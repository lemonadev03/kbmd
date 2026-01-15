import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, organizations, orgMemberships } from "@/db";

export type OrgRole = "admin" | "user";

export type OrgContext = {
  orgId: string;
  orgSlug: string;
  orgName: string;
  role: OrgRole;
  userId: string;
};

async function getServerSession() {
  const requestHeaders = Object.fromEntries((await headers()).entries());
  return auth.api.getSession({ headers: requestHeaders });
}

export async function requireOrgContext(orgSlug: string): Promise<OrgContext> {
  const session = await getServerSession();
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const orgRows = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, orgSlug))
    .limit(1);
  const org = orgRows[0];
  if (!org) {
    throw new Error("Organization not found");
  }

  const membershipRows = await db
    .select()
    .from(orgMemberships)
    .where(
      and(eq(orgMemberships.orgId, org.id), eq(orgMemberships.userId, userId))
    )
    .limit(1);
  const membership = membershipRows[0];
  if (!membership) {
    throw new Error("Forbidden");
  }

  return {
    orgId: org.id,
    orgSlug: org.slug,
    orgName: org.name,
    role: membership.role as OrgRole,
    userId,
  };
}

export async function requireAdmin(orgSlug: string): Promise<OrgContext> {
  const ctx = await requireOrgContext(orgSlug);
  if (ctx.role !== "admin") {
    throw new Error("Forbidden");
  }
  return ctx;
}
