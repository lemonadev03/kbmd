import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, organizations, orgMemberships, userSettings } from "@/db";

export default async function Home() {
  const requestHeaders = Object.fromEntries((await headers()).entries());
  const session = await auth.api.getSession({ headers: requestHeaders });
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/sign-in");
  }

  const settings = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  let orgSlug: string | null = null;
  const lastOrgId = settings[0]?.lastOrgId ?? null;

  if (lastOrgId) {
    const orgRows = await db
      .select({ slug: organizations.slug })
      .from(organizations)
      .where(eq(organizations.id, lastOrgId))
      .limit(1);
    orgSlug = orgRows[0]?.slug ?? null;
  }

  if (!orgSlug) {
    const membershipRows = await db
      .select({ slug: organizations.slug })
      .from(orgMemberships)
      .innerJoin(organizations, eq(orgMemberships.orgId, organizations.id))
      .where(eq(orgMemberships.userId, userId))
      .limit(1);
    orgSlug = membershipRows[0]?.slug ?? null;
  }

  if (!orgSlug) {
    redirect("/orgs");
  }

  redirect(`/org/${orgSlug}`);
}
