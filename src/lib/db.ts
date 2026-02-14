import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { impactMetrics } from "@/lib/content";

const dataDir = path.join(process.cwd(), "data");
const dbFile = path.join(dataDir, "app.db");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let dbInstance: Database.Database | null = null;

function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const db = new Database(dbFile, { timeout: 5000 });
  db.pragma("busy_timeout = 5000");
  db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service TEXT NOT NULL,
    school_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    teachers INTEGER NOT NULL,
    grades TEXT NOT NULL,
    challenges TEXT NOT NULL,
    location TEXT NOT NULL,
    preferred_date TEXT NOT NULL,
    preferred_time TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    organization TEXT,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS download_leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_slug TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    organization TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  `);

  dbInstance = db;
  return db;
}

export function saveBooking(payload: {
  service: string;
  schoolName: string;
  contactName: string;
  email: string;
  phone: string;
  teachers: number;
  grades: string;
  challenges: string;
  location: string;
  preferredDate: string;
  preferredTime: string;
}) {
  return getDb()
    .prepare(`
      INSERT INTO bookings (
        service,
        school_name,
        contact_name,
        email,
        phone,
        teachers,
        grades,
        challenges,
        location,
        preferred_date,
        preferred_time
      ) VALUES (
        @service,
        @schoolName,
        @contactName,
        @email,
        @phone,
        @teachers,
        @grades,
        @challenges,
        @location,
        @preferredDate,
        @preferredTime
      )
    `)
    .run(payload);
}

export function saveContact(payload: {
  type: string;
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  message: string;
}) {
  return getDb()
    .prepare(`
      INSERT INTO contacts (
        type,
        name,
        email,
        phone,
        organization,
        message
      ) VALUES (
        @type,
        @name,
        @email,
        @phone,
        @organization,
        @message
      )
    `)
    .run(payload);
}

export function saveDownloadLead(payload: {
  resourceSlug: string;
  name: string;
  email: string;
  organization?: string;
}) {
  return getDb()
    .prepare(`
      INSERT INTO download_leads (
        resource_slug,
        name,
        email,
        organization
      ) VALUES (
        @resourceSlug,
        @name,
        @email,
        @organization
      )
    `)
    .run(payload);
}

export function getImpactSummary() {
  const db = getDb();
  const bookingCount = db
    .prepare("SELECT COUNT(*) AS total FROM bookings")
    .get() as { total: number };
  const contactCount = db
    .prepare("SELECT COUNT(*) AS total FROM contacts")
    .get() as { total: number };
  const downloadCount = db
    .prepare("SELECT COUNT(*) AS total FROM download_leads")
    .get() as { total: number };
  const newsletterCount = db
    .prepare("SELECT COUNT(*) AS total FROM newsletter_subscribers")
    .get() as { total: number };

  return {
    metrics: impactMetrics,
    engagement: {
      bookingRequests: bookingCount.total,
      partnerInquiries: contactCount.total,
      toolkitLeads: downloadCount.total,
      newsletterSubscribers: newsletterCount.total,
    },
    generatedAt: new Date().toISOString(),
  };
}

export function saveNewsletterSubscriber(payload: { name: string; email: string }) {
  return getDb()
    .prepare(
      `
      INSERT INTO newsletter_subscribers (
        name,
        email
      ) VALUES (
        @name,
        @email
      )
      ON CONFLICT(email) DO NOTHING
    `,
    )
    .run(payload);
}
