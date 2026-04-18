import { auth } from "@repo/auth";
import { db } from "@repo/database";
import { logger } from "@repo/logs";
import { type NextRequest, NextResponse } from "next/server";

// Force runtime; this is a state-changing handler that must not be cached.
export const dynamic = "force-dynamic";

interface RouteContext {
	params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
	const { id: organizationId } = await params;

	// CSRF defence: this is a state-changing POST that piggybacks on the session
	// cookie, so we MUST verify the request originated from our own UI. SameSite=Lax
	// alone permits top-level cross-site form submissions.
	const origin = req.headers.get("origin");
	const referer = req.headers.get("referer");
	const expectedHost = req.headers.get("host");
	const sameOriginByOrigin = origin ? new URL(origin).host === expectedHost : false;
	const sameOriginByReferer = referer ? new URL(referer).host === expectedHost : false;
	if (!sameOriginByOrigin && !sameOriginByReferer) {
		return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
	}

	const session = await auth.api.getSession({ headers: req.headers });

	if (!session?.user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	if (session.user.role !== "platformAdmin") {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const organization = await db.organization.findUnique({ where: { id: organizationId } });
	if (!organization) {
		return NextResponse.json({ error: "Organization not found" }, { status: 404 });
	}

	// Better Auth's setActiveOrganization rejects when the caller has no Member row.
	// Platform admins by design DO NOT have Member rows, so we set the active org
	// directly. Caller authorization (platformAdmin role + org exists) was verified
	// above, so this write is safe.
	await db.$transaction([
		db.user.update({
			where: { id: session.user.id },
			data: { lastActiveOrganizationId: organizationId },
		}),
		db.session.update({
			where: { id: session.session.id },
			data: { activeOrganizationId: organizationId },
		}),
	]);

	logger.info("Platform admin impersonation", {
		event: "platform_impersonation",
		platformAdminUserId: session.user.id,
		organizationId,
		at: new Date().toISOString(),
	});

	return NextResponse.redirect(new URL("/admin", req.url));
}
