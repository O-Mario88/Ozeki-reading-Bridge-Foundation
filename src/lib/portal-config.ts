import { EXTENDED_RECOMMENDATION_CATALOG } from "@/lib/recommendations";
import { PortalRecordModule } from "@/lib/types";
import { approvedRegionLabels, ugandaRegions } from "@/lib/uganda-locations";

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
      title: "Training Info",
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
            { value: "Postponed", label: "Postponed" },
            { value: "Cancelled", label: "Cancelled" },
          ],
        },
        { key: "trainingName", label: "Training name", type: "text", required: true },
        {
          key: "trainingRegion",
          label: "Region",
          type: "select",
          required: true,
          options: approvedRegionLabels.map((r) => ({ value: r, label: r })),
        },
      ],
    },
    {
      id: "details",
      title: "Additional Details (optional)",
      collapsible: true,
      fields: [
        {
          key: "trainingOrganization",
          label: "Training organization",
          type: "text",
          placeholder: "e.g. Ozeki Reading Bridge Foundation",
        },
        {
          key: "trainingPresenter",
          label: "Training presenter",
          type: "text",
          placeholder: "Lead presenter or facilitator",
        },
        {
          key: "deliveryMode",
          label: "Training type",
          type: "select",
          options: [
            { value: "In-Person", label: "In-Person" },
            { value: "Virtual (Online)", label: "Virtual (Online)" },
            { value: "Hybrid", label: "Hybrid" },
            { value: "Field-Based", label: "Field-Based" },
          ],
        },
        { key: "startTime", label: "Start time", type: "time" },
        { key: "endTime", label: "End time", type: "time" },
        {
          key: "trainingSubRegion",
          label: "Sub-Region",
          type: "select",
          options: ugandaRegions.flatMap((r) =>
            r.subRegions.map((sr) => ({ value: sr.subRegion, label: sr.subRegion })),
          ),
        },
        {
          key: "trainingDistrict",
          label: "District",
          type: "select",
          options: ugandaRegions.flatMap((r) =>
            r.districts.map((d) => ({ value: d, label: d })),
          ),
        },
        { key: "trainingVenue", label: "Training venue", type: "text" },
        {
          key: "audience",
          label: "Audience",
          type: "select",
          options: [
            { value: "Teachers Only", label: "Teachers Only" },
            { value: "Head Teachers Only", label: "Head Teachers Only" },
            { value: "Teachers & Head Teachers", label: "Teachers & Head Teachers" },
            { value: "Community Members", label: "Community Members" },
            { value: "Mixed Audience", label: "Mixed Audience" },
          ],
        },
        {
          key: "objectivesCovered",
          label: "Objectives covered",
          type: "multiselect",
          options: [
            { value: "Phonics Instruction", label: "Phonics Instruction" },
            { value: "Reading Fluency", label: "Reading Fluency" },
            { value: "Comprehension Strategies", label: "Comprehension Strategies" },
            { value: "Lesson Planning", label: "Lesson Planning" },
            { value: "Classroom Management", label: "Classroom Management" },
            { value: "Use of Teaching Aids", label: "Use of Teaching Aids" },
            { value: "Learner Assessment Techniques", label: "Learner Assessment Techniques" },
            { value: "Storybook Integration", label: "Storybook Integration" },
            { value: "Community Engagement", label: "Community Engagement" },
            { value: "Inclusive Education Practices", label: "Inclusive Education Practices" },
          ],
        },
        {
          key: "modulesDelivered",
          label: "Modules delivered",
          type: "multiselect",
          options: [
            { value: "Module 1: Foundation Literacy", label: "Module 1: Foundation Literacy" },
            { value: "Module 2: Phonics & Decoding", label: "Module 2: Phonics & Decoding" },
            { value: "Module 3: Reading Practice", label: "Module 3: Reading Practice" },
            { value: "Module 4: Story Writing", label: "Module 4: Story Writing" },
            { value: "Module 5: Assessment Tools", label: "Module 5: Assessment Tools" },
            { value: "Module 6: Coaching & Mentoring", label: "Module 6: Coaching & Mentoring" },
            { value: "Module 7: School Leadership", label: "Module 7: School Leadership" },
            { value: "Module 8: Community Reading Clubs", label: "Module 8: Community Reading Clubs" },
          ],
        },
        { key: "facilitators", label: "Facilitators", type: "text" },
        {
          key: "trainingLanguage",
          label: "Training language",
          type: "select",
          options: [
            { value: "English", label: "English" },
            { value: "Luganda", label: "Luganda" },
            { value: "Ateso", label: "Ateso" },
            { value: "Luo", label: "Luo" },
            { value: "Runyankole", label: "Runyankole" },
            { value: "Other", label: "Other" },
          ],
        },
        {
          key: "trainerRecommendations",
          label: "Trainer recommendations",
          type: "multiselect",
          options: [
            { value: "Schedule follow-up coaching visit", label: "Schedule follow-up coaching visit" },
            { value: "Provide additional teaching aids", label: "Provide additional teaching aids" },
            { value: "Pair with mentor teacher", label: "Pair with mentor teacher" },
            { value: "Recommend for advanced training", label: "Recommend for advanced training" },
            { value: "Monitor classroom implementation", label: "Monitor classroom implementation" },
            { value: "Refer to school leadership for support", label: "Refer to school leadership for support" },
            { value: "No immediate action needed", label: "No immediate action needed" },
          ],
        },
        {
          key: "trainingFeedbackBundleJson",
          label: "Participants & Facilitator Feedback",
          type: "text",
          helperText:
            "Capture participant feedback and facilitator observations.",
        },
        {
          key: "followUpDate",
          label: "Follow-up date",
          type: "date",
        },
        {
          key: "preTestAverage",
          label: "Pre-test average (%)",
          type: "number",
          min: 0,
          max: 100,
        },
        ...sponsorshipFields.map((f) => ({ ...f, required: false })),
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
      title: "Visit Context",
      fields: [
        {
          key: "visitStatus",
          label: "Visit status",
          type: "select",
          required: true,
          options: [
            { value: "scheduled", label: "Scheduled" },
            { value: "completed", label: "Completed" },
          ],
        },
        {
          key: "implementationStatus",
          label:
            "Has the school started implementing the reading method?",
          type: "select",
          required: true,
          options: [
            { value: "started", label: "Yes — Implementation has started" },
            { value: "not_started", label: "No — Not yet started" },
            { value: "partial", label: "Partially — Started in some classes only" },
          ],
        },
      ],
    },
    {
      id: "lessonDemo",
      title: "Demo Lesson",
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
        { key: "demoFocus", label: "Demo focus", type: "text" },
        { key: "demoMinutes", label: "Period length (minutes)", type: "number", min: 1 },
      ],
    },
    {
      id: "visitDetails",
      title: "Detailed Visit Data (optional)",
      collapsible: true,
      fields: [
        { key: "visitName", label: "Visit name", type: "text" },
        {
          key: "visitedBy",
          label: "Visited by",
          type: "text",
          helperText: "Auto-filled from the signed-in user.",
        },
        {
          key: "visitReasons",
          label: "Reason for visit",
          type: "multiselect",
          options: [
            { value: "Meeting with Leadership", label: "Meeting with Leadership" },
            { value: "Assessment", label: "Assessment" },
            { value: "Coaching", label: "Coaching" },
            { value: "Support", label: "Support" },
            { value: "Classroom Observation", label: "Classroom Observation" },
          ],
        },
        { key: "startTime", label: "Time from", type: "time" },
        { key: "endTime", label: "Time to", type: "time" },
        {
          key: "visitContacts",
          label: "Visit contacts",
          type: "multiselect",
        },
        {
          key: "classesImplementing",
          label: "Classes implementing",
          type: "multiselect",
          options: [
            { value: "Baby Class", label: "Baby Class" },
            { value: "Middle Class", label: "Middle Class" },
            { value: "Top Class", label: "Top Class" },
            { value: "P1", label: "P1" },
            { value: "P2", label: "P2" },
            { value: "P3", label: "P3" },
            { value: "P4", label: "P4" },
            { value: "P5", label: "P5" },
            { value: "P6", label: "P6" },
            { value: "P7", label: "P7" },
          ],
        },
        { key: "teacherObserved", label: "Teacher observed", type: "text" },
        {
          key: "classLevel",
          label: "Class observed",
          type: "select",
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
          key: "general_revisedSoundsQuickly",
          label: "Revised sounds quickly",
          type: "select",
          options: observationRatingOptions,
        },
        {
          key: "general_qualityLessonPlanning",
          label: "Quality lesson planning",
          type: "select",
          options: observationRatingOptions,
        },
        {
          key: "general_choiceOfWords",
          label: "Good choice of words",
          type: "select",
          options: observationRatingOptions,
        },
        {
          key: "general_soundKnowledge",
          label: "Sound knowledge",
          type: "select",
          options: observationRatingOptions,
        },
        {
          key: "general_followsSoundOrder",
          label: "Follows sound order",
          type: "select",
          options: observationRatingOptions,
        },
        {
          key: "general_usesRangeOfResources",
          label: "Uses range of resources",
          type: "select",
          options: observationRatingOptions,
        },
        {
          key: "newSound_clearPronunciation",
          label: "Clear pronunciation",
          type: "select",
          options: observationRatingOptions,
        },
        {
          key: "newSound_handwritingFormation",
          label: "Handwriting/letter formation",
          type: "select",
          options: observationRatingOptions,
        },
        {
          key: "newSound_childrenSayWrite",
          label: "Children say and write new sound",
          type: "select",
          options: observationRatingOptions,
        },
        {
          key: "readingActivities_soundOutWords",
          label: "Sound out words",
          type: "select",
          options: observationRatingOptions,
        },
        {
          key: "readingActivities_pairGroupReading",
          label: "Pair/group reading",
          type: "select",
          options: observationRatingOptions,
        },
        {
          key: "readingActivities_teacherEncouragedDecoding",
          label: "Encouraged decoding",
          type: "select",
          options: observationRatingOptions,
        },
        {
          key: "readingActivities_activeEngagement",
          label: "Active engagement",
          type: "select",
          options: observationRatingOptions,
        },
        {
          key: "readingActivities_resourceVariety",
          label: "Resource variety",
          type: "select",
          options: observationRatingOptions,
        },
        {
          key: "trickyWords_taughtOrRevised",
          label: "Tricky words taught/revised",
          type: "select",
          options: trickyWordDefaultOptions,
        },
        {
          key: "trickyWords_sightWordSpeed",
          label: "Tricky words by sight",
          type: "select",
          options: trickyWordDefaultOptions,
        },
        { key: "strengthsObserved", label: "Key findings", type: "textarea" },
        { key: "gapsIdentified", label: "What went well", type: "textarea" },
        { key: "coachingProvided", label: "Challenges", type: "textarea" },
        { key: "teacherActions", label: "Recommendations / action points", type: "textarea" },
        { key: "nextVisitFocus", label: "Conclusions / next steps", type: "text" },
        {
          key: "demoComponents",
          label: "Demo approach used",
          type: "multiselect",
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
          key: "demoTeachersPresentContactIds",
          label: "Teacher(s) present for demo",
          type: "multiselect",
        },
        { key: "demoTakeawaysText", label: "Demo takeaways", type: "textarea" },
        {
          key: "leadershipMeetingHeld",
          label: "Leadership meeting held?",
          type: "select",
          options: [
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ],
        },
        { key: "leadershipSummary", label: "Leadership summary", type: "textarea" },
        { key: "leadershipAgreements", label: "Agreements made", type: "textarea" },
        { key: "leadershipRisks", label: "Risks/barriers", type: "textarea" },
        { key: "leadershipNextVisitDate", label: "Next visit date", type: "date" },
        { key: "implementationStartDate", label: "Implementation start date", type: "date" },
        { key: "visitAssessmentPlan", label: "Assessment actions agreed", type: "textarea" },
        { key: "evidenceNotes", label: "Evidence notes", type: "textarea" },
        ...sponsorshipFields.map((f) => ({ ...f, required: false })),
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
        {
          key: "surveyName",
          label: "Survey / tool name",
          type: "text",
          required: true,
          placeholder: "e.g. Annual School Assessment (Core)",
        },
        {
          key: "assessmentNumber",
          label: "Assessment number",
          type: "text",
          helperText: "Optional manual identifier. If blank, the system will generate one.",
        },
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
        {
          key: "assessmentAssessorName",
          label: "Assessor display name",
          type: "text",
          helperText: "Use when the profile/report should show a specific assessor name.",
        },
        {
          key: "assessmentContactName",
          label: "School contact",
          type: "text",
          helperText: "Head teacher, director, or focal teacher linked to the assessment session.",
        },
        {
          key: "reviewYear",
          label: "Review year",
          type: "select",
          required: true,
          options: [
            { value: "Baseline", label: "Baseline" },
            { value: "Year 1", label: "Year 1" },
            { value: "Year 2", label: "Year 2" },
            { value: "Year 3", label: "Year 3" },
            { value: "Endline", label: "Endline" },
          ],
        },
        {
          key: "trainingSessionName",
          label: "Linked training session",
          type: "text",
          helperText: "Optional link to the training session that prepared the school for this assessment.",
        },
        {
          key: "assessmentLanguage",
          label: "Assessment language",
          type: "select",
          required: true,
          options: [
            { value: "English", label: "English" },
            { value: "Luganda", label: "Luganda" },
            { value: "Luo", label: "Luo" },
            { value: "Ateso", label: "Ateso" },
            { value: "Runyankole", label: "Runyankole" },
            { value: "Other", label: "Other" },
          ],
        },
        {
          key: "collectionMethod",
          label: "Collection method",
          type: "select",
          required: true,
          options: [
            { value: "Form-based", label: "Form-based" },
            { value: "Tablet", label: "Tablet" },
            { value: "Paper", label: "Paper" },
            { value: "Imported", label: "Imported" },
          ],
        },
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
        {
          key: "totalQuestionsUnanswered",
          label: "Total questions unanswered",
          type: "number",
          min: 0,
          helperText: "Used on the assessment profile and data-quality reporting surfaces.",
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
      title: "Story Info",
      fields: [
        { key: "storyProjectName", label: "Project session name", type: "text", required: true },
        { key: "learnersInvolved", label: "# learners involved", type: "number", min: 0, required: true },
        { key: "storiesDrafted", label: "# stories drafted", type: "number", min: 0 },
        {
          key: "storiesApproved",
          label: "Stories approved for anthology",
          type: "number",
          min: 0,
          required: true,
        },
      ],
    },
    {
      id: "details",
      title: "Additional Details (optional)",
      collapsible: true,
      fields: [
        { key: "subCounty", label: "Sub-county", type: "text" },
        { key: "parish", label: "Parish", type: "text" },
        { key: "grades", label: "Grade(s)", type: "text" },
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
        { key: "projectLead", label: "Project lead", type: "text" },
        { key: "mentorContacts", label: "Mentor / teacher contacts", type: "text" },
        { key: "teacherSupportGiven", label: "Teacher support given", type: "textarea" },
        { key: "structureScore", label: "Structure score (1-5)", type: "number", min: 1, max: 5 },
        { key: "vocabularyScore", label: "Vocabulary score (1-5)", type: "number", min: 1, max: 5 },
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
        { key: "nextSteps", label: "Next steps", type: "textarea" },
        { key: "storiesReceived", label: "Stories received", type: "number", min: 0 },
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
        {
          key: "anthologyStage",
          label: "Anthology stage",
          type: "select",
          options: [
            { value: "Ideation", label: "Ideation" },
            { value: "Drafting", label: "Drafting" },
            { value: "Editing", label: "Editing" },
            { value: "Layout", label: "Layout" },
            { value: "Printing", label: "Printing" },
            { value: "Published", label: "Published" },
          ],
        },
        { key: "evidenceNotes", label: "Evidence notes", type: "textarea" },
      ],
    },
    {
      ...standardizedInsightSection,
      id: "storyInsights",
      title: "Key Findings & Next Steps",
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
