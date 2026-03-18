import { NextRequest, NextResponse } from "next/server";
import {
  createConceptNoteRequest,
  createSupportRequest,
  listSupportRequests,
} from "@/services/dataService";
import { getAuthenticatedPortalUser } from "@/lib/portal-api";
import {
  SupportRequestInput,
  SupportRequestStatus,
  SupportRequestUrgency,
  SupportType,
  ConceptNoteRequesterType,
} from "@/lib/types";

const SUPPORT_STATUSES = ["New", "Contacted", "Scheduled", "Delivered", "Closed"] as const;
const SUPPORT_TYPES = [
  "phonics training",
  "coaching visit",
  "learner assessment",
  "remedial & catch-up support",
  "1001 story",
] as const;
const SUPPORT_URGENCIES = ["low", "medium", "high", "this_term", "next_term"] as const;
const REQUESTER_TYPES = ["school", "partner_donor"] as const;

const PARTNER_INTEREST_OPTIONS = [
  "Sponsor Uganda (National)",
  "Sponsor a Region (2 years)",
  "Sponsor a Sub-region (2 years)",
  "Sponsor a District (2 years)",
  "Sponsor Schools (select number)",
  "Other",
] as const;

type PartnerInterest = (typeof PARTNER_INTEREST_OPTIONS)[number];

function asObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function isSupportStatus(value: unknown): value is SupportRequestStatus {
  return typeof value === "string" && SUPPORT_STATUSES.includes(value as SupportRequestStatus);
}

function isSupportType(value: unknown): value is SupportType {
  return typeof value === "string" && SUPPORT_TYPES.includes(value as SupportType);
}

function isSupportUrgency(value: unknown): value is SupportRequestUrgency {
  return typeof value === "string" && SUPPORT_URGENCIES.includes(value as SupportRequestUrgency);
}

function isRequesterType(value: unknown): value is ConceptNoteRequesterType {
  return typeof value === "string" && REQUESTER_TYPES.includes(value as ConceptNoteRequesterType);
}

function isPartnerInterest(value: unknown): value is PartnerInterest {
  return typeof value === "string" && PARTNER_INTEREST_OPTIONS.includes(value as PartnerInterest);
}

function mapInterestToScopeRequirement(interest: PartnerInterest) {
  if (interest === "Sponsor Uganda (National)") {
    return "national" as const;
  }
  if (interest === "Sponsor a Region (2 years)") {
    return "region" as const;
  }
  if (interest === "Sponsor a Sub-region (2 years)") {
    return "sub_region" as const;
  }
  if (interest === "Sponsor a District (2 years)") {
    return "district" as const;
  }
  return "optional" as const;
}

function resolveSourcePage(body: Record<string, unknown>) {
  const sourcePage = asString(body.source_page || body.sourcePage);
  return sourcePage || "/";
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedPortalUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const status = isSupportStatus(statusParam) ? statusParam : undefined;
    const district = searchParams.get("district") || undefined;

    const requests = await listSupportRequests(undefined); // Passing undefined to list all, or could pass schoolId if needed
    return NextResponse.json(requests);
  } catch (error: unknown) {
    console.error("Error listing support requests:", error);
    return NextResponse.json(
      { error: errorMessage(error, "Failed to list support requests") },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedPortalUser();
    const body = (await req.json()) as Record<string, unknown>;
    const requesterType = isRequesterType(body.requester_type) ? body.requester_type : null;

    if (requesterType === "school") {
      const schoolPayload = asObject(body.school_request) ?? body;
      const schoolNameLocation = asString(
        schoolPayload.school_name_location ?? schoolPayload.locationText,
      );
      const region = asString(schoolPayload.region);
      const subRegion = asString(schoolPayload.sub_region ?? schoolPayload.subRegion);
      const district = asString(schoolPayload.district);
      const contactName = asString(schoolPayload.contact_name ?? schoolPayload.contactName);
      const contactRole = asString(schoolPayload.contact_role ?? schoolPayload.contactRole);
      const phone = asString(schoolPayload.phone);
      const email = asString(schoolPayload.email);
      const whatsapp = asString(schoolPayload.whatsapp);
      const supportNeeded = asStringArray(
        schoolPayload.support_needed ?? schoolPayload.supportTypes,
      ).filter((entry) => isSupportType(entry));
      const urgency = isSupportUrgency(schoolPayload.urgency)
        ? schoolPayload.urgency
        : "medium";
      const readingChallenges = asStringArray(
        schoolPayload.reading_challenges ?? schoolPayload.readingChallenges,
      );
      const requestDetails = asString(
        schoolPayload.request_details ?? schoolPayload.message,
      );
      const consentFollowUp =
        schoolPayload.consent_follow_up === true || schoolPayload.consentFollowUp === true;

      if (
        !schoolNameLocation ||
        !district ||
        !contactName ||
        !contactRole ||
        !phone ||
        supportNeeded.length === 0 ||
        !requestDetails ||
        !consentFollowUp
      ) {
        return NextResponse.json(
          { error: "Missing required fields for school support request." },
          { status: 400 },
        );
      }

      const contactInfoParts = [phone, email, whatsapp].filter((entry) => entry.length > 0);
      const supportRequest = await createSupportRequest(
        {
          locationText: schoolNameLocation,
          contactName,
          contactRole,
          contactInfo: contactInfoParts.join(" | "),
          supportTypes: supportNeeded as any,
          urgency,
          message: requestDetails,
        },
        user?.id ?? 0,
      );

      const sourcePage = resolveSourcePage(body);
      const timestamp = asString(body.timestamp) || new Date().toISOString();
      const conceptRequest = createConceptNoteRequest(
        {
          requesterType,
          sourcePage,
          region,
          subRegion,
          district,
          payload: {
            requester_type: requesterType,
            source_page: sourcePage,
            timestamp,
            school_request: {
              school_name_location: schoolNameLocation,
              region,
              sub_region: subRegion,
              district,
              contact_name: contactName,
              contact_role: contactRole,
              phone,
              email,
              whatsapp,
              support_needed: supportNeeded,
              urgency,
              reading_challenges: readingChallenges,
              request_details: requestDetails,
              consent_follow_up: consentFollowUp,
            },
          },
        },
        { submittedByUserId: user?.id ?? null },
      );

      return NextResponse.json({ supportRequest, conceptRequest }, { status: 201 });
    }

    if (requesterType === "partner_donor") {
      const partnerPayload = asObject(body.partner_request) ?? body;
      const organizationName = asString(
        partnerPayload.organization_name ?? partnerPayload.organizationName,
      );
      const contactName = asString(partnerPayload.contact_name ?? partnerPayload.contactName);
      const roleTitle = asString(partnerPayload.role_title ?? partnerPayload.roleTitle);
      const email = asString(partnerPayload.email);
      const phoneWhatsapp = asString(
        partnerPayload.phone_whatsapp ?? partnerPayload.phoneWhatsapp,
      );
      const website = asString(partnerPayload.website);
      const partnerInterestValue =
        partnerPayload.partnership_interest ?? partnerPayload.partnershipInterest;
      const partnershipInterest = isPartnerInterest(partnerInterestValue)
        ? partnerInterestValue
        : null;
      const otherInterest = asString(
        partnerPayload.other_interest ?? partnerPayload.otherInterest,
      );
      const region = asString(partnerPayload.region);
      const subRegion = asString(partnerPayload.sub_region ?? partnerPayload.subRegion);
      const district = asString(partnerPayload.district);
      const partnershipGoals = asStringArray(
        partnerPayload.partnership_goals ?? partnerPayload.partnershipGoals,
      );
      const budgetRange = asString(partnerPayload.budget_range ?? partnerPayload.budgetRange);
      const preferredStart = asString(
        partnerPayload.preferred_start ?? partnerPayload.preferredStart,
      );
      const evidencePreferences = asStringArray(
        partnerPayload.evidence_preferences ?? partnerPayload.evidencePreferences,
      );
      const requestDetails = asString(
        partnerPayload.request_details ?? partnerPayload.message,
      );
      const consentFollowUp =
        partnerPayload.consent_follow_up === true ||
        partnerPayload.consentFollowUp === true;

      if (
        !organizationName ||
        !contactName ||
        !roleTitle ||
        !email ||
        !partnershipInterest ||
        partnershipGoals.length === 0 ||
        !budgetRange ||
        !preferredStart ||
        !requestDetails ||
        !consentFollowUp
      ) {
        return NextResponse.json(
          { error: "Missing required fields for partner/donor concept note request." },
          { status: 400 },
        );
      }

      if (partnershipInterest === "Other" && !otherInterest) {
        return NextResponse.json(
          { error: "Please specify the partnership interest for Other." },
          { status: 400 },
        );
      }

      const geoRequirement = mapInterestToScopeRequirement(partnershipInterest);
      if (geoRequirement === "region" && !region) {
        return NextResponse.json(
          { error: "Region is required for this partnership interest." },
          { status: 400 },
        );
      }
      if (geoRequirement === "sub_region" && (!region || !subRegion)) {
        return NextResponse.json(
          { error: "Region and sub-region are required for this partnership interest." },
          { status: 400 },
        );
      }
      if (geoRequirement === "district" && (!region || !subRegion || !district)) {
        return NextResponse.json(
          { error: "Region, sub-region, and district are required for this partnership interest." },
          { status: 400 },
        );
      }

      const sourcePage = resolveSourcePage(body);
      const timestamp = asString(body.timestamp) || new Date().toISOString();
      const conceptRequest = createConceptNoteRequest(
        {
          requesterType,
          sourcePage,
          region,
          subRegion,
          district,
          payload: {
            requester_type: requesterType,
            source_page: sourcePage,
            timestamp,
            partner_request: {
              organization_name: organizationName,
              contact_name: contactName,
              role_title: roleTitle,
              email,
              phone_whatsapp: phoneWhatsapp,
              website,
              partnership_interest: partnershipInterest,
              other_interest: otherInterest,
              region,
              sub_region: subRegion,
              district,
              partnership_goals: partnershipGoals,
              duration: "2 years",
              budget_range: budgetRange,
              preferred_start: preferredStart,
              evidence_preferences: evidencePreferences,
              request_details: requestDetails,
              consent_follow_up: consentFollowUp,
            },
          },
        },
        { submittedByUserId: user?.id ?? null },
      );

      return NextResponse.json({ conceptRequest }, { status: 201 });
    }

    // Legacy support request payload handling.
    const schoolIdRaw = body.schoolId;
    const schoolId =
      typeof schoolIdRaw === "number"
        ? schoolIdRaw
        : typeof schoolIdRaw === "string"
          ? Number(schoolIdRaw)
          : undefined;
    const supportTypes = Array.isArray(body.supportTypes)
      ? body.supportTypes.filter(isSupportType)
      : [];
    const urgency = isSupportUrgency(body.urgency) ? body.urgency : "medium";
    const contactName = asString(body.contactName);
    const contactRole = asString(body.contactRole);
    const contactInfo = asString(body.contactInfo);
    const message = asString(body.message);

    if (!contactName || !contactRole || !contactInfo || !message || supportTypes.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const normalizedSchoolId =
      typeof schoolId === "number" && Number.isInteger(schoolId) && schoolId > 0
        ? schoolId
        : undefined;

    const input: SupportRequestInput = {
      schoolId: normalizedSchoolId,
      locationText: asString(body.locationText) || undefined,
      contactName,
      contactRole,
      contactInfo,
      supportTypes,
      urgency,
      message,
    };

    const newRequest = await createSupportRequest(input, user?.id ?? 0);
    return NextResponse.json(newRequest, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating support request:", error);
    return NextResponse.json(
      { error: errorMessage(error, "Failed to create support request") },
      { status: 500 },
    );
  }
}
