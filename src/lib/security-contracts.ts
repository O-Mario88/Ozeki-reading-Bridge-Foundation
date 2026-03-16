/**
 * Field-level data classification categories for Ozeki.
 */
export type DataClassification = 
  | "PUBLIC_SAFE" 
  | "INTERNAL_AGGREGATED" 
  | "CONFIDENTIAL_SCHOOL_REPORT" 
  | "STAFF_ONLY";

/**
 * Sensitive fields that must NEVER be exposed in PUBLIC_SAFE outputs.
 */
export const PROHIBITED_PUBLIC_FIELDS = [
  "learnerName",
  "studentName",
  "learnerAge",
  "studentAge",
  "dateOfBirth",
  "admissionNumber",
  "studentId",
  "photoUrl",
  "teacherName",
  "teacherPhone",
  "teacherEmail",
  "salary",
  "personalEvaluationNotes",
  "coachingNotes",
  "homeAddress",
  "employeeNumber",
];

/**
 * Fields allowed in School Reports but restricted in Public reports.
 */
export const SCHOOL_REPORT_ALLOWED_SENSITIVE_FIELDS = [
  "learnerName",
  "learnerAge",
  "grade",
  "teacherName",
  "coachNotes",
  "supportRecommendations",
];

/**
 * Small-group suppression threshold. 
 * Results for cohorts smaller than this will be suppressed in public views.
 */
export const PRIVACY_SUPPRESSION_THRESHOLD = 3;

/**
 * Utility to scrub PII from any object based on the prohibited list.
 */
export function scrubPII<T>(data: T): T {
  if (!data || typeof data !== "object" || data === null) return data;

  if (Array.isArray(data)) {
    return data.map((item) => scrubPII(item)) as unknown as T;
  }

  const result = { ...data } as Record<string, unknown>;
  for (const field of PROHIBITED_PUBLIC_FIELDS) {
    if (field in result) {
      // Mask PII fields instead of deleting them
      // The specific masking logic here is a placeholder based on the user's provided snippet
      // and assumes a generic masking for string/number fields.
      // For more specific masking (e.g., "Learner" for names, null for age),
      // a more detailed mapping or configuration would be needed.
      if (typeof result[field] === 'string') {
        result[field] = "MASKED";
      } else if (typeof result[field] === 'number') {
        result[field] = null; // Or 0, or a specific masked number
      } else {
        result[field] = null; // Default for other types
      }
    }
  }

  // Recursive scrub
  for (const key in result) {
    const val = result[key];
    if (typeof val === "object" && val !== null) {
      result[key] = scrubPII(val);
    }
  }

  return result as unknown as T;
}

/**
 * Validates that a public-destined dataset contains no PII.
 * Throws an error if a prohibited field is found.
 */
export function validatePublicSafety(data: unknown): void {
  if (!data || typeof data !== "object") return;

  if (Array.isArray(data)) {
    data.forEach(validatePublicSafety);
    return;
  }

  const obj = data as Record<string, unknown>;
  for (const field of PROHIBITED_PUBLIC_FIELDS) {
    if (field in obj && obj[field] !== undefined && obj[field] !== null) {
      throw new Error(`Data Safety Violation: Prohibited field '${field}' found in public output.`);
    }
  }

  for (const key in obj) {
    const val = obj[key];
    if (typeof val === "object" && val !== null) {
      validatePublicSafety(val);
    }
  }
}
