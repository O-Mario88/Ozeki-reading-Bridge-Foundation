import { PortalRecordModule } from "@/lib/types";

export type PortalFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "time"
  | "select"
  | "multiselect";

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
          key: "participantRoster",
          label: "Participants (Name | Role | Phone | Email)",
          type: "textarea",
          placeholder:
            "Jane Doe | Classroom teacher | +2567xxxxxxx | jane@school.org",
          helperText: "Enter one participant per line.",
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

const visitConfig: PortalModuleConfig = {
  module: "visit",
  route: "/portal/visits",
  navLabel: "Visits",
  pageTitle: "School Visits",
  description:
    "Capture coaching, observation, mentorship, and school support visits with structured rubric scoring.",
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
      title: "Section 1: Basics",
      fields: [
        { key: "startTime", label: "Start time", type: "time", required: true },
        { key: "endTime", label: "End time", type: "time", required: true },
        { key: "subCounty", label: "Sub-county", type: "text", required: true },
        { key: "parish", label: "Parish", type: "text", required: true },
        { key: "village", label: "Village (optional)", type: "text" },
        { key: "teacherObserved", label: "Teacher observed", type: "text" },
        { key: "gradeClass", label: "Grade / class", type: "text" },
      ],
    },
    {
      id: "program",
      title: "Section 2: Program Details",
      fields: [
        {
          key: "lessonType",
          label: "Lesson type",
          type: "select",
          options: [
            { value: "Phonics", label: "Phonics" },
            { value: "Fluency", label: "Fluency" },
            { value: "Comprehension", label: "Comprehension" },
            { value: "Remedial", label: "Remedial" },
          ],
        },
        { key: "subjectFocus", label: "Subject focus", type: "text" },
      ],
    },
    {
      id: "results",
      title: "Section 3: Results / Scores",
      fields: [
        {
          key: "lessonStructureFollowed",
          label: "Lesson structure followed",
          type: "select",
          options: [
            { value: "Yes", label: "Yes" },
            { value: "Partial", label: "Partial" },
            { value: "No", label: "No" },
          ],
        },
        {
          key: "phonicsRoutineCorrect",
          label: "Correct phonics routine",
          type: "select",
          options: [
            { value: "Yes", label: "Yes" },
            { value: "Partial", label: "Partial" },
            { value: "No", label: "No" },
          ],
        },
        {
          key: "learnerEngagement",
          label: "Learner engagement",
          type: "select",
          options: [
            { value: "Low", label: "Low" },
            { value: "Medium", label: "Medium" },
            { value: "High", label: "High" },
          ],
        },
        {
          key: "teachingAidsUse",
          label: "Use of teaching aids",
          type: "select",
          options: [
            { value: "Yes", label: "Yes" },
            { value: "Partial", label: "Partial" },
            { value: "No", label: "No" },
          ],
        },
        {
          key: "overallRating",
          label: "Overall rating (1-5)",
          type: "number",
          min: 1,
          max: 5,
          step: 1,
        },
      ],
    },
    {
      id: "actions",
      title: "Section 4: Actions & Follow-up",
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
      ],
    },
    {
      id: "evidence",
      title: "Section 5: Evidence Uploads",
      fields: [{ key: "evidenceNotes", label: "Evidence notes", type: "textarea" }],
    },
  ],
};

const assessmentConfig: PortalModuleConfig = {
  module: "assessment",
  route: "/portal/assessments",
  navLabel: "Assessments",
  pageTitle: "Assessments",
  description:
    "Capture baseline/progress/endline learner reading data and recommendations for targeted support.",
  newLabel: "+ New Assessment",
  programTypeLabel: "Assessment type",
  programTypeOptions: [
    { value: "Baseline", label: "Baseline" },
    { value: "Progress", label: "Progress" },
    { value: "Endline", label: "Endline" },
  ],
  sections: [
    {
      id: "basics",
      title: "Section 1: Basics",
      fields: [
        { key: "subCounty", label: "Sub-county", type: "text", required: true },
        { key: "parish", label: "Parish", type: "text", required: true },
        { key: "village", label: "Village (optional)", type: "text" },
        {
          key: "toolUsed",
          label: "Tool used",
          type: "select",
          options: [
            { value: "Paper", label: "Paper" },
            { value: "Digital", label: "Digital" },
            { value: "One Test App", label: "One Test App" },
          ],
        },
        { key: "gradesAssessed", label: "Grade(s) assessed", type: "text" },
        {
          key: "samplingMethod",
          label: "Sampling method",
          type: "select",
          options: [
            { value: "Whole class", label: "Whole class" },
            { value: "Sample", label: "Sample" },
          ],
        },
      ],
    },
    {
      id: "program",
      title: "Section 2: Program Details",
      fields: [
        { key: "learnersAssessed", label: "# learners assessed", type: "number", min: 0 },
        { key: "nonReaders", label: "Non-readers", type: "number", min: 0 },
        { key: "emergingReaders", label: "Emerging", type: "number", min: 0 },
        { key: "atLevelReaders", label: "At level", type: "number", min: 0 },
        { key: "aboveLevelReaders", label: "Above level", type: "number", min: 0 },
      ],
    },
    {
      id: "results",
      title: "Section 3: Results / Scores",
      fields: [
        { key: "wcpmAverage", label: "Average WCPM", type: "number", min: 0 },
        {
          key: "accuracyPercent",
          label: "Accuracy (%)",
          type: "number",
          min: 0,
          max: 100,
        },
        {
          key: "comprehensionAverage",
          label: "Comprehension average (%)",
          type: "number",
          min: 0,
          max: 100,
        },
        { key: "keyInsights", label: "Top 3 insights", type: "textarea" },
      ],
    },
    {
      id: "actions",
      title: "Section 4: Actions & Follow-up",
      fields: [
        { key: "recommendations", label: "Recommendations", type: "textarea" },
        {
          key: "followUpRequired",
          label: "Follow-up required",
          type: "select",
          options: [
            { value: "Yes", label: "Yes" },
            { value: "No", label: "No" },
          ],
        },
        { key: "storiesPublished", label: "Stories published", type: "number", min: 0 },
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
