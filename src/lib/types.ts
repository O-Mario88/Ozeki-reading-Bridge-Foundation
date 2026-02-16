export type ResourceGrade =
  | "Nursery"
  | "P1-P2"
  | "P3-P4"
  | "P5-P7"
  | "All Primary";

export type ResourceSkill =
  | "Phonics"
  | "Fluency"
  | "Comprehension"
  | "Assessment"
  | "Remedial"
  | "Writing";

export type ResourceType =
  | "Toolkit"
  | "Lesson Plan"
  | "Assessment"
  | "Poster"
  | "Guide"
  | "Reader";

export interface Program {
  id: number;
  title: string;
  summary: string;
  focusAreas: string[];
  outputs: string[];
  outcome: string;
}

export interface ResourceItem {
  slug: string;
  title: string;
  description: string;
  grade: ResourceGrade;
  skill: ResourceSkill;
  type: ResourceType;
  filePath: string;
}

export interface BlogSection {
  heading: string;
  paragraphs: string[];
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  role: string;
  publishedAt: string;
  readTime: string;
  tags: string[];
  sections: BlogSection[];
}

export interface Testimonial {
  name: string;
  role: string;
  quote: string;
}

export interface CaseStudy {
  slug: string;
  school: string;
  district: string;
  challenge: string;
  intervention: string[];
  results: string[];
  testimonial: string;
}

export interface Partner {
  name: string;
  note: string;
}

export type PortalUserRole = "Staff" | "Volunteer";

export interface PortalUser {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: PortalUserRole;
  isSupervisor: boolean;
  isME: boolean;
  isAdmin: boolean;
}

export type ParticipantRole = "Classroom teacher" | "School Leader";

export interface TrainingParticipantInput {
  name: string;
  role: ParticipantRole;
  phone: string;
  email: string;
}

export interface TrainingSessionInput {
  schoolName: string;
  district: string;
  subCounty: string;
  parish: string;
  village?: string;
  sessionDate: string;
  participants: TrainingParticipantInput[];
}

export interface TrainingSessionRecord {
  id: number;
  schoolName: string;
  district: string;
  subCounty: string;
  parish: string;
  village: string | null;
  sessionDate: string;
  participantCount: number;
  classroomTeachers: number;
  schoolLeaders: number;
  createdAt: string;
}

export interface AssessmentRecordInput {
  schoolName: string;
  district: string;
  subCounty: string;
  parish: string;
  village?: string;
  learnersAssessed: number;
  storiesPublished: number;
  assessmentDate: string;
}

export interface AssessmentRecord {
  id: number;
  schoolName: string;
  district: string;
  subCounty: string;
  parish: string;
  village: string | null;
  learnersAssessed: number;
  storiesPublished: number;
  assessmentDate: string;
  createdAt: string;
}

export interface OnlineTrainingEventInput {
  title: string;
  description?: string;
  audience: string;
  startDate: string;
  startTime: string;
  durationMinutes: number;
  attendeeEmails?: string[];
}

export interface OnlineTrainingEventRecord {
  id: number;
  title: string;
  description: string | null;
  audience: string;
  startDateTime: string;
  endDateTime: string;
  durationMinutes: number;
  attendeeCount: number;
  calendarEventId: string | null;
  calendarLink: string | null;
  meetLink: string | null;
  createdAt: string;
}

export type PortalRecordModule = "training" | "visit" | "assessment" | "story";
export type PortalRecordStatus = "Draft" | "Submitted" | "Returned" | "Approved";

export interface PortalRecordPayload {
  [key: string]: string | number | boolean | string[] | null | undefined;
}

export interface PortalRecordInput {
  module: PortalRecordModule;
  date: string;
  district: string;
  schoolName: string;
  programType?: string;
  followUpDate?: string;
  status: PortalRecordStatus;
  payload: PortalRecordPayload;
}

export interface PortalRecord extends PortalRecordInput {
  id: number;
  recordCode: string;
  createdByUserId: number;
  createdByName: string;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PortalRecordFilters {
  module: PortalRecordModule;
  dateFrom?: string;
  dateTo?: string;
  district?: string;
  school?: string;
  status?: PortalRecordStatus;
  createdBy?: number;
  programType?: string;
}

export interface DashboardKpis {
  trainingsLogged: number;
  schoolVisits: number;
  assessments: number;
  storyActivities: number;
}

export interface DashboardAgendaItem {
  id: number;
  recordCode: string;
  module: PortalRecordModule;
  date: string;
  schoolName: string;
  programType: string | null;
}

export interface DashboardFollowUpItem {
  id: number;
  recordCode: string;
  module: PortalRecordModule;
  schoolName: string;
  followUpDate: string;
}

export interface DashboardActivityItem {
  id: number;
  recordCode: string;
  module: PortalRecordModule;
  date: string;
  schoolName: string;
  status: PortalRecordStatus;
  updatedAt: string;
}

export interface PortalDashboardData {
  kpis: DashboardKpis;
  weekAgenda: DashboardAgendaItem[];
  dueFollowUps: DashboardFollowUpItem[];
  recentActivity: DashboardActivityItem[];
}

export interface SchoolDirectoryInput {
  name: string;
  district: string;
  subCounty: string;
  parish: string;
  village?: string;
  gpsLat?: string;
  gpsLng?: string;
  contactName?: string;
  contactPhone?: string;
}

export interface SchoolDirectoryRecord {
  id: number;
  schoolCode: string;
  name: string;
  district: string;
  subCounty: string;
  parish: string;
  village: string | null;
  gpsLat: string | null;
  gpsLng: string | null;
  contactName: string | null;
  contactPhone: string | null;
  createdAt: string;
}

export interface PortalEvidenceRecord {
  id: number;
  recordId: number | null;
  module: PortalRecordModule;
  date: string;
  schoolName: string;
  fileName: string;
  storedPath: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByName: string;
  createdAt: string;
}
