"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { FloatingFormModal } from "@/components/FloatingFormModal";
import { submitJsonWithOfflineQueue } from "@/lib/offline-form-queue";
import { getSubRegionsByRegion, ugandaRegions } from "@/lib/uganda-locations";
import { SupportRequestUrgency, SupportType } from "@/lib/types";
import styles from "./HomeSupportRequestModal.module.css";

type HomeSupportRequestModalProps = {
  triggerLabel: string;
  title: string;
  description: string;
  triggerClassName?: string;
  presetMessage?: string;
  presetSupportTypes?: SupportType[];
  presetUrgency?: SupportRequestUrgency;
};

type RequesterType = "" | "school" | "partner_donor";

type SubmitState = {
  status: "idle" | "submitting" | "success" | "error";
  message: string;
};

type SchoolFormState = {
  schoolNameLocation: string;
  region: string;
  subRegion: string;
  district: string;
  contactName: string;
  contactRole: string;
  phone: string;
  email: string;
  whatsapp: string;
  supportNeeded: SupportType[];
  urgency: SupportRequestUrgency;
  readingChallenges: string[];
  requestDetails: string;
  consentFollowUp: boolean;
};

type PartnerFormState = {
  organizationName: string;
  contactName: string;
  roleTitle: string;
  email: string;
  phoneWhatsapp: string;
  website: string;
  partnershipInterest: string;
  otherInterest: string;
  region: string;
  subRegion: string;
  district: string;
  partnershipGoals: string[];
  budgetRange: string;
  preferredStart: string;
  evidencePreferences: string[];
  requestDetails: string;
  consentFollowUp: boolean;
};

type FormState = {
  requesterType: RequesterType;
  school: SchoolFormState;
  partner: PartnerFormState;
};

const REQUESTER_OPTIONS: Array<{ value: Exclude<RequesterType, "">; label: string }> = [
  { value: "school", label: "School" },
  { value: "partner_donor", label: "Partner/Donor" },
];

const SCHOOL_ROLE_OPTIONS = [
  "Proprietor",
  "Head Teacher",
  "Deputy Head Teacher",
  "DOS",
  "Teacher",
] as const;

const SCHOOL_SUPPORT_OPTIONS: Array<{ value: SupportType; label: string }> = [
  { value: "phonics training", label: "Phonics training" },
  { value: "coaching visit", label: "Coaching visit" },
  { value: "learner assessment", label: "Learner assessment" },
  { value: "remedial & catch-up support", label: "Remedial & catch-up support" },
  { value: "1001 story", label: "1001 Story activation" },
];

const URGENCY_OPTIONS: Array<{ value: SupportRequestUrgency; label: string }> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "this_term", label: "This term" },
  { value: "next_term", label: "Next term" },
];

const READING_CHALLENGE_OPTIONS = [
  "Many learners can't identify letter sounds",
  "Learners struggle to blend/segment",
  "Learners guess words instead of decoding",
  "Fluency is very low (slow word-by-word reading)",
  "Learners struggle to understand what they read",
  "Teachers need support to teach reading routines",
] as const;

const PARTNERSHIP_INTEREST_OPTIONS = [
  "Sponsor Uganda (National)",
  "Sponsor a Region (2 years)",
  "Sponsor a Sub-region (2 years)",
  "Sponsor a District (2 years)",
  "Sponsor Schools (select number)",
  "Other",
] as const;

const PARTNERSHIP_GOAL_OPTIONS = [
  "Improve early grade reading outcomes",
  "Reduce non-readers through catch-up intervention",
  "Improve teaching quality through coaching",
  "Strengthen leadership supervision routines",
  "Expand 1001 Story writing + publishing",
  "Build district/region evidence and reporting",
] as const;

const BUDGET_RANGE_OPTIONS = ["<UGX 50M", "UGX 50–100M", "UGX 100–250M", "UGX 250–500M", "UGX 500M+"] as const;

const PREFERRED_START_OPTIONS = ["Immediate", "Next term", "Next FY", "Not sure"] as const;

const EVIDENCE_PREFERENCE_OPTIONS = [
  "Quarterly snapshot reports",
  "District/sub-county performance briefs",
  "Teaching quality reports",
  "Assessment and reading level movement reports",
  "Implementation fidelity & coverage report",
  "Stories/case studies (approved)",
  "Partner portal access (optional)",
] as const;

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

const REGION_OPTIONS = uniqueSorted(ugandaRegions.map((region) => region.region));
const ALL_DISTRICT_OPTIONS = uniqueSorted(
  ugandaRegions.flatMap((region) =>
    region.subRegions.flatMap((subRegion) => subRegion.districts),
  ),
);

function getDistrictOptions(region: string, subRegion: string) {
  if (!region) {
    return ALL_DISTRICT_OPTIONS;
  }

  const subRegions = getSubRegionsByRegion(region);
  if (!subRegion) {
    return uniqueSorted(subRegions.flatMap((entry) => entry.districts));
  }

  const entry = subRegions.find((item) => item.subRegion === subRegion);
  return uniqueSorted(entry?.districts ?? []);
}

function toggleStringValue<T extends string>(list: T[], value: T) {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function createInitialSchoolFormState(
  presetMessage?: string,
  presetSupportTypes?: SupportType[],
  presetUrgency?: SupportRequestUrgency,
): SchoolFormState {
  return {
    schoolNameLocation: "",
    region: "",
    subRegion: "",
    district: "",
    contactName: "",
    contactRole: "",
    phone: "",
    email: "",
    whatsapp: "",
    supportNeeded: presetSupportTypes ?? [],
    urgency: presetUrgency ?? "medium",
    readingChallenges: [],
    requestDetails: presetMessage ?? "",
    consentFollowUp: false,
  };
}

function createInitialPartnerFormState(presetMessage?: string): PartnerFormState {
  return {
    organizationName: "",
    contactName: "",
    roleTitle: "",
    email: "",
    phoneWhatsapp: "",
    website: "",
    partnershipInterest: "",
    otherInterest: "",
    region: "",
    subRegion: "",
    district: "",
    partnershipGoals: [],
    budgetRange: "",
    preferredStart: "",
    evidencePreferences: [],
    requestDetails: presetMessage ?? "",
    consentFollowUp: false,
  };
}

function createInitialFormState(
  presetMessage?: string,
  presetSupportTypes?: SupportType[],
  presetUrgency?: SupportRequestUrgency,
): FormState {
  return {
    requesterType: "",
    school: createInitialSchoolFormState(presetMessage, presetSupportTypes, presetUrgency),
    partner: createInitialPartnerFormState(presetMessage),
  };
}

function getPartnerGeoRequirement(partnershipInterest: string) {
  if (partnershipInterest === "Sponsor Uganda (National)") {
    return "national" as const;
  }
  if (partnershipInterest === "Sponsor a Region (2 years)") {
    return "region" as const;
  }
  if (partnershipInterest === "Sponsor a Sub-region (2 years)") {
    return "sub_region" as const;
  }
  if (partnershipInterest === "Sponsor a District (2 years)") {
    return "district" as const;
  }
  return "optional" as const;
}

function SupportRequestPopupForm({
  close,
  presetMessage,
  presetSupportTypes,
  presetUrgency,
  onRequesterTypeChange,
}: {
  close: () => void;
  presetMessage?: string;
  presetSupportTypes?: SupportType[];
  presetUrgency?: SupportRequestUrgency;
  onRequesterTypeChange: (value: RequesterType) => void;
}) {
  const [form, setForm] = useState<FormState>(() =>
    createInitialFormState(presetMessage, presetSupportTypes, presetUrgency),
  );
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
    message: "",
  });

  useEffect(() => {
    return () => {
      onRequesterTypeChange("");
    };
  }, [onRequesterTypeChange]);

  const schoolSubRegionOptions = useMemo(
    () =>
      form.school.region
        ? getSubRegionsByRegion(form.school.region).map((entry) => entry.subRegion)
        : [],
    [form.school.region],
  );

  const schoolDistrictOptions = useMemo(
    () => getDistrictOptions(form.school.region, form.school.subRegion),
    [form.school.region, form.school.subRegion],
  );

  const partnerSubRegionOptions = useMemo(
    () =>
      form.partner.region
        ? getSubRegionsByRegion(form.partner.region).map((entry) => entry.subRegion)
        : [],
    [form.partner.region],
  );

  const partnerDistrictOptions = useMemo(
    () => getDistrictOptions(form.partner.region, form.partner.subRegion),
    [form.partner.region, form.partner.subRegion],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.requesterType) {
      setSubmitState({
        status: "error",
        message: "Select requester type before submitting.",
      });
      return;
    }

    if (form.requesterType === "school" && form.school.supportNeeded.length === 0) {
      setSubmitState({
        status: "error",
        message: "Select at least one support need before submitting.",
      });
      return;
    }

    if (form.requesterType === "partner_donor" && form.partner.partnershipGoals.length === 0) {
      setSubmitState({
        status: "error",
        message: "Select at least one partnership goal before submitting.",
      });
      return;
    }

    const geoRequirement = getPartnerGeoRequirement(form.partner.partnershipInterest);
    if (form.requesterType === "partner_donor") {
      if (geoRequirement === "region" && !form.partner.region) {
        setSubmitState({
          status: "error",
          message: "Region is required for this partnership interest.",
        });
        return;
      }
      if (geoRequirement === "sub_region" && (!form.partner.region || !form.partner.subRegion)) {
        setSubmitState({
          status: "error",
          message: "Region and sub-region are required for this partnership interest.",
        });
        return;
      }
      if (
        geoRequirement === "district" &&
        (!form.partner.region || !form.partner.subRegion || !form.partner.district)
      ) {
        setSubmitState({
          status: "error",
          message: "Region, sub-region, and district are required for this partnership interest.",
        });
        return;
      }
      if (form.partner.partnershipInterest === "Other" && !form.partner.otherInterest.trim()) {
        setSubmitState({
          status: "error",
          message: "Provide details for partnership interest marked Other.",
        });
        return;
      }
    }

    if (form.requesterType === "school" && !form.school.consentFollowUp) {
      setSubmitState({
        status: "error",
        message: "Consent for follow-up contact is required.",
      });
      return;
    }

    if (form.requesterType === "partner_donor" && !form.partner.consentFollowUp) {
      setSubmitState({
        status: "error",
        message: "Consent for follow-up contact is required.",
      });
      return;
    }

    setSubmitState({ status: "submitting", message: "Submitting request..." });

    try {
      const sourcePage =
        typeof window !== "undefined" && window.location
          ? window.location.pathname
          : "/";

      const payload =
        form.requesterType === "school"
          ? {
              requester_type: "school" as const,
              source_page: sourcePage,
              timestamp: new Date().toISOString(),
              school_request: {
                school_name_location: form.school.schoolNameLocation.trim(),
                region: form.school.region,
                sub_region: form.school.subRegion,
                district: form.school.district,
                contact_name: form.school.contactName.trim(),
                contact_role: form.school.contactRole,
                phone: form.school.phone.trim(),
                email: form.school.email.trim(),
                whatsapp: form.school.whatsapp.trim(),
                support_needed: form.school.supportNeeded,
                urgency: form.school.urgency,
                reading_challenges: form.school.readingChallenges,
                request_details: form.school.requestDetails.trim(),
                consent_follow_up: form.school.consentFollowUp,
              },
            }
          : {
              requester_type: "partner_donor" as const,
              source_page: sourcePage,
              timestamp: new Date().toISOString(),
              partner_request: {
                organization_name: form.partner.organizationName.trim(),
                contact_name: form.partner.contactName.trim(),
                role_title: form.partner.roleTitle.trim(),
                email: form.partner.email.trim(),
                phone_whatsapp: form.partner.phoneWhatsapp.trim(),
                website: form.partner.website.trim(),
                partnership_interest: form.partner.partnershipInterest,
                other_interest: form.partner.otherInterest.trim(),
                region: form.partner.region,
                sub_region: form.partner.subRegion,
                district: form.partner.district,
                partnership_goals: form.partner.partnershipGoals,
                duration: "2 years",
                budget_range: form.partner.budgetRange,
                preferred_start: form.partner.preferredStart,
                evidence_preferences: form.partner.evidencePreferences,
                request_details: form.partner.requestDetails.trim(),
                consent_follow_up: form.partner.consentFollowUp,
              },
            };

      const result = await submitJsonWithOfflineQueue<{ error?: string }>("/api/portal/support", {
        payload,
        label:
          form.requesterType === "school"
            ? "School literacy support request"
            : "Partnership concept note request",
      });

      if (result.queued) {
        setSubmitState({
          status: "success",
          message:
            "No internet connection. Request saved on this device and will sync automatically when connected.",
        });
        setForm(createInitialFormState(presetMessage, presetSupportTypes, presetUrgency));
        onRequesterTypeChange("");
        return;
      }

      if (!result.response.ok) {
        throw new Error(result.data?.error ?? "Could not submit request.");
      }

      setSubmitState({
        status: "success",
        message: "Request submitted. We'll respond by email.",
      });
      setForm(createInitialFormState(presetMessage, presetSupportTypes, presetUrgency));
      onRequesterTypeChange("");
    } catch (error) {
      setSubmitState({
        status: "error",
        message: error instanceof Error ? error.message : "Could not submit request.",
      });
    }
  };

  const renderSchoolForm = () => (
    <>
      <label className={`${styles.label} ${styles.fullWidth}`}>
        School name + location
        <span className={styles.helperText}>
          Provide the school name and district in one line.
        </span>
        <input
          className={styles.input}
          type="text"
          placeholder="e.g., Bright Future Primary School, Gulu District"
          value={form.school.schoolNameLocation}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              school: {
                ...prev.school,
                schoolNameLocation: event.target.value,
              },
            }))
          }
          required={form.requesterType === "school"}
        />
      </label>

      <label className={styles.label}>
        Region (optional)
        <select
          className={styles.select}
          value={form.school.region}
          onChange={(event) => {
            const region = event.target.value;
            setForm((prev) => ({
              ...prev,
              school: {
                ...prev.school,
                region,
                subRegion: "",
                district: "",
              },
            }));
          }}
        >
          <option value="">Select region</option>
          {REGION_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.label}>
        Sub-region (optional)
        <select
          className={styles.select}
          value={form.school.subRegion}
          onChange={(event) => {
            const subRegion = event.target.value;
            setForm((prev) => ({
              ...prev,
              school: {
                ...prev.school,
                subRegion,
                district: "",
              },
            }));
          }}
          disabled={!form.school.region}
        >
          <option value="">Select sub-region</option>
          {schoolSubRegionOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.label}>
        District
        <select
          className={styles.select}
          value={form.school.district}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              school: {
                ...prev.school,
                district: event.target.value,
              },
            }))
          }
          required={form.requesterType === "school"}
        >
          <option value="">Select district</option>
          {schoolDistrictOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.label}>
        Contact name
        <input
          className={styles.input}
          type="text"
          value={form.school.contactName}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              school: {
                ...prev.school,
                contactName: event.target.value,
              },
            }))
          }
          required={form.requesterType === "school"}
        />
      </label>

      <label className={styles.label}>
        Role
        <select
          className={styles.select}
          value={form.school.contactRole}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              school: {
                ...prev.school,
                contactRole: event.target.value,
              },
            }))
          }
          required={form.requesterType === "school"}
        >
          <option value="">Select role</option>
          {SCHOOL_ROLE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.label}>
        Phone
        <input
          className={styles.input}
          type="tel"
          value={form.school.phone}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              school: {
                ...prev.school,
                phone: event.target.value,
              },
            }))
          }
          required={form.requesterType === "school"}
        />
      </label>

      <label className={styles.label}>
        Email (optional)
        <input
          className={styles.input}
          type="email"
          value={form.school.email}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              school: {
                ...prev.school,
                email: event.target.value,
              },
            }))
          }
        />
      </label>

      <label className={styles.label}>
        WhatsApp (optional)
        <input
          className={styles.input}
          type="text"
          value={form.school.whatsapp}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              school: {
                ...prev.school,
                whatsapp: event.target.value,
              },
            }))
          }
        />
      </label>

      <div className={`${styles.label} ${styles.fullWidth}`}>
        Support needed
        <div className={styles.checkboxGrid}>
          {SCHOOL_SUPPORT_OPTIONS.map((option) => (
            <label key={option.value} className={styles.checkboxItem}>
              <input
                type="checkbox"
                checked={form.school.supportNeeded.includes(option.value)}
                onChange={() =>
                  setForm((prev) => ({
                    ...prev,
                    school: {
                      ...prev.school,
                      supportNeeded: toggleStringValue(prev.school.supportNeeded, option.value),
                    },
                  }))
                }
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <label className={`${styles.label} ${styles.fullWidth}`}>
        Urgency
        <select
          className={styles.select}
          value={form.school.urgency}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              school: {
                ...prev.school,
                urgency: event.target.value as SupportRequestUrgency,
              },
            }))
          }
        >
          {URGENCY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className={`${styles.label} ${styles.fullWidth}`}>
        Reading challenge quick-check
        <div className={styles.checkboxGrid}>
          {READING_CHALLENGE_OPTIONS.map((option) => (
            <label key={option} className={styles.checkboxItem}>
              <input
                type="checkbox"
                checked={form.school.readingChallenges.includes(option)}
                onChange={() =>
                  setForm((prev) => ({
                    ...prev,
                    school: {
                      ...prev.school,
                      readingChallenges: toggleStringValue(prev.school.readingChallenges, option),
                    },
                  }))
                }
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </div>

      <label className={`${styles.label} ${styles.fullWidth}`}>
        Request details
        <textarea
          className={styles.textarea}
          value={form.school.requestDetails}
          placeholder="Briefly describe your need (classes affected, approximate number of learners, what you've tried, and what support you want)."
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              school: {
                ...prev.school,
                requestDetails: event.target.value,
              },
            }))
          }
          required={form.requesterType === "school"}
        />
      </label>

      <label className={`${styles.consentRow} ${styles.fullWidth}`}>
        <input
          type="checkbox"
          checked={form.school.consentFollowUp}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              school: {
                ...prev.school,
                consentFollowUp: event.target.checked,
              },
            }))
          }
          required={form.requesterType === "school"}
        />
        <span>I consent to follow-up contact from Ozeki Reading Bridge Foundation.</span>
      </label>
    </>
  );

  const renderPartnerForm = () => {
    const geoRequirement = getPartnerGeoRequirement(form.partner.partnershipInterest);
    const showGeoSelectors = geoRequirement !== "national";

    return (
      <>
        <label className={styles.label}>
          Organization / partner name
          <input
            className={styles.input}
            type="text"
            value={form.partner.organizationName}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                partner: {
                  ...prev.partner,
                  organizationName: event.target.value,
                },
              }))
            }
            required={form.requesterType === "partner_donor"}
          />
        </label>

        <label className={styles.label}>
          Contact person name
          <input
            className={styles.input}
            type="text"
            value={form.partner.contactName}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                partner: {
                  ...prev.partner,
                  contactName: event.target.value,
                },
              }))
            }
            required={form.requesterType === "partner_donor"}
          />
        </label>

        <label className={styles.label}>
          Role/title
          <input
            className={styles.input}
            type="text"
            value={form.partner.roleTitle}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                partner: {
                  ...prev.partner,
                  roleTitle: event.target.value,
                },
              }))
            }
            required={form.requesterType === "partner_donor"}
          />
        </label>

        <label className={styles.label}>
          Email
          <input
            className={styles.input}
            type="email"
            value={form.partner.email}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                partner: {
                  ...prev.partner,
                  email: event.target.value,
                },
              }))
            }
            required={form.requesterType === "partner_donor"}
          />
        </label>

        <label className={styles.label}>
          Phone/WhatsApp (optional)
          <input
            className={styles.input}
            type="text"
            value={form.partner.phoneWhatsapp}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                partner: {
                  ...prev.partner,
                  phoneWhatsapp: event.target.value,
                },
              }))
            }
          />
        </label>

        <label className={styles.label}>
          Organization website (optional)
          <input
            className={styles.input}
            type="url"
            value={form.partner.website}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                partner: {
                  ...prev.partner,
                  website: event.target.value,
                },
              }))
            }
          />
        </label>

        <label className={`${styles.label} ${styles.fullWidth}`}>
          Partnership interest
          <select
            className={styles.select}
            value={form.partner.partnershipInterest}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                partner: {
                  ...prev.partner,
                  partnershipInterest: event.target.value,
                },
              }))
            }
            required={form.requesterType === "partner_donor"}
          >
            <option value="">Select partnership interest</option>
            {PARTNERSHIP_INTEREST_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        {form.partner.partnershipInterest === "Other" ? (
          <label className={`${styles.label} ${styles.fullWidth}`}>
            Other partnership interest
            <input
              className={styles.input}
              type="text"
              value={form.partner.otherInterest}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  partner: {
                    ...prev.partner,
                    otherInterest: event.target.value,
                  },
                }))
              }
              required={form.requesterType === "partner_donor"}
            />
          </label>
        ) : null}

        {showGeoSelectors ? (
          <>
            <label className={styles.label}>
              Region
              <select
                className={styles.select}
                value={form.partner.region}
                onChange={(event) => {
                  const region = event.target.value;
                  setForm((prev) => ({
                    ...prev,
                    partner: {
                      ...prev.partner,
                      region,
                      subRegion: "",
                      district: "",
                    },
                  }));
                }}
                required={geoRequirement === "region" || geoRequirement === "sub_region" || geoRequirement === "district"}
              >
                <option value="">Select region</option>
                {REGION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.label}>
              Sub-region
              <select
                className={styles.select}
                value={form.partner.subRegion}
                onChange={(event) => {
                  const subRegion = event.target.value;
                  setForm((prev) => ({
                    ...prev,
                    partner: {
                      ...prev.partner,
                      subRegion,
                      district: "",
                    },
                  }));
                }}
                disabled={!form.partner.region}
                required={geoRequirement === "sub_region" || geoRequirement === "district"}
              >
                <option value="">Select sub-region</option>
                {partnerSubRegionOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.label}>
              District
              <select
                className={styles.select}
                value={form.partner.district}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    partner: {
                      ...prev.partner,
                      district: event.target.value,
                    },
                  }))
                }
                disabled={!form.partner.subRegion}
                required={geoRequirement === "district"}
              >
                <option value="">Select district</option>
                {partnerDistrictOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}

        <div className={`${styles.label} ${styles.fullWidth}`}>
          Partnership goals
          <div className={styles.checkboxGrid}>
            {PARTNERSHIP_GOAL_OPTIONS.map((option) => (
              <label key={option} className={styles.checkboxItem}>
                <input
                  type="checkbox"
                  checked={form.partner.partnershipGoals.includes(option)}
                  onChange={() =>
                    setForm((prev) => ({
                      ...prev,
                      partner: {
                        ...prev.partner,
                        partnershipGoals: toggleStringValue(prev.partner.partnershipGoals, option),
                      },
                    }))
                  }
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>

        <div className={styles.label}>
          Duration
          <p className={styles.lockedValue}>2 years (fixed)</p>
        </div>

        <label className={styles.label}>
          Approx budget range
          <select
            className={styles.select}
            value={form.partner.budgetRange}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                partner: {
                  ...prev.partner,
                  budgetRange: event.target.value,
                },
              }))
            }
            required={form.requesterType === "partner_donor"}
          >
            <option value="">Select budget range</option>
            {BUDGET_RANGE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.label}>
          Preferred start
          <select
            className={styles.select}
            value={form.partner.preferredStart}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                partner: {
                  ...prev.partner,
                  preferredStart: event.target.value,
                },
              }))
            }
            required={form.requesterType === "partner_donor"}
          >
            <option value="">Select preferred start</option>
            {PREFERRED_START_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className={`${styles.label} ${styles.fullWidth}`}>
          Evidence preferences
          <div className={styles.checkboxGrid}>
            {EVIDENCE_PREFERENCE_OPTIONS.map((option) => (
              <label key={option} className={styles.checkboxItem}>
                <input
                  type="checkbox"
                  checked={form.partner.evidencePreferences.includes(option)}
                  onChange={() =>
                    setForm((prev) => ({
                      ...prev,
                      partner: {
                        ...prev.partner,
                        evidencePreferences: toggleStringValue(prev.partner.evidencePreferences, option),
                      },
                    }))
                  }
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>

        <label className={`${styles.label} ${styles.fullWidth}`}>
          Request details
          <textarea
            className={styles.textarea}
            value={form.partner.requestDetails}
            placeholder="Please prepare a concept note for a 2-year literacy partnership."
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                partner: {
                  ...prev.partner,
                  requestDetails: event.target.value,
                },
              }))
            }
            required={form.requesterType === "partner_donor"}
          />
        </label>

        <label className={`${styles.consentRow} ${styles.fullWidth}`}>
          <input
            type="checkbox"
            checked={form.partner.consentFollowUp}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                partner: {
                  ...prev.partner,
                  consentFollowUp: event.target.checked,
                },
              }))
            }
            required={form.requesterType === "partner_donor"}
          />
          <span>I consent to follow-up contact from Ozeki Reading Bridge Foundation.</span>
        </label>
      </>
    );
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={`${styles.stepper} ${styles.fullWidth}`}>
        <span className={`${styles.stepChip} ${styles.stepChipActive}`}>Type</span>
        <span className={`${styles.stepChip} ${form.requesterType ? styles.stepChipActive : ""}`}>Details</span>
        <span className={styles.stepChip}>Submit</span>
      </div>

      <label className={`${styles.label} ${styles.fullWidth}`}>
        I am a...
        <select
          className={styles.select}
          value={form.requesterType}
          onChange={(event) => {
            const requesterType = event.target.value as RequesterType;
            setForm((prev) => ({ ...prev, requesterType }));
            onRequesterTypeChange(requesterType);
            setSubmitState({ status: "idle", message: "" });
          }}
          required
        >
          <option value="">Select requester type</option>
          {REQUESTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {form.requesterType === "school" ? renderSchoolForm() : null}
      {form.requesterType === "partner_donor" ? renderPartnerForm() : null}

      <div className={`${styles.submitRow} ${styles.fullWidth}`}>
        <button className="button button-ghost button-compact" type="button" onClick={close}>
          Cancel
        </button>
        <button
          className="button button-compact"
          type="submit"
          disabled={submitState.status === "submitting" || !form.requesterType}
        >
          {submitState.status === "submitting" ? "Submitting..." : "Submit Request"}
        </button>
      </div>

      {submitState.status === "error" ? (
        <p className={`${styles.error} ${styles.fullWidth}`}>{submitState.message}</p>
      ) : null}
      {submitState.status === "success" ? (
        <p className={`${styles.success} ${styles.fullWidth}`}>{submitState.message}</p>
      ) : null}
    </form>
  );
}

export function HomeSupportRequestModal({
  triggerLabel,
  title,
  description,
  triggerClassName = "button",
  presetMessage,
  presetSupportTypes,
  presetUrgency,
}: HomeSupportRequestModalProps) {
  const [requesterType, setRequesterType] = useState<RequesterType>("");

  const modalTitle =
    requesterType === "school"
      ? "Request School Literacy Support"
      : requesterType === "partner_donor"
        ? "Request a Partnership Concept Note"
        : title;

  const modalDescription =
    requesterType === "school"
      ? "Tell us what you need to improve reading outcomes. Our team will respond with a support plan."
      : requesterType === "partner_donor"
        ? "Tell us your geography focus and partnership goals. We will prepare a tailored concept note."
        : description;

  return (
    <FloatingFormModal
      triggerLabel={triggerLabel}
      title={modalTitle}
      description={modalDescription}
      triggerClassName={triggerClassName}
    >
      {({ close }) => (
        <SupportRequestPopupForm
          close={close}
          presetMessage={presetMessage}
          presetSupportTypes={presetSupportTypes}
          presetUrgency={presetUrgency}
          onRequesterTypeChange={setRequesterType}
        />
      )}
    </FloatingFormModal>
  );
}
