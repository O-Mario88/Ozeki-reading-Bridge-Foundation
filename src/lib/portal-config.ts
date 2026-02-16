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

const trainingConfig: PortalModuleConfig = {
  module: "training",
  route: "/portal/trainings",
  navLabel: "Trainings",
  pageTitle: "Trainings",
  description:
    "Log teacher professional development sessions and track quality, participation, and follow-up actions.",
  newLabel: "+ New Training",
  programTypeLabel: "Training type",
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
      title: "Section 1: Basics",
      fields: [
        { key: "startTime", label: "Start time", type: "time", required: true },
        { key: "endTime", label: "End time", type: "time", required: true },
        { key: "subCounty", label: "Sub-county", type: "text", required: true },
        { key: "parish", label: "Parish", type: "text", required: true },
        { key: "village", label: "Village (optional)", type: "text" },
        { key: "gpsLocation", label: "GPS (optional)", type: "text" },
      ],
    },
    {
      id: "program",
      title: "Section 2: Program Details",
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
            "Capture participant name, school attached to, role (Teacher or Leader), and phone contact.",
        },
        { key: "facilitators", label: "Facilitators", type: "text", required: true },
      ],
    },
    {
      id: "results",
      title: "Section 3: Results / Scores",
      fields: [
        {
          key: "numberAttended",
          label: "Number attended",
          type: "number",
          required: true,
          min: 0,
        },
        { key: "femaleCount", label: "Female attended", type: "number", min: 0 },
        { key: "maleCount", label: "Male attended", type: "number", min: 0 },
        {
          key: "preTestAverage",
          label: "Pre-test average (%)",
          type: "number",
          min: 0,
          max: 100,
        },
        {
          key: "postTestAverage",
          label: "Post-test average (%)",
          type: "number",
          min: 0,
          max: 100,
        },
        { key: "testedCount", label: "# tested", type: "number", min: 0 },
      ],
    },
    {
      id: "actions",
      title: "Section 4: Actions & Follow-up",
      fields: [
        { key: "challenges", label: "Challenges / risks", type: "textarea" },
        { key: "actionPoints", label: "Action points agreed", type: "textarea" },
        { key: "followUpFocus", label: "Follow-up focus", type: "text" },
      ],
    },
    {
      id: "evidence",
      title: "Section 5: Evidence Uploads",
      fields: [
        {
          key: "evidenceNotes",
          label: "Evidence notes",
          type: "textarea",
          placeholder: "Attendance sheet, photos, or observations summary.",
        },
      ],
    },
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
    "Ozeki Reading Bridge Foundation Lesson Observation Sheet (Nursery and Primary Classes). Use this to log school visits, teacher performance, and coaching decisions for professional development and progress reporting.",
  newLabel: "+ New School Visit",
  programTypeLabel: "Visit purpose",
  programTypeOptions: [
    { value: "Coaching", label: "Coaching" },
    { value: "Observation", label: "Observation" },
    { value: "Mentorship", label: "Mentorship" },
    { value: "Literacy routine setup", label: "Literacy routine setup" },
    { value: "Leadership support", label: "Leadership support" },
  ],
  sections: [
    {
      id: "basics",
      title: "Header details",
      fields: [
        {
          key: "teacherObserved",
          label: "Teacher",
          type: "text",
          required: true,
          helperText:
            "Form title: Ozeki Reading Bridge Foundation Lesson Observation Sheet (Nursery and Primary Classes). School is captured from the selected school account above.",
        },
        {
          key: "classLevel",
          label: "Class",
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
            { value: "Nursery - Baby", label: "Nursery - Baby" },
            { value: "Nursery - Middle", label: "Nursery - Middle" },
            { value: "Nursery - Top", label: "Nursery - Top" },
          ],
        },
        { key: "classSize", label: "Class size", type: "number", min: 0 },
        {
          key: "startTime",
          label: "Visit start time",
          type: "time",
          required: true,
          helperText: "Date is captured in the visit metadata above.",
        },
        { key: "endTime", label: "Visit end time", type: "time", required: true },
        { key: "subCounty", label: "Sub-county", type: "text", required: true },
        { key: "parish", label: "Parish", type: "text", required: true },
        { key: "village", label: "Village (optional)", type: "text" },
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
      id: "actions",
      title: "Actions, feedback and follow-up",
      fields: [
        { key: "strengthsObserved", label: "Strengths observed", type: "textarea" },
        { key: "gapsIdentified", label: "Gaps identified", type: "textarea" },
        { key: "coachingProvided", label: "Coaching provided", type: "textarea" },
        {
          key: "teacherActions",
          label: "Agreed teacher actions (max 3)",
          type: "textarea",
        },
        { key: "nextVisitFocus", label: "Next visit focus", type: "text" },
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
    "Capture Early Grade Reading Assessment (EGRA) baseline data with learner-level records and school summaries.",
  newLabel: "+ New Assessment",
  programTypeLabel: "Type",
  programTypeOptions: [
    { value: "Baseline", label: "BASELINE" },
    { value: "Progress", label: "Progress" },
    { value: "Endline", label: "Endline" },
  ],
  sections: [
    {
      id: "basics",
      title: "SECTION A: SCHOOL INFORMATION",
      fields: [
        { key: "emisCode", label: "EMIS Code", type: "text", required: true },
        { key: "subCounty", label: "Sub-county", type: "text", required: true },
        { key: "parish", label: "Parish", type: "text", required: true },
        { key: "classLevel", label: "Class", type: "select", required: true, options: [
          { value: "Baby", label: "Baby" },
          { value: "Middle", label: "Middle" },
          { value: "Top", label: "Top" },
          { value: "P1", label: "P1" },
          { value: "P2", label: "P2" },
          { value: "P3", label: "P3" },
        ] },
        { key: "term", label: "Term", type: "select", required: true, options: [
          { value: "Term 1", label: "Term 1" },
          { value: "Term 2", label: "Term 2" },
          { value: "Term 3", label: "Term 3" },
        ] },
        { key: "assessor", label: "Assessor", type: "text", required: true },
        { key: "village", label: "Village (optional)", type: "text" },
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
          helperText: "Enter up to 20 learners, matching the baseline assessment sheet.",
        },
      ],
    },
    {
      id: "results",
      title: "SECTION C: SCHOOL SUMMARY",
      fields: [
        {
          key: "egraSummary",
          label: "Baseline snapshot",
          type: "egraSummary",
        },
      ],
    },
    {
      id: "actions",
      title: "SECTION D: READING PROFILE",
      fields: [
        {
          key: "egraProfile",
          label: "Reading level profile",
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
              value: "Majority are Non-Readers - Focus on phonemic awareness plus letter sounds",
              label: "Majority are Non-Readers",
            },
            {
              value: "Weak in Made-up Words - Strengthen decoding instruction",
              label: "Weak in Made-up Words",
            },
            {
              value: "Low comprehension with good story reading - Work on vocabulary plus questioning",
              label: "Low comprehension with good story reading",
            },
            {
              value: "Fluency plateau - Increase guided repeated reading",
              label: "Fluency plateau",
            },
          ],
        },
        {
          key: "assessorComments",
          label: "Assessor comments",
          type: "textarea",
          helperText:
            "Accuracy formula reference: Accuracy % = (Correct Words / (Correct Words + Errors)) x 100",
        },
      ],
    },
    {
      id: "evidence",
      title: "Section 5: Evidence Uploads",
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
      id: "evidence",
      title: "Section 5: Evidence Uploads",
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
};

export const portalStatusOptions = [
  { value: "Draft", label: "Draft" },
  { value: "Submitted", label: "Submitted" },
  { value: "Returned", label: "Returned" },
  { value: "Approved", label: "Approved" },
] as const;
