"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download } from "lucide-react";

interface Variable {
  id: string;
  key: string;
  value: string;
}

interface Section {
  id: string;
  name: string;
}

interface FAQ {
  id: string;
  sectionId: string;
  question: string;
  answer: string;
  notes: string;
}

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variables: Variable[];
  sections: Section[];
  faqs: FAQ[];
}

export function ExportModal({
  open,
  onOpenChange,
  variables,
  sections,
  faqs,
}: ExportModalProps) {
  const [includeVariables, setIncludeVariables] = useState(true);
  const [selectedSections, setSelectedSections] = useState<Set<string>>(
    new Set(sections.map((s) => s.id))
  );

  // Update selected sections when sections change
  if (open && selectedSections.size === 0 && sections.length > 0) {
    setSelectedSections(new Set(sections.map((s) => s.id)));
  }

  const toggleSection = (sectionId: string) => {
    const newSelected = new Set(selectedSections);
    if (newSelected.has(sectionId)) {
      newSelected.delete(sectionId);
    } else {
      newSelected.add(sectionId);
    }
    setSelectedSections(newSelected);
  };

  const selectAll = () => {
    setSelectedSections(new Set(sections.map((s) => s.id)));
  };

  const selectNone = () => {
    setSelectedSections(new Set());
  };

  const generateMarkdown = () => {
    let md = "# Knowledge Base\n\n";

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
      if (!selectedSections.has(section.id)) continue;

      const sectionFaqs = faqs.filter((f) => f.sectionId === section.id);
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

  const selectedCount = selectedSections.size;
  const canExport = includeVariables || selectedCount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export to Markdown</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
                return (
                  <div key={section.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={section.id}
                      checked={selectedSections.has(section.id)}
                      onCheckedChange={() => toggleSection(section.id)}
                    />
                    <label
                      htmlFor={section.id}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {section.name}
                      <span className="text-muted-foreground ml-2">
                        ({faqCount} FAQ{faqCount !== 1 ? "s" : ""})
                      </span>
                    </label>
                  </div>
                );
              })}

              {sections.length === 0 && (
                <p className="text-sm text-muted-foreground">No sections to export</p>
              )}
            </div>
          </div>
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
