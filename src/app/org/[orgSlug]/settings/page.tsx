import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireOrgContext } from "@/lib/org";

interface OrgSettingsPageProps {
  params: { orgSlug: string };
}

export default async function OrgSettingsPage({ params }: OrgSettingsPageProps) {
  const { orgSlug } = await params;
  const org = await requireOrgContext(orgSlug);

  return (
    <div className="min-h-screen app-shell">
      <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Organization
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold text-foreground">
              {org.orgName} Settings
            </h1>
            <span className="text-xs uppercase tracking-wide text-muted-foreground border px-2 py-1 rounded-full">
              {org.role}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage members and org details. Invites are coming soon.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/org/${org.orgSlug}`}>Back to org</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/orgs">Switch orgs</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4 space-y-2">
          <div className="text-sm font-medium">Org profile</div>
          <div className="text-sm text-muted-foreground">
            Name: {org.orgName}
          </div>
          <div className="text-sm text-muted-foreground">
            Slug: {org.orgSlug}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Member management and export presets will live here once invites are
            enabled.
          </p>
        </div>
      </main>
    </div>
  );
}
