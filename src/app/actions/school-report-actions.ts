"use server";

import { requirePortalStaffUser } from "@/lib/auth";
import { 
  getSchoolFactPack, 
  saveSchoolReportDraft 
} from "@/lib/server/postgres/repositories/school-reports";
import { generateSchoolNarrative } from "@/lib/server/ai/school-narration";
import { queryPostgres } from "@/lib/server/postgres/client";

export async function createReportDraftAction(schoolId: number, start: string, end: string) {
  const user = await requirePortalStaffUser();
  const factPack = await getSchoolFactPack(schoolId, start, end);
  
  const draftId = await saveSchoolReportDraft({
    schoolId,
    periodStart: start,
    periodEnd: end,
    factPack,
    userId: user.id
  });

  return { draftId, factPack };
}

export async function generateNarrativeAction(reportId: number) {
  await requirePortalStaffUser();
  
  const res = await queryPostgres("SELECT fact_pack_json FROM school_performance_reports WHERE id = $1", [reportId]);
  if (!res.rows[0]) throw new Error("Report not found");

  const factPack = res.rows[0].fact_pack_json;
  const narrative = await generateSchoolNarrative(factPack);

  await queryPostgres(
    "UPDATE school_performance_reports SET ai_narrative_json = $1, status = 'ai_generated' WHERE id = $2",
    [JSON.stringify(narrative), reportId]
  );

  return narrative;
}

export async function approveReportAction(reportId: number, staffSummary: string) {
  const user = await requirePortalStaffUser();

  await queryPostgres(
    `UPDATE school_performance_reports 
     SET staff_summary_override = $1, 
         status = 'approved', 
         approved_by_user_id = $2, 
         approved_at = NOW() 
     WHERE id = $3`,
    [staffSummary, user.id, reportId]
  );

  return { success: true };
}
