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

export interface BlogPostSection {
  heading: string;
  paragraphs: string[];
}

export interface BlogPost {
  slug: string;
  title: string;
  subtitle?: string;
  excerpt: string;
  category: string;
  author: string;
  role: string;
  publishedAt: string;
  readTime: string;
  tags: string[];
  sections: BlogPostSection[];
  mediaImageUrl?: string | null;
  mediaVideoUrl?: string | null;
  source?: "static" | "portal";
  views?: number;
}

export type PortalUserRole =
  | "Staff"
  | "Volunteer"
  | "Admin"
  | "Coach"
  | "DataClerk"
  | "SchoolLeader"
  | "Partner"
  | "Government";

export interface PortalUser {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: PortalUserRole;
  geographyScope: string | null;
  isSupervisor: boolean;
  isME: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

/* ─── NLIS Fidelity ───────────────────────────────── */

export type FidelityBand = "Strong" | "Developing" | "Needs support" | "High priority";

export interface FidelityDriverScore {
  driver: string;
  label: string;
  score: number;
  weight: number;
  detail: string;
}

export interface FidelityScore {
  scopeType: "country" | "region" | "sub_region" | "district" | "sub_county" | "parish" | "school";
  scopeId: string;
  totalScore: number;
  band: FidelityBand;
  drivers: FidelityDriverScore[];
  sampleSize: number;
  period: string;
  lastUpdated: string;
}

export interface FidelityDashboardData {
  scope: FidelityScore;
  children: FidelityScore[];
  rankings: Array<{ name: string; score: number; band: FidelityBand }>;
}

/* ─── NLIS Cost Tracking ──────────────────────────── */

export type CostCategory =
  | "transport"
  | "meals"
  | "printing"
  | "staff_time"
  | "materials"
  | "training"
  | "assessment"
  | "other";

export interface CostEntryInput {
  scopeType: "country" | "region" | "district" | "school";
  scopeValue: string;
  period: string;
  category: CostCategory;
  amount: number;
  notes?: string;
}

export interface CostEntryRecord extends CostEntryInput {
  id: number;
  createdByUserId: number;
  createdByName: string;
  createdAt: string;
}

export interface CostEffectivenessData {
  totalCost: number;
  costPerSchool: number | null;
  costPerTeacher: number | null;
  costPerLearnerAssessed: number | null;
  costPerLearnerImproved: number | null;
  period: string;
  scopeType: string;
  scopeValue: string;
  breakdown: Array<{ category: CostCategory; amount: number }>;
}

export interface ImpactCalculatorResult {
  inputAmount: number;
  estimatedSchools: number;
  estimatedTeachers: number;
  estimatedLearners: number;
  estimatedOutcomes: string;
  assumptions: string[];
  methodology: string;
}

/* ─── NLIS Audit Logging ──────────────────────────── */

export interface AuditLogEntry {
  id: number;
  userId: number;
  userName: string;
  action: string;
  targetTable: string;
  targetId: number | null;
  detail: string | null;
  ipAddress: string | null;
  timestamp: string;
}

/* ─── NLIS Observation Rubrics ────────────────────── */

export interface RubricIndicator {
  key: string;
  label: string;
  score: number;
  maxScore: number;
}

export interface ObservationRubricInput {
  schoolId: number;
  teacherUid: string;
  date: string;
  lessonType: string;
  indicators: RubricIndicator[];
  strengths: string;
  gaps: string;
  coachingActions: string;
}

export interface ObservationRubricRecord extends Omit<ObservationRubricInput, "indicators"> {
  id: number;
  overallScore: number;
  indicatorsJson: string;
  createdByUserId: number;
  createdByName: string;
  createdAt: string;
}

/* ─── NLIS Interventions ──────────────────────────── */

export interface InterventionGroupInput {
  schoolId: number;
  grade: string;
  targetSkill: string;
  learnerUids: string[];
  schedule: string;
  startDate: string;
  endDate: string;
}

export interface InterventionGroupRecord extends Omit<InterventionGroupInput, "learnerUids"> {
  id: number;
  learnersJson: string;
  createdByUserId: number;
  createdAt: string;
}

export interface InterventionSessionInput {
  groupId: number;
  date: string;
  attendance: number;
  skillsPracticed: string;
  quickCheckScore: number | null;
  notes: string;
}

export interface InterventionSessionRecord extends InterventionSessionInput {
  id: number;
  createdByUserId: number;
  createdAt: string;
}

/* ─── NLIS Materials Distribution ─────────────────── */

export interface MaterialDistributionInput {
  schoolId: number;
  date: string;
  materialType: string;
  quantity: number;
  receiptPath?: string;
  notes?: string;
}

export interface MaterialDistributionRecord extends MaterialDistributionInput {
  id: number;
  createdByUserId: number;
  createdByName: string;
  createdAt: string;
}

/* ─── NLIS Consent ────────────────────────────────── */

export type ConsentType = "photo" | "video" | "story";
export type ConsentUsage = "public" | "partner" | "internal";

export interface ConsentRecordInput {
  schoolId: number;
  consentType: ConsentType;
  source: string;
  date: string;
  allowedUsage: ConsentUsage;
  linkedFiles: string;
  expiryDate?: string;
}

export interface ConsentRecordEntry extends ConsentRecordInput {
  id: number;
  createdByUserId: number;
  createdAt: string;
}

/* ─── NLIS Data Quality ───────────────────────────── */

export interface DataQualitySummary {
  scopeType: string;
  scopeId: string;
  completenessScore: number;
  schoolsMissingBaseline: number;
  schoolsMissingEndline: number;
  outlierCount: number;
  duplicateLearnersDetected: number;
  lastChecked: string;
}

/* ─── NLIS Learning Gains ─────────────────────────── */

export interface DomainGainData {
  domain: string;
  baselineAvg: number | null;
  endlineAvg: number | null;
  change: number | null;
  sampleSize: number;
  belowBenchmarkPct: number | null;
  approachingPct: number | null;
  atBenchmarkPct: number | null;
}

export interface LearningGainsData {
  scopeType: string;
  scopeId: string;
  period: string;
  domains: DomainGainData[];
  schoolImprovementIndex: number | null;
  lastUpdated: string;
}

/* ─── NLIS Government View ────────────────────────── */

export interface DistrictLeagueRow {
  district: string;
  region: string;
  outcomesScore: number | null;
  fidelityScore: number | null;
  rank: number;
  priorityFlag: "urgent" | "watch" | "on-track";
  schoolsSupported: number;
  learnersAssessed: number;
}

export interface GovernmentViewData {
  leagueTable: DistrictLeagueRow[];
  generatedAt: string;
  period: string;
}

/* ─── NLIS Geography ──────────────────────────────── */

export interface GeographyMasterRecord {
  id: number;
  name: string;
  code: string;
  parentId: number | null;
  level: "country" | "region" | "district";
  metadata: string | null;
  createdAt: string;
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

export type AssessmentType = "baseline" | "progress" | "endline";
export type LearnerGender = "Boy" | "Girl" | "Other";

export interface AssessmentRecordInput {
  childName: string;
  childId: string;
  gender: LearnerGender;
  age: number;
  schoolId: number;
  classGrade: string;
  assessmentDate: string;
  assessmentType: AssessmentType;
  letterIdentificationScore: number | null;
  soundIdentificationScore: number | null;
  decodableWordsScore: number | null;
  undecodableWordsScore: number | null;
  madeUpWordsScore: number | null;
  storyReadingScore: number | null;
  readingComprehensionScore: number | null;
  notes?: string;
}

export interface AssessmentRecord extends AssessmentRecordInput {
  id: number;
  createdByUserId: number;
  createdAt: string;
}

export interface DomainOutcomes {
  baselineName: string;
  baselineScore: number;
  endlineName: string;
  endlineScore: number;
  sampleSize: number;
}

export interface AggregatedImpactData {
  level: "country" | "region" | "sub_region" | "district" | "sub_county" | "parish" | "school";
  name: string;
  kpis: {
    schoolsSupported: number;
    teachersTrained: number;
    learnersEnrolled: number;
    learnersAssessed: number;
  };
  outcomesByDomain: {
    letterIdentification: DomainOutcomes;
    soundIdentification: DomainOutcomes;
    decodableWords: DomainOutcomes;
    undecodableWords: DomainOutcomes;
    madeUpWords: DomainOutcomes;
    storyReading: DomainOutcomes;
    readingComprehension: DomainOutcomes;
  };
  funnel: {
    targetSchools: number;
    schoolsTrained: number;
    schoolsVisited: number;
    schoolsAssessedBaseline: number;
    schoolsAssessedEndline: number;
  };
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
  learnersReached: number;
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

export interface PortalSchoolReportRow {
  country?: string | null;
  region?: string | null;
  subRegion?: string | null;
  district: string;
  subCounty?: string | null;
  parish?: string | null;
  village?: string | null;
  schoolId: number;
  schoolCode: string;
  schoolName: string;
  accountOwner: string;
  currentEnrollment: number;
  lastActivityDate: string | null;
  schoolStatus: "Open";
  phone: string | null;
  primaryContact: string | null;
  trainings: number;
  schoolVisits: number;
  storyActivities: number;
  resourcesDistributed: number;
  teacherAssessments: number;
  teacherObservationAverage: number | null;
  teacherObservationCount: number;
  learnerAssessments: number;
  contactsCount: number;
  totalRecords: number;
}

export interface PortalDistrictReportSummary {
  country?: string | null;
  region?: string | null;
  subRegion?: string | null;
  district: string;
  schools: number;
  enrollment: number;
  trainings: number;
  schoolVisits: number;
  storyActivities: number;
  resourcesDistributed: number;
  teacherAssessments: number;
  teacherObservationCount: number;
  learnerAssessments: number;
  schoolsWithContacts: number;
  totalRecords: number;
}

export interface PortalObservationEvent {
  schoolId: number;
  date: string;
  overallScore: number;
  indicators: RubricIndicator[];
}

export interface PortalOperationalReportsData {
  generatedAt: string;
  totals: {
    totalRecords: number;
    totalSchools: number;
    totalEnrollment: number;
    totalDistricts: number;
    trainings: number;
    schoolVisits: number;
    storyActivities: number;
    resourcesDistributed: number;
    teacherAssessments: number;
    learnerAssessments: number;
    schoolsWithContacts: number;
    teacherObservationCount: number;
  };
  districts: PortalDistrictReportSummary[];
  schools: PortalSchoolReportRow[];
  observationEvents: PortalObservationEvent[];
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
  enrolledBaby?: number;
  enrolledMiddle?: number;
  enrolledTop?: number;
  enrolledP1?: number;
  enrolledP2?: number;
  enrolledP3?: number;
  enrolledP4?: number;
  enrolledP5?: number;
  enrolledP6?: number;
  enrolledP7?: number;
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
  enrolledBaby: number;
  enrolledMiddle: number;
  enrolledTop: number;
  enrolledP1: number;
  enrolledP2: number;
  enrolledP3: number;
  enrolledP4: number;
  enrolledP5: number;
  enrolledP6: number;
  enrolledP7: number;
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
  videoSourceType: "upload" | "youtube";
  videoFileName: string;
  videoStoredPath: string;
  videoMimeType: string;
  videoSizeBytes: number;
  youtubeVideoId: string | null;
  youtubeVideoTitle: string | null;
  youtubeChannelTitle: string | null;
  youtubeThumbnailUrl: string | null;
  youtubeEmbedUrl: string | null;
  youtubeWatchUrl: string | null;
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
  letterIdentification: ImpactReportLearningOutcomeMetric;
  soundIdentification: ImpactReportLearningOutcomeMetric;
  decodableWords: ImpactReportLearningOutcomeMetric;
  undecodableWords: ImpactReportLearningOutcomeMetric;
  madeUpWords: ImpactReportLearningOutcomeMetric;
  storyReading: ImpactReportLearningOutcomeMetric;
  readingComprehension: ImpactReportLearningOutcomeMetric;
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

export interface RegionStats {
  region: string;
  totalSchools: number;
  totalDistricts: number;
  totalZapSchools: number;
  totalLearners: number;
  districts: string[];
}

export interface DistrictStats {
  district: string;
  region: string;
  totalSchools: number;
  totalZapSchools: number;
  totalLearners: number;
}
