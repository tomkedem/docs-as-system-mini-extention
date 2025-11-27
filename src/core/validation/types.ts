// src/core/validation/types.ts

// All comments in this file must stay in English only.

export type CoreDocumentKind =
  | "business-requirements"
  | "project-spec"
  | "architecture-blueprint"
  | "implementation-plan";

export type ValidationSeverity = "error" | "warning" | "info";

export type ValidationCategory = "structure" | "content" | "cross-document";

export interface ValidationLocation {
  uri: string;          // Workspace relative path, for example: docs/project/BUSINESS_REQUIREMENTS.mini.md
  line?: number;        // Optional: line number for more precise navigation
  column?: number;      // Optional: column number for more precise navigation
}

export interface ValidationIssue {
  ruleId: string;                   // Stable rule id, for example: BR_MISSING_BUSINESS_GOALS
  severity: ValidationSeverity;
  category: ValidationCategory;
  target: CoreDocumentKind;         // Which core document this issue belongs to
  messageKey: string;               // Key to lookup localized text for title and "how to fix"
  location?: ValidationLocation;
  details?: Record<string, unknown>; // Extra data used by the UI when rendering the message
}

export enum DocumentReadinessLevel {
  NotChecked = 0,                   // No validation has been run yet
  FilesExist = 1,                   // All four core documents exist and are non empty
  StructureOk = 2,                  // Required sections and headings are present
  ContentLooksProjectSpecific = 3,  // Content does not look like a raw template anymore
  AgentApproved = 4,                // Human confirmed that the agent approved the documents
}

export interface DocumentValidationResult {
  kind: CoreDocumentKind;
  readiness: DocumentReadinessLevel;
  issues: ValidationIssue[];
}

export interface CoreDocumentsValidationSnapshot {
  overallReadiness: DocumentReadinessLevel;
  perDocument: DocumentValidationResult[];
  lastValidatedAt?: string;         // ISO timestamp string
}

export interface UiLanguageConfig {
  docsLanguage: string;             // Value from AGENT_CONFIG.language.docs
  uiLanguage: string;               // Value from AGENT_CONFIG.language.ui
}
