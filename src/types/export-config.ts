export type ExportConfigPayload = {
  includeVariables: boolean;
  includeCustomRules: boolean;
  sectionIds: string[];
  phaseGroupIds?: string[];
};
