import { EXTENDED_RECOMMENDATION_CATALOG } from "@/lib/recommendations";
import { PortalRecordModule } from "@/lib/types";

export type PortalFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "time"
  | "select"
  | "multiselect"
  | "participants"
  | "egraLearners"
  | "egraSummary"
  | "egraProfile";

export interface PortalFieldOption {
  value: string;
  label: string;
}

export interface PortalFieldConfig {
  key: string;
  label: string;
  type: PortalFieldType;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  options?: PortalFieldOption[];
  helperText?: string;
}

export interface PortalSectionConfig {
  id: string;
  title: string;
  collapsible?: boolean;
  fields: PortalFieldConfig[];
}

export interface PortalModuleConfig {
  module: PortalRecordModule;
  route: string;
  navLabel: string;
  pageTitle: string;
  description: string;
  newLabel: string;
  programTypeLabel: string;
  programTypeOptions: PortalFieldOption[];
  sections: PortalSectionConfig[];
}

export const performanceSection: PortalSectionConfig = {
  id: "performance",
  title: "SECTION: SCHOOL PERFORMANCE SCORECARD (0-10)",
  collapsible: true,
  fields: [
    {
      key: "score_instruction",
      label: "Instruction Quality (0-10)",
      type: "number",
      min: 0,
      max: 10,
      step: 1,
      required: false,
      helperText: "Rate the quality of teaching and lesson delivery.",
    },
    {
      key: "score_outcomes",
      label: "Learner Outcomes (0-10)",
      type: "number",
      min: 0,
      max: 10,
      step: 1,
      required: false,
      helperText: "Rate based on assessment data and learner progress.",
    },
    {
      key: "score_leadership",
      label: "Leadership & Governance (0-10)",
      type: "number",
      min: 0,
      max: 10,
      step: 1,
      required: false,
      helperText: "Rate school administration support and oversight.",
    },
    {
      key: "score_community",
      label: "Community Engagement (0-10)",
      type: "number",
      min: 0,
      max: 10,
      step: 1,
      required: false,
      helperText: "Rate parental and community involvement.",
    },
    {
      key: "score_environment",
      label: "Safe Learning Environment (0-10)",
      type: "number",
      min: 0,
      max: 10,
      step: 1,
      required: false,
      helperText: "Rate safety, inclusivity, and resource availability.",
    },
  ],
};

const sponsorshipFields: PortalFieldConfig[] = [
  {
    key: "sponsorshipType",
    label: "Sponsorship type",
    type: "select",
    required: true,
    options: [
      { value: "Partner", label: "Partner" },
      { value: "Individual Donation", label: "Individual donation" },
      { value: "Government", label: "Government" },
      { value: "Internal Program Budget", label: "Internal program budget" },
      { value: "Other", label: "Other" },
    ],
    helperText:
      "Select whether this activity was sponsored by a partner or an individual donor.",
  },
  {
    key: "sponsoredBy",
    label: "Sponsored by",
    type: "text",
    required: true,
    placeholder: "e.g. UNICEF Uganda, USAID, John Doe",
  },
];

const insightRecommendationOptions: PortalFieldOption[] = EXTENDED_RECOMMENDATION_CATALOG.map((rec) => ({
  value: rec.id,
  label: `${rec.id}: ${rec.title}`,
}));

const standardizedInsightSection: PortalSectionConfig = {
  id: "insights",
  title: "Key Findings & Next Steps",
  fields: [
    {
      key: "insightsKeyFindings",
      label: "Key findings",
      type: "textarea",
      required: true,
      helperText: "What did we observe in decoding/fluency/comprehension?",
    },
    {
      key: "insightsWhatWentWell",
      label: "What went well",
      type: "textarea",
      helperText: "What routines worked well?",
    },
    {
      key: "insightsChallenges",
      label: "Challenges",
      type: "textarea",
      helperText: "What barriers did teachers report?",
    },
    {
      key: "insightsRecommendationsRecIds",
      label: "Recommendations (REC mapped)",
      type: "multiselect",
      required: true,
      options: insightRecommendationOptions,
      helperText: "Select approved REC items. Priority and notes are captured below each selected REC.",
    },
    {
      key: "insightsConclusionsNextSteps",
      label: "Conclusions + next steps",
      type: "textarea",
      required: true,
      helperText: "Include follow-up date where applicable.",
    },
  ],
};

const trainingConfig: PortalModuleConfig = {
  module: "training",
  route: "/portal/trainings",
  navLabel: "Trainings",
  pageTitle: "Trainings",
  description:
    "Log teacher professional development sessions and track quality, participation, and follow-up actions.",
  newLabel: "+ New Training",
  programTypeLabel: "Training topic",
  programTypeOptions: [
    { value: "Phonics", label: "Phonics" },
    { value: "Fluency", label: "Fluency" },
    { value: "Comprehension", label: "Comprehension" },
    { value: "Assessments", label: "Assessments" },
    { value: "Remedial", label: "Remedial" },
    { value: "Leadership", label: "Leadership" },
  ],
  sections: [
    {
      id: "basics",
      title: "Section 1: Training Metadata",
      fields: [
        {
          key: "trainingStatus",
          label: "Training status",
          type: "select",
          required: true,
          options: [
            { value: "Scheduled", label: "Scheduled" },
            { value: "In Progress", label: "In Progress" },
            { value: "Completed", label: "Completed" },
            { value: "Canceled", label: "Canceled" },
          ],
        },
        { key: "trainingName", label: "Training name", type: "text", required: true },
        {
          key: "deliveryMode",
          label: "Training type",
          type: "select",
          required: true,
          options: [
            { value: "Grouped", label: "Grouped" },
            { value: "Cluster-based", label: "Cluster-based" },
            { value: "In-school", label: "In-school" },
            { value: "Online", label: "Online" },
          ],
        },
        { key: "startTime", label: "Start time", type: "time", required: true },
        { key: "endTime", label: "End time", type: "time", required: true },
      ],
    },
    {
      id: "location",
      title: "Section 2: Location & Venue",
      fields: [
        { key: "trainingVenue", label: "Training venue", type: "text", required: true },
        {
          key: "clusterName",
          label: "Cluster name (required for Cluster-based)",
          type: "text",
          helperText: "Only required when Training type is Cluster-based.",
        },
        { key: "village", label: "Village (optional)", type: "text" },
        { key: "gpsLocation", label: "GPS (optional)", type: "text" },
        ...sponsorshipFields,
      ],
    },
    {
      id: "program",
      title: "Section 3: Training Details",
      fields: [
        {
          key: "audience",
          label: "Audience",
          type: "select",
          required: true,
          options: [
            { value: "Teachers", label: "Teachers" },
            { value: "Leaders", label: "Leaders" },
            { value: "Both", label: "Both" },
          ],
        },
        {
          key: "objectivesCovered",
          label: "Objectives covered",
          type: "multiselect",
          options: [
            { value: "Letter sounds", label: "Letter sounds" },
            { value: "Blending and segmenting", label: "Blending and segmenting" },
            { value: "Decoding and encoding", label: "Decoding and encoding" },
            { value: "Fluency routines", label: "Fluency routines" },
            { value: "Vocabulary and comprehension", label: "Vocabulary and comprehension" },
          ],
        },
        {
          key: "modulesDelivered",
          label: "Modules delivered",
          type: "multiselect",
          options: [
            { value: "Demo lesson", label: "Demo lesson" },
            { value: "Co-teaching", label: "Co-teaching" },
            { value: "Practice routine", label: "Practice routine" },
            { value: "Assessment routine", label: "Assessment routine" },
          ],
        },
        {
          key: "participants",
          label: "Participants",
          type: "participants",
          required: true,
          helperText:
            "Capture participant name, school attached to, role (Teacher or Leader), gender, and phone contact.",
        },
        { key: "facilitators", label: "Facilitators", type: "text", required: true },
      ],
    },
    {
      id: "results",
      title: "Section 4: Results / Scores",
      fields: [
        {
          key: "numberAttended",
          label: "Number attended (auto)",
          type: "number",
          required: true,
          min: 0,
        },
        { key: "femaleCount", label: "Female attended (auto)", type: "number", min: 0 },
        { key: "maleCount", label: "Male attended (auto)", type: "number", min: 0 },
        { key: "teachersFemale", label: "Teachers (Female, auto)", type: "number", min: 0 },
        { key: "teachersMale", label: "Teachers (Male, auto)", type: "number", min: 0 },
        { key: "schoolLeadersFemale", label: "School leaders (Female, auto)", type: "number", min: 0 },
        { key: "schoolLeadersMale", label: "School leaders (Male, auto)", type: "number", min: 0 },
        {
          key: "preTestAverage",
          label: "Pre-test average (%)",
          type: "number",
          min: 0,
          max: 100,
        },
      ],
    },
    {
      id: "actions",
      title: "Section 5: Actions & Follow-up",
      fields: [
        {
          key: "how_training_changed_teaching",
          label: "Participant feedback: How training changed teaching",
          type: "textarea",
          helperText:
            "This field feeds the testimonials moderation queue and training report themes.",
        },
        {
          key: "what_you_will_do_to_improve_reading_levels",
          label: "Participant feedback: What you will do to improve reading levels",
          type: "textarea",
          helperText:
            "Capture practical commitments that can be tracked during follow-up.",
        },
        {
          key: "what_went_well_participant",
          label: "Participant feedback: What went well",
          type: "textarea",
        },
        {
          key: "what_went_well_trainer",
          label: "Trainer feedback: What went well",
          type: "textarea",
        },
        {
          key: "challenges_participant",
          label: "Participant feedback: Challenges",
          type: "textarea",
        },
        {
          key: "needsImprovement",
          label: "Training feedback: Areas needing improvement",
          type: "textarea",
        },
        {
          key: "challenges_trainer",
          label: "Trainer feedback: Challenges",
          type: "textarea",
        },
        {
          key: "recommendations_next_training_participant",
          label: "Participant feedback: Recommendations for next training",
          type: "textarea",
        },
        {
          key: "recommendations_next_training_trainer",
          label: "Trainer feedback: Recommendations for next training",
          type: "textarea",
        },
        { key: "challenges", label: "Challenges / risks", type: "textarea" },
        { key: "actionPoints", label: "Action points agreed", type: "textarea" },
        { key: "trainingNotes", label: "Training notes", type: "textarea" },
      ],
    },
    standardizedInsightSection,
  ],
};

const observationRatingOptions: PortalFieldOption[] = [
  { value: "", label: "Select rating" },
  { value: "Very Good", label: "Very Good" },
  { value: "Good", label: "Good" },
  { value: "Fair", label: "Fair" },
  { value: "Can Improve", label: "Can Improve" },
];

const trickyWordDefaultOptions: PortalFieldOption[] = [
  { value: "Can Improve", label: "Can Improve" },
  { value: "Very Good", label: "Very Good" },
  { value: "Good", label: "Good" },
  { value: "Fair", label: "Fair" },
];

const visitConfig: PortalModuleConfig = {
  module: "visit",
  route: "/portal/visits",
  navLabel: "Visits",
  pageTitle: "School Visits",
  description:
    "Capture school-scoped coaching visits with an implementation check gate that routes each visit into observation, demo + leadership meeting, or mixed pathway.",
  newLabel: "+ New School Visit",
  programTypeLabel: "Visit type",
  programTypeOptions: [
    { value: "Baseline", label: "Baseline" },
    { value: "Follow-up", label: "Follow-up" },
    { value: "Support", label: "Support" },
    { value: "Other", label: "Other" },
  ],
  sections: [
    {
      id: "visitContext",
      title: "Step 1: Visit Context",
      fields: [
        {
          key: "coachObserver",
          label: "Coach/Observer",
          type: "text",
          required: true,
          helperText: "Auto-filled from the signed-in user.",
        },
        {
          key: "purposeTags",
          label: "Purpose tags",
          type: "multiselect",
          required: true,
          options: [
            { value: "coaching", label: "Coaching" },
            { value: "monitoring", label: "Monitoring" },
            { value: "demo", label: "Demo" },
            { value: "leadership", label: "Leadership" },
          ],
        },
        { key: "startTime", label: "Visit start time", type: "time", required: true },
        { key: "endTime", label: "Visit end time", type: "time", required: true },
        { key: "subCounty", label: "Sub-county", type: "text", required: true },
        { key: "parish", label: "Parish", type: "text", required: true },
        { key: "village", label: "Village (optional)", type: "text" },
        ...sponsorshipFields,
      ],
    },
    {
      id: "implementationGate",
      title: "Step 2: Implementation Check",
      fields: [
        {
          key: "implementationStatus",
          label:
            "Has the school started implementing the reading method learned from training (structured phonics routines)?",
          type: "select",
          required: true,
          options: [
            { value: "started", label: "Yes — Implementation has started" },
            { value: "not_started", label: "No — Not yet started" },
            { value: "partial", label: "Partially — Started in some classes only" },
          ],
        },
        {
          key: "classesImplementing",
          label: "Classes implementing",
          type: "multiselect",
          options: [
            { value: "P1", label: "P1" },
            { value: "P2", label: "P2" },
            { value: "P3", label: "P3" },
            { value: "P4", label: "P4" },
            { value: "P5", label: "P5" },
            { value: "P6", label: "P6" },
            { value: "P7", label: "P7" },
          ],
          helperText:
            "Required when implementation status is Partial.",
        },
        {
          key: "classesNotImplementing",
          label: "Classes not implementing",
          type: "multiselect",
          options: [
            { value: "P1", label: "P1" },
            { value: "P2", label: "P2" },
            { value: "P3", label: "P3" },
            { value: "P4", label: "P4" },
            { value: "P5", label: "P5" },
            { value: "P6", label: "P6" },
            { value: "P7", label: "P7" },
          ],
          helperText: "Date is captured in the visit metadata above.",
        },
      ],
    },
    {
      id: "observationContext",
      title: "Step 3A: Classroom Observation & Coaching",
      fields: [
        {
          key: "teacherObserved",
          label: "Teacher observed",
          type: "text",
          required: true,
          helperText: "Select a teacher from the school roster.",
        },
        {
          key: "classLevel",
          label: "Class observed",
          type: "select",
          required: true,
          options: [
            { value: "P1", label: "P1" },
            { value: "P2", label: "P2" },
            { value: "P3", label: "P3" },
            { value: "P4", label: "P4" },
            { value: "P5", label: "P5" },
            { value: "P6", label: "P6" },
            { value: "P7", label: "P7" },
          ],
        },
        { key: "classSize", label: "Class size", type: "number", min: 0 },
        {
          key: "lessonFocusAreas",
          label: "Lesson focus",
          type: "multiselect",
          options: [
            { value: "sounds", label: "Sounds" },
            { value: "decoding", label: "Decoding" },
            { value: "blending", label: "Blending" },
            { value: "segmenting", label: "Segmenting" },
            { value: "fluency", label: "Fluency" },
            { value: "comprehension", label: "Comprehension" },
            { value: "tricky_words", label: "Tricky words" },
          ],
        },
        {
          key: "learnerSpotCheckCount",
          label: "Quick learner spot-check count (optional)",
          type: "number",
          min: 0,
        },
        {
          key: "learnerSpotCheckNote",
          label: "Quick learner spot-check note (optional)",
          type: "textarea",
        },
      ],
    },
    {
      id: "generalTeaching",
      title: "1) General teaching",
      fields: [
        {
          key: "general_revisedSoundsQuickly",
          label: "Children revised sounds quickly at the start of the lesson.",
          type: "select",
          required: true,
          options: observationRatingOptions,
          helperText: "Rating scale: Very Good | Good | Fair | Can Improve.",
        },
        {
          key: "general_qualityLessonPlanning",
          label:
            "Quality lesson planning was evident and the teacher was well prepared.",
          type: "select",
          required: true,
          options: observationRatingOptions,
        },
        {
          key: "general_choiceOfWords",
          label:
            "Good choice of words used in the lesson, at pupils’ level and covered sounds already learnt.",
          type: "select",
          required: true,
          options: observationRatingOptions,
        },
        {
          key: "general_soundKnowledge",
          label: "Teacher displayed a good knowledge of sounds during the lesson.",
          type: "select",
          required: true,
          options: observationRatingOptions,
        },
        {
          key: "general_followsSoundOrder",
          label: "Teacher follows the sounds in order.",
          type: "select",
          required: true,
          options: observationRatingOptions,
        },
        {
          key: "general_usesRangeOfResources",
          label: "The teacher used a range of resources in the lesson to engage learners.",
          type: "select",
          required: true,
          options: observationRatingOptions,
        },
      ],
    },
    {
      id: "teacherNewSound",
      title: "2) Teacher new sound",
      fields: [
        {
          key: "newSound_clearPronunciation",
          label: "Teacher models clear pronunciation.",
          type: "select",
          required: true,
          options: observationRatingOptions,
        },
        {
          key: "newSound_handwritingFormation",
          label: "Teacher models handwriting/letter formation.",
          type: "select",
          required: true,
          options: observationRatingOptions,
        },
        {
          key: "newSound_childrenSayWrite",
          label: "Children had opportunities to say and write the new sound.",
          type: "select",
          required: true,
          options: observationRatingOptions,
        },
      ],
    },
    {
      id: "readingActivities",
      title: "3) Reading activities",
      fields: [
        {
          key: "readingActivities_soundOutWords",
          label: "Pupils given opportunities to sound out word.",
          type: "select",
          required: true,
          options: observationRatingOptions,
        },
        {
          key: "readingActivities_pairGroupReading",
          label: "Pupils given opportunities to read in pairs/groups.",
          type: "select",
          required: true,
          options: observationRatingOptions,
        },
        {
          key: "readingActivities_teacherEncouragedDecoding",
          label:
            "Teacher did not read for children but encouraged learners to sound out words.",
          type: "select",
          required: true,
          options: observationRatingOptions,
        },
        {
          key: "readingActivities_activeEngagement",
          label:
            "All pupils actively engaged in sounding and reading sounds, words and sentences.",
          type: "select",
          required: true,
          options: observationRatingOptions,
        },
        {
          key: "readingActivities_resourceVariety",
          label:
            "Teacher used a range of different resources to engage learners in reading activities.",
          type: "select",
          required: true,
          options: observationRatingOptions,
        },
      ],
    },
    {
      id: "trickyWords",
      title: "4) Tricky (non-decodable) words",
      fields: [
        {
          key: "trickyWords_taughtOrRevised",
          label: "Pupils were taught a new tricky word or revised tricky words in the lesson.",
          type: "select",
          required: true,
          options: trickyWordDefaultOptions,
        },
        {
          key: "trickyWords_sightWordSpeed",
          label: "Pupils are beginning to say tricky words by sight quickly.",
          type: "select",
          required: true,
          options: trickyWordDefaultOptions,
          helperText:
            "Scoring note: Very Good = 5 marks; Good = 3 marks; Fair = 1 mark. Satisfactory phonics lesson = 60% or above.",
        },
      ],
    },
    {
      id: "observationCoaching",
      title: "Observation coaching notes",
      fields: [
        { key: "strengthsObserved", label: "Key findings", type: "textarea" },
        { key: "gapsIdentified", label: "What went well", type: "textarea" },
        { key: "coachingProvided", label: "Challenges", type: "textarea" },
        {
          key: "teacherActions",
          label: "Recommendations / action points",
          type: "textarea",
        },
        { key: "nextVisitFocus", label: "Conclusions / next steps", type: "text" },
      ],
    },
    {
      id: "lessonDemo",
      title: "Step 3B: Lesson Demonstration",
      fields: [
        {
          key: "demoDelivered",
          label: "Demo delivered?",
          type: "select",
          required: true,
          options: [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ],
        },
        { key: "demoClass", label: "Class for demo (grade/stream)", type: "text", required: true },
        { key: "demoFocus", label: "Demo focus", type: "text", required: true },
        { key: "demoMinutes", label: "Period length (minutes)", type: "number", required: true, min: 1 },
        {
          key: "demoComponents",
          label: "Demo approach used",
          type: "multiselect",
          required: true,
          options: [
            { value: "sound review routine", label: "Sound review routine" },
            { value: "new sound modeling", label: "New sound modeling" },
            { value: "blending routine", label: "Blending routine" },
            { value: "segmenting routine", label: "Segmenting routine" },
            { value: "decoding practice", label: "Decoding practice" },
            { value: "fluency practice", label: "Fluency practice" },
            { value: "quick check", label: "Quick check" },
          ],
        },
        {
          key: "demoMaterialsUsed",
          label: "Materials used",
          type: "multiselect",
          options: [
            { value: "teacher guide", label: "Teacher guide" },
            { value: "learner books", label: "Learner books" },
            { value: "flash cards", label: "Flash cards" },
            { value: "sound chart", label: "Sound chart" },
            { value: "board/chalk", label: "Board/chalk" },
            { value: "other", label: "Other" },
          ],
        },
        {
          key: "demoTeachersPresentContactIds",
          label: "Teacher(s) present",
          type: "multiselect",
          required: true,
          helperText: "Select from school contacts.",
        },
        {
          key: "demoTakeawaysText",
          label: "Key demonstration takeaways",
          type: "textarea",
          required: true,
        },
      ],
    },
    {
      id: "implementationStartPlan",
      title: "Implementation start plan",
      fields: [
        { key: "implementationStartDate", label: "Start date", type: "date", required: true },
        {
          key: "dailyReadingTimeMinutes",
          label: "Daily reading time agreed (minutes)",
          type: "number",
          required: true,
          min: 0,
        },
        {
          key: "classesToStartFirst",
          label: "Classes to start first",
          type: "multiselect",
          required: true,
          options: [
            { value: "P1", label: "P1" },
            { value: "P2", label: "P2" },
            { value: "P3", label: "P3" },
            { value: "P4", label: "P4" },
            { value: "P5", label: "P5" },
            { value: "P6", label: "P6" },
            { value: "P7", label: "P7" },
          ],
        },
        {
          key: "implementationResponsibleContactId",
          label: "Responsible person at school",
          type: "select",
          required: true,
          helperText: "Default recommendation: Headteacher or DOS.",
        },
        {
          key: "supportNeededFromOzeki",
          label: "Support needed from Ozeki",
          type: "multiselect",
          required: true,
          options: [
            { value: "refresher training", label: "Refresher training" },
            { value: "materials", label: "Materials" },
            { value: "coaching follow-up", label: "Coaching follow-up" },
            { value: "assessment setup", label: "Assessment setup" },
          ],
        },
        {
          key: "visitAssessmentPlan",
          label: "Assessment actions agreed",
          type: "textarea",
          helperText:
            "Capture any baseline/progress/endline assessment actions linked to this visit.",
        },
      ],
    },
    {
      id: "leadershipMeeting",
      title: "Headteacher / DOS meeting summary",
      fields: [
        {
          key: "leadershipMeetingHeld",
          label: "Meeting held?",
          type: "select",
          required: true,
          options: [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ],
        },
        {
          key: "leadershipAttendeesContactIds",
          label: "Attendees",
          type: "multiselect",
          options: [],
          helperText: "Select from school contacts (Proprietor/HT/DOS/Teacher).",
        },
        {
          key: "leadershipSummary",
          label: "Summary of conversation",
          type: "textarea",
          required: true,
        },
        {
          key: "leadershipAgreements",
          label: "Agreements made",
          type: "textarea",
          required: true,
        },
        {
          key: "leadershipRisks",
          label: "Risks/barriers discussed",
          type: "textarea",
          required: true,
        },
        {
          key: "leadershipNextActionsJson",
          label: "Next actions + owner + due date",
          type: "text",
          required: true,
        },
        {
          key: "leadershipNextVisitDate",
          label: "Next visit date",
          type: "date",
          required: true,
        },
      ],
    },
    {
      id: "visitInsights",
      title: "Step 4: Submit & Follow-up",
      fields: [
        {
          key: "visitPathway",
          label: "Visit pathway (auto)",
          type: "text",
          helperText: "Auto-calculated from implementation status.",
        },
        ...standardizedInsightSection.fields,
        { key: "evidenceNotes", label: "Evidence notes", type: "textarea" },
      ],
    },
  ],
};

const assessmentConfig: PortalModuleConfig = {
  module: "assessment",
  route: "/portal/assessments",
  navLabel: "Assessments",
  pageTitle: "Assessments",
  description:
    "Capture mastery-based learner reading assessments with traffic-light outputs and benchmarked reading stages.",
  newLabel: "+ New Assessment",
  programTypeLabel: "Type",
  programTypeOptions: [
    { value: "Baseline", label: "Baseline" },
    { value: "Year 1", label: "Year 1" },
    { value: "Year 2", label: "Year 2" },
    { value: "Year 3 (Endline)", label: "Year 3 (Endline)" },
  ],
  sections: [
    {
      id: "basics",
      title: "SECTION A: SCHOOL INFORMATION",
      fields: [
        { key: "emisCode", label: "EMIS Code", type: "text", required: true },
        { key: "subCounty", label: "Sub-county", type: "text", required: true },
        { key: "parish", label: "Parish", type: "text", required: true },
        {
          key: "classLevel", label: "Class", type: "select", required: true, options: [
            { value: "Baby", label: "Baby" },
            { value: "Middle", label: "Middle" },
            { value: "Top", label: "Top" },
            { value: "P1", label: "P1" },
            { value: "P2", label: "P2" },
            { value: "P3", label: "P3" },
          ]
        },
        {
          key: "term", label: "Term", type: "select", required: true, options: [
            { value: "Term 1", label: "Term 1" },
            { value: "Term 2", label: "Term 2" },
            { value: "Term 3", label: "Term 3" },
          ]
        },
        { key: "assessor", label: "Assessor", type: "text", required: true },
        { key: "village", label: "Village (optional)", type: "text" },
        ...sponsorshipFields,
      ],
    },
    {
      id: "program",
      title: "SECTION B: LEARNER-LEVEL ASSESSMENT RECORD",
      fields: [
        {
          key: "egraLearners",
          label: "Learner table",
          type: "egraLearners",
          required: true,
          helperText:
            "Enter up to 20 learners using the six-domain mastery rubric (Green/Amber/Red).",
        },
      ],
    },
    {
      id: "results",
      title: "SECTION C: MASTERY SUMMARY",
      fields: [
        {
          key: "egraSummary",
          label: "Domain mastery snapshot",
          type: "egraSummary",
        },
      ],
    },
    {
      id: "actions",
      title: "SECTION D: READING STAGE PROFILE",
      fields: [
        {
          key: "egraProfile",
          label: "Reading stage distribution",
          type: "egraProfile",
        },
      ],
    },
    {
      id: "recommendations",
      title: "SECTION E: INSTRUCTIONAL RECOMMENDATIONS",
      fields: [
        {
          key: "instructionalRecommendations",
          label: "Instructional recommendations",
          type: "multiselect",
          options: [
            {
              value: "Red in foundational domains - Remedial & Catch-Up Reading Interventions",
              label: "Foundational domains Red",
            },
            {
              value: "Amber in Word Recognition & Fluency - Fluency strengthening",
              label: "Fluency domain Amber",
            },
            {
              value: "Green decoding with weak comprehension - Comprehension instruction focus",
              label: "Comprehension gap",
            },
            {
              value: "Mostly Green across foundational domains - Progressing / Graduation Prep",
              label: "Progressing / Graduation Prep",
            },
          ],
        },
        {
          key: "assessorComments",
          label: "Assessor comments",
          type: "textarea",
          helperText:
            "Mastery outputs are generated from accuracy, latency, attempts, and support signals.",
        },
      ],
    },
    {
      ...standardizedInsightSection,
      id: "assessmentInsights",
      title: "SECTION F: KEY FINDINGS & NEXT STEPS",
    },
    performanceSection,
    {
      id: "evidence",
      title: "Section G: Evidence Uploads",
      fields: [{ key: "evidenceNotes", label: "Evidence notes", type: "textarea" }],
    },
  ],
};

const storyConfig: PortalModuleConfig = {
  module: "story",
  route: "/portal/story",
  navLabel: "1001 Story",
  pageTitle: "1001 Story",
  description:
    "Track school-based writing support, draft progression, anthology readiness, and learner outcomes.",
  newLabel: "+ New 1001 Story Support",
  programTypeLabel: "Activity type",
  programTypeOptions: [
    { value: "Teacher orientation", label: "Teacher orientation" },
    { value: "Story writing session", label: "Story writing session" },
    { value: "Draft review", label: "Draft review" },
    { value: "Editing support", label: "Editing support" },
    { value: "Compilation progress", label: "Compilation progress" },
  ],
  sections: [
    {
      id: "basics",
      title: "Section 1: Basics",
      fields: [
        { key: "subCounty", label: "Sub-county", type: "text", required: true },
        { key: "parish", label: "Parish", type: "text", required: true },
        { key: "village", label: "Village (optional)", type: "text" },
        ...sponsorshipFields,
        { key: "grades", label: "Grade(s)", type: "text" },
        { key: "learnersInvolved", label: "# learners involved", type: "number", min: 0 },
        { key: "storiesDrafted", label: "# stories drafted", type: "number", min: 0 },
      ],
    },
    {
      id: "program",
      title: "Section 2: Program Details",
      fields: [
        {
          key: "theme",
          label: "Theme used",
          type: "select",
          options: [
            { value: "My community", label: "My community" },
            { value: "My future", label: "My future" },
            { value: "Environment", label: "Environment" },
            { value: "Leadership", label: "Leadership" },
            { value: "Other", label: "Other" },
          ],
        },
        { key: "customTheme", label: "Custom theme (if other)", type: "text" },
        { key: "teacherSupportGiven", label: "Teacher support given", type: "textarea" },
      ],
    },
    {
      id: "results",
      title: "Section 3: Results / Scores",
      fields: [
        { key: "structureScore", label: "Structure score (1-5)", type: "number", min: 1, max: 5 },
        {
          key: "vocabularyScore",
          label: "Vocabulary score (1-5)",
          type: "number",
          min: 1,
          max: 5,
        },
        { key: "spellingScore", label: "Spelling score (1-5)", type: "number", min: 1, max: 5 },
        { key: "clarityScore", label: "Clarity score (1-5)", type: "number", min: 1, max: 5 },
        {
          key: "commonGaps",
          label: "Common gaps noticed",
          type: "multiselect",
          options: [
            { value: "Sentence structure", label: "Sentence structure" },
            { value: "Punctuation", label: "Punctuation" },
            { value: "Spelling", label: "Spelling" },
            { value: "Vocabulary depth", label: "Vocabulary depth" },
          ],
        },
      ],
    },
    {
      id: "actions",
      title: "Section 4: Actions & Follow-up",
      fields: [
        { key: "nextSteps", label: "Next steps", type: "textarea" },
        { key: "storiesReceived", label: "Stories received", type: "number", min: 0 },
        {
          key: "storiesApproved",
          label: "Stories approved for anthology",
          type: "number",
          min: 0,
        },
        {
          key: "editingStatus",
          label: "Editing status",
          type: "select",
          options: [
            { value: "Not started", label: "Not started" },
            { value: "In progress", label: "In progress" },
            { value: "Completed", label: "Completed" },
          ],
        },
        {
          key: "bookStatus",
          label: "Book status",
          type: "select",
          options: [
            { value: "Layout", label: "Layout" },
            { value: "Proof", label: "Proof" },
            { value: "Print", label: "Print" },
            { value: "Distributed", label: "Distributed" },
          ],
        },
      ],
    },
    {
      ...standardizedInsightSection,
      id: "storyInsights",
      title: "Section 5: Key Findings & Next Steps",
    },
    {
      id: "evidence",
      title: "Section 6: Evidence Uploads",
      fields: [{ key: "evidenceNotes", label: "Evidence notes", type: "textarea" }],
    },
  ],
};

export const portalModuleConfigs: PortalModuleConfig[] = [
  trainingConfig,
  visitConfig,
  assessmentConfig,
  storyConfig,
];

export const portalModuleConfigByModule: Record<PortalRecordModule, PortalModuleConfig> = {
  training: trainingConfig,
  visit: visitConfig,
  assessment: assessmentConfig,
  story: storyConfig,
  story_activity: {
    ...storyConfig,
    module: "story_activity",
    navLabel: "Story Activities",
    pageTitle: "Story Activities",
    newLabel: "+ New Story Activity",
  },
};

export const portalStatusOptions = [
  { value: "Draft", label: "Draft" },
  { value: "Submitted", label: "Submitted" },
  { value: "Returned", label: "Returned" },
  { value: "Approved", label: "Approved" },
] as const;
