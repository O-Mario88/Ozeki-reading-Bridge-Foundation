import { queryPostgres } from "@/lib/server/postgres/client";

export type CoachingVisitExtractionPayload = {
  recordId: number;
  schoolId: number;
  date: string;
  visitType: string; // From followUpType or default
  coachUserId: number;
  payloadObj: Record<string, unknown>;
};

export async function extractAndSaveCoachingVisitAsync(
  input: CoachingVisitExtractionPayload,
) {
  const { recordId, schoolId, date, visitType, coachUserId, payloadObj } = input;

  const implementationStatus =
    String(payloadObj.implementationStatus || "started").toLowerCase();
  let visitPathway = "observation";
  if (implementationStatus === "not_started" || implementationStatus === "not started") {
    visitPathway = "demo_and_meeting";
  } else if (implementationStatus === "partial") {
    visitPathway = "mixed";
  }

  const visitUid = `CV-${recordId}-${Date.now().toString().slice(-6)}`;
  const coachingCycleNumber = Number(payloadObj.coachingCycleNumber) || 1;
  const visitReason = String(payloadObj.visitReason || "lesson_evaluation_coaching");

  const focusAreas = Array.isArray(payloadObj.focusAreas) ? payloadObj.focusAreas : [];
  const classesImplementing = Array.isArray(payloadObj.classesImplementing)
    ? payloadObj.classesImplementing
    : [];
  const classesNotImplementing = Array.isArray(payloadObj.classesNotImplementing)
    ? payloadObj.classesNotImplementing
    : [];

  const visitResult = await queryPostgres<{ id: number }>(
    `INSERT INTO coaching_visits (
       visit_uid, portal_record_id, school_id, visit_date, visit_type,
       coaching_cycle_number, coach_user_id, focus_areas_json,
       implementation_status, visit_pathway, classes_implementing_json,
       classes_not_implementing_json, visit_reason, created_at, updated_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8,
       $9, $10, $11, $12, $13, NOW(), NOW()
     )
     ON CONFLICT (portal_record_id) DO UPDATE SET
       visit_date = EXCLUDED.visit_date,
       visit_type = EXCLUDED.visit_type,
       coaching_cycle_number = EXCLUDED.coaching_cycle_number,
       coach_user_id = EXCLUDED.coach_user_id,
       focus_areas_json = EXCLUDED.focus_areas_json,
       implementation_status = EXCLUDED.implementation_status,
       visit_pathway = EXCLUDED.visit_pathway,
       classes_implementing_json = EXCLUDED.classes_implementing_json,
       classes_not_implementing_json = EXCLUDED.classes_not_implementing_json,
       visit_reason = EXCLUDED.visit_reason,
       updated_at = NOW()
     RETURNING id`,
    [
      visitUid,
      recordId,
      schoolId,
      date,
      visitType,
      coachingCycleNumber,
      coachUserId,
      JSON.stringify(focusAreas),
      implementationStatus.replace(" ", "_"),
      visitPathway,
      JSON.stringify(classesImplementing),
      JSON.stringify(classesNotImplementing),
      visitReason,
    ],
  );

  const visitId = Number(visitResult.rows[0]?.id ?? 0);
  if (!visitId) return null;

  // Process Demo Sub-record if available
  const demoDelivered =
    String(payloadObj.demoDelivered).toLowerCase() === "yes" || payloadObj.demoDelivered === true;
  if (demoDelivered) {
    const demoComponents = Array.isArray(payloadObj.demoComponents) ? payloadObj.demoComponents : [];
    const materialsUsed = Array.isArray(payloadObj.demoMaterialsUsed) ? payloadObj.demoMaterialsUsed : [];
    const teachersPresentIds = Array.isArray(payloadObj.demoTeachersPresentContactIds)
      ? payloadObj.demoTeachersPresentContactIds
      : Array.isArray(payloadObj.demoTeachersPresentIds) ? payloadObj.demoTeachersPresentIds : [];
    const classesToStart = Array.isArray(payloadObj.classesToStartFirst)
      ? payloadObj.classesToStartFirst
      : [];
    const supportNeeded = Array.isArray(payloadObj.supportNeededFromOzeki)
      ? payloadObj.supportNeededFromOzeki
      : [];
      
    const responsibleContactId = Number(payloadObj.implementationResponsibleContactId) || null;

    const demoMinutes = Number(payloadObj.demoMinutes) || 0;
    const dailyReadingTime = Number(payloadObj.dailyReadingTimeMinutes) || 0;

    await queryPostgres(
      `INSERT INTO visit_demo (
         visit_id, demo_delivered, demo_class, demo_focus, demo_minutes,
         demo_components_json, materials_used_json, teachers_present_contact_ids_json,
         takeaways_text, implementation_start_date, daily_reading_time_minutes,
         classes_to_start_json, responsible_contact_id, support_needed_json,
         created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
       )
       ON CONFLICT (visit_id) DO UPDATE SET
         demo_delivered = EXCLUDED.demo_delivered,
         demo_class = EXCLUDED.demo_class,
         demo_focus = EXCLUDED.demo_focus,
         demo_minutes = EXCLUDED.demo_minutes,
         demo_components_json = EXCLUDED.demo_components_json,
         materials_used_json = EXCLUDED.materials_used_json,
         teachers_present_contact_ids_json = EXCLUDED.teachers_present_contact_ids_json,
         takeaways_text = EXCLUDED.takeaways_text,
         implementation_start_date = EXCLUDED.implementation_start_date,
         daily_reading_time_minutes = EXCLUDED.daily_reading_time_minutes,
         classes_to_start_json = EXCLUDED.classes_to_start_json,
         responsible_contact_id = EXCLUDED.responsible_contact_id,
         support_needed_json = EXCLUDED.support_needed_json,
         updated_at = NOW()`,
      [
        visitId,
        true,
        payloadObj.demoClass ? String(payloadObj.demoClass) : null,
        payloadObj.demoFocus ? String(payloadObj.demoFocus) : null,
        demoMinutes > 0 ? demoMinutes : null,
        JSON.stringify(demoComponents),
        JSON.stringify(materialsUsed),
        JSON.stringify(teachersPresentIds),
        payloadObj.demoTakeawaysText ? String(payloadObj.demoTakeawaysText) : null,
        payloadObj.implementationStartDate ? String(payloadObj.implementationStartDate) : null,
        dailyReadingTime > 0 ? dailyReadingTime : null,
        JSON.stringify(classesToStart),
        responsibleContactId,
        JSON.stringify(supportNeeded),
      ],
    );
  }

  // Process Leadership Meeting Sub-record
  const meetingHeld =
    String(payloadObj.leadershipMeetingHeld).toLowerCase() === "yes" || payloadObj.leadershipMeetingHeld === true;
  if (meetingHeld) {
    const attendeesIds = Array.isArray(payloadObj.leadershipAttendeesContactIds)
      ? payloadObj.leadershipAttendeesContactIds
      : Array.isArray(payloadObj.leadershipAttendeesIds) ? payloadObj.leadershipAttendeesIds : [];
      
    // Handle both JSON strings and raw arrays for next actions
    let nextActions = [];
    if (typeof payloadObj.leadershipNextActionsJson === 'string') {
      try {
        nextActions = JSON.parse(payloadObj.leadershipNextActionsJson);
      } catch (e) {
        nextActions = [];
      }
    } else if (Array.isArray(payloadObj.leadershipNextActionsJson)) {
        nextActions = payloadObj.leadershipNextActionsJson;
    }

    await queryPostgres(
      `INSERT INTO visit_leadership_meeting (
         visit_id, meeting_held, attendees_contact_ids_json, summary_text,
         agreements_text, risks_text, next_actions_json, next_visit_date,
         created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
       )
       ON CONFLICT (visit_id) DO UPDATE SET
         meeting_held = EXCLUDED.meeting_held,
         attendees_contact_ids_json = EXCLUDED.attendees_contact_ids_json,
         summary_text = EXCLUDED.summary_text,
         agreements_text = EXCLUDED.agreements_text,
         risks_text = EXCLUDED.risks_text,
         next_actions_json = EXCLUDED.next_actions_json,
         next_visit_date = EXCLUDED.next_visit_date,
         updated_at = NOW()`,
      [
        visitId,
        true,
        JSON.stringify(attendeesIds),
        payloadObj.leadershipSummary ? String(payloadObj.leadershipSummary) : null,
        payloadObj.leadershipAgreements ? String(payloadObj.leadershipAgreements) : null,
        payloadObj.leadershipRisks ? String(payloadObj.leadershipRisks) : null,
        JSON.stringify(nextActions),
        payloadObj.leadershipNextVisitDate ? String(payloadObj.leadershipNextVisitDate) : null,
      ],
    );
  }
  
  // Note: visit_participants mapping relies on `visitParticipantsContactIds` if available
  // In `PortalModuleManager.tsx` we can see multiple nested participant arrays.
  
  return visitId;
}
