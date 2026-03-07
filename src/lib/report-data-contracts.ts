import {
  ImpactReportAudience,
  ImpactReportProgramType,
  ImpactReportScopeType,
  ReportCategory,
} from "@/lib/types";

export type ReportContractSection = {
  id: string;
  title: string;
  required: boolean;
};

export type ReportDataContract = {
  category: ReportCategory;
  programsIncluded: ImpactReportProgramType[];
  sources: string[];
  fields: string[];
  sections: ReportContractSection[];
};

export const REPORT_CATEGORIES: ReportCategory[] = [
  "Assessment Report",
  "Training Report",
  "School Coaching Visit Report",
  "Teaching Quality Report (Lesson Evaluations)",
  "Remedial & Catch-Up Intervention Report",
  "1001 Story Project Report",
  "Implementation Fidelity & Coverage Report",
  "District Literacy Brief",
  "Graduation Readiness & Alumni Monitoring Report",
  "Partner/Donor Report (Scoped)",
  "Data Quality & Credibility Report",
  "School Profile Report (Headteacher Pack)",
];

const standardNarrativeSections: ReportContractSection[] = [
  { id: "key-findings", title: "Key Findings", required: true },
  { id: "what-went-well", title: "What Went Well", required: true },
  { id: "challenges", title: "Challenges", required: true },
  { id: "recommendations", title: "Recommendations (REC Mapped)", required: true },
  { id: "conclusions-next-steps", title: "Conclusions + Next Steps", required: true },
  { id: "data-trust", title: "Data Trust Footer", required: true },
];

export const report_data_contracts: Record<ReportCategory, ReportDataContract> = {
  "Assessment Report": {
    category: "Assessment Report",
    programsIncluded: ["assessment"],
    sources: ["assessment_sessions", "assessment_session_results", "assessment_records"],
    fields: [
      "assessment_sessions_count",
      "schools_assessed_count",
      "learners_assessed_n",
      "domain_outcomes",
      "reading_level_distribution",
      "baseline_progress_endline",
      "completeness",
      "tool_version",
      "last_updated",
    ],
    sections: standardNarrativeSections,
  },
  "Training Report": {
    category: "Training Report",
    programsIncluded: ["training"],
    sources: ["portal_records", "portal_training_attendance", "training_feedback_entries"],
    fields: [
      "training_sessions_count",
      "schools_represented_count",
      "participants_by_role",
      "participants_by_gender",
      "teachers_by_class_subject",
      "geography_breakdown",
      "follow_up_plan",
      "feedback_summaries",
      "challenges_recommendations",
      "last_updated",
    ],
    sections: standardNarrativeSections,
  },
  "School Coaching Visit Report": {
    category: "School Coaching Visit Report",
    programsIncluded: ["visit", "assessment"],
    sources: ["portal_records", "coaching_visits", "visit_demo", "visit_leadership_meeting"],
    fields: [
      "visits_count",
      "schools_visited",
      "lessons_observed_count",
      "grades_observed_distribution",
      "key_findings_themes",
      "what_went_well",
      "challenges",
      "recommendations_rec",
      "follow_up_schedule",
      "aligned_outcome_trends",
      "last_updated",
    ],
    sections: standardNarrativeSections,
  },
  "Teaching Quality Report (Lesson Evaluations)": {
    category: "Teaching Quality Report (Lesson Evaluations)",
    programsIncluded: ["visit", "assessment"],
    sources: ["lesson_evaluations", "lesson_evaluation_items", "teacher_support_status_snapshots"],
    fields: [
      "lesson_evaluations_n",
      "overall_quality_average",
      "quality_distribution",
      "domain_averages",
      "teacher_improvement_trends",
      "teacher_support_status_counts",
      "last_updated",
    ],
    sections: standardNarrativeSections,
  },
  "Remedial & Catch-Up Intervention Report": {
    category: "Remedial & Catch-Up Intervention Report",
    programsIncluded: ["assessment", "visit", "training"],
    sources: [
      "school_support_status_snapshots",
      "assessment_session_results",
      "portal_records",
      "coaching_visits",
    ],
    fields: [
      "schools_flagged_count",
      "learner_groups_or_proxy",
      "intervention_actions_logged",
      "non_readers_reduction",
      "cwpm_20_plus_reach",
      "fidelity_indicators",
      "recommendations",
      "last_updated",
    ],
    sections: standardNarrativeSections,
  },
  "1001 Story Project Report": {
    category: "1001 Story Project Report",
    programsIncluded: ["story", "assessment"],
    sources: ["story_activities", "story_library", "story_anthologies", "story_views"],
    fields: [
      "participating_schools_count",
      "story_sessions_count",
      "stories_published_count",
      "anthologies_count",
      "participation_trend",
      "engagement_metrics",
      "story_library_link",
      "aligned_literacy_outcomes",
      "last_updated",
    ],
    sections: standardNarrativeSections,
  },
  "Implementation Fidelity & Coverage Report": {
    category: "Implementation Fidelity & Coverage Report",
    programsIncluded: ["training", "visit", "assessment", "story"],
    sources: [
      "portal_records",
      "coaching_visits",
      "assessment_sessions",
      "story_activities",
      "lesson_evaluations",
    ],
    fields: [
      "implementation_funnel",
      "coverage_rates",
      "coaching_intensity",
      "teacher_eval_coverage",
      "data_completeness",
      "bottleneck_analysis",
      "last_updated",
    ],
    sections: standardNarrativeSections,
  },
  "District Literacy Brief": {
    category: "District Literacy Brief",
    programsIncluded: ["assessment", "visit", "training"],
    sources: ["assessment_session_results", "portal_records", "school_support_status_snapshots"],
    fields: [
      "reading_levels_distribution",
      "reading_levels_movement",
      "domain_outcomes",
      "benchmark_attainment",
      "priority_schools",
      "risk_flags",
      "top_3_actions_rec",
      "coverage_completeness_n",
      "next_month_plan",
      "last_updated",
    ],
    sections: standardNarrativeSections,
  },
  "Graduation Readiness & Alumni Monitoring Report": {
    category: "Graduation Readiness & Alumni Monitoring Report",
    programsIncluded: ["assessment", "visit", "story", "training"],
    sources: [
      "school_graduation_eligibility_cache",
      "school_graduation_workflow",
      "story_library",
      "lesson_evaluations",
    ],
    fields: [
      "readiness_status_counts",
      "eligibility_scorecard_aggregates",
      "threshold_evidence",
      "eligible_school_list",
      "monitoring_signals",
      "last_updated",
    ],
    sections: standardNarrativeSections,
  },
  "Partner/Donor Report (Scoped)": {
    category: "Partner/Donor Report (Scoped)",
    programsIncluded: ["training", "visit", "assessment", "story", "resources"],
    sources: [
      "portal_records",
      "portal_evidence",
      "assessment_session_results",
      "story_library",
      "download_leads",
    ],
    fields: [
      "partner_scope",
      "outputs_summary",
      "outcomes_summary",
      "approved_media",
      "next_quarter_plan",
      "funding_menu_reference",
      "last_updated",
    ],
    sections: standardNarrativeSections,
  },
  "Data Quality & Credibility Report": {
    category: "Data Quality & Credibility Report",
    programsIncluded: ["training", "visit", "assessment", "story"],
    sources: ["portal_records", "assessment_session_results", "assessment_sessions"],
    fields: [
      "completeness_percent",
      "missingness_by_field",
      "sample_sizes",
      "tool_versions",
      "outliers_anomalies_counts",
      "audit_exception_queue_summary",
      "confidence_rating_by_district",
      "last_updated",
    ],
    sections: standardNarrativeSections,
  },
  "School Profile Report (Headteacher Pack)": {
    category: "School Profile Report (Headteacher Pack)",
    programsIncluded: ["assessment", "visit", "training", "story"],
    sources: [
      "schools_directory",
      "school_contacts",
      "assessment_session_results",
      "lesson_evaluations",
      "story_activities",
      "activity_insights",
    ],
    fields: [
      "school_profile",
      "learner_outcomes_latest",
      "teaching_quality_summary",
      "teacher_support_needs",
      "intervention_plan",
      "follow_up_schedule",
      "story_participation_summary",
      "priority_actions_30_days",
      "last_updated",
    ],
    sections: standardNarrativeSections,
  },
};

export function getReportDataContract(category: ReportCategory): ReportDataContract {
  return report_data_contracts[category];
}

export function programsFromReportCategory(category: ReportCategory): ImpactReportProgramType[] {
  return [...report_data_contracts[category].programsIncluded];
}

export function canIncludeTeacherIdentifiers(args: {
  category?: ReportCategory;
  audience?: ImpactReportAudience;
  scopeType: ImpactReportScopeType;
}) {
  if (args.audience !== "Staff-only") {
    return false;
  }
  if (args.scopeType !== "School") {
    return false;
  }
  if (!args.category) {
    return false;
  }
  return (
    args.category === "School Profile Report (Headteacher Pack)" ||
    args.category === "School Coaching Visit Report"
  );
}
