// src/core/validation/core-docs-validator.ts

import * as vscode from "vscode";
import {
  CoreDocumentKind,
  CoreDocumentsValidationSnapshot,
  DocumentReadinessLevel,
  DocumentValidationResult,
  ValidationIssue
} from "./types";
import { computeOverallReadiness } from "./state";

// Core docs are always validated from docs/project
const CORE_DOC_PATHS: Record<CoreDocumentKind, string> = {
  "business-requirements": "docs/project/BUSINESS_REQUIREMENTS.mini.md",
  "project-spec": "docs/project/PROJECT_SPECIFICATION.mini.md",
  "architecture-blueprint": "docs/project/ARCHITECTURE_BLUEPRINT.mini.md",
  "implementation-plan": "docs/project/IMPLEMENTATION_PLAN.mini.md"
};

type ValidationCategory = "structure" | "content" | "cross-document";
type ValidationSeverity = "error" | "warning" | "info";

interface ParsedSection {
  title: string;
  headingLine: number;
  startLine: number;
  endLine: number;
  required: boolean;
  hasTemplateMarker: boolean;
  hasMeaningfulContent: boolean;
}

/**
 * Read a workspace relative file as UTF-8 text.
 */
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

/**
 * Helper to create a ValidationIssue instance.
 */
function createIssue(params: {
  kind: CoreDocumentKind;
  ruleId: string;
  messageKey: string;
  severity?: ValidationSeverity;
  category?: ValidationCategory;
  relativePath: string;
  line?: number;
  sectionTitle?: string;
}): ValidationIssue {
  const details: Record<string, unknown> = {
    relativePath: params.relativePath
  };

  if (params.sectionTitle) {
    details.sectionTitle = params.sectionTitle;
  }

  return {
    ruleId: params.ruleId,
    severity: params.severity ?? "error",
    category: params.category ?? "structure",
    target: params.kind,
    messageKey: params.messageKey,
    location: {
      uri: params.relativePath,
      line: params.line
    },
    details
  };
}

/**
 * Find the first top level heading ("# ...") in a markdown document.
 */
function detectFirstHeading(
  text: string
): { line: number; value: string } | undefined {
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("# ")) {
      return { line: i, value: trimmed };
    }
  }

  return undefined;
}

function isMeaningfulContentLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }

  if (trimmed === "---") {
    return false;
  }

  // Ignore pure comments that are only markers or template hints
  if (trimmed.startsWith("<!--") && trimmed.endsWith("-->")) {
    if (
      trimmed.includes("TEMPLATE_CONTENT") ||
      trimmed.includes("DO NOT REMOVE OR RENAME THIS HEADING") ||
      trimmed.includes("CORE HEADER")
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Parse markdown sections in a core document.
 * Sections are defined as lines that start with "## ".
 * The first heading "# ..." is treated as the document title.
 */
function parseSections(content: string): ParsedSection[] {
  const lines = content.split(/\r?\n/);
  const sections: ParsedSection[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("## ")) {
      const title = trimmed.replace(/^##\s+/, "").trim();
      const headingLine = i;

      // Check a few lines after the heading for the "do not remove" marker
      let required = false;
      for (let j = i + 1; j < Math.min(lines.length, i + 6); j++) {
        const marker = lines[j].trim();
        if (marker.includes("DO NOT REMOVE OR RENAME THIS HEADING")) {
          required = true;
          break;
        }
        if (marker.startsWith("## ") || marker.startsWith("# ")) {
          break;
        }
      }

      // Determine section bounds until the next "## " or "# " heading
      const startLine = i + 1;
      let endLine = lines.length - 1;

      for (let j = i + 1; j < lines.length; j++) {
        const t = lines[j].trim();
        if (t.startsWith("## ") || t.startsWith("# ")) {
          endLine = j - 1;
          break;
        }
      }

      let hasTemplateMarker = false;
      let hasMeaningfulContent = false;

      for (let j = startLine; j <= endLine; j++) {
        const sectionLine = lines[j] ?? "";
        if (sectionLine.includes("TEMPLATE_CONTENT")) {
          hasTemplateMarker = true;
        }
        if (isMeaningfulContentLine(sectionLine)) {
          hasMeaningfulContent = true;
        }
      }

      sections.push({
        title,
        headingLine,
        startLine,
        endLine,
        required,
        hasTemplateMarker,
        hasMeaningfulContent
      });

      i = endLine + 1;
      continue;
    }

    i += 1;
  }

  return sections;
}

/**
 * Decide the readiness level for a single document, based on issues and sections.
 */
function computeDocumentReadinessFromSections(
  hadTitleIssue: boolean,
  sections: ParsedSection[]
): DocumentReadinessLevel {
  if (hadTitleIssue || sections.length === 0) {
    return DocumentReadinessLevel.FilesExist;
  }

  const hasRequired = sections.some(s => s.required);
  if (!hasRequired) {
    // We have some structure, but nothing marked as required
    return DocumentReadinessLevel.StructureOk;
  }

  const hasTemplateSections = sections.some(s => s.hasTemplateMarker);
  const hasEmptyRequired = sections.some(
    s => s.required && !s.hasMeaningfulContent
  );

  if (!hasTemplateSections && !hasEmptyRequired) {
    return DocumentReadinessLevel.ContentLooksProjectSpecific;
  }

  return DocumentReadinessLevel.StructureOk;
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

  // Title must exist, but we do not enforce a specific text token
  const heading = detectFirstHeading(content);
  let hadTitleIssue = false;

  if (!heading) {
    issues.push(
      createIssue({
        kind,
        ruleId: "CORE_DOC_MISSING_TITLE",
        messageKey: "CORE_DOC_MISSING_TITLE",
        relativePath
      })
    );
    hadTitleIssue = true;
  }

  const sections = parseSections(content);

  // For each required section with no real content, raise an issue
  for (const section of sections) {
    if (section.required && !section.hasMeaningfulContent) {
      issues.push(
        createIssue({
          kind,
          ruleId: "CORE_DOC_EMPTY_SECTION",
          messageKey: "CORE_DOC_EMPTY_SECTION",
          severity: "warning",
          category: "content",
          relativePath,
          line: section.headingLine,
          sectionTitle: section.title
        })
      );
    }

    if (section.hasTemplateMarker) {
      issues.push(
        createIssue({
          kind,
          ruleId: "CORE_DOC_SECTION_STILL_TEMPLATE",
          messageKey: "CORE_DOC_SECTION_STILL_TEMPLATE",
          severity: "warning",
          category: "content",
          relativePath,
          line: section.headingLine,
          sectionTitle: section.title
        })
      );
    }
  }

  const readiness = computeDocumentReadinessFromSections(
    hadTitleIssue,
    sections
  );

  return {
    kind,
    readiness,
    issues
  };
}

/**
 * Basic validation for the four core Docs-as-System mini documents.
 * Checks for each document:
 * - File existence
 * - Non empty content
 * - Presence of a top level title
 * - Presence of required sections
 * - Required sections that still contain TEMPLATE_CONTENT markers
 * - Required sections that are structurally present but empty
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
