// src/core/validation/model.ts

export type ValidationSeverity = "OK" | "WARNING" | "BLOCKER";

export interface DocumentIssue {
  id: string;                    // Logical rule identifier (ruleId)
  message: string;               // Human facing validation message
  severity: ValidationSeverity;  // Issue severity level
  sectionPath?: string;          // File location (if available)
  details?: string;              // Extra details (optional)
  suggestion?: string;           // Suggested fix (optional)
}

export interface DocumentValidationResult {
  path: string;                  // Full path to the document
  displayName: string;           // Human friendly document name
  severity: ValidationSeverity;  // Aggregated severity for this document
  issues: DocumentIssue[];       // All issues found in this document

  // Human readable readiness state (e.g. "Template content", "Structure OK", "Project specific")
  readinessLabel?: string;
}

export interface ValidationSnapshot {
  summarySeverity: ValidationSeverity;   // Overall severity across all documents
  readyForDevelopment: boolean;          // Whether full AI cycles are allowed
  summaryMessage: string;                // Summary line shown at the top of the report
  lastValidatedAt?: string;              // When validation was last executed
  documents: DocumentValidationResult[]; // Per document validation results
}
