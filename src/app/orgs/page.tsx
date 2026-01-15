import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, organizations, orgMemberships, userSettings } from "@/db";
import { Button } from "@/components/ui/button";

export default async function OrgSwitcherPage() {
  const requestHeaders = Object.fromEntries((await headers()).entries());
  const session = await auth.api.getSession({ headers: requestHeaders });
  const userId = session?.user?.id;
  if (!userId) {
    redirect("/sign-in");
  }

  const [orgRows, settingsRows] = await Promise.all([
    db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        role: orgMemberships.role,
      })
      .from(orgMemberships)
      .innerJoin(organizations, eq(orgMemberships.orgId, organizations.id))
      .where(eq(orgMemberships.userId, userId))
      .orderBy(asc(organizations.name)),
    db
      .select({ lastOrgId: userSettings.lastOrgId })
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1),
  ]);

  const lastOrgId = settingsRows[0]?.lastOrgId ?? null;

  return (
    <div className="min-h-screen app-shell">
      <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Organizations
          </p>
          <h1 className="text-3xl font-semibold text-foreground">
            Switch organization
          </h1>
          <p className="text-sm text-muted-foreground">
            Choose the org you want to work in.
          </p>
        </div>

        <div className="grid gap-3">
          {orgRows.map((org) => {
            const isCurrent = lastOrgId === org.id;
            return (
              <div
                key={org.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border bg-card p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-foreground">
                      {org.name}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground border px-2 py-1 rounded-full">
                        Current
                      </span>
                    )}
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground border px-2 py-1 rounded-full">
                      {org.role}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    /org/{org.slug}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/org/${org.slug}/settings`}>Manage</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href={`/org/${org.slug}`}>Open</Link>
                  </Button>
                </div>
              </div>
            );
          })}

          {orgRows.length === 0 && (
            <div className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
              No organizations yet.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
