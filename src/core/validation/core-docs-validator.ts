import * as vscode from "vscode";
import {
  CoreDocumentKind,
  CoreDocumentsValidationSnapshot,
  DocumentReadinessLevel,
  DocumentValidationResult,
  ValidationIssue
} from "./types";
import { computeOverallReadiness } from "./state";

const CORE_DOC_PATHS: Record<CoreDocumentKind, string> = {
  "business-requirements": "docs/project/BUSINESS_REQUIREMENTS.mini.md",
  "project-spec": "docs/project/PROJECT_SPEC.mini.md",
  "architecture-blueprint": "docs/project/ARCHITECTURE_BLUEPRINT.mini.md",
  "implementation-plan": "docs/project/IMPLEMENTATION_PLAN.mini.md"
};

// Reference templates used to detect "raw template" content
const CORE_TEMPLATE_PATHS: Record<CoreDocumentKind, string> = {
  "business-requirements":
    "templates/project/BUSINESS_REQUIREMENTS_TEMPLATE.mini.md",
  "project-spec": "templates/project/PROJECT_SPEC_TEMPLATE.mini.md",
  "architecture-blueprint":
    "templates/project/ARCHITECTURE_BLUEPRINT_TEMPLATE.mini.md",
  "implementation-plan":
    "templates/project/IMPLEMENTATION_PLAN_TEMPLATE.mini.md"
};

async function readDocumentContent(
  workspaceFolder: vscode.WorkspaceFolder,
  relativePath: string
): Promise<string | undefined> {
  const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, relativePath);

  try {
    const data = await vscode.workspace.fs.readFile(fileUri);
    return Buffer.from(data).toString("utf8");
  } catch {
    return undefined;
  }
}

function createIssue(params: {
  kind: CoreDocumentKind;
  ruleId: string;
  messageKey: string;
  severity?: "error" | "warning" | "info";
  category?: "structure" | "content" | "cross-document";
  relativePath: string;
}): ValidationIssue {
  return {
    ruleId: params.ruleId,
    severity: params.severity ?? "error",
    category: params.category ?? "structure",
    target: params.kind,
    messageKey: params.messageKey,
    location: {
      uri: params.relativePath
    },
    details: {
      relativePath: params.relativePath
    }
  };
}

function detectFirstHeading(text: string): string | undefined {
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) {
      return trimmed;
    }
  }
  return undefined;
}

function expectedTitleToken(kind: CoreDocumentKind): string {
  switch (kind) {
    case "business-requirements":
      return "BUSINESS_REQUIREMENTS";
    case "project-spec":
      return "PROJECT_SPEC";
    case "architecture-blueprint":
      return "ARCHITECTURE_BLUEPRINT";
    case "implementation-plan":
      return "IMPLEMENTATION_PLAN";
    default:
      return "";
  }
}

/**
 * Normalize text so that template comparison is robust to whitespace
 * and minor formatting differences. We do not care about the language
 * of the content here.
 */
function normalizeForTemplateComparison(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function validateSingleDocument(
  workspaceFolder: vscode.WorkspaceFolder,
  kind: CoreDocumentKind
): Promise<DocumentValidationResult> {
  const relativePath = CORE_DOC_PATHS[kind];
  const content = await readDocumentContent(workspaceFolder, relativePath);

  const issues: ValidationIssue[] = [];

  if (content === undefined) {
    issues.push(
      createIssue({
        kind,
        ruleId: "CORE_DOC_MISSING_FILE",
        messageKey: "CORE_DOC_MISSING_FILE",
        relativePath
      })
    );

    return {
      kind,
      readiness: DocumentReadinessLevel.NotChecked,
      issues
    };
  }

  const trimmed = content.trim();
  if (!trimmed) {
    issues.push(
      createIssue({
        kind,
        ruleId: "CORE_DOC_EMPTY_FILE",
        messageKey: "CORE_DOC_EMPTY_FILE",
        relativePath
      })
    );

    return {
      kind,
      readiness: DocumentReadinessLevel.FilesExist,
      issues
    };
  }

  let readiness = DocumentReadinessLevel.FilesExist;

  // 1. Basic structure: check the top-level heading matches the expected token
  const heading = detectFirstHeading(content);
  const token = expectedTitleToken(kind);

  if (!heading) {
    issues.push(
      createIssue({
        kind,
        ruleId: "CORE_DOC_MISSING_TITLE",
        messageKey: "CORE_DOC_MISSING_TITLE",
        relativePath
      })
    );
  } else if (token && !heading.toUpperCase().includes(token)) {
    issues.push(
      createIssue({
        kind,
        ruleId: "CORE_DOC_WRONG_TITLE",
        messageKey: "CORE_DOC_WRONG_TITLE",
        relativePath
      })
    );
  } else {
    readiness = DocumentReadinessLevel.StructureOk;
  }

  // 2. Compare with template to detect "raw template" content
  // Only run this if structure is at least OK
  if (readiness >= DocumentReadinessLevel.StructureOk) {
    const templatePath = CORE_TEMPLATE_PATHS[kind];
    const templateContent = await readDocumentContent(
      workspaceFolder,
      templatePath
    );

    if (templateContent) {
      const normalizedDoc = normalizeForTemplateComparison(content);
      const normalizedTemplate =
        normalizeForTemplateComparison(templateContent);

      if (normalizedDoc === normalizedTemplate) {
        // Document still looks like the original template.
        // This means the user did not really adapt it to the project yet.
        issues.push(
          createIssue({
            kind,
            ruleId: "CORE_DOC_STILL_TEMPLATE",
            messageKey: "CORE_DOC_STILL_TEMPLATE",
            relativePath,
            severity: "warning",
            category: "content"
          })
        );
        // Keep readiness at StructureOk, do not promote to ContentLooksProjectSpecific.
      } else {
        // Content diverged from the template. We do not judge the language,
        // only the fact that the content looks specific to this project.
        readiness = DocumentReadinessLevel.ContentLooksProjectSpecific;
      }
    }
  }

  return {
    kind,
    readiness,
    issues
  };
}

/**
 * Basic validation for the four core Docs-as-System mini documents.
 * Checks:
 * - File existence
 * - Non-empty content
 * - Top-level heading that matches the expected token
 * - Content is no longer identical to the original template
 */
export async function validateCoreDocumentsBasic(): Promise<CoreDocumentsValidationSnapshot> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

  if (!workspaceFolder) {
    const emptySnapshot: CoreDocumentsValidationSnapshot = {
      overallReadiness: DocumentReadinessLevel.NotChecked,
      perDocument: [],
      lastValidatedAt: new Date().toISOString()
    };
    return emptySnapshot;
  }

  const kinds: CoreDocumentKind[] = [
    "business-requirements",
    "project-spec",
    "architecture-blueprint",
    "implementation-plan"
  ];

  const perDocument: DocumentValidationResult[] = [];

  for (const kind of kinds) {
    const result = await validateSingleDocument(workspaceFolder, kind);
    perDocument.push(result);
  }

  const snapshot: CoreDocumentsValidationSnapshot = {
    overallReadiness: computeOverallReadiness(perDocument),
    perDocument,
    lastValidatedAt: new Date().toISOString()
  };

  return snapshot;
}
