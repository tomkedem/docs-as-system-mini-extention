import * as vscode from "vscode";
import {
  startHumanEdit,
  analyzeHumanChanges,
  validateDocsWithAgent
} from "../core/ai-workflow";
import { openQuickStart, openReadme } from "../core/files";
import {
  getValidationStatus,
  onValidationStatusChange
} from "../core/validation-state";
import {
  getCoreDocsValidationSnapshot
} from "../core/validation/state";
import {
  CoreDocumentsValidationSnapshot,
  DocumentValidationResult as CoreDocumentValidationResult,
  ValidationIssue as CoreValidationIssue,
  ValidationSeverity as CoreValidationSeverity,
  CoreDocumentKind,
  DocumentReadinessLevel
} from "../core/validation/types";
import {
  ValidationSnapshot as UiValidationSnapshot,
  DocumentValidationResult as UiDocumentValidationResult,
  DocumentIssue as UiDocumentIssue,
  ValidationSeverity as UiValidationSeverity
} from "../core/validation/model";

export function openControlCenter(context: vscode.ExtensionContext) {
  const panel = vscode.window.createWebviewPanel(
    "docsAsSystemMiniControlCenter",
    "Docs-as-System mini - Control Center",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, "media")
      ]
    }
  );

  panel.webview.html = getWebviewContent(context, panel);

  // Keep project validation status in sync with the webview
  const subscription = onValidationStatusChange(ok => {
    panel.webview.postMessage({
      type: "validationResult",
      target: "project",
      ok
    });
  });

  context.subscriptions.push(subscription);

  panel.webview.onDidReceiveMessage(
    async message => {
      if (!message || typeof message !== "object") {
        return;
      }

      // Webview is ready - send initial state
      if (message.type === "ready") {
        const status = getValidationStatus();
        if (typeof status === "boolean") {
          panel.webview.postMessage({
            type: "validationResult",
            target: "project",
            ok: status
          });
        }

        // Try to load existing snapshot
        let coreSnapshot = getCoreDocsValidationSnapshot(context);

        // If no snapshot exists yet, run validation once on first open
        if (!coreSnapshot) {
          await vscode.commands.executeCommand("docsAsSystemMini.validateCoreDocs");
          coreSnapshot = getCoreDocsValidationSnapshot(context);
        }

        if (coreSnapshot) {
          const uiSnapshot = mapCoreDocsSnapshotToUi(coreSnapshot);
          panel.webview.postMessage({
            type: "coreDocsValidationUpdated",
            snapshot: uiSnapshot
          });
        }

        return;
      }

             // Webview asks to open a specific document and line
      if (message.type === "openDocLocation") {
        const relativePath = String(message.relativePath ?? "");
        const line = typeof message.line === "number" ? message.line : 0;

        if (!relativePath) {
          return;
        }

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
          vscode.window.showWarningMessage(
            "Cannot open document location because no workspace is open."
          );
          return;
        }

        const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, relativePath);

        try {
          const doc = await vscode.workspace.openTextDocument(fileUri);
          const editor = await vscode.window.showTextDocument(doc, {
            preview: false
          });

          const safeLine = Math.max(0, Math.min(line, doc.lineCount - 1));
          const position = new vscode.Position(safeLine, 0);
          const range = new vscode.Range(position, position);

          editor.selection = new vscode.Selection(position, position);
          editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
        } catch (err) {
          const messageText =
            err instanceof Error ? err.message : String(err);
          vscode.window.showWarningMessage(
            `Could not open "${relativePath}": ${messageText}`
          );
        }

        return;
      }


      // Button click from the webview
      if (message.type === "click") {
        const id = String(message.buttonId ?? "");

        switch (id) {
          case "init-project": {
            await vscode.commands.executeCommand(
              "docsAsSystemMini.initProject"
            );
            break;
          }

          case "validate-project": {
            const ok = await vscode.commands.executeCommand<boolean>(
              "docsAsSystemMini.validateProject"
            );
            if (typeof ok === "boolean") {
              panel.webview.postMessage({
                type: "validationResult",
                target: "project",
                ok
              });
            }
            break;
          }

          case "validate-core-docs": {
            // Run basic validation for core documents and persist the snapshot
            const coreSnapshot = await vscode.commands.executeCommand<
              CoreDocumentsValidationSnapshot
            >("docsAsSystemMini.validateCoreDocumentsBasic");

            if (coreSnapshot) {
              const uiSnapshot = mapCoreDocsSnapshotToUi(coreSnapshot);
              panel.webview.postMessage({
                type: "coreDocsValidationUpdated",
                snapshot: uiSnapshot
              });
            }
            break;
          }



          case "validate-docs-with-agent": {
            const coreSnapshot = getCoreDocsValidationSnapshot(context);

            if (
              !coreSnapshot ||
              typeof coreSnapshot.overallReadiness !== "number" ||
              coreSnapshot.overallReadiness <
                DocumentReadinessLevel.ContentLooksProjectSpecific
            ) {
              vscode.window.showWarningMessage(
                'Core documents basic validation has not passed the "Content looks project specific" level yet. ' +
                  "Please run core docs validation, open the files, and fix the issues before asking the agent to validate them."
              );
              break;
            }

            await validateDocsWithAgent();
            break;
          }

          case "run-full-cycle": {
            await vscode.commands.executeCommand(
              "docsAsSystemMini.runFullCycle"
            );
            break;
          }

          case "start-human-edit": {
            await startHumanEdit();
            break;
          }

          case "analyze-human-changes": {
            await analyzeHumanChanges();
            break;
          }

          case "open-quick-start": {
            await openQuickStart();
            break;
          }

          case "open-readme": {
            await openReadme();
            break;
          }

          default: {
            vscode.window.showWarningMessage(
              `Unknown control center button: ${id}`
            );
            break;
          }
        }
      }
    }
  );
}

function getWebviewContent(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel
): string {
  const webview = panel.webview;
  const cspSource = webview.cspSource;

  const cssUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "media", "controlCenter.css")
  );
  const jsUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "media", "controlCenter.js")
  );

  const validatePendingIconUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(
      context.extensionUri,
      "media",
      "icons",
      "validate-pending-light.svg"
    )
  );

  const validateSuccessIconUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(
      context.extensionUri,
      "media",
      "icons",
      "validate-success-light.svg"
    )
  );

  const validateFailedIconUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(
      context.extensionUri,
      "media",
      "icons",
      "validate-failed-light.svg"
    )
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    http-equiv="Content-Security-Policy"
    content="
      default-src 'none';
      img-src ${cspSource} https: data:;
      script-src ${cspSource};
      style-src ${cspSource};
    "
  />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Docs-as-System mini - Control Center</title>
  <link rel="stylesheet" href="${cssUri}" />
</head>

<body>
  <div class="container">
    <div class="card">

      <!-- Header -->
      <div class="header">
        <div class="title-group">
          <div class="title-row">
            <h1 class="title">Docs-as-System mini</h1>
            <span class="title-label">Control Center</span>
          </div>

          <p class="subtitle">
            One place to initialize the project, validate the core documents, and run AI guided cycles.
          </p>

          <p class="subtitle secondary">
            Start from Step 1 at the top. Once the core docs are ready, you can let the agent run full cycles safely.
          </p>
        </div>

        <!-- Project validation status -->
        <div class="status-card">
          <div class="status-main">
            <div class="status-row">
              <span class="status-dot"></span>
              <span class="status-label">Project validation</span>
            </div>
            <div
              class="status-note"
              data-status-text="project"
            >
              Project structure has not been validated yet.
            </div>
          </div>
          <img
            class="status-icon"
            data-validation-icon="project"
            data-icon-pending="${validatePendingIconUri}"
            data-icon-success="${validateSuccessIconUri}"
            data-icon-failed="${validateFailedIconUri}"
            src="${validatePendingIconUri}"
            alt="Validation status"
          />
        </div>
      </div>

      <!-- Section: Step 1 -->
      <div class="section-title">
        Step 1: Validate project and core documents
      </div>

      <div class="flow-grid">

        <!-- Initialize project -->
        <div class="flow-step">
          <div class="flow-header">
            <div class="flow-left">
              <div class="flow-step-title">Initialize project</div>
            </div>
          </div>
          <div class="flow-desc">
            Download Docs-as-System mini folders and core templates, or repair a broken setup.
          </div>
          <div class="docs-buttons-row">
            <button class="btn" data-button-id="init-project">
              <span class="btn-status-icon" id="init-status-icon"></span>
              <span class="btn-label-main">
                Initialize or repair project
              </span>
              <span class="btn-key">Init</span>
            </button>


            <button class="btn" data-button-id="open-quick-start">
              <span class="btn-label-main">
                Open Quick Start guide
              </span>
              <span class="btn-key">Guide</span>
            </button>
            <button class="btn" data-button-id="open-readme">
              <span class="btn-label-main">
                Open project README
              </span>
              <span class="btn-key">Docs</span>
            </button>
          </div>
        </div>

        <!-- Validate project structure -->
        <div class="flow-step">
          <div class="flow-header">
            <div class="flow-left">
              <div class="flow-step-index">1</div>
              <div class="flow-step-title">Validate project structure</div>
            </div>
          </div>
          <div class="flow-desc">
            Check that all required folders and system files exist and match the expected structure.
          </div>
          <button class="btn btn-validate" data-button-id="validate-project">
            <span class="btn-label-main">
              <span>Validate project structure</span>
            </span>
            <span class="btn-key-and-icon">
              <span class="btn-key">Step 1</span>
              <img
                class="btn-status-icon"
                data-validation-icon="validate"
                data-icon-pending="${validatePendingIconUri}"
                data-icon-success="${validateSuccessIconUri}"
                data-icon-failed="${validateFailedIconUri}"
                src="${validatePendingIconUri}"
                alt="Validation status"
              />
            </span>
          </button>
        </div>

        <!-- Core documents validation status + button -->
        <div class="flow-step">
          <div class="flow-header">
            <div class="flow-left">
              <div class="flow-step-index">2</div>
              <div class="flow-step-title">Validate core documents</div>
            </div>
          </div>
          <div class="flow-desc">
            Run a quick validation of the core docs to ensure they exist, follow the template, and contain project specific content.
          </div>
          <div class="core-docs-status" data-status-text="core-docs">
            Core documents status: not validated yet.
          </div>
          <button class="btn" data-button-id="validate-core-docs">
            <span class="btn-label-main">
              Validate core documents
            </span>
            <span class="btn-key">Step 2</span>
          </button>
        </div>

        <!-- Validate docs with agent -->
        <div class="flow-step">
          <div class="flow-header">
            <div class="flow-left">
              <div class="flow-step-index">3</div>
              <div class="flow-step-title">Validate docs with the agent</div>
            </div>
          </div>
          <div class="flow-desc">
            Ask the AI agent to review consistency between the core docs and surface deeper issues.
          </div>
          <button class="btn" data-button-id="validate-docs-with-agent">
            <span class="btn-label-main">
              Ask the agent to validate docs
            </span>
            <span class="btn-key">Step 3</span>
          </button>
        </div>
      </div>

      <!-- Core docs report -->
      <div class="section-title">
        Core documents validation report
      </div>

      <div class="core-docs-layout">
        <div class="core-docs-list-panel">
          <div class="core-docs-list-header">
            <div class="core-docs-list-title">Documents</div>
            <div class="core-docs-list-subtitle">
              Latest validation snapshot. Click a document to see its issues.
            </div>
          </div>
          <div id="core-docs-list" class="core-docs-list">
            <!-- filled by controlCenter.js -->
          </div>
        </div>

        <div class="core-docs-details-panel">
          <div class="core-docs-details-header">
            <div
              id="core-docs-details-title"
              class="core-docs-details-title"
            >
              No document selected
            </div>
            <div
              id="core-docs-details-subtitle"
              class="core-docs-details-subtitle"
            >
              Run core docs validation, then select a document on the left.
            </div>
          </div>

          <div
            id="core-docs-issues"
            class="core-docs-issues"
          >
            <!-- filled by controlCenter.js -->
          </div>
        </div>
      </div>

      <!-- Section: Step 2 -->
      <div class="section-title">
        Step 2: Run AI guided cycles
      </div>

      <div class="flow-grid">
        <!-- Run full cycle -->
        <div class="flow-step">
          <div class="flow-header">
            <div class="flow-left">
              <div class="flow-step-index">4</div>
              <div class="flow-step-title">Run full AI guided cycle</div>
            </div>
          </div>
          <div class="flow-desc">
            Let the agent read the docs, select the next task from the Implementation Plan, propose a plan, execute, self check, and prepare a commit and pull request.
          </div>
          <button class="btn" data-button-id="run-full-cycle">
            <span class="btn-label-main">
              Run full cycle with the agent
            </span>
            <span class="btn-key">Step 4</span>
          </button>
        </div>

        <!-- Human edit mode -->
        <div class="flow-step">
          <div class="flow-header">
            <div class="flow-left">
              <div class="flow-step-index">5</div>
              <div class="flow-step-title">Human edit mode</div>
            </div>
          </div>
          <div class="flow-desc">
            Temporarily switch to human driven editing of the docs, while keeping the agent aware of the changes.
          </div>
          <div class="docs-buttons-row">
            <button class="btn" data-button-id="start-human-edit">
              <span class="btn-label-main">
                Start Human Edit mode
              </span>
              <span class="btn-key">Edit</span>
            </button>
            <button class="btn" data-button-id="analyze-human-changes">
              <span class="btn-label-main">
                Analyze Human changes
              </span>
              <span class="btn-key">Review</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Activity / helper footer -->
      <div class="activity">
        <div class="activity-left">
          <div class="activity-title">
            Activity and notifications
          </div>
          <div class="activity-note">
            Commands you run from here will appear in the VS Code notifications and Output panel.
          </div>
        </div>
        <div class="badge">Docs-as-System mini</div>
      </div>

    </div>
  </div>

  <script src="${jsUri}"></script>
</body>
</html>
`;
}

/**
 * Map the core documents validation snapshot (used by the validation engine)
 * into the UI friendly snapshot that the Control Center renders.
 */
function mapCoreDocsSnapshotToUi(
  snapshot: CoreDocumentsValidationSnapshot
): UiValidationSnapshot & { overallReadiness: DocumentReadinessLevel } {
  const documents: UiDocumentValidationResult[] =
    snapshot.perDocument.map(mapCoreDocResultToUiDocResult);

  const summarySeverity = computeSummarySeverity(documents);
  const readyForDevelopment = computeReadyForDevelopment(
    snapshot.overallReadiness
  );

  const base: UiValidationSnapshot = {
    summarySeverity,
    readyForDevelopment,
    summaryMessage: describeCoreDocsState(
      documents,
      snapshot.overallReadiness
    ),
    lastValidatedAt: snapshot.lastValidatedAt,
    documents
  };

  return {
    ...base,
    overallReadiness: snapshot.overallReadiness
  };
}

const CORE_DOC_PATHS: Record<CoreDocumentKind, string> = {
  "business-requirements": "docs/project/BUSINESS_REQUIREMENTS.mini.md",
  "project-spec": "docs/project/PROJECT_SPECIFICATION.mini.md",
  "architecture-blueprint":
    "docs/project/ARCHITECTURE_BLUEPRINT.mini.md",
  "implementation-plan": "docs/project/IMPLEMENTATION_PLAN.mini.md"
};

const CORE_DOC_DISPLAY_NAMES: Record<CoreDocumentKind, string> = {
  "business-requirements": "Business Requirements",
  "project-spec": "Project Spec",
  "architecture-blueprint": "Architecture Blueprint",
  "implementation-plan": "Implementation Plan"
};

function mapCoreDocResultToUiDocResult(
  doc: CoreDocumentValidationResult
): UiDocumentValidationResult {
  const issues = (doc.issues ?? []).map(mapCoreIssueToUiIssue);
  const severity = computeDocumentSeverity(issues);
  const path = CORE_DOC_PATHS[doc.kind] ?? doc.kind;
  const displayName = CORE_DOC_DISPLAY_NAMES[doc.kind] ?? doc.kind;
  const readinessLabel = describeDocumentReadiness(doc.readiness);

  return {
    path,
    displayName,
    severity,
    issues,
    readinessLabel
  };
}

function mapCoreIssueToUiIssue(
  issue: CoreValidationIssue
): UiDocumentIssue {
  return {
    id: issue.ruleId,
    message: mapIssueMessage(issue),
    severity: mapCoreSeverityToUiSeverity(issue.severity),
    sectionPath: buildSectionPath(issue),
    details: undefined,
    suggestion: undefined
  };
}
 // Maps low level validation keys to human friendly messages
function mapIssueMessage(issue: CoreValidationIssue): string {
  const key = issue.messageKey || issue.ruleId;

  // Try to extract the section title from issue.details, if available
  let sectionTitle: string | undefined;
  if (issue.details && typeof issue.details === "object") {
    const anyDetails = issue.details as Record<string, unknown>;
    if (
      typeof anyDetails.sectionTitle === "string" &&
      anyDetails.sectionTitle.trim().length > 0
    ) {
      sectionTitle = anyDetails.sectionTitle.trim();
    }
  }

  switch (key) {
    case "CORE_DOC_MISSING_FILE":
      return "This core document is missing from the project. Create it from the official template before continuing.";

    case "CORE_DOC_EMPTY_FILE":
      return "This core document exists but is empty. Fill it with project specific content before continuing.";

    case "CORE_DOC_MISSING_TITLE":
      return "The document is missing a top-level title. Add a '# ...' heading at the top.";

    case "CORE_DOC_WRONG_TITLE":
      return "Document title does not follow the expected structure. Use a clear project specific title.";

    case "CORE_DOC_MISSING_SECTION":
      if (sectionTitle) {
        return `Required section "${sectionTitle}" is missing from this document. Add this section using the heading from the template.`;
      }
      return "One or more required sections are missing from this document.";

    case "CORE_DOC_EMPTY_SECTION":
      if (sectionTitle) {
        return `Section "${sectionTitle}" exists but does not have project specific content yet. Fill this section before relying on this document.`;
      }
      return "One or more sections exist but do not have project specific content yet.";

    case "CORE_DOC_SECTION_STILL_TEMPLATE":
      if (sectionTitle) {
        return `Section "${sectionTitle}" still contains template content. Replace the template examples with your project specific content and remove the TEMPLATE_CONTENT marker.`;
      }
      return "One or more sections still contain template content. Replace the template examples with your project specific content and remove the TEMPLATE_CONTENT markers.";

    case "CORE_DOC_STILL_TEMPLATE":
      return "This document still looks very close to the original template. Adapt the content to this specific project before using it for real development.";

    default:
      // Fallback: show the raw key so advanced users still see what rule fired
      return key || "Validation issue detected in this document.";
  }
}




function buildSectionPath(
  issue: CoreValidationIssue
): string | undefined {
  const loc = issue.location;
  if (!loc) {
    return undefined;
  }

  if (typeof loc.line === "number") {
    return `${loc.uri}:${loc.line}`;
  }

  return loc.uri;
}

function mapCoreSeverityToUiSeverity(
  severity: CoreValidationSeverity
): UiValidationSeverity {
  switch (severity) {
    case "error":
      return "BLOCKER";
    case "warning":
      return "WARNING";
    case "info":
    default:
      return "OK";
  }
}

function computeDocumentSeverity(
  issues: UiDocumentIssue[]
): UiValidationSeverity {
  if (issues.some(i => i.severity === "BLOCKER")) {
    return "BLOCKER";
  }

  if (issues.some(i => i.severity === "WARNING")) {
    return "WARNING";
  }

  return "OK";
}

function computeSummarySeverity(
  documents: UiDocumentValidationResult[]
): UiValidationSeverity {
  if (documents.some(d => d.severity === "BLOCKER")) {
    return "BLOCKER";
  }

  if (documents.some(d => d.severity === "WARNING")) {
    return "WARNING";
  }

  return "OK";
}

function computeReadyForDevelopment(
  level: DocumentReadinessLevel
): boolean {
  return (
    level === DocumentReadinessLevel.ContentLooksProjectSpecific ||
    level === DocumentReadinessLevel.AgentApproved
  );
}

/**
 * Human friendly description for the mixed state of core docs.
 * Takes into account both the overall readiness level and the per-document mix.
 */
function describeCoreDocsState(
  documents: UiDocumentValidationResult[],
  overall: DocumentReadinessLevel
): string {
  if (!documents.length) {
    return "Core documents status: not validated yet.";
  }

  const okCount = documents.filter(d => d.severity === "OK").length;
  const warnCount = documents.filter(d => d.severity === "WARNING").length;
  const blockCount = documents.filter(d => d.severity === "BLOCKER").length;
  const total = documents.length;

  // Classic initial state: files exist but none of the documents are really ready
  if (
    overall === DocumentReadinessLevel.FilesExist &&
    okCount === 0 &&
    (warnCount > 0 || blockCount > 0 || total > 0)
  ) {
    return "Core documents exist, but content is not ready yet. Some files may be empty, missing sections, or still look like the default template.";
  }

  // All documents are ready and look project specific
  if (
    okCount === total &&
    overall >= DocumentReadinessLevel.ContentLooksProjectSpecific
  ) {
    return "All core documents look project specific and ready.";
  }

  // Mixed state: some documents are fine, others have serious issues
  if (blockCount > 0 && okCount > 0) {
    return "Some core documents are ready, but others still require work.";
  }

  if (blockCount > 0 && okCount === 0) {
    return "Several core documents have critical issues that must be fixed before you can rely on them.";
  }

  if (warnCount > 0 && okCount > 0 && blockCount === 0) {
    return "Most core documents look good, but some still need attention.";
  }

  if (warnCount > 0 && okCount === 0 && blockCount === 0) {
    return "Core documents structure looks mostly OK, but several sections still need attention.";
  }

  // Generic fallback based on overall readiness
  switch (overall) {
    case DocumentReadinessLevel.NotChecked:
      return "Core documents status: not validated yet.";
    case DocumentReadinessLevel.FilesExist:
      return "Core documents exist, but content is not ready yet.";
    case DocumentReadinessLevel.StructureOk:
      return "Core documents: structure looks OK, but some content still needs work.";
    case DocumentReadinessLevel.ContentLooksProjectSpecific:
      return "Core documents: content looks project specific, with some minor issues.";
    case DocumentReadinessLevel.AgentApproved:
      return "Core documents: agent approved and ready for full cycles.";
    default:
      return "Core documents status: unknown.";
  }
}

// Converts DocumentReadinessLevel into a short, human friendly label per document
function describeDocumentReadiness(
  level: DocumentReadinessLevel | undefined
): string {
  if (typeof level !== "number") {
    return "Not validated yet";
  }

  switch (level) {
    case DocumentReadinessLevel.NotChecked:
      return "Not validated yet";
    case DocumentReadinessLevel.FilesExist:
      return "Template or incomplete content";
    case DocumentReadinessLevel.StructureOk:
      return "Structure OK, content needs work";
    case DocumentReadinessLevel.ContentLooksProjectSpecific:
      return "Content looks project specific";
    case DocumentReadinessLevel.AgentApproved:
      return "Agent approved and ready";
    default:
      return "Unknown state";
  }
}
