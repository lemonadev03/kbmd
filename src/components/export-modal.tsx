"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Trash2 } from "lucide-react";
import type { ExportConfigPayload } from "@/types/export-config";

interface Variable {
  id: string;
  key: string;
  value: string;
}

interface Section {
  id: string;
  name: string;
  phaseGroupId?: string | null;
}

interface FAQ {
  id: string;
  sectionId: string;
  question: string;
  answer: string;
  notes: string;
  order: number;
}

interface PhaseGroup {
  id: string;
  name: string;
}

interface ExportConfig {
  id: string;
  name: string;
  config: ExportConfigPayload;
}

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variables: Variable[];
  sections: Section[];
  phaseGroups?: PhaseGroup[];
  faqs: FAQ[];
  customRules?: string;
  exportConfigs?: ExportConfig[];
  canManageConfigs?: boolean;
  onCreateExportConfig?: (name: string, config: ExportConfigPayload) => Promise<
    ExportConfig | null | undefined
  >;
  onUpdateExportConfig?: (
    id: string,
    name: string,
    config: ExportConfigPayload
  ) => Promise<ExportConfig | null | undefined>;
  onDeleteExportConfig?: (id: string) => Promise<void>;
}

export function ExportModal({
  open,
  onOpenChange,
  variables,
  sections,
  phaseGroups = [],
  faqs,
  customRules,
  exportConfigs = [],
  canManageConfigs = true,
  onCreateExportConfig,
  onUpdateExportConfig,
  onDeleteExportConfig,
}: ExportModalProps) {
  const [includeVariables, setIncludeVariables] = useState(true);
  const [includeCustomRules, setIncludeCustomRules] = useState(true);
  const [selectedSections, setSelectedSections] = useState<Set<string>>(
    new Set(sections.map((s) => s.id))
  );
  const [selectedPhaseGroups, setSelectedPhaseGroups] = useState<Set<string>>(
    new Set()
  );
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [presetName, setPresetName] = useState("");
  const [isSavingPreset, setIsSavingPreset] = useState(false);

  useEffect(() => {
    if (!open || sections.length === 0) return;
    setSelectedSections((prev) => {
      if (prev.size > 0 || selectedConfigId || selectedPhaseGroups.size > 0) {
        return prev;
      }
      return new Set(sections.map((s) => s.id));
    });
  }, [open, sections, selectedConfigId, selectedPhaseGroups.size]);

  useEffect(() => {
    if (!open) {
      setSelectedConfigId(null);
      setPresetName("");
    }
  }, [open]);

  useEffect(() => {
    if (!selectedConfigId) return;
    const stillExists = exportConfigs.some(
      (config) => config.id === selectedConfigId
    );
    if (!stillExists) {
      setSelectedConfigId(null);
      setPresetName("");
    }
  }, [exportConfigs, selectedConfigId]);

  const sectionIdSet = useMemo(() => new Set(sections.map((s) => s.id)), [
    sections,
  ]);
  const groupIdSet = useMemo(() => new Set(phaseGroups.map((g) => g.id)), [
    phaseGroups,
  ]);

  useEffect(() => {
    if (selectedPhaseGroups.size === 0) return;
    setSelectedPhaseGroups((prev) => {
      const next = new Set([...prev].filter((id) => groupIdSet.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [groupIdSet, selectedPhaseGroups.size]);

  const groupSectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const group of phaseGroups) {
      counts.set(group.id, 0);
    }
    for (const section of sections) {
      if (!section.phaseGroupId) continue;
      if (!counts.has(section.phaseGroupId)) continue;
      counts.set(section.phaseGroupId, (counts.get(section.phaseGroupId) ?? 0) + 1);
    }
    return counts;
  }, [phaseGroups, sections]);

  const buildConfig = (): ExportConfigPayload => ({
    includeVariables,
    includeCustomRules,
    sectionIds: Array.from(selectedSections),
    phaseGroupIds: Array.from(selectedPhaseGroups),
  });

  const applyConfig = (config: ExportConfig, updateSelection = true) => {
    setIncludeVariables(config.config.includeVariables);
    setIncludeCustomRules(config.config.includeCustomRules);
    if (updateSelection) {
      const filtered = config.config.sectionIds.filter((id) =>
        sectionIdSet.has(id)
      );
      setSelectedSections(new Set(filtered));
      const groupIds = (config.config.phaseGroupIds ?? []).filter((id) =>
        groupIdSet.has(id)
      );
      setSelectedPhaseGroups(new Set(groupIds));
    }
    setSelectedConfigId(config.id);
    setPresetName(config.name);
  };

  const toggleSection = (sectionId: string) => {
    const newSelected = new Set(selectedSections);
    if (newSelected.has(sectionId)) {
      newSelected.delete(sectionId);
    } else {
      newSelected.add(sectionId);
    }
    setSelectedSections(newSelected);
  };

  const togglePhaseGroup = (groupId: string) => {
    const newSelected = new Set(selectedPhaseGroups);
    if (newSelected.has(groupId)) {
      newSelected.delete(groupId);
    } else {
      newSelected.add(groupId);
    }
    setSelectedPhaseGroups(newSelected);
  };

  const selectAllPhaseGroups = () => {
    setSelectedPhaseGroups(new Set(phaseGroups.map((group) => group.id)));
  };

  const selectNonePhaseGroups = () => {
    setSelectedPhaseGroups(new Set());
  };

  const selectAll = () => {
    setSelectedSections(new Set(sections.map((s) => s.id)));
  };

  const selectNone = () => {
    setSelectedSections(new Set());
  };

  const effectiveSectionIds = useMemo(() => {
    const ids = new Set(selectedSections);
    for (const section of sections) {
      if (section.phaseGroupId && selectedPhaseGroups.has(section.phaseGroupId)) {
        ids.add(section.id);
      }
    }
    return ids;
  }, [selectedSections, selectedPhaseGroups, sections]);

  const handleSavePreset = async () => {
    if (!canManageConfigs || !onCreateExportConfig) return;
    const name = presetName.trim();
    if (!name) return;
    setIsSavingPreset(true);
    try {
      const created = await onCreateExportConfig(name, buildConfig());
      if (created) {
        setSelectedConfigId(created.id);
        setPresetName(created.name);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to save export preset. Please try again.");
    } finally {
      setIsSavingPreset(false);
    }
  };

  const handleUpdatePreset = async () => {
    if (!canManageConfigs || !onUpdateExportConfig || !selectedConfigId) return;
    const name = presetName.trim();
    const fallbackName =
      exportConfigs.find((config) => config.id === selectedConfigId)?.name ??
      "";
    const nextName = name || fallbackName;
    if (!nextName) return;
    setIsSavingPreset(true);
    try {
      const updated = await onUpdateExportConfig(
        selectedConfigId,
        nextName,
        buildConfig()
      );
      if (updated) {
        setPresetName(updated.name);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to update export preset. Please try again.");
    } finally {
      setIsSavingPreset(false);
    }
  };

  const handleDeletePreset = async () => {
    if (!canManageConfigs || !onDeleteExportConfig || !selectedConfigId) return;
    if (!confirm("Delete this export preset?")) return;
    setIsSavingPreset(true);
    try {
      await onDeleteExportConfig(selectedConfigId);
      setSelectedConfigId(null);
      setPresetName("");
    } catch (error) {
      console.error(error);
      alert("Failed to delete export preset. Please try again.");
    } finally {
      setIsSavingPreset(false);
    }
  };

  const generateMarkdown = () => {
    let md = "# Knowledge Base\n\n";

    // Custom rules section
    if (includeCustomRules && customRules) {
      md += "## System Prompt Logic\n\n";
      md += customRules + "\n\n";
    }

    // Variables section
    if (includeVariables && variables.length > 0) {
      md += "## Variables\n\n";
      md += "| Key | Value |\n";
      md += "|-----|-------|\n";
      for (const v of variables) {
        md += `| \`${v.key}\` | ${v.value} |\n`;
      }
      md += "\n";
    }

    // FAQ sections
    for (const section of sections) {
      if (!effectiveSectionIds.has(section.id)) continue;

      const sectionFaqs = [...faqs.filter((f) => f.sectionId === section.id)].sort(
        (a, b) => (a.order - b.order) || a.id.localeCompare(b.id)
      );
      md += `# ${section.name}\n\n`;

      if (sectionFaqs.length === 0) {
        md += "*No FAQs in this section.*\n\n";
        continue;
      }

      for (const faq of sectionFaqs) {
        // H2 for question
        md += `## ${faq.question}\n\n`;
        
        // Paragraph for answer
        md += `${faq.answer}\n\n`;
        
        // Include notes if present
        if (faq.notes.trim()) {
          md += `*Note: ${faq.notes}*\n\n`;
        }
      }
    }

    return md;
  };

  const handleExport = () => {
    const markdown = generateMarkdown();
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "knowledge-base.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onOpenChange(false);
  };

  const selectedCount = effectiveSectionIds.size;
  const canExport = includeVariables || includeCustomRules || selectedCount > 0;
  const hasConfigs = exportConfigs.length > 0;
  const canSavePreset =
    canManageConfigs && presetName.trim().length > 0 && !isSavingPreset;
  const canUpdatePreset =
    canManageConfigs && !!selectedConfigId && !isSavingPreset;
  const canDeletePreset = canUpdatePreset;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export to Markdown</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {hasConfigs && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Export presets</span>
                {selectedConfigId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedConfigId(null);
                      setPresetName("");
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {exportConfigs.map((config) => (
                  <Button
                    key={config.id}
                    size="sm"
                    variant={selectedConfigId === config.id ? "default" : "outline"}
                    onClick={() => applyConfig(config)}
                  >
                    {config.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Rules */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="customRules"
              checked={includeCustomRules}
              onCheckedChange={(checked) => setIncludeCustomRules(checked === true)}
              disabled={!customRules}
            />
            <label htmlFor="customRules" className="text-sm font-medium cursor-pointer">
              Custom Rules {customRules ? "" : "(empty)"}
            </label>
          </div>

          {/* Variables */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="variables"
              checked={includeVariables}
              onCheckedChange={(checked) => setIncludeVariables(checked === true)}
            />
            <label htmlFor="variables" className="text-sm font-medium cursor-pointer">
              Variables ({variables.length})
            </label>
          </div>

          {phaseGroups.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Phase groups</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAllPhaseGroups}>
                    All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={selectNonePhaseGroups}>
                    None
                  </Button>
                </div>
              </div>

              <div className="space-y-2 max-h-40 overflow-auto">
                {phaseGroups.map((group) => {
                  const sectionCount = groupSectionCounts.get(group.id) ?? 0;
                  return (
                    <div key={group.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`group-${group.id}`}
                        checked={selectedPhaseGroups.has(group.id)}
                        onCheckedChange={() => togglePhaseGroup(group.id)}
                      />
                      <label
                        htmlFor={`group-${group.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {group.name}
                        <span className="text-muted-foreground ml-2">
                          ({sectionCount} section{sectionCount !== 1 ? "s" : ""})
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sections */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Sections</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  All
                </Button>
                <Button variant="ghost" size="sm" onClick={selectNone}>
                  None
                </Button>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-auto">
              {sections.map((section) => {
                const faqCount = faqs.filter((f) => f.sectionId === section.id).length;
                const sectionIncludedByGroup =
                  !!section.phaseGroupId &&
                  selectedPhaseGroups.has(section.phaseGroupId);
                return (
                  <div key={section.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={section.id}
                      checked={
                        sectionIncludedByGroup || selectedSections.has(section.id)
                      }
                      onCheckedChange={() => {
                        if (sectionIncludedByGroup) return;
                        toggleSection(section.id);
                      }}
                      disabled={sectionIncludedByGroup}
                    />
                    <label
                      htmlFor={section.id}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {section.name}
                      <span className="text-muted-foreground ml-2">
                        ({faqCount} FAQ{faqCount !== 1 ? "s" : ""})
                      </span>
                      {sectionIncludedByGroup && (
                        <span className="text-muted-foreground ml-2">
                          (via group)
                        </span>
                      )}
                    </label>
                  </div>
                );
              })}

              {sections.length === 0 && (
                <p className="text-sm text-muted-foreground">No sections to export</p>
              )}
            </div>
          </div>

          {canManageConfigs && (
            <div className="border-t pt-4 space-y-3">
              <div className="text-sm font-medium">Save preset</div>
              <div className="flex items-center gap-2">
                <Input
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Main Export"
                  className="h-9"
                />
                <Button onClick={handleSavePreset} disabled={!canSavePreset}>
                  Save
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleUpdatePreset}
                  disabled={!canUpdatePreset}
                >
                  Update
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDeletePreset}
                  disabled={!canDeletePreset}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={!canExport}>
            <Download className="h-4 w-4 mr-2" />
            Export ({selectedCount} section{selectedCount !== 1 ? "s" : ""})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
