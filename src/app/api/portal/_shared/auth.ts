import { NextResponse } from "next/server";
import { getAuthenticatedPortalUser } from "@/lib/auth";

export async function authorizeSuperAdmin() {
    const user = await getAuthenticatedPortalUser();
    if (!user) {
        return { authorized: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null };
    }
    if (!user.isSuperAdmin) {
        return { authorized: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }), user };
    }
    return { authorized: true, response: null, user };
}
