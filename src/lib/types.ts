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


export type BlogArticleType =
  | "Blog Post"
  | "Resource Article"
  | "Thought Leadership"
  | "Methodology Explainer"
  | "Story Editorial"
  | "Report Summary";

export type BlogBodyBlockType =
  | "paragraph"
  | "heading2"
  | "heading3"
  | "bullet_list"
  | "numbered_list"
  | "quote"
  | "image"
  | "callout"
  | "stat"
  | "divider"
  | "cta_inline";

export type BlogImageWidthStyle = "full" | "contained" | "small";

export interface BlogBodyBlock {
  id: string;
  type: BlogBodyBlockType;
  text?: string | null;
  heading?: string | null;
  items?: string[] | null;
  quoteAttribution?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  imageCaption?: string | null;
  imageCredit?: string | null;
  imageWidthStyle?: BlogImageWidthStyle | null;
  calloutTitle?: string | null;
  calloutTone?: "neutral" | "info" | "success" | "warning" | "critical" | null;
  statLabel?: string | null;
  statValue?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  tocLabel?: string | null;
  hideFromToc?: boolean | null;
}



export interface BlogComment {
  id: number;
  postSlug: string;
  displayName: string;
  commentText: string;
  createdAt: string;
}

export interface BlogEngagement {
  postSlug: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  likedByViewer: boolean;
  comments: BlogComment[];
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
  articleType?: BlogArticleType | null;
  featuredImageUrl?: string | null;
  featuredImageAlt?: string | null;
  featuredImageCaption?: string | null;
  featuredImageCredit?: string | null;
  primaryCategory?: string | null;
  secondaryCategories?: string[];
  authorBio?: string | null;
  bodyBlocks?: BlogBodyBlock[];
  seoTitle?: string | null;
  metaDescription?: string | null;
  socialImageUrl?: string | null;
  canonicalUrl?: string | null;
  source?: "static" | "portal";
  views?: number;
  likes?: number;
  commentCount?: number;
}

export type PortalBlogPublishStatus = "draft" | "published";

export type ReportScope = "Public" | "Internal_School";

export interface PortalBlogPostRecord {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string;
  category: string;
  author: string;
  role: string;
  publishedAt: string;
  readTime: string;
  readTimeMinutes?: number | null;
  tags: string[];
  sections: BlogPostSection[];
  bodyBlocks?: BlogBodyBlock[];
  mediaImageUrl: string | null;
  mediaVideoUrl: string | null;
  articleType?: BlogArticleType | null;
  featuredImageUrl?: string | null;
  featuredImageAlt?: string | null;
  featuredImageCaption?: string | null;
  featuredImageCredit?: string | null;
  primaryCategory?: string | null;
  secondaryCategories?: string[];
  authorBio?: string | null;
  seoTitle?: string | null;
  metaDescription?: string | null;
  socialImageUrl?: string | null;
  canonicalUrl?: string | null;
  publishStatus: PortalBlogPublishStatus;
  createdByUserId: number;
  createdByUserName: string;
  createdAt: string;
  updatedAt: string;
}

export type PortalUserRole =
  | "Staff"
  | "Volunteer"
  | "Admin"
  | "Accountant"
  | "Coach"
  | "DataClerk"
  | "SchoolLeader"
  | "Partner"
  | "Government"
  | "Auditor";

export type PortalUserStatus = "active" | "invited" | "deactivated";

export interface PortalUser {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: PortalUserRole;
  geographyScope: string | null;
  department: string | null;
  status: PortalUserStatus;
  mustChangePassword: boolean;
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
  targetId: number | string | null;
  payloadBefore: string | null;
  payloadAfter: string | null;
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

/* ─── Lesson Evaluation (Phonics Observation Form) ───────── */

export type LessonEvaluationDomainKey =
  | "gpc"
  | "blending"
  | "engagement";

export type LessonEvaluationItemKey =
  | "C1a"
  | "C1b"
  | "C1c"
  | "C2a"
  | "C2b"
  | "C2c"
  | "C2d"
  | "C2e"
  | "C2f"
  | "D1"
  | "D2"
  | "D3"
  | "D4";

export type LessonStructureItemKey = "LS1" | "LS2" | "LS3" | "LS4" | "LS5";

export type PostObservationRating =
  | "implemented_with_fidelity"
  | "partial_implementation"
  | "low_implementation";

export type LessonEvaluationGrade = "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "P7";
export type LessonEvaluationOverallLevel = "Exemplary" | "Good" | "Developing" | "Needs Support";

export interface LessonStructureItemInput {
  itemKey: LessonStructureItemKey;
  observed: boolean;
  note?: string | null;
}

export interface LessonEvaluationItemInput {
  domainKey: LessonEvaluationDomainKey;
  itemKey: LessonEvaluationItemKey;
  score: 1 | 2 | 3 | 4;
  note?: string | null;
}

export interface ActionPlanEntry {
  urgentAction: string;
  resourcesNeeded: string;
  reviewDate: string;
}

export interface LessonEvaluationInput {
  schoolId: number;
  teacherUid: string;
  grade: LessonEvaluationGrade;
  stream?: string | null;
  classSize?: number | null;
  lessonDate: string;
  lessonFocus: string[];
  lessonDurationMinutes?: number | null;
  observerId?: number | null;
  observerNameText?: string | null;
  visitId?: number | null;
  lessonStructure: LessonStructureItemInput[];
  items: LessonEvaluationItemInput[];
  strengthsList: string[];
  areasForDevelopmentList: string[];
  actionPlan?: ActionPlanEntry | null;
  postObservationRating?: PostObservationRating | null;
  strengthsText: string;
  priorityGapText: string;
  nextCoachingAction: string;
  teacherCommitment: string;
  catchupEstimateCount?: number | null;
  catchupEstimatePercent?: number | null;
  nextVisitDate?: string | null;
}

export interface LessonEvaluationRecord {
  id: number;
  schoolId: number;
  schoolName: string;
  district: string;
  teacherUid: string;
  teacherName: string;
  grade: LessonEvaluationGrade;
  stream: string | null;
  classSize: number | null;
  lessonDate: string;
  lessonFocus: string[];
  lessonDurationMinutes: number | null;
  observerId: number;
  observerName: string;
  observerNameText: string | null;
  visitId: number | null;
  overallScore: number;
  overallLevel: LessonEvaluationOverallLevel;
  domainScores: Record<LessonEvaluationDomainKey, number | null>;
  topGapDomain: LessonEvaluationDomainKey | null;
  topStrengthDomain: LessonEvaluationDomainKey | null;
  lessonStructure: LessonStructureItemInput[];
  strengthsList: string[];
  areasForDevelopmentList: string[];
  actionPlan: ActionPlanEntry | null;
  postObservationRating: PostObservationRating | null;
  strengthsText: string;
  priorityGapText: string;
  nextCoachingAction: string;
  teacherCommitment: string;
  catchupEstimateCount: number | null;
  catchupEstimatePercent: number | null;
  nextVisitDate: string | null;
  status: "active" | "void";
  items: LessonEvaluationItemInput[];
  createdAt: string;
  updatedAt: string;
}

export type TeacherImprovementStatus = "improved" | "flat" | "declined";

export interface TeacherImprovementDomainDelta {
  gpc: number | null;
  blending: number | null;
  engagement: number | null;
}

export interface TeacherImprovementItemDelta {
  itemKey: LessonEvaluationItemKey;
  prompt: string;
  baselineScore: number;
  comparisonScore: number;
  delta: number;
}

export interface TeacherImprovementTimelinePoint {
  evaluationId: number;
  lessonDate: string;
  visitId: number | null;
  grade: LessonEvaluationGrade;
  stream: string | null;
  overallScore: number;
  overallLevel: LessonEvaluationOverallLevel;
}

export interface TeacherImprovementComparison {
  teacherUid: string;
  teacherName: string;
  schoolId: number;
  schoolName: string;
  gradeFilter: string | null;
  firstEvaluationId: number;
  firstEvaluationDate: string;
  comparisonEvaluationId: number;
  comparisonEvaluationDate: string;
  latestEvaluationId: number;
  latestEvaluationDate: string;
  evaluationsCount: number;
  overallScoreBaseline: number;
  overallScoreComparison: number;
  overallScoreLatest: number;
  deltaOverall: number;
  domainDeltas: TeacherImprovementDomainDelta;
  improvedDomainsCount: number;
  improvementStatus: TeacherImprovementStatus;
  topImprovedItems: TeacherImprovementItemDelta[];
  stubbornGapItems: TeacherImprovementItemDelta[];
  timeline: TeacherImprovementTimelinePoint[];
}

export interface SchoolTeachingQualityImprovementSummary {
  schoolId: number;
  schoolName: string;
  teachersCompared: number;
  improvedTeachersCount: number;
  improvedTeachersPercent: number;
  averageOverallDelta: number | null;
  schoolImproved: boolean;
  topImprovingDomains: Array<{ domain: string; avgDelta: number }>;
  teachersNeedingSupport: Array<{
    teacherUid: string;
    teacherName: string;
    deltaOverall: number;
    improvementStatus: TeacherImprovementStatus;
  }>;
  teacherComparisons: TeacherImprovementComparison[];
}

export interface LearnerOutcomeTimelinePoint {
  period: string;
  sampleSize: number;
  decodingAvg: number | null;
  fluencyAvg: number | null;
  comprehensionAvg: number | null;
  nonReaderPct: number | null;
  cwpm20PlusPct: number | null;
}

export interface StoryParticipationTimelinePoint {
  period: string;
  sessionsCount: number;
  storiesPublished: number;
  anthologiesPublished: number;
  active: boolean;
}

export interface TeachingLearningAlignmentPoint {
  period: string;
  teachingQualityAvg: number | null;
  decodingAvg: number | null;
  fluencyAvg: number | null;
  comprehensionAvg: number | null;
  nonReaderPct: number | null;
  cwpm20PlusPct: number | null;
  storySessionsCount: number;
  storyPublishedCount: number;
  storyActiveSchoolsPct: number | null;
}

export interface TeachingLearningAlignmentSummary {
  teachingDelta: number | null;
  nonReaderReductionPp: number | null;
  cwpm20PlusDeltaPp: number | null;
  storyActiveLatest: boolean | null;
  storySessionsLatest: number;
}

export interface TeachingLearningAlignmentAggregate {
  caveat: string;
  points: TeachingLearningAlignmentPoint[];
  summary: TeachingLearningAlignmentSummary;
}

export interface TeacherImprovementProfile {
  teacherComparison: TeacherImprovementComparison | null;
  schoolSummary: SchoolTeachingQualityImprovementSummary;
  alignment: TeachingLearningAlignmentAggregate;
  teacherSupportStatus?: TeacherSupportStatus | null;
  teacherSupportAction?: string | null;
}

export interface SchoolSupportStatusRecord {
  id: number;
  schoolId: number;
  schoolName: string;
  district: string;
  periodKey: string;
  status: SchoolSupportStatus;
  recommendedActions: string[];
  metrics: Record<string, number | string | null>;
  rulesVersion: string;
  computedAt: string;
}

export interface TeacherSupportStatusRecord {
  id: number;
  schoolId: number;
  schoolName: string;
  district: string;
  teacherUid: string;
  teacherName: string;
  periodKey: string;
  status: TeacherSupportStatus;
  recommendedAction: string;
  evaluationsCount: number;
  metrics: Record<string, number | string | null>;
  rulesVersion: string;
  computedAt: string;
}

export type TrainingReportScopeType =
  | "training_session"
  | "month"
  | "quarter"
  | "fy"
  | "district"
  | "region"
  | "sub_region"
  | "country";

export interface TrainingReportFacts {
  factsVersion: string;
  scopeType: TrainingReportScopeType;
  scopeValue: string;
  scopeLabel: string;
  periodStart: string;
  periodEnd: string;
  trainingsCount: number;
  schoolsTrainedCount: number;
  participantsTotal: number;
  teachersTotal: number;
  leadersTotal: number;
  femaleTotal: number;
  maleTotal: number;
  teacherByClass: Array<{ classTaught: string; total: number }>;
  teacherBySubject: Array<{ subjectTaught: string; total: number }>;
  leadersByCategory: Array<{ category: string; total: number; female: number; male: number }>;
  geographyBreakdown: Array<{
    region: string;
    subRegion: string;
    district: string;
    trainingsCount: number;
    schoolsCount: number;
    participantsCount: number;
  }>;
  followUpPlans: Array<{
    trainingRecordId: number;
    trainingDate: string;
    schoolName: string;
    district: string;
    followUpDate: string | null;
    followUpType: string | null;
    followUpOwner: string | null;
  }>;
  feedback: {
    participantRows: number;
    trainerRows: number;
    changedTeachingRows: number;
    improveReadingRows: number;
    challengesRows: number;
    recommendationsRows: number;
    themes: Array<{ theme: string; mentions: number; sampleQuote: string | null }>;
  };
  observedAfterTraining?: {
    coachingVisitsCount: number;
    assessmentSessionsCount: number;
  } | null;
  approvedQuotes: Array<{
    quote: string;
    role: string | null;
    district: string | null;
    schoolName: string | null;
  }>;
}

export interface TrainingReportNarrative {
  narrativeVersion: string;
  generatedWithAi: boolean;
  sections: {
    summary: string;
    participation: string;
    whatWentWell: string;
    practiceChange: string;
    challengesAndRecommendations: string;
    followUpPlan: string;
    nextImprovements: string;
  };
}

export interface TrainingReportArtifactRecord {
  id: number;
  reportCode: string;
  scopeType: TrainingReportScopeType;
  scopeValue: string;
  periodStart: string;
  periodEnd: string;
  facts: TrainingReportFacts;
  narrative: TrainingReportNarrative;
  htmlReport: string;
  pdfStoredPath: string | null;
  generatedByUserId: number;
  generatedByName: string;
  generatedAt: string;
  updatedAt: string;
}

export type TrainingFeedbackRole = "participant" | "trainer";

export interface TrainingFeedbackRecord {
  id: number;
  trainingRecordId: number;
  schoolId: number;
  contactId: number | null;
  trainerUserId: number | null;
  feedbackRole: TrainingFeedbackRole;
  whatWentWell: string | null;
  howTrainingChangedTeaching: string | null;
  whatYouWillDoToImproveReadingLevels: string | null;
  challenges: string | null;
  recommendationsNextTraining: string | null;
  roleSnapshot: string | null;
  genderSnapshot: string | null;
  classTaughtSnapshot: string | null;
  submittedAt: string;
}

export interface TrainingReportRecord {
  id: number;
  reportCode: string;
  scopeType: string;
  scopeValue: string;
  periodStart: string;
  periodEnd: string;
  factsJson: string;
  narrativeJson: string;
  htmlReport: string;
  pdfStoredPath: string | null;
  generatedByUserId: number;
  generatedAt: string;
  updatedAt: string;
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

/* ─── NLIS Reading Levels ─────────────────────────── */

export interface ReadingLevelCycleDist {
  cycle: "baseline" | "progress" | "endline" | "latest";
  n: number;
  counts: Record<string, number>;
  percents: Record<string, number>;
}

export interface ReadingLevelGradeDist {
  grade: string;
  cycle: "baseline" | "progress" | "endline" | "latest";
  n: number;
  counts: Record<string, number>;
  percents: Record<string, number>;
}

export interface ReadingLevelTransition {
  from: string;
  to: string;
  count: number;
  percent: number;
}

export interface ReadingLevelMovementSummary {
  n_matched: number;
  moved_up_1plus_count: number;
  moved_up_1plus_percent: number;
  stayed_same_percent: number;
  moved_down_percent: number;
  top_transitions: ReadingLevelTransition[];
}

export interface ReadingLevelsBlock {
  definition_version: string;
  levels: Array<{ level: number; label: string }>;
  distribution: ReadingLevelCycleDist[];
  by_grade: ReadingLevelGradeDist[];
  movement: ReadingLevelMovementSummary | null;
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
  readingLevels?: ReadingLevelsBlock;
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
  gender?: "Male" | "Female";
  schoolId?: number;
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

export interface TeacherRosterInput {
  schoolId: number;
  fullName: string;
  gender: "Male" | "Female";
  isReadingTeacher: boolean;
  phone?: string;
}

export interface TeacherRosterRecord extends TeacherRosterInput {
  teacherUid: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export type SchoolContactCategory =
  | "Proprietor"
  | "Head Teacher"
  | "Deputy Head Teacher"
  | "DOS"
  | "Head Teacher Lower"
  | "Teacher"
  | "Administrator"
  | "Accountant";

export interface SchoolContactInput {
  schoolId: number;
  fullName: string;
  gender: "Male" | "Female" | "Other";
  phone?: string;
  email?: string;
  whatsapp?: string;
  category: SchoolContactCategory;
  roleTitle?: string;
  isPrimaryContact?: boolean;
  classTaught?: string;
  subjectTaught?: string;
  contactRecordType?: string;
  nickname?: string;
  leadershipRole?: boolean;
  subRole?: string;
  roleFormula?: string;
  lastSsaSent?: string;
  trainer?: boolean;
  notes?: string;
}

export interface SchoolContactRecord extends SchoolContactInput {
  contactId: number;
  contactUid: string;
  teacherUid: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LearnerRosterInput {
  schoolId: number;
  fullName: string;
  internalChildId?: string;
  gender: LearnerGender;
  age: number;
  classGrade: string;
  consentFlag?: boolean;
}

export interface LearnerRosterRecord extends LearnerRosterInput {
  learnerUid: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolLearnerInput {
  schoolId: number;
  learnerName: string;
  classGrade: string;
  age: number;
  gender: LearnerGender;
  internalChildId?: string;
}

export interface SchoolLearnerRecord extends SchoolLearnerInput {
  learnerId: number;
  learnerUid: string;
  createdAt: string;
  updatedAt: string;
}

export type AssessmentType = "baseline" | "progress" | "endline";
export type LearnerGender = "Boy" | "Girl" | "Other";
export type AssessmentComputedReadingLevel =
  | "Level0 Non-reader"
  | "Level1 Emergent"
  | "Level2 Minimum"
  | "Level3 Competent"
  | "Level4 Strong";
export type SchoolSupportStatus =
  | "Requires Remedial & Catch-Up"
  | "Progressing (Maintain + Strengthen)"
  | "Graduation Prep (Approaching criteria)"
  | "Graduation Eligible";
export type TeacherSupportStatus =
  | "Needs Catch-up Training"
  | "Needs Coaching & Follow-up"
  | "On Track";

export type MasteryDomainKey =
  | "phonemic_awareness"
  | "grapheme_phoneme_correspondence"
  | "blending_decoding"
  | "word_recognition_fluency"
  | "sentence_paragraph_construction"
  | "comprehension";

export type MasteryStatus = "green" | "amber" | "red";

export interface AssessmentMasteryDomainInput {
  domainScoreRaw?: number | null;
  domainAccuracy?: number | null;
  domainLatencyAvgMs?: number | null;
  domainAttemptsAvg?: number | null;
  domainSupportUsageRate?: number | null;
  domainMasteryStatus?: MasteryStatus | "Green" | "Amber" | "Red" | null;
}

export interface AssessmentItemResponseInput {
  domainKey: MasteryDomainKey;
  itemKey: string;
  accuracy: boolean | number;
  latencyMs?: number | null;
  attempts?: number | null;
  hintUsed?: boolean | null;
  correctionPromptUsed?: boolean | null;
  itemDifficulty?: string | null;
  gradeBand?: string | null;
  promptType?: string | null;
  audioSupportUsed?: boolean | null;
}

export type { ReadingLevel } from "@/lib/reading-assessment-utils";

export interface AssessmentRecordInput {
  childName: string;
  childId?: string;
  learnerUid?: string;
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
  fluencyAccuracyScore?: number | null;
  assessmentModelVersion?: string | null;
  benchmarkVersion?: string | null;
  scoringProfileVersion?: string | null;
  learnerExpectedGrade?: string | null;
  masteryDomainInputs?: Partial<Record<MasteryDomainKey, AssessmentMasteryDomainInput>>;
  masteryItemResponses?: AssessmentItemResponseInput[];
  notes?: string;
}

export interface AssessmentRecord extends AssessmentRecordInput {
  id: number;
  createdByUserId: number;
  createdAt: string;
  /** Auto-computed reading level based on domain scores */
  readingLevel?: import("@/lib/reading-assessment-utils").ReadingLevel;
  computedReadingLevel?: AssessmentComputedReadingLevel | null;
  computedLevelBand?: number | null;
  readingRulesVersion?: string | null;
  assessmentModelVersion?: string | null;
  readingStageLabel?: string | null;
  readingStageOrder?: number | null;
  benchmarkGradeLevel?: string | null;
  expectedVsActualStatus?: string | null;
  stageReasonCode?: string | null;
  stageReasonSummary?: string | null;
  masteryProfileSummaryJson?: string | null;
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
    schoolsStoryActive: number;
  };
}

export interface PublicImpactDomainAggregate {
  baseline: number | null;
  latest: number | null;
  endline: number | null;
  benchmarkPct: number | null;
  n: number;
}

export interface PublicTeachingQualitySummary {
  evaluationsCount: number;
  avgOverallScore: number | null;
  deltaOverall: number | null;
  improvedTeachersPercent: number | null;
  schoolsImprovedPercent: number | null;
  levelDistribution: {
    strong: { count: number; percent: number };
    good: { count: number; percent: number };
    developing: { count: number; percent: number };
    needsSupport: { count: number; percent: number };
  };
  domainAverages: {
    gpc: number | null;
    blending: number | null;
    engagement: number | null;
  };
  domainDeltas: {
    gpc: number | null;
    blending: number | null;
    engagement: number | null;
  };
  trend: Array<{
    period: string;
    averageScore: number | null;
    evaluations: number;
  }>;
  topCoachingFocusAreas: string[];
  lastUpdated: string;
}

export interface PublicImpactAggregate {
  scope: {
    level: "country" | "region" | "subregion" | "district" | "school";
    id: string;
    name: string;
    parent?: string;
  };
  period: {
    label: string;
    startDate: string | null;
    endDate: string | null;
  };
  kpis: {
    schoolsSupported: number;
    subCountiesReached: number;
    totalBooksRead: number;
    teachersSupportedMale: number;
    teachersSupportedFemale: number;
    onlineLiveSessionsCovered: number;
    onlineTeachersSupported: number;
    onlineSchoolsReachedCount: number;
    learnersDirectlyImpacted: number;
    enrollmentEstimatedReach: number;
    learnersAssessedUnique: number;
    learnersReachedEstimated: number;
    coachingVisitsCompleted: number;
    assessmentCycleCompletionPct: number;
    assessmentsBaselineCount: number;
    assessmentsProgressCount: number;
    assessmentsEndlineCount: number;
    recordedLessonsViews?: number;
    recordedLessonsCertificates?: number;
    trainingSessionsCount: number;
    teachersTrainedTotal: number;
    teachersTrainedMale: number;
    teachersTrainedFemale: number;
    schoolLeadersTrained: number;
    schoolLeadersTrainedMale: number;
    schoolLeadersTrainedFemale: number;
    certificatesIssued: number;
  };
  outcomes: {
    letterNames: PublicImpactDomainAggregate;
    letterSounds: PublicImpactDomainAggregate;
    realWords: PublicImpactDomainAggregate;
    madeUpWords: PublicImpactDomainAggregate;
    storyReading: PublicImpactDomainAggregate;
    comprehension: PublicImpactDomainAggregate;
  };
  financials?: {
    totalUgxReceived: number;
    totalUsdEquivalent: number;
  };
  masteryDomains?: Record<
    MasteryDomainKey,
    {
      green: { count: number; percent: number };
      amber: { count: number; percent: number };
      red: { count: number; percent: number };
      n: number;
    }
  >;
  readingStageDistribution?: Array<{
    label: string;
    order: number;
    count: number;
    percent: number;
  }>;
  benchmarkStatus?: {
    belowExpected: { count: number; percent: number };
    atExpected: { count: number; percent: number };
    aboveExpected: { count: number; percent: number };
    n: number;
  };
  publicExplanation?: {
    green: string;
    amber: string;
    red: string;
  };
  funnel: {
    trained: number;
    coached: number;
    baselineAssessed: number;
    endlineAssessed: number;
    storyActive: number;
  };
  fidelity: {
    score: number;
    band: FidelityBand;
    drivers: Array<{ key: string; label: string; score: number }>;
  };
  rankings: {
    mostImproved: Array<{ name: string; score: number }>;
    prioritySupport: Array<{ name: string; score: number }>;
    mostActive: Array<{ name: string; score: number }>;
    atRisk?: Array<{
      name: string;
      schoolId: number;
      riskScore: number;
      daysSinceLastVisit: number | null;
      riskFactors: string[];
    }>;
  };
  teachingQuality: PublicTeachingQualitySummary;
  teachingLearningAlignment: TeachingLearningAlignmentAggregate;
  readingLevels?: ReadingLevelsBlock;
  readingLevelAverages?: {
    method: "school_average";
    scopeAveragePercent: number | null;
    scopeLevels: Array<{
      label: string;
      percent: number;
    }>;
    districtAverages: Array<{
      district: string;
      averagePercent: number;
      schoolCount: number;
      sampleSize: number;
      levels: Array<{
        label: string;
        percent: number;
      }>;
    }>;
  };
  meta: {
    lastUpdated: string;
    dataCompleteness: "Complete" | "Partial";
    sampleSize: number;
  };
  navigator: {
    regions: string[];
    subRegions: string[];
    districts: string[];
    schools: Array<{
      id: number;
      name: string;
      district: string;
      subRegion: string;
      region: string;
    }>;
  };
  cohortProgression?: {
    matchedLearners: number;
    avgBaselineComposite: number | null;
    avgProgressComposite: number | null;
    avgEndlineComposite: number | null;
    compositeDelta: number | null;
    byGrade: Array<{
      grade: string;
      n: number;
      baselineAvg: number | null;
      endlineAvg: number | null;
      delta: number | null;
    }>;
  };
  trainingOutcomeCorrelation?: {
    trainedSchools: { count: number; avgScoreDelta: number | null };
    untrainedSchools: { count: number; avgScoreDelta: number | null };
    lift: number | null;
  };
  donorImpact?: {
    totalSponsorships: number;
    totalDonations: number;
    linkedSchoolsCount: number;
    fundedDistrictsCount: number;
    sponsorships: Array<{
      reference: string;
      donorName: string;
      amount: number;
      currency: string;
      targetType: string;
      targetName: string;
    }>;
  };
  generatedAt?: string;
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

export interface EventRegistrationContactInput {
  fullName: string;
  role: string;
  gender: "Male" | "Female" | "";
  phone?: string;
  email?: string;
}

export interface EventRegistrationInput {
  eventId: number;
  schoolName: string;
  district: string;
  region?: string;
  subRegion?: string;
  subCounty?: string;
  parish?: string;
  contacts: EventRegistrationContactInput[];
}

export interface EventParticipantRecord {
  id: number;
  sessionId: number;
  schoolId: number;
  schoolName: string;
  contactsRegistered: number;
}

export interface PortalUserAdminRecord extends PortalUser {
  createdAt: string;
  invitedAt: string | null;
  lastLoginAt: string | null;
}

export type PortalRecordModule = "training" | "visit" | "assessment" | "story" | "story_activity";
export type PortalRecordStatus = "Draft" | "Submitted" | "Returned" | "Approved";
export type TrainingFollowUpType = "virtual_check_in" | "school_visit" | "refresher_session";

export interface PortalRecordPayload {
  [key: string]:
    | string
    | number
    | boolean
    | string[]
    | Array<Record<string, unknown>>
    | Record<string, unknown>
    | null
    | undefined;
}

export interface PortalRecordInput {
  module: PortalRecordModule;
  date: string;
  district: string;
  schoolId: number | null;
  schoolName: string;
  programType?: string;
  followUpDate?: string;
  followUpType?: TrainingFollowUpType;
  followUpOwnerUserId?: number;
  status: PortalRecordStatus;
  payload: PortalRecordPayload;
}

export interface PortalRecord extends Omit<PortalRecordInput, "schoolId"> {
  id: number;
  schoolId: number | null;
  recordCode: string;
  createdByUserId: number;
  createdByName: string;
  followUpOwnerName?: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  deletedByUserId: number | null;
  deleteReason: string | null;
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

export type ActivityInsightActivityType =
  | "training"
  | "visit"
  | "assessment"
  | "lesson_evaluation"
  | "story_activity";

export type ActivityInsightScopeType =
  | "school"
  | "district"
  | "region"
  | "subregion"
  | "country";

export type ActivityRecommendationPriority = "high" | "medium" | "low";

export interface ActivityInsightRecord {
  insightsId: number;
  activityType: ActivityInsightActivityType;
  activityId: number;
  scopeType: ActivityInsightScopeType;
  scopeId: string;
  keyFindings: string | null;
  whatWentWell: string | null;
  challenges: string | null;
  conclusionsNextSteps: string | null;
  createdByUserId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityRecommendationRecord {
  recLinkId: number;
  insightsId: number;
  recId: string;
  priority: ActivityRecommendationPriority;
  notes: string | null;
}

export interface SchoolInsightsRollupRecord {
  schoolId: number;
  lastUpdated: string | null;
  latestFindings: string;
  openActions: string;
  recommendationIds: string[];
}

export interface DashboardKpis {
  trainingsLogged: number;
  schoolVisits: number;
  assessments: number;
  storyActivities: number;
  learnersReached: number;
  schoolsImplementingPercent: number;
  schoolsNotImplementingPercent: number;
  demoVisitsConducted: number;
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

export type StorySessionType = "upload" | "review" | "editing" | "feedback";

export interface StoryActivityInput {
  schoolId: number;
  date: string;
  sessionType: StorySessionType;
  learnersCount: number;
  draftsCount: number;
  revisionsCount: number;
  notes?: string;
}

export interface StoryActivityRecord extends StoryActivityInput {
  id: number;
  recordCode: string;
  createdByUserId: number;
  createdByName: string;
  createdAt: string;
}

/* ─── NLIS Support Requests ───────────────────────── */

export type SupportRequestStatus = "New" | "Contacted" | "Scheduled" | "Delivered" | "Closed";
export type SupportType =
  | "phonics training"
  | "coaching visit"
  | "learner assessment"
  | "remedial & catch-up support"
  | "1001 story";
export type SupportRequestUrgency = "low" | "medium" | "high" | "this_term" | "next_term";

export interface SupportRequestInput {
  schoolId?: number;
  locationText?: string;
  contactName: string;
  contactRole: string;
  contactInfo: string;
  supportTypes: SupportType[];
  urgency: SupportRequestUrgency;
  message: string;
}

export interface SupportRequestRecord extends SupportRequestInput {
  id: number;
  status: SupportRequestStatus;
  assignedStaffId?: number;
  assignedStaffName?: string;
  followUpStarted?: boolean;
  followUpNotes?: string;
  createdAt: string;
}

export type ConceptNoteRequesterType = "school" | "partner_donor";
export type ConceptNoteRequestStatus = "new" | "in_review" | "responded" | "closed";
export type ConceptNoteOwnerTeam = "support" | "partnerships";

export interface ConceptNoteRequestInput {
  requesterType: ConceptNoteRequesterType;
  sourcePage?: string;
  region?: string;
  subRegion?: string;
  district?: string;
  payload: Record<string, unknown>;
}

export interface ConceptNoteRequestRecord extends ConceptNoteRequestInput {
  id: number;
  requestId: string;
  status: ConceptNoteRequestStatus;
  submittedByUserId?: number;
  assignedOwnerUserId?: number;
  assignedOwnerTeam: ConceptNoteOwnerTeam;
  submittedAt: string;
}

/* ─── Finance Module ─────────────────────────────── */

export type FinanceCategory =
  | "Donation"
  | "Training"
  | "School Coaching visits and Follow Up"
  | "Assessment"
  | "Contracts"
  | "Sponsorship"
  | "Expense";
export type FinanceContactType = "donor" | "partner" | "sponsor" | "other";
export type FinanceCurrency = "UGX" | "USD";
export type FinanceInvoiceStatus =
  | "draft"
  | "sent"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "void";
export type FinanceReceiptStatus = "draft" | "issued" | "void";
export type FinancePostedStatus = "draft" | "posted" | "void";
export type FinanceExpenseStatus = "draft" | "submitted" | "posted" | "blocked_mismatch" | "void";
export type FinancePaymentMethod =
  | "cash"
  | "bank_transfer"
  | "mobile_money"
  | "cheque"
  | "other";
export type FinanceTransactionType = "money_in" | "money_out";
export type FinanceTransactionSourceType = "receipt" | "invoice_payment" | "expense" | "adjustment";

export interface FinanceContactInput {
  name: string;
  emails: string[];
  phone?: string;
  address?: string;
  contactType: FinanceContactType;
}

export interface FinanceContactRecord extends FinanceContactInput {
  id: number;
  createdAt: string;
}

export interface FinanceInvoiceLineItemInput {
  description: string;
  qty: number;
  unitPrice: number;
}

export interface FinanceInvoiceLineItemRecord extends FinanceInvoiceLineItemInput {
  id: number;
  amount: number;
}

export interface FinanceInvoiceInput {
  contactId: number;
  category: Exclude<FinanceCategory, "Expense">;
  issueDate: string;
  dueDate: string;
  currency: FinanceCurrency;
  lineItems: FinanceInvoiceLineItemInput[];
  tax?: number;
  notes?: string;
}

export interface FinanceInvoiceRecord extends FinanceInvoiceInput {
  lineItems: FinanceInvoiceLineItemRecord[];
  id: number;
  invoiceNumber: string;
  contactName?: string;
  contactType?: FinanceContactType;
  subtotal: number;
  total: number;
  paidAmount: number;
  balanceDue: number;
  status: FinanceInvoiceStatus;
  voidReason?: string;
  pdfFileId?: number;
  pdfUrl?: string;
  emailedAt?: string;
  lastSentTo?: string;
  createdBy: number;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  linkedReceipt?: {
    id: number;
    receiptNumber: string;
    status: FinanceReceiptStatus;
    amountReceived: number;
    receiptDate: string;
    pdfFileId?: number;
    pdfUrl?: string;
    emailedAt?: string;
    lastSentTo?: string;
  };
}

export interface FinanceReceiptInput {
  contactId: number;
  category: Exclude<FinanceCategory, "Expense">;
  receivedFrom: string;
  receiptDate: string;
  currency: FinanceCurrency;
  amountReceived: number;
  paymentMethod: FinancePaymentMethod;
  referenceNo?: string;
  relatedInvoiceId?: number;
  description?: string;
  notes?: string;
  /* Restricted/earmarked */
  restrictedFlag?: boolean;
  restrictedProgram?: FinanceRestrictedProgram;
  restrictedGeoScope?: FinanceRestrictedGeoScope;
  restrictedGeoId?: number;
  restrictionNotes?: string;
}

export interface FinanceReceiptRecord extends FinanceReceiptInput {
  id: number;
  receiptNumber: string;
  status: FinanceReceiptStatus;
  voidReason?: string;
  pdfFileId?: number;
  pdfUrl?: string;
  emailedAt?: string;
  lastSentTo?: string;
  createdBy: number;
  createdByName?: string;
  createdAt: string;
}

export interface FinancePaymentInput {
  relatedInvoiceId: number;
  date: string;
  amount: number;
  method: FinancePaymentMethod;
  reference?: string;
  notes?: string;
}

export interface FinancePaymentRecord extends FinancePaymentInput {
  id: number;
  currency: FinanceCurrency;
  status: FinancePostedStatus;
  voidReason?: string;
  createdBy: number;
  createdByName?: string;
  createdAt: string;
}

export interface FinanceExpenseInput {
  vendorName: string;
  date: string;
  subcategory?: string;
  amount: number;
  currency: FinanceCurrency;
  paymentMethod: FinancePaymentMethod;
  description: string;
  notes?: string;
  /* Restricted/earmarked */
  restrictedFlag?: boolean;
  restrictedProgram?: FinanceRestrictedProgram;
  restrictedGeoScope?: FinanceRestrictedGeoScope;
  restrictedGeoId?: number;
  restrictionNotes?: string;
}

export interface FinanceExpenseRecord extends FinanceExpenseInput {
  id: number;
  expenseNumber: string;
  category: "Expense";
  status: FinanceExpenseStatus;
  voidReason?: string;
  submittedAt?: string;
  submittedBy?: number;
  submittedByName?: string;
  postedAt?: string;
  postedBy?: number;
  postedByName?: string;
  mismatchOverrideReason?: string;
  mismatchOverrideBy?: number;
  mismatchOverrideByName?: string;
  mismatchOverrideAt?: string;
  createdBy: number;
  createdByName?: string;
  createdAt: string;
}

export interface FinanceExpenseReceiptRecord {
  id: number;
  expenseId: number;
  fileId: number;
  fileUrl: string;
  fileName?: string;
  fileHashSha256: string;
  vendorName: string;
  receiptDate: string;
  receiptAmount: number;
  currency: FinanceCurrency;
  referenceNo?: string;
  uploadedBy: number;
  uploadedByName?: string;
  uploadedAt: string;
}

export interface FinanceFileRecord {
  id: number;
  sourceType: FinanceTransactionSourceType | "payment_evidence" | "invoice_pdf" | "receipt_pdf" | "statement_pdf";
  sourceId: number;
  fileName: string;
  storedPath: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: number;
  createdAt: string;
  signedUrl?: string;
}

export interface FinanceLedgerTransactionRecord {
  id: number;
  txnType: FinanceTransactionType;
  category: FinanceCategory;
  subcategory?: string;
  date: string;
  currency: FinanceCurrency;
  amount: number;
  counterpartyContactId?: number;
  counterpartyName?: string;
  sourceType: FinanceTransactionSourceType;
  sourceId: number;
  notes?: string;
  evidenceFiles: FinanceFileRecord[];
  postedStatus: FinancePostedStatus;
  postedAt?: string;
  voidReason?: string;
  createdBy: number;
  createdByName?: string;
  createdAt: string;
  /* Restricted/earmarked */
  restrictedFlag?: boolean;
  restrictedProgram?: FinanceRestrictedProgram;
  restrictedGeoScope?: FinanceRestrictedGeoScope;
  restrictedGeoId?: number;
  restrictionNotes?: string;
}

export interface FinanceMonthlyStatementRecord {
  id: number;
  month: string;
  periodType: "monthly" | "quarterly" | "fiscal_year";
  currency: FinanceCurrency;
  totalMoneyIn: number;
  totalMoneyOut: number;
  net: number;
  breakdownByCategory: Record<FinanceCategory, number>;
  generatedAt: string;
  generatedBy: number;
  generatedByName?: string;
  pdfFileId?: number;
  pdfUrl?: string;
  balanceSheetPdfFileId?: number;
  statementOfFinancialPositionPdfFileId?: number;
  incomeStatementPdfFileId?: number;
  balanceSheetPdfUrl?: string;
  statementOfFinancialPositionPdfUrl?: string;
  incomeStatementPdfUrl?: string;
}

export interface FinanceSettingsRecord {
  fromEmail: string | null;
  ccFinanceEmail: string | null;
  invoicePrefix: string;
  receiptPrefix: string;
  expensePrefix: string;
  categorySubcategories: Record<string, string[]>;
  invoiceEmailTemplate: string;
  receiptEmailTemplate: string;
  paymentInstructions: string;
  cashThresholdUgx: number;
  cashThresholdUsd: number;
  backdateDaysLimit: number;
  allowReceiptMismatchOverride: boolean;
  allowReceiptReuseOverride: boolean;
  outlierMultiplier: number;
}

export type FinanceAuditExceptionSeverity = "low" | "medium" | "high";
export type FinanceAuditExceptionStatus = "open" | "acknowledged" | "resolved" | "overridden";

export interface FinanceAuditExceptionRecord {
  id: number;
  entityType: "expense" | "receipt" | "invoice" | "payment" | "ledger";
  entityId: number;
  severity: FinanceAuditExceptionSeverity;
  ruleCode: string;
  message: string;
  status: FinanceAuditExceptionStatus;
  amount?: number;
  currency?: FinanceCurrency;
  createdBy?: number;
  createdByName?: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: number;
  resolvedByName?: string;
  resolutionNotes?: string;
}

export interface FinanceTxnRiskScoreRecord {
  id: number;
  entityType: "expense" | "receipt" | "invoice" | "payment" | "ledger";
  entityId: number;
  riskScore: number;
  signals: string[];
  computedAt: string;
}

export interface FinanceReceiptRegistryRecord {
  id: number;
  expenseId: number;
  expenseNumber?: string;
  expenseStatus?: FinanceExpenseStatus;
  fileId: number;
  fileUrl: string;
  fileName?: string;
  fileHashSha256: string;
  vendorName: string;
  receiptDate: string;
  receiptAmount: number;
  currency: FinanceCurrency;
  referenceNo?: string;
  uploadedBy: number;
  uploadedByName?: string;
  uploadedAt: string;
  flags: string[];
}

export interface FinanceAuditComplianceCheckRecord {
  ruleCode: string;
  title: string;
  severity: FinanceAuditExceptionSeverity;
  openCount: number;
}

export interface FinanceAuditRunSummary {
  checkedAt: string;
  checkedExpenses: number;
  checkedLedgerEntries: number;
  checkedIncomeRecords: number;
  exceptionsCreated: number;
  riskScoresUpdated: number;
}

export interface FinanceDashboardSummary {
  month: string;
  currency: FinanceCurrency;
  moneyIn: number;
  moneyOut: number;
  net: number;
  outstandingInvoiceCount: number;
  outstandingInvoiceTotal: number;
  categoryBreakdown: Record<Exclude<FinanceCategory, "Expense">, number>;
}

export interface FinanceEmailLogEntry {
  id: number;
  recordType: "invoice" | "receipt";
  recordId: number;
  toEmail: string;
  ccEmail: string | null;
  subject: string;
  status: "sent" | "failed" | "skipped";
  providerMessage: string | null;
  createdBy: number;
  createdAt: string;
}

/* ── Reconciliation ── */
export type FinanceStatementAccountType = "bank" | "cash" | "mobile_money";
export type FinanceMatchStatus = "unmatched" | "matched" | "partial";

export interface FinanceStatementLineInput {
  accountType: FinanceStatementAccountType;
  date: string;
  amount: number;
  currency: FinanceCurrency;
  reference?: string;
  description?: string;
}

export interface FinanceStatementLineRecord extends FinanceStatementLineInput {
  id: number;
  matchStatus: FinanceMatchStatus;
  matchedAmount: number;
  createdBy: number;
  createdAt: string;
}

export interface FinanceReconciliationMatchRecord {
  id: number;
  statementLineId: number;
  ledgerTxnId: number;
  matchedAmount: number;
  createdBy: number;
  createdAt: string;
}

export interface FinanceReconciliationSummary {
  month: string;
  currency: FinanceCurrency;
  statementTotal: number;
  ledgerTotal: number;
  matchedTotal: number;
  unmatchedStatementCount: number;
  unmatchedLedgerCount: number;
}

/* ── Payment Allocation ── */
export interface FinancePaymentAllocationRecord {
  id: number;
  paymentId: number;
  invoiceId: number;
  allocatedAmount: number;
  invoiceNumber?: string;
  createdBy: number;
  createdAt: string;
}

/* ── Budgets ── */
export interface FinanceBudgetMonthlyInput {
  month: string;
  currency: FinanceCurrency;
  subcategory: string;
  budgetAmount: number;
}

export interface FinanceBudgetMonthlyRecord extends FinanceBudgetMonthlyInput {
  id: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceBudgetVsActualLine {
  subcategory: string;
  budgetAmount: number;
  actualAmount: number;
  variance: number;
  variancePct: number | null;
}

/* ── Restricted/Earmarked Funds ── */
export type FinanceRestrictedProgram =
  | "phonics"
  | "coaching"
  | "assessments"
  | "story_project"
  | "general";

export type FinanceRestrictedGeoScope =
  | "country"
  | "region"
  | "subregion"
  | "district"
  | "school";

export interface FinanceRestrictionMetadata {
  restrictedFlag: boolean;
  restrictedProgram?: FinanceRestrictedProgram;
  restrictedGeoScope?: FinanceRestrictedGeoScope;
  restrictedGeoId?: number;
  restrictionNotes?: string;
}

export interface FinanceRestrictedBalanceLine {
  program: FinanceRestrictedProgram;
  geoScope?: string;
  geoId?: number;
  geoName?: string;
  totalIn: number;
  totalOut: number;
  remaining: number;
  currency: FinanceCurrency;
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
  lessonEvaluations: number;
  teacherAssessments: number;
  teacherObservationAverage: number | null;
  teacherObservationCount: number;
  learnerAssessments: number;
  implementationStartedVisits: number;
  implementationNotStartedVisits: number;
  implementationPartialVisits: number;
  demoVisits: number;
  latestImplementationStatus: "started" | "not_started" | "partial" | null;
  latestVisitPathway: "observation" | "demo_and_meeting" | "mixed" | null;
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
  lessonEvaluations: number;
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

export interface PortalTrainingActivityReportRow {
  recordId: number;
  recordCode: string;
  date: string;
  country: string;
  region: string | null;
  subRegion: string | null;
  district: string;
  subCounty?: string | null;
  parish?: string | null;
  village?: string | null;
  location: string;
  trainingName: string;
  trainingStatus: string;
  trainingType: string | null;
  audience: string | null;
  schoolsAttended: number;
  participantsTotal: number;
  teachersFemale: number;
  teachersMale: number;
  leadersFemale: number;
  leadersMale: number;
  trainerName: string;
  fundedBy: string | null;
}

export interface PortalVisitActivityReportRow {
  visitId: number;
  recordCode: string;
  date: string;
  country: string;
  region: string | null;
  subRegion: string | null;
  district: string;
  subCounty?: string | null;
  parish?: string | null;
  village?: string | null;
  schoolId: number;
  schoolCode: string;
  schoolName: string;
  location: string;
  visitType: string;
  implementationStatus: "started" | "not_started" | "partial";
  visitPathway: "observation" | "demo_and_meeting" | "mixed";
  focusAreas: string;
  coachName: string;
  followUpDate: string | null;
  fundedBy: string | null;
}

export interface PortalEvaluationActivityReportRow {
  evaluationId: number;
  date: string;
  country: string;
  region: string | null;
  subRegion: string | null;
  district: string;
  subCounty?: string | null;
  parish?: string | null;
  village?: string | null;
  schoolId: number;
  schoolCode: string;
  schoolName: string;
  teacherName: string;
  grade: string;
  stream: string | null;
  classSize: number | null;
  overallScore: number;
  overallLevel: string;
  topStrengthDomain: string | null;
  topGapDomain: string | null;
  nextCoachingAction: string;
  observerName: string;
  nextVisitDate: string | null;
  fundedBy: string | null;
}

export interface PortalAssessmentActivityReportRow {
  sessionId: number;
  recordCode: string;
  date: string;
  country: string;
  region: string | null;
  subRegion: string | null;
  district: string;
  subCounty?: string | null;
  parish?: string | null;
  village?: string | null;
  schoolId: number;
  schoolCode: string;
  schoolName: string;
  assessmentType: string;
  classGrade: string;
  learnersAssessed: number;
  averageLetterSounds: number | null;
  averageDecoding: number | null;
  averageFluency: number | null;
  averageComprehension: number | null;
  assessorName: string;
  fundedBy: string | null;
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
    lessonEvaluations: number;
    teacherAssessments: number;
    learnerAssessments: number;
    schoolsWithContacts: number;
    teacherObservationCount: number;
    schoolsImplementingPercent: number;
    schoolsNotImplementingPercent: number;
    schoolsWithImplementationData: number;
    implementationStartedVisits: number;
    implementationNotStartedVisits: number;
    implementationPartialVisits: number;
    demoVisitsConducted: number;
  };
  districts: PortalDistrictReportSummary[];
  schools: PortalSchoolReportRow[];
  observationEvents: PortalObservationEvent[];
  trainingActivities: PortalTrainingActivityReportRow[];
  visitActivities: PortalVisitActivityReportRow[];
  evaluationActivities: PortalEvaluationActivityReportRow[];
  assessmentActivities: PortalAssessmentActivityReportRow[];
}

export interface SchoolDirectoryInput {
  name: string;
  country?: string;
  district: string;
  subCounty?: string;
  parish?: string;
  village?: string;
  notes?: string;
  alternateSchoolNames?: string;
  schoolStatus?: string;
  schoolStatusDate?: string;
  currentPartnerType?: string;
  yearFounded?: number;
  clientSchoolNumber?: number;
  metricCount?: number;
  runningTotalMaxEnrollment?: number;
  currentPartnerSchool?: boolean;
  schoolActive?: boolean;
  enrollmentTotal?: number;
  enrollmentByGrade?: string;
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
  contactName?: string;
  contactPhone?: string;
}

export interface SchoolDirectoryRecord {
  id: number;
  schoolUid: string;
  schoolCode: string;
  /** Ministry of Education identifier (EMIS) — user-entered, optional. */
  schoolExternalId: string | null;
  name: string;
  country: string;
  region: string;
  subRegion: string;
  district: string;
  subCounty: string;
  parish: string;
  village: string | null;
  alternateSchoolNames: string | null;
  schoolStatus: string;
  schoolStatusDate: string | null;
  currentPartnerType: string;
  yearFounded: number | null;

  clientSchoolNumber: number;
  metricCount: number;
  runningTotalMaxEnrollment: number;
  currentPartnerSchool: boolean;
  schoolActive: boolean;
  enrollmentTotal: number;
  enrollmentByGrade: string | null;
  enrolledBoys: number;
  enrolledGirls: number;
  enrolledLearners: number;
  directImpactLearners: number;
  classesJson: string | null;
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
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  primaryContactId: number | null;
  primaryContactName: string | null;
  primaryContactCategory: SchoolContactCategory | null;
  programStatus: "active" | "graduated" | "paused" | "monitoring";
  graduatedAt: string | null;
  graduatedByUserId: number | null;
  graduationNotes: string | null;
  graduationVersion: string | null;
  createdAt: string;
}

export type SchoolAccountModuleKey =
  | "contacts"
  | "trainings"
  | "onlineTrainings"
  | "visits"
  | "assessments"
  | "teacherEvaluations";

export interface SchoolAccountRelatedCounts {
  contacts: number;
  trainings: number;
  onlineTrainings: number;
  visits: number;
  assessments: number;
  teacherEvaluations: number;
}

export interface SchoolAccountRecentItem {
  id: number;
  module: Exclude<SchoolAccountModuleKey, "contacts">;
  title: string;
  subtitle: string | null;
  date: string | null;
  status: string | null;
  href: string;
}

export interface SchoolAccountProfileSummary {
  dateOfLastActivity: string | null;
  dateOfLastStaffVisit: string | null;
  lastMetricsDate: string | null;
  schoolVisitsThisFy: number;
  schoolVisitsLastFy: number;
}

export interface SchoolAccountProgressSnapshot {
  learnersAssessed: number;
  storyReadingAvg: number | null;
  comprehensionAvg: number | null;
  onBenchmarkPct: number | null;
  fluentReaderPct: number | null;
  latestReadingStage: string | null;
}

export interface SchoolAccountProfile {
  school: SchoolDirectoryRecord;
  contacts: SchoolContactRecord[];
  counts: SchoolAccountRelatedCounts;
  recentTrainings: SchoolAccountRecentItem[];
  recentInteractions: SchoolAccountRecentItem[];
  summary: SchoolAccountProfileSummary;
  progress?: SchoolAccountProgressSnapshot | null;
}

export type GraduationDomainKey =
  | "letter_sounds"
  | "decoding"
  | "fluency"
  | "comprehension";

export type GraduationAssessmentCycleMode = "latest_or_endline" | "latest" | "endline";

export interface GraduationSettingsRecord {
  graduationEnabled: boolean;
  targetDomainProficiencyPct: number;
  requiredDomains: GraduationDomainKey[];
  requiredReadingLevel: "Non-Reader" | "Emerging" | "Developing" | "Transitional" | "Fluent";
  requiredFluentPct: number;
  minPublishedStories: number;
  targetTeachingQualityPct: number;
  requireTeachingDomains: boolean;
  latestAssessmentRequired: boolean;
  latestEvaluationRequired: boolean;
  assessmentCycleMode: GraduationAssessmentCycleMode;
  dismissSnoozeDays: number;
  criteriaVersion: string;
  updatedAt: string | null;
  /* ── Evidence gates (V2) ── */
  minLearnersAssessedN: number;
  targetGrades: string[];
  minTeacherEvaluationsTotal: number;
  minEvaluationsPerReadingTeacher: number;
  dataCompletenessThreshold: number;
  /* ── Sustainability validation (V2) ── */
  requireSustainabilityValidation: boolean;
  sustainabilityChecklistItems: string[];
}

export interface GraduationEligibilityDomainMetric {
  key: GraduationDomainKey;
  label: string;
  proficiencyPct: number | null;
  targetPct: number;
  sampleSize: number;
  met: boolean;
}

export type GraduationSustainabilityStatus =
  | "not_required"
  | "pending"
  | "first_pass"
  | "validated";

export interface GraduationEligibilityScorecard {
  domainsOk: boolean;
  domainsValues: GraduationEligibilityDomainMetric[];
  readingLevelsOk: boolean;
  fluentPct: number | null;
  requiredFluentPct: number;
  readingSampleSize: number;
  storiesOk: boolean;
  publishedStoryCount: number;
  requiredStories: number;
  teachingOk: boolean;
  teachingQualityPct: number | null;
  requiredTeachingQualityPct: number;
  teachingEvaluationsCount: number;
  /* ── Evidence gates (V2) ── */
  evidenceGatesOk: boolean;
  learnersAssessedCount: number;
  requiredLearnersAssessedN: number;
  teacherEvaluationsTotalCount: number;
  requiredTeacherEvaluationsTotal: number;
  perTeacherEvaluationsOk: boolean;
  dataCompletenessPct: number | null;
  requiredDataCompletenessPct: number;
  /* ── Sustainability (V2) ── */
  sustainabilityValidationStatus: GraduationSustainabilityStatus;
  validationPassCount: number;
}

export type GraduationWorkflowState =
  | "pending"
  | "kept_supporting"
  | "needs_review"
  | "graduated"
  | "monitoring";

export interface GraduationEligibilityRecord {
  schoolId: number;
  schoolName: string;
  district: string;
  subRegion: string;
  region: string;
  programStatus: "active" | "graduated" | "paused" | "monitoring";
  isEligible: boolean;
  eligibilityScorecard: GraduationEligibilityScorecard;
  missingDataFlags: string[];
  workflowState: GraduationWorkflowState;
  snoozedUntil: string | null;
  assignedSupervisorUserId: number | null;
  assignedSupervisorName: string | null;
  workflowReason: string | null;
  graduatedAt: string | null;
  graduationVersion: string | null;
  computedAt: string;
  lastUpdatedSource: string | null;
  /* ── Checklist (V2) ── */
  checklistCompleted: boolean;
  checklistAnswers: Record<string, boolean> | null;
}

export interface GraduationQueueSummary {
  eligibleCount: number;
  updatedAt: string | null;
  items: GraduationEligibilityRecord[];
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
  schoolId: number | null;
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
  moderationStatus: "pending" | "approved" | "hidden";
  sourceType: "manual" | "training_feedback";
  sourceTrainingFeedbackId: number | null;
  sourceTrainingRecordId: number | null;
  quoteField: string | null;
  createdByUserId: number;
  createdByName: string;
  createdAt: string;
}

export type AboutTeamSection = "board" | "staff" | "volunteer";

export interface PortalLeadershipTeamMemberRecord {
  id: number;
  section: AboutTeamSection;
  name: string;
  role: string;
  about: string;
  photoFileName: string | null;
  photoStoredPath: string | null;
  photoMimeType: string | null;
  photoSizeBytes: number | null;
  sortOrder: number;
  isPublished: boolean;
  createdByUserId: number;
  createdByName: string;
  updatedByUserId: number;
  updatedByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface PortalCoreValueRecord {
  id: number;
  title: string;
  description: string;
  sortOrder: number;
  isPublished: boolean;
  createdByUserId: number;
  createdByName: string;
  updatedByUserId: number;
  updatedByName: string;
  createdAt: string;
  updatedAt: string;
}

export type ImpactReportType =
  | "Visit Report"
  | "Training Report"
  | "Assessment Report"
  | "General Literacy Report"
  | "Teacher Evaluation Report"
  | "Learning Outcomes"
  | "Reading Levels"
  | "Implementation Funnel"
  | "Teaching Quality"
  | "School Report";

export type ReportCategory =
  | "Assessment Report"
  | "Training Report"
  | "School Coaching Visit Report"
  | "Teaching Quality Report (Lesson Evaluations)"
  | "Remedial & Catch-Up Intervention Report"
  | "1001 Story Project Report"
  | "Implementation Fidelity & Coverage Report"
  | "District Literacy Brief"
  | "Graduation Readiness & Alumni Monitoring Report"
  | "Partner/Donor Report (Scoped)"
  | "Data Quality & Credibility Report"
  | "School Profile Report (Headteacher Pack)";

export type ImpactReportScopeType = "National" | "Region" | "Sub-region" | "District" | "Sub-county" | "Parish" | "School";
export type ImpactReportPeriodType = "Term One" | "Term Two" | "Term Three" | "This Fiscal Year" | "Last Fiscal Year" | "Monthly";
export type ImpactReportAudience = "Public-safe" | "Staff-only";
export type ImpactReportOutput = "PDF" | "HTML preview";

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
  reportCategory?: ReportCategory;
  scopeType: ImpactReportScopeType;
  scopeValue?: string;
  regionId?: string;
  subRegionId?: string;
  districtId?: string;
  schoolId?: number;
  partnerName?: string;
  periodType?: ImpactReportPeriodType;
  periodStart: string;
  periodEnd: string;
  programsIncluded?: ImpactReportProgramType[];
  audience?: ImpactReportAudience;
  output?: ImpactReportOutput;
  isPublic: boolean;
  version: string;
}

export interface ImpactReportDataTrustFooter {
  n: number;
  completenessPercent: number;
  toolVersion: string;
  lastUpdated: string;
}

export interface CategoryReportFactsJson {
  keyFindings: Array<{ text: string; metricPath: string }>;
  whatWentWell: Array<{ text: string; metricPath: string }>;
  challenges: Array<{ text: string; metricPath: string }>;
  recommendations: Array<{
    recId: string;
    priority: "high" | "medium" | "low";
    text: string;
    metricPath: string;
  }>;
  conclusionsNextSteps: Array<{ text: string; metricPath: string }>;
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

export interface ImpactReportSponsorshipEntry {
  sponsorType: string;
  sponsoredBy: string;
  activities: number;
  modules: PortalRecordModule[];
}

export interface ImpactReportSponsorshipBlock {
  totalAttributedActivities: number;
  uniqueSponsors: number;
  topSponsors: ImpactReportSponsorshipEntry[];
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
  domainMasteryDistribution?: Record<
    MasteryDomainKey,
    {
      green: { count: number; percent: number };
      amber: { count: number; percent: number };
      red: { count: number; percent: number };
      n: number;
    }
  >;
  readingStageDistribution?: Array<{
    label: string;
    order: number;
    count: number;
    percent: number;
  }>;
  benchmarkStatus?: {
    belowExpected: { count: number; percent: number };
    atExpected: { count: number; percent: number };
    aboveExpected: { count: number; percent: number };
    n: number;
  };
  assessmentModelVersion?: string | null;
  benchmarkVersion?: string | null;
  scoringProfileVersion?: string | null;
}

export interface ImpactReportInstructionQualityBlock {
  routineAdoptionRate: number | null;
  observationScoreChange: number | null;
  topGaps: string[];
}

export interface ImpactReportVisitPathwayBlock {
  startedVisits: number;
  notStartedVisits: number;
  partialVisits: number;
  observationVisits: number;
  demoAndMeetingVisits: number;
  mixedVisits: number;
  demoVisitsConducted: number;
  demoSummariesLogged: number;
  implementationStartPlansLogged: number;
  leadershipMeetingsLogged: number;
  leadershipAgreementsLogged: number;
}

export interface ImpactReportDataQualityBlock {
  approvedRecords: number;
  totalRecords: number;
  missingPayloadRate: number;
  verificationNote: string;
}

export interface LessonEvaluationPassAFinding {
  finding: string;
  metricPath: string;
  value: number | string | null;
  evidenceLines: string[];
}

export interface LessonEvaluationPassARecommendation {
  recId: string;
  recTitle: string;
  priority: "High" | "Medium";
  why: string;
  whatToDoThisWeek: string[];
  successMetric: string;
  evidenceLines: string[];
}

export interface LessonEvaluationPassA {
  keyFindings: LessonEvaluationPassAFinding[];
  recommendations: LessonEvaluationPassARecommendation[];
}

export interface ImpactReportTeacherEvaluationRecord {
  teacherName: string;
  classObserved: string;
  lessonDate: string;
  overallScore: number;
  overallLevel: LessonEvaluationOverallLevel;
  strengthsText: string;
  priorityGapText: string;
  nextCoachingAction: string;
  teacherCommitment: string;
  nextVisitDate: string | null;
}

export interface ImpactReportTeacherImprovementComparison {
  teacherName: string;
  classObserved: string;
  baselineDate: string;
  comparisonDate: string;
  latestDate: string;
  deltaOverall: number;
  improvementStatus: TeacherImprovementStatus;
  domainDeltas: TeacherImprovementDomainDelta;
}

export interface ImpactReportTeacherImprovementSummary {
  teachersCompared: number;
  improvedTeachersCount: number;
  improvedTeachersPercent: number | null;
  averageOverallDelta: number | null;
  schoolImprovedPercent: number | null;
  topImprovingDomains: Array<{
    domain: string;
    avgDelta: number;
  }>;
  teacherComparisons: ImpactReportTeacherImprovementComparison[];
  disclaimer: string;
}

export interface ImpactReportTeacherEvaluationBlock {
  totalEvaluations: number;
  averageOverallScore: number | null;
  levelDistribution: {
    strong: number;
    good: number;
    developing: number;
    needsSupport: number;
  };
  domainAverages: {
    gpc: number | null;
    blending: number | null;
    engagement: number | null;
  };
  topGapDomains: string[];
  passA: LessonEvaluationPassA;
  narrative: {
    whatWeObserved: string;
    whatItMeans: string;
    whatToDoNext30Days: string;
    howToCheckNextVisit: string;
  };
  records: ImpactReportTeacherEvaluationRecord[];
}

export interface ImpactReportFactPack {
  generatedAt: string;
  reportType: ImpactReportType;
  reportCategory?: ReportCategory;
  periodType?: ImpactReportPeriodType;
  audience?: ImpactReportAudience;
  output?: ImpactReportOutput;
  scopeType: ImpactReportScopeType;
  scopeValue: string;
  regionId?: string | null;
  subRegionId?: string | null;
  districtId?: string | null;
  schoolId?: number | null;
  periodStart: string;
  periodEnd: string;
  programsIncluded: ImpactReportProgramType[];
  categoryData?: Record<string, unknown>;
  categoryFactsJson?: CategoryReportFactsJson;
  dataTrust?: ImpactReportDataTrustFooter;
  definitions: {
    learnersReached: string;
    schoolsImpacted: string;
    schoolsCoachedVisited: string;
    improvement: string;
    reportingCalendar: string;
  };
  coverageDelivery: ImpactReportCoverageBlock;
  sponsorship?: ImpactReportSponsorshipBlock;
  engagement: ImpactReportEngagementBlock;
  learningOutcomes: ImpactReportLearningOutcomesBlock;
  masteryPublicExplanation?: {
    green: string;
    amber: string;
    red: string;
  };
  readingLevels?: ReadingLevelsBlock;
  instructionQuality: ImpactReportInstructionQualityBlock;
  visitPathways?: ImpactReportVisitPathwayBlock;
  teacherLessonEvaluation?: ImpactReportTeacherEvaluationBlock;
  teacherImprovementSummary?: ImpactReportTeacherImprovementSummary;
  teachingLearningAlignment?: TeachingLearningAlignmentAggregate;
  dataQuality: ImpactReportDataQualityBlock;
  audit?: {
    generatedByUserId: number;
    generatedByName: string;
    generatedAt: string;
    dataTimestamp: string;
    scopeLabel: string;
    periodLabel: string;
    reportVersion: string;
  };
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
  reportCategory?: ReportCategory;
  periodType?: ImpactReportPeriodType;
  audience?: ImpactReportAudience;
  output?: ImpactReportOutput;
  scopeType: ImpactReportScopeType;
  scopeValue: string;
  regionId?: string | null;
  subRegionId?: string | null;
  districtId?: string | null;
  schoolId?: number | null;
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

/* ─── 1001 Story Library ─────────────────────────── */

export type StoryPublishStatus = "draft" | "review" | "published";
export type StoryConsentStatus = "pending" | "approved" | "denied";

export type StoryContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | {
    type: "illustration";
    image_url: string;
    alt_text: string;
    caption?: string;
    layout?: "full" | "center" | "inset-left" | "inset-right";
    max_height_px?: number;
    keep_with_next?: boolean;
  };

export interface AuthorProfile {
  id: number;
  storyId: number;
  authorName?: string;
  authorPhotoUrl?: string;
  age?: number;
  className?: string;
  schoolDisplay?: string;
  authorBioShort?: string;
  showNamePublic: boolean;
  showPhotoPublic: boolean;
  showAgePublic: boolean;
  showClassPublic: boolean;
}

export interface ConsentRecord {
  id: number;
  schoolId: number;
  guardianConsentDocumentUrl?: string;
  schoolConsentDocumentUrl?: string;
  consentDate?: string;
  consentScope: string[]; // e.g., ["story", "author_photo", "author_name", "author_age", "author_class"]
  approvedByUserId?: number;
  status: "pending" | "approved" | "rejected";
  notes?: string;
}

export interface StoryView {
  id: number;
  storyId: number;
  viewedAt: string;
  sessionId: string;
  userId?: number;
  geoHint?: string;
  durationSeconds?: number;
}

export interface StoryRating {
  id: number;
  storyId: number;
  userId?: number;
  anonymousId?: string;
  stars: number;
  createdAt: string;
  status: "visible" | "hidden";
}

export interface StoryComment {
  id: number;
  storyId: number;
  userId?: number;
  anonymousId?: string;
  displayName?: string;
  commentText: string;
  createdAt: string;
  status: "visible" | "hidden" | "flagged";
  flaggedReason?: string;
}

export interface StoryRecord {
  id: number;
  slug: string;
  schoolId: number;
  anthologyId: number | null;
  authorProfileId: number | null;
  consentRecordId: number | null;
  title: string;
  authorAbout: string;
  excerpt: string;
  contentText: string | null;
  storyContentBlocks: StoryContentBlock[];
  hasIllustrations: boolean;
  pdfStoredPath: string | null;
  coverImagePath: string | null;
  grade: string;
  language: string;
  tags: string[];
  pageStart: number;
  pageEnd: number;
  publishStatus: StoryPublishStatus;
  consentStatus: StoryConsentStatus;
  publicAuthorDisplay: string;
  learnerUid: string | null;
  viewCount: number;
  sortOrder: number;
  createdByUserId: number;
  createdAt: string;
  publishedAt: string | null;
  schoolName?: string;
  district?: string;
  subRegion?: string;
  region?: string;
}

/** Public-safe projection — never contains learnerUid */
export interface PublishedStory {
  id: number;
  slug: string;
  anthologyId: number | null;
  anthologySlug?: string | null;
  authorProfileId?: number | null;
  title: string;
  authorAbout: string;
  excerpt: string;
  contentText: string | null;
  storyContentBlocks: StoryContentBlock[];
  hasIllustrations: boolean;
  pdfStoredPath: string | null;
  coverImagePath: string | null;
  grade: string;
  language: string;
  tags: string[];
  pageStart: number;
  pageEnd: number;
  publicAuthorDisplay: string;
  viewCount: number;
  averageStars?: number;
  ratingCount?: number;
  commentCount?: number;
  latestCommentSnippet?: string;
  publishedAt: string | null;
  schoolName: string;
  district: string;
  subRegion: string;
  schoolId: number;
}

export interface AnthologyRecord {
  id: number;
  slug: string;
  title: string;
  scopeType: "school" | "district" | "subregion" | "region";
  scopeId: number | null;
  schoolId: number | null;
  districtScope: string | null;
  edition: string;
  pdfStoredPath: string | null;
  pdfPageCount: number;
  coverImagePath: string | null;
  publishStatus: "draft" | "review" | "published";
  consentStatus: StoryConsentStatus;
  featured: boolean;
  featuredRank: number | null;
  downloadCount: number;
  createdByUserId: number;
  createdAt: string;
  publishedAt: string | null;
  schoolName?: string;
}

export interface StoryLibraryFilters {
  q?: string;
  region?: string;
  district?: string;
  schoolId?: number;
  grade?: string;
  tag?: string;
  language?: string;
  sort?: "newest" | "views" | "school";
  page?: number;
  limit?: number;
}

/* --- FINANCIAL TRANSPARENCY HUB --- */

export type FinancePublicSnapshotStatus = "draft" | "published" | "archived";

export type FinancePublicSnapshotRecord = {
  id: number;
  fy: number;
  quarter: string | null;
  currency: FinanceCurrency;
  snapshotType: "fy" | "quarterly";
  status: FinancePublicSnapshotStatus;
  totalIncome: number;
  totalExpenditure: number;
  net: number;
  programPct: number | null;
  adminPct: number | null;
  categoryBreakdownJson: string; // JSON array of aggregated categories/subcategories
  restrictedSummaryJson: string; // JSON array of restricted fund balances
  pdfFileId: number | null;
  storedPath: string | null;
  publishConfirmation: string | null; // e.g., "PUBLISH FY SNAPSHOT"
  publishedAt: string | null; // ISO string
  publishedByUserId: number | null;
  archivedAt: string | null; // ISO string
  generatedByUserId: number;
  generatedAt: string; // ISO string
};

export type FinanceAuditedStatementRecord = {
  id: number;
  fy: number;
  auditorName: string | null;
  auditCompletedDate: string | null; // ISO string (YYYY-MM-DD)
  status: "private_uploaded" | "published" | "archived";
  storedPath: string;
  originalFilename: string;
  notes: string | null;
  publishConfirmation: string | null; // e.g., "PUBLISH AUDITED STATEMENTS"
  publishedAt: string | null; // ISO string
  publishedByUserId: number | null;
  archivedAt: string | null; // ISO string
  uploadedByUserId: number;
  uploadedAt: string; // ISO string
};

// ============================================================================
// ONLINE TRAINING MODULE TYPES
// ============================================================================

export type TrainingSessionStatus = "draft" | "scheduled" | "live" | "completed" | "canceled";
export type TrainingArtifactType = "recording" | "transcript" | "meet_notes" | "ai_notes";
export type TrainingArtifactSource = "google_meet" | "google_docs" | "ozeki_ai";
export type TrainingArtifactStatus =
  | "pending"
  | "processing"
  | "available"
  | "not_available"
  | "failed";
export type TrainingResourceVisibility = "internal" | "schools" | "public";

export interface OnlineTrainingSessionRecord {
  id: number;
  title: string;
  agenda: string;
  objectives: string | null;
  description: string | null;
  audience: string | null;
  programTags: string; // JSON array of strings
  attendeeEmails: string; // JSON array of emails
  scopeType: "country" | "region" | "subregion" | "district" | "school";
  scopeId: string | null;
  startTime: string; // ISO string
  endTime: string; // ISO string
  timezone: string;
  hostUserId: number;
  attendeeCount: number;
  onlineTeachersTrained: number;
  onlineSchoolLeadersTrained: number;
  calendarEventId: string | null;
  calendarLink: string | null;
  meetJoinUrl: string | null;
  conferenceRecordId: string | null;
  recordingUrl: string | null;
  chatSummary: string | null;
  attendanceCapturedAt: string | null;
  status: TrainingSessionStatus;
  visibility: string;
  createdByUserId: number;
  createdAt: string; // ISO string
  updatedAt: string;
  schoolName: string;
  district: string;
  subCounty: string;
  parish: string;
  region: string;
  participants: unknown[];
  resources: unknown[];
  artifacts: unknown[];
}

export interface TrainingParticipantRecord {
  id: number;
  sessionId: number;
  schoolId: string;
  teacherId: number | null;
  nameSnapshot: string | null;
  role: string | null;
  invited: boolean;
  attended: boolean;
  joinTime: string | null; // ISO string
  leaveTime: string | null; // ISO string
  attendanceMarkedByUserId: number | null;
  markedAt: string | null; // ISO string
}

export interface TrainingResourceRecord {
  id: number;
  sessionId: number;
  title: string;
  fileUrl: string;
  visibility: TrainingResourceVisibility;
  uploadedByUserId: number;
  uploadedAt: string; // ISO string
}

export interface TrainingArtifactRecord {
  id: number;
  sessionId: number;
  type: TrainingArtifactType;
  source: TrainingArtifactSource;
  sourceUrl: string | null;
  status: TrainingArtifactStatus;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface TrainingNotesRecord {
  id: number;
  sessionId: number;
  notesJson: string; // Serialized JSON string
  notesHtml: string | null;
  aiModel: string;
  generatedAt: string; // ISO string
  guardrailVersion: string;
}

/* ─── Finance V2 (Core Accounting) ────────────────── */

export type FinanceAccountType = "asset" | "liability" | "equity" | "income" | "expense";
export type FinanceFundType = "restricted" | "unrestricted" | "designated";
export type FinanceEntryStatus = "draft" | "posted" | "reversed";
export type FinanceApprovalStatus = "pending" | "approved" | "rejected";
export type FinanceDocumentType = "receipt" | "invoice" | "voucher" | "report";

export interface FinanceFund {
  id: number;
  code: string;
  name: string;
  fundType: FinanceFundType;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface FinanceBranch {
  id: number;
  name: string;
  location: string | null;
  createdAt: string;
}

export interface FinanceDepartment {
  id: number;
  code: string;
  name: string;
  createdAt: string;
}

export interface FinanceProgram {
  id: number;
  code: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface FinanceProject {
  id: number;
  code: string;
  name: string;
  programId: number | null;
  createdAt: string;
}

export interface FinanceGrant {
  id: number;
  code: string;
  name: string;
  grantorContactId: number;
  fundId: number;
  totalAwardAmount: number;
  currency: string;
  startDate: string;
  endDate: string;
  status: "active" | "closed" | "pending";
  notes: string | null;
  complianceNotes: string | null;
  createdAt: string;
}

export interface ChartOfAccount {
  id: number;
  accountCode: string;
  accountName: string;
  accountType: FinanceAccountType;
  isActive: boolean;
  createdAt: string;
}

export interface JournalEntry {
  id: number;
  entryNumber: string;
  entryDate: string;
  description: string | null;
  sourceType: string;
  sourceId: number | null;
  status: FinanceEntryStatus;
  postedAt: string | null;
  postedByUserId: number | null;
  createdAt: string;
}

export interface JournalLine {
  id: number;
  journalId: number;
  accountId: number;
  debit: number;
  credit: number;
  fundId: number;
  departmentId: number | null;
  programId: number | null;
  projectId: number | null;
  grantId: number | null;
  branchId: number | null;
  description: string | null;
  createdAt: string;
}

export interface BudgetPlan {
  id: number;
  fiscalYear: number;
  title: string;
  status: "draft" | "active" | "closed";
  createdAt: string;
}

export interface BudgetLine {
  id: number;
  planId: number;
  accountId: number;
  fundId: number;
  departmentId: number | null;
  programId: number | null;
  projectId: number | null;
  grantId: number | null;
  amount: number;
  fiscalPeriod: string;
  createdAt: string;
}

export interface FinanceAsset {
  id: number;
  assetCode: string;
  name: string;
  acquisitionDate: string;
  purchaseValue: number;
  currency: string;
  usefulLifeMonths: number;
  residualValue: number;
  depreciationMethod: "straight_line" | "none";
  vendorId: number | null;
  fundId: number | null;
  sourceTxnId: number | null;
  status: "active" | "disposed";
  createdAt: string;
}

export interface GeneratedDocument {
  id: number;
  documentNumber: string;
  documentType: FinanceDocumentType;
  sourceType: string;
  sourceId: number;
  fileId: number | null;
  storedPath: string | null;
  generatedByUserId: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any> | null;
  isImmutable: boolean;
  createdAt: string;
}

/* ─── Geographic Hierarchy (6-Level) ──────────────── */

export interface GeoCountry {
  id: number;
  isoCode: string;
  name: string;
}

export interface GeoRegion {
  id: number;
  name: string;
  countryId: number;
}

export interface GeoSubRegion {
  id: number;
  name: string;
  regionId: number;
}

export interface GeoDistrict {
  id: number;
  name: string;
  subRegionId: number;
}

export interface GeoParish {
  id: number;
  name: string;
  districtId: number;
}

export interface LocationFilterState {
  countryId?: number;
  regionId?: number;
  subRegionId?: number;
  districtId?: number;
  parishId?: number;
  schoolId?: number;
  academicYear?: number;
  term?: string;
  grade?: string;
}

export interface SchoolHierarchyView {
  schoolId: number;
  schoolName: string;
  parishId: number | null;
  parishName: string | null;
  districtId: number | null;
  districtName: string | null;
  subRegionId: number | null;
  subRegionName: string | null;
  regionId: number | null;
  regionName: string | null;
  countryId: number | null;
  countryName: string | null;
}
/* ─── National Literacy Intelligence System (NLIS) ──────────────── */

export type NlisGeoScopeType =
  | "country"
  | "region"
  | "sub_region"
  | "district"
  | "sub_county"
  | "parish"
  | "school";

export type BenchmarkGrade =
  | "ALL"
  | "P1"
  | "P2"
  | "P3"
  | "P4"
  | "P5"
  | "P6"
  | "P7";

export interface BenchmarkProfileRecord {
  benchmarkId: number;
  name: string;
  effectiveFromDate: string;
  effectiveToDate: string | null;
  notes: string | null;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  rulesCount: number;
}

export interface BenchmarkRuleRecord {
  ruleId: number;
  benchmarkId: number;
  grade: BenchmarkGrade;
  language: string;
  cwpmBands: {
    non_reader: number;
    emergent: [number, number];
    minimum: [number, number];
    competent: [number, number];
    strong: [number, number];
  };
  comprehensionProficientRule:
    | { type: "percent"; threshold: number }
    | { type: "count"; correct: number; total: number };
  optionalAccuracyFloor: number | null;
  domainProficiencyThresholds: Record<string, number>;
  createdAt: string;
}

export interface BenchmarkRuleInput {
  benchmarkId: number;
  grade: BenchmarkGrade;
  language: string;
  cwpmBands: BenchmarkRuleRecord["cwpmBands"];
  comprehensionProficientRule: BenchmarkRuleRecord["comprehensionProficientRule"];
  optionalAccuracyFloor?: number | null;
  domainProficiencyThresholds?: Record<string, number>;
}

export interface EducationAuditExceptionRecord {
  exceptionId: number;
  entityType:
    | "assessment"
    | "assessment_result"
    | "teacher_evaluation"
    | "story"
    | "school"
    | "district"
    | "other";
  entityId: string;
  ruleCode: string;
  severity: "low" | "medium" | "high";
  message: string;
  status: "open" | "resolved" | "overridden";
  scopeType: NlisGeoScopeType;
  scopeId: string;
  periodKey: string;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: number | null;
  resolutionNotes: string | null;
}

export interface DataQualityCenterSummaryRecord {
  scopeType: NlisGeoScopeType;
  scopeId: string;
  periodKey: string;
  completenessPct: number;
  coverageIndicators: {
    schoolsTotal: number;
    schoolsWithBaseline: number;
    schoolsWithEndline: number;
    schoolsMissingEndline: number;
    districtsLowCoverage: number;
  };
  exceptionCounts: {
    open: number;
    high: number;
    medium: number;
    low: number;
  };
  lastUpdated: string;
}

export interface NationalPriorityQueueItem {
  schoolId: number;
  schoolName: string;
  district: string;
  subRegion: string;
  region: string;
  periodKey: string;
  riskScore: number;
  priorityLevel: "high" | "medium" | "low";
  recommendedIntervention:
    | "Remedial & Catch-up"
    | "Coaching"
    | "Training"
    | "Leadership support";
  evidenceSummary: string;
  metrics: {
    nonReadersPct: number;
    at20PlusDeltaPct: number;
    teachingQualityPct: number;
    coachingCoveragePct: number;
    completenessPct: number;
  };
  assignedOwnerUserId: number | null;
  assignedOwnerName: string | null;
  assignedAt: string | null;
  assignmentNotes: string | null;
}

export interface NationalInsightWidgetData {
  scopeType: NlisGeoScopeType;
  scopeId: string;
  periodStart: string;
  periodEnd: string;
  movement: {
    nonReaderReductionPct: number;
    movedTo20PlusPct: number;
    movedTo40PlusPct: number;
    movedTo60PlusPct: number;
    comprehensionProficientDeltaPct: number;
    sampleSize: number;
  };
  cohortTracking: Array<{
    schoolId: number;
    schoolName: string;
    baselineAt20PlusPct: number;
    latestAt20PlusPct: number;
    deltaPct: number;
  }>;
  alignedDrivers: {
    coachingFrequencyPerSchool: number;
    teachingQualityLatestPct: number;
    teachingQualityDeltaPct: number;
    materialsCoveragePct: number;
    storyParticipationPct: number;
    disclaimer: string;
  };
  priorityQueue: NationalPriorityQueueItem[];
}

export interface InterventionPlanRecord {
  planId: number;
  scopeType: "school" | "district";
  scopeId: string;
  schoolId: number | null;
  district: string | null;
  title: string;
  status: "draft" | "planned" | "in_progress" | "completed" | "paused";
  targetMetrics: Record<string, number | string>;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  createdBy: number;
  createdByName: string | null;
  createdAt: string;
  completedActions: number;
  totalActions: number;
}

export interface InterventionActionRecord {
  actionId: number;
  planId: number;
  actionType:
    | "Remedial & Catch-up program"
    | "Teacher coaching cycle"
    | "Teacher catch-up training"
    | "Leadership mentoring"
    | "Assessment support"
    | "1001 Story activation/publishing support";
  ownerUserId: number;
  ownerUserName: string | null;
  dueDate: string | null;
  status: "draft" | "planned" | "in_progress" | "completed" | "paused";
  visitId: number | null;
  trainingId: number | null;
  assessmentId: number | null;
  storyActivityId: number | null;
  outcomeNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NationalReportPreset =
  | "National Quarterly Snapshot"
  | "District Literacy Brief"
  | "School Coaching Pack"
  | "Annual National Report";

export interface NationalReportPackRecord {
  reportId: number;
  reportCode: string;
  preset: NationalReportPreset;
  scopeType: NlisGeoScopeType;
  scopeId: string;
  periodStart: string;
  periodEnd: string;
  facts: Record<string, unknown>;
  narrative: {
    summary: string;
    movement: string;
    priorityActions: string;
    interventions: string;
    methodology: string;
    references: string[];
    generatedWithAi: boolean;
  };
  htmlReport: string;
  pdfPath: string | null;
  generatedByUserId: number;
  generatedByName: string;
  generatedAt: string;
  updatedAt: string;
}

export interface PartnerApiClientRecord {
  clientId: number;
  partnerName: string;
  allowedScopeType: NlisGeoScopeType;
  allowedScopeIds: string[];
  active: boolean;
  createdBy: number;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface NationalInsights {
  scopeType: NlisGeoScopeType;
  scopeId: string;
  periodStart: string;
  periodEnd: string;
  movement: {
    nonReaderReductionPct: number;
    movedTo20PlusPct: number;
    movedTo40PlusPct: number;
    movedTo60PlusPct: number;
    comprehensionProficientDeltaPct: number;
    sampleSize: number;
  };
  alignedDrivers: {
    coachingFrequencyPerSchool: number;
    teachingQualityLatestPct: number;
    teachingQualityDeltaPct: number;
    materialsCoveragePct: number;
    storyParticipationPct: number;
    disclaimer: string;
  };
  priorityQueue: NationalPriorityQueueItem[];
}

export interface SchoolEnrollmentRecord {
  id: number;
  schoolId: number;
  boysCount: number;
  girlsCount: number;
  totalEnrollment: number;
  academicTerm: string | null;
  updatedFrom: string;
  recordedById: number;
  createdAt: string;
}

export interface SchoolLiteracyImpactRecord {
  id: number;
  schoolId: number;
  babyClassImpacted: number;
  middleClassImpacted: number;
  topClassImpacted: number;
  p1Impacted: number;
  p2Impacted: number;
  p3Impacted: number;
  totalImpacted: number;
  recordedById: number;
  createdAt: string;
}

export type FinanceBudgetStatus = 
  | "draft" | "submitted" | "under_review" | "approved" | "rejected" | "partially_funded" | "funded" | "closed";

export interface FinanceOperationBudget {
  id: number;
  title: string;
  period: string; // e.g. "Q1 2026", "Month of March", "Fiscal 2026"
  ownerId: number | null;
  status: FinanceBudgetStatus;
  requestedAmount: number;
  approvedAmount: number;
  spentAmount: number;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  items?: FinanceOperationBudgetItem[];
  requests?: FinanceFundRequest[];
}

export interface FinanceOperationBudgetItem {
  id: number;
  budgetId: number;
  category: string;
  description: string;
  quantity?: number;
  unitCost?: number;
  totalCost: number;
  createdAt: string;
}

export type FinanceFundRequestStatus = 
  | "submitted" | "under_review" | "approved" | "partially_approved" | "rejected";

export interface FinanceFundRequest {
  id: number;
  budgetId: number;
  requesterId: number;
  requestedAmount: number;
  approvedAmount?: number;
  status: FinanceFundRequestStatus;
  reviewNotes?: string;
  reviewedBy?: number;
  submittedAt: string;
  reviewedAt?: string;
}
