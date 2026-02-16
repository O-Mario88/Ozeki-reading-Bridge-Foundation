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

export const portalResourceSections = [
  "Resources Library",
  "Compliance Documents",
  "Financial Documents",
  "Safeguarding Documents",
  "Legal & Governance Documents",
  "Donor Pack Documents",
  "Monitoring & Evaluation Documents",
  "Impact Report Documents",
] as const;

export type PortalResourceSection = (typeof portalResourceSections)[number];

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
  downloadLabel?: string;
  section?: PortalResourceSection;
}

export interface PortalResourceRecord {
  id: number;
  slug: string;
  title: string;
  description: string;
  grade: ResourceGrade;
  skill: ResourceSkill;
  type: ResourceType;
  section: PortalResourceSection;
  fileName: string | null;
  storedPath: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  externalUrl: string | null;
  downloadLabel: string | null;
  isPublished: boolean;
  createdByUserId: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
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
  isSuperAdmin: boolean;
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
  onlineTeachersTrained: number;
  onlineSchoolLeadersTrained: number;
  calendarEventId: string | null;
  calendarLink: string | null;
  meetLink: string | null;
  recordingUrl: string | null;
  chatSummary: string | null;
  attendanceCapturedAt: string | null;
  createdAt: string;
}

export interface PortalUserAdminRecord extends PortalUser {
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
  schoolId: number | null;
  schoolName: string;
  programType?: string;
  followUpDate?: string;
  status: PortalRecordStatus;
  payload: PortalRecordPayload;
}

export interface PortalRecord extends Omit<PortalRecordInput, "schoolId"> {
  id: number;
  schoolId: number | null;
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

export interface PortalAnalyticsModuleStatus {
  module: PortalRecordModule;
  draft: number;
  submitted: number;
  returned: number;
  approved: number;
  total: number;
}

export interface PortalAnalyticsMonthlyPoint {
  key: string;
  month: string;
  records: number;
  training: number;
  visits: number;
  assessments: number;
  story: number;
  evidence: number;
  testimonials: number;
}

export interface PortalAnalyticsDistrictStat {
  district: string;
  records: number;
  schools: number;
  testimonials: number;
}

export interface PortalAnalyticsUserStat {
  userId: number;
  fullName: string;
  role: PortalUserRole;
  records: number;
  evidence: number;
  testimonials: number;
}

export interface PortalAnalyticsRecentRecord {
  id: number;
  recordCode: string;
  module: PortalRecordModule;
  date: string;
  district: string;
  schoolName: string;
  status: PortalRecordStatus;
  createdByName: string;
  updatedAt: string;
}

export interface PortalAnalyticsData {
  generatedAt: string;
  scope: "all" | "mine";
  totals: {
    portalRecords: number;
    approvedRecords: number;
    submittedRecords: number;
    returnedRecords: number;
    draftRecords: number;
    schoolsCovered: number;
    followUpsDue: number;
    evidenceUploads: number;
    testimonials: number;
    onlineTrainingEvents: number;
    onlineTeachersTrained: number;
    onlineSchoolLeadersTrained: number;
    resourcesUploaded: number;

    schoolsDirectory: number;
    legacyTrainingSessions: number;
    legacyAssessmentRecords: number;
    bookingRequests: number;
    partnerInquiries: number;
    toolkitLeads: number;
    newsletterSubscribers: number;
    learnersAssessed: number;
    storiesPublished: number;
    trainingSessionsCompleted: number;
  };
  participants: {
    total: number;
    teachers: number;
    leaders: number;
  };
  moduleStatus: PortalAnalyticsModuleStatus[];
  monthly: PortalAnalyticsMonthlyPoint[];
  districtStats: PortalAnalyticsDistrictStat[];
  userStats: PortalAnalyticsUserStat[];
  followUps: DashboardFollowUpItem[];
  recentRecords: PortalAnalyticsRecentRecord[];
  recentEvidence: PortalEvidenceRecord[];
  recentTestimonials: PortalTestimonialRecord[];
}

export interface SchoolDirectoryInput {
  name: string;
  district: string;
  subCounty: string;
  parish: string;
  village?: string;
  notes?: string;
  enrolledBoys?: number;
  enrolledGirls?: number;
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
  notes: string | null;
  enrolledBoys: number;
  enrolledGirls: number;
  enrolledLearners: number;
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

export interface PortalTestimonialRecord {
  id: number;
  storytellerName: string;
  storytellerRole: string;
  schoolName: string;
  district: string;
  storyText: string;
  videoFileName: string;
  videoStoredPath: string;
  videoMimeType: string;
  videoSizeBytes: number;
  photoFileName: string | null;
  photoStoredPath: string | null;
  photoMimeType: string | null;
  photoSizeBytes: number | null;
  isPublished: boolean;
  createdByUserId: number;
  createdByName: string;
  createdAt: string;
}

export type ImpactReportType =
  | "FY Impact Report"
  | "Regional Impact Report"
  | "District Report"
  | "School Report"
  | "Partner Snapshot Report";

export type ImpactReportScopeType = "National" | "Region" | "District" | "School";

export type ImpactReportProgramType =
  | "training"
  | "visit"
  | "assessment"
  | "story"
  | "resources"
  | "online-training";

export type ImpactReportVariant = "Public Impact Report" | "Partner Report" | "School Report";

export interface ImpactReportTemplateSection {
  id: string;
  title: string;
  purpose: string;
  dataBlocks: string[];
  aiWrites: string;
  included: boolean;
  order: number;
}

export interface ImpactReportTemplatePackage {
  masterTemplateId: string;
  masterTemplateName: string;
  variant: ImpactReportVariant;
  aiWritingRules: string[];
  tableOfContents: string[];
  sections: ImpactReportTemplateSection[];
  generatedDate: string;
}

export interface ImpactReportSectionNarrative {
  sectionId: string;
  title: string;
  summary: string;
}

export interface ImpactReportBuildInput {
  title?: string;
  reportType: ImpactReportType;
  scopeType: ImpactReportScopeType;
  scopeValue?: string;
  partnerName?: string;
  periodStart: string;
  periodEnd: string;
  programsIncluded: ImpactReportProgramType[];
  isPublic: boolean;
  version: string;
}

export interface ImpactReportCoverageBlock {
  schoolsImpacted: number;
  schoolsCoachedVisited: number;
  teachersTrained: number;
  schoolLeadersTrained: number;
  learnersReached: number;
  coachingVisitsCompleted: number;
  coachingVisitsPlanned: number;
  assessmentsConducted: {
    baseline: number;
    progress: number;
    endline: number;
  };
}

export interface ImpactReportEngagementBlock {
  resourcesDownloaded: number;
  topDownloads: Array<{
    slug: string;
    title: string;
    downloads: number;
  }>;
  downloadsByType: Array<{
    type: string;
    downloads: number;
  }>;
  downloadsByGrade: Array<{
    grade: string;
    downloads: number;
  }>;
  bookingRequests: number;
}

export interface ImpactReportLearningOutcomeMetric {
  baseline: number | null;
  progress: number | null;
  endline: number | null;
  change: number | null;
}

export interface ImpactReportLearningOutcomesBlock {
  letterSoundKnowledge: ImpactReportLearningOutcomeMetric;
  decodingAccuracy: ImpactReportLearningOutcomeMetric;
  oralReadingFluencyWcpm: ImpactReportLearningOutcomeMetric;
  oralReadingAccuracy: ImpactReportLearningOutcomeMetric;
  comprehension: ImpactReportLearningOutcomeMetric;
  proficiencyBandMovementPercent: number | null;
  reductionInNonReadersPercent: number | null;
}

export interface ImpactReportInstructionQualityBlock {
  routineAdoptionRate: number | null;
  observationScoreChange: number | null;
  topGaps: string[];
}

export interface ImpactReportDataQualityBlock {
  approvedRecords: number;
  totalRecords: number;
  missingPayloadRate: number;
  verificationNote: string;
}

export interface ImpactReportFactPack {
  generatedAt: string;
  reportType: ImpactReportType;
  scopeType: ImpactReportScopeType;
  scopeValue: string;
  periodStart: string;
  periodEnd: string;
  programsIncluded: ImpactReportProgramType[];
  definitions: {
    learnersReached: string;
    schoolsImpacted: string;
    schoolsCoachedVisited: string;
    improvement: string;
    reportingCalendar: string;
  };
  coverageDelivery: ImpactReportCoverageBlock;
  engagement: ImpactReportEngagementBlock;
  learningOutcomes: ImpactReportLearningOutcomesBlock;
  instructionQuality: ImpactReportInstructionQualityBlock;
  dataQuality: ImpactReportDataQualityBlock;
}

export interface ImpactReportNarrative {
  variant: ImpactReportVariant;
  factsLockInstruction: string;
  executiveSummary: string;
  biggestImprovements: string[];
  keyChallenges: string[];
  nextPriorities: string[];
  methodsNote: string;
  limitations: string;
  sectionNarratives: ImpactReportSectionNarrative[];
  template: ImpactReportTemplatePackage;
}

export interface ImpactReportRecord {
  id: number;
  reportCode: string;
  title: string;
  reportType: ImpactReportType;
  scopeType: ImpactReportScopeType;
  scopeValue: string;
  partnerName: string | null;
  periodStart: string;
  periodEnd: string;
  programsIncluded: ImpactReportProgramType[];
  factPack: ImpactReportFactPack;
  narrative: ImpactReportNarrative;
  status: "Generated";
  isPublic: boolean;
  version: string;
  generatedAt: string;
  viewCount: number;
  downloadCount: number;
  createdByUserId: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}
