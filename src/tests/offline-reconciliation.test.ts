import { test, mock } from "node:test";
import assert from "node:assert";
import "fake-indexeddb/auto"; // Injects global.indexedDB

// Mock full browser environment for offline-form-queue.ts
global.window = {
  dispatchEvent: () => true,
  addEventListener: () => {},
  setInterval: () => {},
} as any;
Object.defineProperty(global, 'navigator', {
  value: { onLine: false },
  writable: true
});
global.document = {
  addEventListener: () => {},
  visibilityState: "visible"
} as any;
import { webcrypto } from "node:crypto";
Object.defineProperty(global, 'crypto', { value: webcrypto });



let testingLocalId: string | number;
let testingLessonEvalLocalId: string | number;

test("Offline Record Manager E2E UUID Reconciliation", async (t) => {
  const { offlineDb } = await import("@/lib/offline-db");
  const { createOfflineRecord, updateOfflineRecord } = await import("@/lib/offline-record-manager");
  const { flushOfflineFormQueue } = await import("@/lib/offline-form-queue");

  // Reset Dexie
  await offlineDb.delete();
  await offlineDb.open();

  let fetchCalls: any[] = [];
  let nextBackendId = 42;
  global.fetch = mock.fn(async (url: string, options: any) => {
    fetchCalls.push({ url, options });
    const assignedId = nextBackendId++;
    return {
      ok: true,
      json: async () => ({
        record: { id: assignedId, recordCode: `TST-00${assignedId}`, status: "Submitted" },
      }),
    };
  }) as any;

  await t.test("1. Create record offline", async () => {
    Object.defineProperty(global.navigator, 'onLine', { value: false });
    const { id } = await createOfflineRecord("visit", { date: "2026-03-24", schoolId: 100 });
    
    // Check Dexie tables
    const records = await offlineDb.offlineRecords.toArray();
    assert.strictEqual(records.length, 1);
    assert.strictEqual(records[0].id, id);
    assert.ok(String(id).startsWith("local-"));
    assert.strictEqual(records[0].isLocalOnly, 1);

    const queue = await offlineDb.syncQueue.toArray();
    assert.strictEqual(queue.length, 1);
    assert.strictEqual(queue[0].action, "create");
    assert.strictEqual(queue[0].localRecordId, id);
    assert.strictEqual(queue[0].status, "pending");

    // Persist this ID to test dependent updates
    testingLocalId = id;
  });

  await t.test("2. Update the same un-synced record while offline", async () => {
    const localId = testingLocalId;
    await updateOfflineRecord("visit", localId, { extraNote: "Forgot to add this!" });

    // The logic should mutate the existing "create" queue item, NOT add a new "update" queue item
    const queue = await offlineDb.syncQueue.toArray();
    assert.strictEqual(queue.length, 1);
    assert.strictEqual(queue[0].action, "create");
    assert.strictEqual(queue[0].payload.extraNote, "Forgot to add this!");
  });

  await t.test("3. Create a dependent record (Lesson Evaluation) linked to the local Visit ID", async () => {
    const localVisitId = testingLocalId;
    const { id } = await createOfflineRecord("lessonEvaluation", { visitId: localVisitId, score: 95 });
    
    const queue = await offlineDb.syncQueue.toArray();
    assert.strictEqual(queue.length, 2);
    
    const evalQueueItem = queue.find(q => q.module === "lessonEvaluation");
    assert.ok(evalQueueItem);
    assert.strictEqual(evalQueueItem.payload.visitId, localVisitId); 

    testingLessonEvalLocalId = id;
  });

  await t.test("4. Internet Restores -> Flush Queue triggers Universal UUID Reconciliation", async () => {
    Object.defineProperty(global.navigator, 'onLine', { value: true });
    const localVisitId = testingLocalId;
    
    // Attempt sync
    await flushOfflineFormQueue();

    // Verify exactly 2 network calls were made
    assert.strictEqual(fetchCalls.length, 2);
    assert.strictEqual(fetchCalls[0].options.method, "POST");

    // Did the background queue reconcile the local UUID correctly in Dexie caches?
    const remainingQueue = await offlineDb.syncQueue.toArray();
    assert.strictEqual(remainingQueue.length, 0); // Both synced!

    // Wait! In the mock, fetch returns `id: 42` for BOTH. 
    // This means the Visit became 42, then the lesson eval linked to visitId: 42, and also became id: 42.
    // Let's verify the `offlineRecords` cache. It should have replaced `local-xxxx` with `42`
    const finalCache = await offlineDb.offlineRecords.toArray();
    console.log("FINAL CACHE DUMP", JSON.stringify(finalCache, null, 2));
    
    const visitCache = finalCache.find(r => r.module === "visit");
    assert.ok(visitCache);
    assert.strictEqual(visitCache.id, "42");
    assert.strictEqual(visitCache.isLocalOnly, 0);

    const evalCache = finalCache.find(r => r.module === "lessonEvaluation");
    assert.ok(evalCache);
    assert.strictEqual(evalCache.data.visitId, "42"); // IT SHOULD BE REWRITTEN TO 42!
  });
});
