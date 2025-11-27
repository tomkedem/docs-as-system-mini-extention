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
import { DocumentReadinessLevel } from "../core/validation/types";

export function openControlCenter(context: vscode.ExtensionContext) {
  const panel = vscode.window.createWebviewPanel(
    "docsAsSystemMiniControlCenter",
    "Docs-as-System mini - Control Center",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "media")]
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
  context.subscriptions.push({ dispose: () => subscription.dispose() });

  panel.webview.onDidReceiveMessage(
    async message => {
      if (!message || typeof message !== "object") {
        return;
      }

      // Webview is ready and asks for initial state
      if (message.type === "ready") {
        const status = getValidationStatus();
        if (status !== undefined) {
          panel.webview.postMessage({
            type: "validationResult",
            target: "project",
            ok: status
          });
        }

        // Send latest core documents validation snapshot to the webview
        const coreSnapshot = getCoreDocsValidationSnapshot(context);
        if (coreSnapshot) {
          panel.webview.postMessage({
            type: "coreDocsValidationUpdated",
            snapshot: coreSnapshot
          });
        }

        return;
      }

      // Button click from controlCenter.js
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
            const snapshot = await vscode.commands.executeCommand(
              "docsAsSystemMini.validateCoreDocumentsBasic"
            );
            panel.webview.postMessage({
              type: "coreDocsValidationUpdated",
              snapshot
            });
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
          case "validate-docs-with-agent": {
            const snapshot = getCoreDocsValidationSnapshot(context);

            if (
              !snapshot ||
              typeof snapshot.overallReadiness !== "number" ||
              snapshot.overallReadiness <
                DocumentReadinessLevel.ContentLooksProjectSpecific
            ) {
              vscode.window.showWarningMessage(
                "Core documents basic validation has not passed yet. Run \"Validate core documents\" and fix the issues before asking the agent to validate them."
              );
              break;
            }

            await validateDocsWithAgent();
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
    },
    undefined,
    context.subscriptions
  );
}

function getWebviewContent(
  context: vscode.ExtensionContext,
  panel: vscode.WebviewPanel
): string {
  const cspSource = panel.webview.cspSource;

  const cssUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "media", "controlCenter.css")
  );

  const jsUri = panel.webview.asWebviewUri(
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

          <!-- Main title -->
          <div class="title-row">
            <h1 class="title">Docs-as-System mini</h1>
            <span class="title-label">Control Center</span>
          </div>

          <!-- Subtitle -->
          <p class="subtitle">
            One place to initialize the project, validate the core documents, and run AI guided cycles.
          </p>

          <!-- Small helper text -->
          <p class="subtitle secondary">
            Start from Step 1 at the top. Once the core docs are ready, you can let the agent run full cycles safely.
          </p>
        </div>

        <!-- Project validation status -->
        <div class="status-block">
          <div class="status-label">Project validation</div>
          <div class="status-row">
            <span
              class="status-text"
              data-status-text="project"
            >
              Project structure has not been validated yet.
            </span>
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
      </div>

      <!-- STEP 1 -->
      <div class="section-title">
        Step 1: Validate project and core documents
      </div>

      <div class="flow-grid">

        <!-- Initialize project (no numbering) -->
        <div class="flow-step">
          <div class="flow-header">
            <div class="flow-left">
              <div class="flow-step-title">Initialize project</div>
            </div>
          </div>
          <div class="flow-desc">
            Download Docs-as-System mini folders and core templates, or repair a broken setup.
          </div>
          <button class="btn" data-button-id="init-project">
            <span class="btn-label-main">
              Initialize project
            </span>
            <span class="btn-key">First-time setup</span>
          </button>
        </div>

        <!-- 1. validate project structure -->
        <div class="flow-step">
          <div class="flow-header">
            <div class="flow-left">
              <div class="flow-step-index">1</div>
              <div class="flow-step-title">Project structure</div>
            </div>
          </div>
          <div class="flow-desc">
            Check that the Docs-as-System mini folders, required files and scripts are in place.
          </div>
          <button class="btn" data-button-id="validate-project">
            <span class="btn-label-main">
              Validate project structure
              <img
                class="inline-status-icon"
                data-validation-icon="project"
                data-icon-pending="${validatePendingIconUri}"
                data-icon-success="${validateSuccessIconUri}"
                data-icon-failed="${validateFailedIconUri}"
                src="${validatePendingIconUri}"
                alt="Validation status"
              />
            </span>
            <span class="btn-key">Step 1.1</span>
          </button>
        </div>

        <!-- 2. core docs -->
        <div class="flow-step">
          <div class="flow-header">
            <div class="flow-left">
              <div class="flow-step-index">2</div>
              <div class="flow-step-title">Core project documents</div>
            </div>
          </div>
          <div class="flow-desc">
            Check that BUSINESS_REQUIREMENTS, PROJECT_SPEC, ARCHITECTURE_BLUEPRINT and IMPLEMENTATION_PLAN exist and are readable.
          </div>
          <button class="btn" data-button-id="validate-core-docs">
            <span class="btn-label-main">
              Validate core documents
            </span>
            <span class="btn-key">Step 1.2</span>
          </button>
          <div class="core-docs-status" data-status-text="core-docs">
            Core documents status: not validated yet.
          </div>
        </div>

        <!-- 3. validate docs with agent -->
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
              Run agent validation
            </span>
            <span class="btn-key">Step 1.3</span>
          </button>
        </div>

      </div>

      <!-- STEP 2 -->
      <div class="section-title">
        Step 2: Let the agent work
      </div>

      <div class="flow-grid">

        <!-- 4. run full AI guided cycle -->
        <div class="flow-step">
          <div class="flow-header">
            <div class="flow-left">
              <div class="flow-step-index">4</div>
              <div class="flow-step-title">Run full AI-guided cycle</div>
            </div>
          </div>
          <div class="flow-desc">
            Use the main orchestration prompt to let the agent read the docs, plan the work, update the code, self-check and prepare a commit and pull request.
          </div>
          <button class="btn" data-button-id="run-full-cycle">
            <span class="btn-label-main">
              Run full AI-guided cycle
            </span>
            <span class="btn-key">Step 2.1</span>
          </button>
        </div>
      </div>

      <!-- Hybrid human edit -->
      <div class="section-title">
        Hybrid human edit
      </div>

      <div class="flow-grid">
        <div class="flow-step">
          <div class="flow-header">
            <div class="flow-left">
              <div class="flow-step-title">Human edit session</div>
            </div>
          </div>
          <div class="flow-desc">
            Use this flow when a human edited the docs or code directly and you want the agent to analyze the changes without taking over.
          </div>
          <div class="docs-buttons-row">
            <button class="btn" data-button-id="start-human-edit">
              <span class="btn-label-main">
                Start human edit session
              </span>
            </button>
            <button class="btn" data-button-id="analyze-human-changes">
              <span class="btn-label-main">
                Analyze human changes
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- Docs-as-System mini resources -->
      <div class="section-title">
        Docs-as-System mini resources
      </div>

      <div class="flow-grid">
        <div class="flow-step">
          <div class="flow-header">
            <div class="flow-left">
              <div class="flow-step-title">Method docs</div>
            </div>
          </div>
          <div class="flow-desc">
            Open the official method docs that explain the workflow and the meaning of each document.
          </div>
          <div class="docs-buttons-row">
            <button class="btn" data-button-id="open-quick-start">
              <span class="btn-label-main">Open Quick Start</span>
            </button>
            <button class="btn" data-button-id="open-readme">
              <span class="btn-label-main">Open project README</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <div class="footer-text">
          <div>Docs-as-System mini is designed to be used together with your AI agent inside VS Code.</div>
          <div>
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
