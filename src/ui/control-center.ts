import * as vscode from "vscode";
import {
  initDocsAsSystemMini,
  validateDocsAsSystemMiniProject
} from "../core/project-init";
import {
  runFullCycle,
  startHumanEdit,
  analyzeHumanChanges,
  validateDocsWithAgent
} from "../core/ai-workflow";
import { openQuickStart, openReadme } from "../core/files";
import {
  getValidationStatus,
  onValidationStatusChange
} from "../core/validation-state";

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

  panel.webview.html = getWebviewContent(
    panel.webview,
    cssUri,
    jsUri,
    {
      validatePending: validatePendingIconUri.toString(),
      validateSuccess: validateSuccessIconUri.toString(),
      validateFailed: validateFailedIconUri.toString()
    }
  );

  // When validation status changes globally, notify the webview
  const subscription = onValidationStatusChange(status => {
    if (status === undefined) {
      return;
    }
    panel.webview.postMessage({
      type: "validationResult",
      target: "project",
      ok: status
    });
  });
  context.subscriptions.push({ dispose: () => subscription.dispose() });

  panel.webview.onDidReceiveMessage(
    async message => {
      if (!message || typeof message !== "object") {
        return;
      }

      // Webview asks for initial status
      if (message.type === "ready") {
        const status = getValidationStatus();
        if (status !== undefined) {
          panel.webview.postMessage({
            type: "validationResult",
            target: "project",
            ok: status
          });
        }
        return;
      }

      if (message.type === "click") {
        const id = String(message.buttonId ?? "");
        switch (id) {
          case "init-project": {
            // We reuse the main command so behavior stays consistent
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
          case "run-full-cycle":
            await runFullCycle();
            break;
          case "start-human-edit":
            await startHumanEdit();
            break;
          case "analyze-human-changes":
            await analyzeHumanChanges();
            break;
          case "open-quick-start":
            await openQuickStart();
            break;
          case "open-readme":
            await openReadme();
            break;
          case "validate-docs-with-agent":
            await validateDocsWithAgent();
            break;
          default:
            vscode.window.showWarningMessage(
              `Unknown control center button: ${id}`
            );
            break;
        }
      }
    },
    undefined,
    context.subscriptions
  );
}

function getWebviewContent(
  webview: vscode.Webview,
  cssUri: vscode.Uri,
  jsUri: vscode.Uri,
  icons: {
    validatePending: string;
    validateSuccess: string;
    validateFailed: string;
  }
): string {
  const cspSource = webview.cspSource;

  return `
<!DOCTYPE html>
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
  <link rel="stylesheet" href="${cssUri}">
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="title-group">
          <div class="title">
            Docs-as-System mini
            <span class="title-pill">Control Center</span>
          </div>
          <div class="subtitle">
            Central place for running the method with your AI agent inside VS Code.
          </div>
        </div>
      </div>

      <div class="status-card">
        <div class="status-main">
          <div class="status-row">
            <div class="status-dot"></div>
            <div class="status-label">Ready</div>
          </div>
          <div class="status-note">
            Use the daily flow below to keep your project and agent in sync.
          </div>
        </div>
        <div class="status-hint">
          1. Validate - 2. Run cycle - 3. Review
        </div>
      </div>

      <div class="section-title">
        <span>Daily workflow</span>
      </div>
      <div class="flow-grid">
        <div class="flow-step">
          <div class="flow-header">
            <div class="flow-left">
              <div class="flow-step-index">1</div>
              <div class="flow-step-title">Validate project</div>
            </div>
            <div class="flow-step-tag">Safety</div>
          </div>
          <div class="flow-desc">
            Make sure all required Docs-as-System mini files exist before working with the agent.
          </div>
          <button class="btn btn-pending" data-button-id="validate-project">
            <span class="btn-label-main">
              <img
                class="btn-status-icon"
                data-status-icon="validate"
                data-icon-pending="${icons.validatePending}"
                data-icon-success="${icons.validateSuccess}"
                data-icon-failed="${icons.validateFailed}"
                src="${icons.validatePending}"
                alt=""
              />
              <span>Validate project</span>
            </span>
            <span class="btn-key">Check</span>
          </button>
        </div>

        <div class="flow-step">
          <div class="flow-header">
            <div class="flow-left">
              <div class="flow-step-index">2</div>
              <div class="flow-step-title">Run full cycle</div>
            </div>
            <div class="flow-step-tag">Agent</div>
          </div>
          <div class="flow-desc">
            Prepare the orchestration prompt and let your AI agent run a full guided cycle.
          </div>
          <button class="btn" data-button-id="run-full-cycle">
            <span class="btn-label-main">
              🤖 Run full cycle
            </span>
            <span class="btn-key">Cycle</span>
          </button>
        </div>
      </div>

      <div class="section-title">
        <span>Hybrid human edit</span>
      </div>
      <div class="flow-grid">
        <div class="flow-step">
          <div class="flow-header">
            <div class="flow-left">
              <div class="flow-step-index">3</div>
              <div class="flow-step-title">Tell the agent you edit manually</div>
            </div>
            <div class="flow-step-tag">Pause</div>
          </div>
          <div class="flow-desc">
            Stop the current cycle and clearly mark that you are making manual changes.
          </div>
          <button class="btn" data-button-id="start-human-edit">
            <span class="btn-label-main">
              ✏️ I'm editing manually now
            </span>
            <span class="btn-key">Human</span>
          </button>
        </div>

        <div class="flow-step">
          <div class="flow-header">
            <div class="flow-left">
              <div class="flow-step-index">4</div>
              <div class="flow-step-title">Analyze manual changes</div>
            </div>
            <div class="flow-step-tag">Review</div>
          </div>
          <div class="flow-desc">
            Ask the agent to review your manual edits against the core project documents.
          </div>
          <button class="btn" data-button-id="analyze-human-changes">
            <span class="btn-label-main">
              🔍 Analyze manual changes
            </span>
            <span class="btn-key">Review</span>
          </button>
        </div>
      </div>

      <div class="section-title">
        <span>Docs and project setup</span>
      </div>
      <div class="flow-grid">
        <div class="flow-step">
          <div class="flow-header">
            <div class="flow-left">
              <div class="flow-step-title">Initialize project</div>
            </div>
            <div class="flow-step-tag">Setup</div>
          </div>
          <div class="flow-desc">
            Download all Docs-as-System mini files into this workspace and create required folders.
          </div>
          <button class="btn" data-button-id="init-project">
            <span class="btn-label-main">
              ☁️ Initialize project
            </span>
            <span class="btn-key">Init</span>
          </button>
        </div>

        <div class="flow-step">
          <div class="flow-header">
            <div class="flow-left">
              <div class="flow-step-title">Read the docs</div>
            </div>
            <div class="flow-step-tag">Guide</div>
          </div>
          <div class="flow-desc">
            Open the Quick Start guide or the full README inside this project.
          </div>
          <div class="docs-buttons-row">
            <button class="btn" data-button-id="open-quick-start">
              <span class="btn-label-main">
                🚀 Quick Start
              </span>
              <span class="btn-key">QS</span>
            </button>
            <button class="btn" data-button-id="open-readme">
              <span class="btn-label-main">
                📄 Method README
              </span>
              <span class="btn-key">Docs</span>
            </button>
          </div>
        </div>
      </div>

      <div class="activity">
        <div class="activity-left">
          <div class="activity-title">Activity</div>
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
