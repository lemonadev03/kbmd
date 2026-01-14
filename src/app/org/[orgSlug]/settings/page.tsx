interface OrgSettingsPageProps {
  params: { orgSlug: string };
}

export default function OrgSettingsPage({ params }: OrgSettingsPageProps) {
  const orgLabel = params.orgSlug
    .split("-")
    .map((part) =>
      part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : part
    )
    .join(" ");

  return (
    <div className="min-h-screen app-shell">
      <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Organization
          </p>
          <h1 className="text-3xl font-semibold text-foreground">
            {orgLabel} Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage members, roles, and export presets for this organization.
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            This page will host org profile, membership, and export configs once
            multi-tenancy lands.
          </p>
        </div>
      </main>
    </div>
  );
}
