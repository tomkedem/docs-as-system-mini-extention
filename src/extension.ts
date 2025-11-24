import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";

const GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/tomkedem/Docs-as-System-mini/main";

// -----------------------------------------------------------------------------
// Template and required files
// -----------------------------------------------------------------------------

const TEMPLATE_FILES: { src: string; dest: string }[] = [
  // project docs
  {
    src: "docs/project/BUSINESS_REQUIREMENTS.mini.md",
    dest: "docs/project/BUSINESS_REQUIREMENTS.mini.md"
  },
  {
    src: "docs/project/PROJECT_SPEC.mini.md",
    dest: "docs/project/PROJECT_SPEC.mini.md"
  },
  {
    src: "docs/project/ARCHITECTURE_BLUEPRINT.mini.md",
    dest: "docs/project/ARCHITECTURE_BLUEPRINT.mini.md"
  },
  {
    src: "docs/project/IMPLEMENTATION_PLAN.mini.md",
    dest: "docs/project/IMPLEMENTATION_PLAN.mini.md"
  },

  // prompts
  {
    src: "docs/prompts/PROMPTS_LIBRARY/prompt_execute_task.mini.md",
    dest: "docs/prompts/PROMPTS_LIBRARY/prompt_execute_task.mini.md"
  },
  {
    src: "docs/prompts/PROMPTS_LIBRARY/prompt_generate_summary.mini.md",
    dest: "docs/prompts/PROMPTS_LIBRARY/prompt_generate_summary.mini.md"
  },
  {
    src: "docs/prompts/PROMPTS_LIBRARY/prompt_main_orchestration.mini.md",
    dest: "docs/prompts/PROMPTS_LIBRARY/prompt_main_orchestration.mini.md"
  },
  {
    src: "docs/prompts/PROMPTS_LIBRARY/prompt_prepare_commit.mini.md",
    dest: "docs/prompts/PROMPTS_LIBRARY/prompt_prepare_commit.mini.md"
  },
  {
    src: "docs/prompts/PROMPTS_LIBRARY/prompt_prepare_pull_request.mini.md",
    dest: "docs/prompts/PROMPTS_LIBRARY/prompt_prepare_pull_request.mini.md"
  },
  {
    src: "docs/prompts/PROMPTS_LIBRARY/prompt_prepare_step.mini.md",
    dest: "docs/prompts/PROMPTS_LIBRARY/prompt_prepare_step.mini.md"
  },
  {
    src: "docs/prompts/PROMPTS_LIBRARY/prompt_self_check.mini.md",
    dest: "docs/prompts/PROMPTS_LIBRARY/prompt_self_check.mini.md"
  },
  {
    src: "docs/prompts/PROMPTS_LIBRARY/prompt_understand_context.mini.md",
    dest: "docs/prompts/PROMPTS_LIBRARY/prompt_understand_context.mini.md"
  },
  {
    src: "docs/prompts/PROMPTS_LIBRARY/prompt_update_log.mini.md",
    dest: "docs/prompts/PROMPTS_LIBRARY/prompt_update_log.mini.md"
  },

  // human edit mode prompts
  {
    src: "docs/prompts/HUMAN_EDIT_MODE/prompt_analyze_human_changes.mini.md",
    dest: "docs/prompts/HUMAN_EDIT_MODE/prompt_analyze_human_changes.mini.md"
  },
  {
    src: "docs/prompts/HUMAN_EDIT_MODE/prompt_human_edit_mode.mini.md",
    dest: "docs/prompts/HUMAN_EDIT_MODE/prompt_human_edit_mode.mini.md"
  },

  // agent policies
  {
    src: "docs/agent/AGENT_CONFIG.mini.yaml",
    dest: "docs/agent/AGENT_CONFIG.mini.yaml"
  },
  {
    src: "docs/agent/AGENT_OPERATIONAL_POLICY.mini.md",
    dest: "docs/agent/AGENT_OPERATIONAL_POLICY.mini.md"
  },
  {
    src: "docs/agent/HUMAN_OPERATIONAL_POLICY.mini.md",
    dest: "docs/agent/HUMAN_OPERATIONAL_POLICY.mini.md"
  },

  // logs
  {
    src: "docs/logs/IMPLEMENTATION_LOG.mini.md",
    dest: "docs/logs/IMPLEMENTATION_LOG.mini.md"
  },

  // automation
  {
    src: "docs/automation/CREATE_BRANCH.sh",
    dest: "docs/automation/CREATE_BRANCH.sh"
  },
  {
    src: "docs/automation/OPEN_PULL_REQUEST.sh",
    dest: "docs/automation/OPEN_PULL_REQUEST.sh"
  },
  {
    src: "docs/automation/PUSH_BRANCH.sh",
    dest: "docs/automation/PUSH_BRANCH.sh"
  },
  {
    src: "docs/automation/STAGE_AND_COMMIT.sh",
    dest: "docs/automation/STAGE_AND_COMMIT.sh"
  },

  // templates
  {
    src: "templates/log/IMPLEMENTATION_LOG_TEMPLATE.mini.md",
    dest: "templates/log/IMPLEMENTATION_LOG_TEMPLATE.mini.md"
  },

  // root files
  { src: "QUICK_START_GUIDE.md", dest: "QUICK_START_GUIDE.md" },
  { src: "README.md", dest: "README.md" }
];

// files required by validate
const REQUIRED_FILES: string[] = [
  "docs/project/BUSINESS_REQUIREMENTS.mini.md",
  "docs/project/PROJECT_SPEC.mini.md",
  "docs/project/ARCHITECTURE_BLUEPRINT.mini.md",
  "docs/project/IMPLEMENTATION_PLAN.mini.md",
  "docs/agent/AGENT_CONFIG.mini.yaml",
  "docs/agent/AGENT_OPERATIONAL_POLICY.mini.md",
  "docs/agent/HUMAN_OPERATIONAL_POLICY.mini.md",
  "docs/prompts/PROMPTS_LIBRARY/prompt_main_orchestration.mini.md",
  "docs/logs/IMPLEMENTATION_LOG.mini.md",
  "QUICK_START_GUIDE.md",
  "README.md"
];

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function getWorkspaceRoot(): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    vscode.window.showErrorMessage(
      "No workspace folder is open. Open a folder before using Docs-as-System mini."
    );
    return undefined;
  }
  return folders[0].uri.fsPath;
}

function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(destPath);
    fs.mkdirSync(dir, { recursive: true });

    const file = fs.createWriteStream(destPath);

    https
      .get(url, res => {
        if (res.statusCode !== 200) {
          file.close();
          fs.unlink(destPath, () => {});
          return reject(
            new Error(`Failed to download ${url} (status ${res.statusCode})`)
          );
        }

        res.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", err => {
        file.close();
        fs.unlink(destPath, () => {});
        reject(err);
      });
  });
}

// -----------------------------------------------------------------------------
// Commands: init / validate / workflow / docs
// -----------------------------------------------------------------------------

async function initDocsAsSystemMini() {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    return;
  }

  const answer = await vscode.window.showWarningMessage(
    "Initialize Docs-as-System mini here? Existing files may be overwritten.",
    "Yes",
    "No"
  );
  if (answer !== "Yes") {
    return;
  }

  const output = vscode.window.createOutputChannel("Docs-as-System mini");
  output.show(true);
  output.appendLine("Initializing Docs-as-System mini project...");

  const REQUIRED_FOLDERS = ["src", "docs/logs/summaries"];

  for (const folder of REQUIRED_FOLDERS) {
    const fullPath = path.join(workspaceRoot, folder);
    fs.mkdirSync(fullPath, { recursive: true });

    const gitignorePath = path.join(fullPath, ".gitignore");
    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(gitignorePath, "*\n", "utf8");
      output.appendLine(`Created folder and .gitignore: ${folder}`);
    }
  }

  try {
    for (const tpl of TEMPLATE_FILES) {
      const url = `${GITHUB_RAW_BASE}/${tpl.src}`;
      const dest = path.join(workspaceRoot, tpl.dest);

      output.appendLine(`Downloading: ${tpl.src}`);
      await downloadFile(url, dest);
    }

    output.appendLine("Initialization completed.");
    vscode.window.showInformationMessage(
      "Docs-as-System mini initialized successfully. You can now run Validate Project."
    );
  } catch (err: any) {
    output.appendLine(
      "ERROR during initialization: " + String(err?.message ?? err)
    );
    vscode.window.showErrorMessage(
      "Docs-as-System mini initialization failed. See output for details."
    );
  }
}

async function validateDocsAsSystemMiniProject() {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    return;
  }

  const output = vscode.window.createOutputChannel("Docs-as-System mini");
  output.show(true);
  output.appendLine("Validating Docs-as-System mini project...");

  let allOk = true;

  for (const relPath of REQUIRED_FILES) {
    const fullPath = path.join(workspaceRoot, relPath);
    const exists = fs.existsSync(fullPath);

    if (exists) {
      output.appendLine(`✓ ${relPath}`);
    } else {
      output.appendLine(`✗ MISSING: ${relPath}`);
      allOk = false;
    }
  }

  if (allOk) {
    output.appendLine("Validation finished. All required files are present.");
    vscode.window.showInformationMessage(
      "Docs-as-System mini project validation passed."
    );
  } else {
    output.appendLine("Validation finished. Some required files are missing.");
    vscode.window.showWarningMessage(
      "Docs-as-System mini project validation found missing files. See output for details."
    );
  }
}

async function runFullCycle() {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    return;
  }

  const prompt = [
    "Run the full Docs-as-System mini lifecycle using the official orchestration prompt.",
    "Load and execute the file:",
    "docs/prompts/PROMPTS_LIBRARY/prompt_main_orchestration.mini.md",
    "",
    "Do not skip any steps.",
    "Do not call other prompts manually in the middle of the cycle."
  ].join("\n");

  await vscode.env.clipboard.writeText(prompt);
  await vscode.commands.executeCommand("workbench.action.chat.open");

  vscode.window.showInformationMessage(
    "Prompt for Docs-as-System mini full cycle copied to clipboard. Paste it in your AI chat inside VS Code."
  );
}

async function startHumanEdit() {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    return;
  }

  const prompt = [
    "The human is now performing manual edits outside the current Docs-as-System mini cycle.",
    "Stop the current development cycle immediately and switch to Human Edit Mode.",
    "Use the prompt file:",
    "docs/prompts/HUMAN_EDIT_MODE/prompt_human_edit_mode.mini.md",
    "",
    "Do not continue the cycle.",
    "Do not fix anything automatically.",
    "Wait for explicit human confirmation before taking any further action."
  ].join("\n");

  await vscode.env.clipboard.writeText(prompt);
  await vscode.commands.executeCommand("workbench.action.chat.open");

  vscode.window.showInformationMessage(
    "Human Edit Mode prompt copied to clipboard. Paste it in your AI chat when you start manual editing."
  );
}

async function analyzeHumanChanges() {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    return;
  }

  const prompt = [
    "The human has finished manual edits.",
    "Now analyze all manual changes according to:",
    "docs/prompts/HUMAN_EDIT_MODE/prompt_analyze_human_changes.mini.md",
    "",
    "Do not fix code.",
    "Do not update documents.",
    "Do not update the implementation log.",
    "",
    "Prepare a clear analysis of:",
    "- what changed",
    "- how it aligns with BUSINESS_REQUIREMENTS, PROJECT_SPEC, ARCHITECTURE_BLUEPRINT, IMPLEMENTATION_PLAN",
    "- potential risks or inconsistencies",
    "Then wait for further human instructions."
  ].join("\n");

  await vscode.env.clipboard.writeText(prompt);
  await vscode.commands.executeCommand("workbench.action.chat.open");

  vscode.window.showInformationMessage(
    "Analyze Human Changes prompt copied to clipboard. Paste it in your AI chat after you finish manual edits."
  );
}

async function openQuickStart() {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    return;
  }

  const quickStartPath = path.join(workspaceRoot, "QUICK_START_GUIDE.md");
  if (!fs.existsSync(quickStartPath)) {
    vscode.window.showErrorMessage(
      "QUICK_START_GUIDE.md not found in this workspace."
    );
    return;
  }

   const uri = vscode.Uri.file(quickStartPath);
  // פתיחה ישירה ב־Markdown Preview
  await vscode.commands.executeCommand("markdown.showPreview", uri);
}

async function openReadme() {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    return;
  }

  const readmePath = path.join(workspaceRoot, "README.md");
  if (!fs.existsSync(readmePath)) {
    vscode.window.showErrorMessage("README.md not found in this workspace.");
    return;
  }

const uri = vscode.Uri.file(readmePath);
  // פתיחה ישירה ב־Markdown Preview
  await vscode.commands.executeCommand("markdown.showPreview", uri);
}

// -----------------------------------------------------------------------------
// Tree view items
// -----------------------------------------------------------------------------

class DocsAsSystemMiniItem extends vscode.TreeItem {
  constructor(
    label: string,
    public readonly commandId?: string,
    public readonly description?: string,
    public readonly children: DocsAsSystemMiniItem[] = [],
    iconId?: string,
    public readonly isSectionHeader: boolean = false
  ) {
    super(
      label,
      children.length > 0
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None
    );

    this.label = label;

    if (description) {
      this.description = description;
      this.tooltip = description;
    }

    if (commandId) {
      this.command = {
        command: commandId,
        title: label
      };
    }

    if (iconId) {
      this.iconPath = new vscode.ThemeIcon(iconId);
    }

    if (isSectionHeader) {
      this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
      this.contextValue = "sectionHeader";
      this.iconPath = undefined; // headers without icons
    }
  }
}

class DocsAsSystemMiniProvider
  implements vscode.TreeDataProvider<DocsAsSystemMiniItem>
{
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    DocsAsSystemMiniItem | undefined | void
  >();

  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  getTreeItem(element: DocsAsSystemMiniItem): vscode.TreeItem {
    return element;
  }

  getChildren(
    element?: DocsAsSystemMiniItem
  ): vscode.ProviderResult<DocsAsSystemMiniItem[]> {
    if (element) {
      return element.children;
    }

    const myWorkspace = new DocsAsSystemMiniItem(
      "MY WORKSPACE",
      undefined,
      undefined,
      [
        new DocsAsSystemMiniItem(
          "Control center",
          "docsAsSystemMini.openControlCenter",
          "Open the visual Docs-as-System mini dashboard",
          [],
          "graph"
        )
      ],
      undefined,
      true
    );

    const projectTools = new DocsAsSystemMiniItem(
      "PROJECT TOOLS",
      undefined,
      "Create and validate a Docs-as-System mini project",
      [
        new DocsAsSystemMiniItem(
          "Initialize project",
          "docsAsSystemMini.initProject",
          "Download all Docs-as-System mini files into this workspace",
          [],
          "cloud-download"
        ),
        new DocsAsSystemMiniItem(
          "Validate project",
          "docsAsSystemMini.validateProject",
          "Check that all required files and folders exist",
          [],
          "check"
        )
      ],
      undefined,
      true
    );

    const aiWorkflow = new DocsAsSystemMiniItem(
      "AI WORKFLOW",
      undefined,
      "Run the full Docs-as-System mini agent cycle",
      [
        new DocsAsSystemMiniItem(
          "Run full cycle",
          "docsAsSystemMini.runFullCycle",
          "Copy the orchestration prompt and open chat",
          [],
          "run"
        )
      ],
      undefined,
      true
    );

    const hybridMode = new DocsAsSystemMiniItem(
      "HYBRID HUMAN EDIT",
      undefined,
      "Work in a safe hybrid mode between human and agent",
      [
        new DocsAsSystemMiniItem(
          "I'm editing manually now",
          "docsAsSystemMini.startHumanEdit",
          "Tell the agent that you are doing manual edits",
          [],
          "edit"
        ),
        new DocsAsSystemMiniItem(
          "Analyze manual changes",
          "docsAsSystemMini.analyzeHumanChanges",
          "Ask the agent to analyze what changed after manual edits",
          [],
          "search"
        )
      ],
      undefined,
      true
    );

    const docsHelp = new DocsAsSystemMiniItem(
      "DOCS AND HELP",
      undefined,
      "Read the Docs-as-System mini docs inside this project",
      [
        new DocsAsSystemMiniItem(
          "Open Quick Start Guide",
          "docsAsSystemMini.openQuickStart",
          "Short guide for getting started with Docs-as-System mini",
          [],
          "rocket"
        ),
        new DocsAsSystemMiniItem(
          "Open method README",
          "docsAsSystemMini.openReadme",
          "Full description of the methodology inside this project",
          [],
          "file-text"
        )
      ],
      undefined,
      true
    );

    return [myWorkspace, projectTools, aiWorkflow, hybridMode, docsHelp];
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}

// -----------------------------------------------------------------------------
// Control center Webview
// -----------------------------------------------------------------------------

function openControlCenter(context: vscode.ExtensionContext) {
  const panel = vscode.window.createWebviewPanel(
    "docsAsSystemMiniControlCenter",
    "Docs-as-System mini - Control Center",
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true
    }
  );

  panel.webview.html = getWebviewContent();

  panel.webview.onDidReceiveMessage(
    async (message: any) => {
      if (!message || typeof message !== "object") {
        return;
      }

      if (message.type === "click") {
        const id = String(message.buttonId ?? "");
        switch (id) {
          case "init-project":
            await initDocsAsSystemMini();
            break;
          case "validate-project":
            await validateDocsAsSystemMiniProject();
            break;
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

function getWebviewContent(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    http-equiv="Content-Security-Policy"
    content="default-src 'none'; img-src https: data:; script-src 'unsafe-inline'; style-src 'unsafe-inline';"
  />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Docs-as-System mini - Control Center</title>
  <style>
    :root {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    body {
      margin: 0;
      padding: 0;
      background: radial-gradient(circle at top, #1e90ff 0%, #111827 45%, #020617 100%);
      color: #f9fafb;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .container {
      width: 100%;
      max-width: 840px;
      padding: 24px;
    }

    .card {
      background: rgba(15, 23, 42, 0.96);
      border-radius: 18px;
      padding: 24px 24px 20px;
      box-shadow:
        0 18px 45px rgba(0, 0, 0, 0.45),
        0 0 0 1px rgba(148, 163, 184, 0.18);
      position: relative;
      overflow: hidden;
    }

    .card::before {
      content: "";
      position: absolute;
      inset: -40px;
      background:
        radial-gradient(circle at 0 0, rgba(96, 165, 250, 0.12), transparent 55%),
        radial-gradient(circle at 100% 0, rgba(45, 212, 191, 0.12), transparent 55%);
      opacity: 0.9;
      pointer-events: none;
      z-index: 0;
    }

    .header {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 20px;
    }

    .title-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .title {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.01em;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .title-pill {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid rgba(59, 130, 246, 0.7);
      background: rgba(15, 23, 42, 0.8);
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #93c5fd;
    }

    .subtitle {
      font-size: 13px;
      color: #9ca3af;
    }

    .status-dot {
      width: 9px;
      height: 9px;
      border-radius: 999px;
      background: radial-gradient(circle at 30% 30%, #bbf7d0, #22c55e);
      box-shadow: 0 0 12px rgba(34, 197, 94, 0.9);
    }

    .status-text {
      font-size: 11px;
      color: #6ee7b7;
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }

    .status {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .section-label {
      position: relative;
      z-index: 1;
      margin-top: 4px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: #6b7280;
    }

    .button-grid {
      position: relative;
      z-index: 1;
      margin-top: 12px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
    }

    .btn {
      position: relative;
      border: none;
      border-radius: 12px;
      padding: 12px 14px;
      text-align: left;
      cursor: pointer;
      background: linear-gradient(135deg, #1f2937, #020617);
      color: #e5e7eb;
      display: flex;
      flex-direction: column;
      gap: 4px;
      box-shadow:
        0 10px 18px rgba(0, 0, 0, 0.6),
        0 0 0 1px rgba(148, 163, 184, 0.28);
      overflow: hidden;
      transform: translateY(0);
      transition:
        transform 120ms ease,
        box-shadow 120ms ease,
        background 120ms ease,
        border-color 120ms ease;
    }

    .btn::before {
      content: "";
      position: absolute;
      inset: 0;
      opacity: 0;
      background: radial-gradient(circle at top left, rgba(96, 165, 250, 0.4), transparent 60%);
      transition: opacity 140ms ease;
      pointer-events: none;
    }

    .btn:hover {
      transform: translateY(-2px);
      box-shadow:
        0 14px 26px rgba(0, 0, 0, 0.8),
        0 0 0 1px rgba(191, 219, 254, 0.6);
      background: linear-gradient(135deg, #111827, #020617);
    }

    .btn:hover::before {
      opacity: 1;
    }

    .btn:active {
      transform: translateY(0);
      box-shadow:
        0 4px 12px rgba(0, 0, 0, 0.7),
        0 0 0 1px rgba(96, 165, 250, 0.8);
    }

    .btn-label {
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }

    .btn-label span {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .btn-key {
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 999px;
      border: 1px solid rgba(148, 163, 184, 0.7);
      color: #9ca3af;
    }

    .btn-desc {
      font-size: 11px;
      color: #9ca3af;
    }

    .footer {
      position: relative;
      z-index: 1;
      margin-top: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #6b7280;
    }

    .footer span {
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      max-width: 60%;
    }

    .badge {
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid rgba(148, 163, 184, 0.6);
    }

    @media (max-width: 560px) {
      .card {
        padding: 18px 16px 16px;
      }

      .title {
        font-size: 17px;
      }

      .subtitle {
        font-size: 12px;
      }

      .button-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
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
            Fast access to all critical steps of the method, in one place.
          </div>
        </div>
        <div class="status">
          <div class="status-dot"></div>
          <div class="status-text">READY</div>
        </div>
      </div>

      <div class="section-label">Project setup</div>
      <div class="button-grid">
        <button class="btn" data-button-id="init-project">
          <div class="btn-label">
            <span>Initialize project</span>
            <span class="btn-key">Init</span>
          </div>
          <div class="btn-desc">
            Download all Docs-as-System mini files and prepare the project.
          </div>
        </button>

        <button class="btn" data-button-id="validate-project">
          <div class="btn-label">
            <span>Validate project</span>
            <span class="btn-key">Check</span>
          </div>
          <div class="btn-desc">
            Verify that all required files and folders exist.
          </div>
        </button>
      </div>

      <div class="section-label" style="margin-top: 18px;">AI workflow</div>
      <div class="button-grid">
        <button class="btn" data-button-id="run-full-cycle">
          <div class="btn-label">
            <span>Run full cycle</span>
            <span class="btn-key">Cycle</span>
          </div>
          <div class="btn-desc">
            Prepare the full orchestration prompt and open the chat.
          </div>
        </button>
      </div>

      <div class="section-label" style="margin-top: 18px;">Hybrid human edit</div>
      <div class="button-grid">
        <button class="btn" data-button-id="start-human-edit">
          <div class="btn-label">
            <span>I'm editing manually now</span>
            <span class="btn-key">Human</span>
          </div>
          <div class="btn-desc">
            Tell the agent that you are editing manually and pause the cycle.
          </div>
        </button>

        <button class="btn" data-button-id="analyze-human-changes">
          <div class="btn-label">
            <span>Analyze manual changes</span>
            <span class="btn-key">Review</span>
          </div>
          <div class="btn-desc">
            Ask the agent to review what changed against the core docs.
          </div>
        </button>
      </div>

      <div class="section-label" style="margin-top: 18px;">Docs</div>
      <div class="button-grid">
        <button class="btn" data-button-id="open-quick-start">
          <div class="btn-label">
            <span>Open Quick Start Guide</span>
            <span class="btn-key">QS</span>
          </div>
          <div class="btn-desc">
            A short getting started guide for the method.
          </div>
        </button>

        <button class="btn" data-button-id="open-readme">
          <div class="btn-label">
            <span>Open method README</span>
            <span class="btn-key">Docs</span>
          </div>
          <div class="btn-desc">
            The full description of the methodology in this project.
          </div>
        </button>
      </div>

      <div class="footer">
        <span>You can use both the side tree and this control center together.</span>
        <span class="badge">Docs-as-System mini</span>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function wireButtons() {
      const buttons = document.querySelectorAll(".btn[data-button-id]");
      buttons.forEach(btn => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-button-id");
          vscode.postMessage({ type: "click", buttonId: id });
        });
      });
    }

    window.addEventListener("load", wireButtons);
  </script>
</body>
</html>
`;
}

// -----------------------------------------------------------------------------
// Extension entry points
// -----------------------------------------------------------------------------

export function activate(context: vscode.ExtensionContext) {
  const provider = new DocsAsSystemMiniProvider();

  const treeView = vscode.window.createTreeView("docsAsSystemMiniView", {
    treeDataProvider: provider
  });

  const openControlCenterDisposable = vscode.commands.registerCommand(
    "docsAsSystemMini.openControlCenter",
    () => openControlCenter(context)
  );

  context.subscriptions.push(
    treeView,
    openControlCenterDisposable,
    vscode.commands.registerCommand("docsAsSystemMini.initProject", () =>
      initDocsAsSystemMini()
    ),
    vscode.commands.registerCommand("docsAsSystemMini.validateProject", () =>
      validateDocsAsSystemMiniProject()
    ),
    vscode.commands.registerCommand("docsAsSystemMini.runFullCycle", () =>
      runFullCycle()
    ),
    vscode.commands.registerCommand("docsAsSystemMini.startHumanEdit", () =>
      startHumanEdit()
    ),
    vscode.commands.registerCommand("docsAsSystemMini.analyzeHumanChanges", () =>
      analyzeHumanChanges()
    ),
    vscode.commands.registerCommand("docsAsSystemMini.openQuickStart", () =>
      openQuickStart()
    ),
    vscode.commands.registerCommand("docsAsSystemMini.openReadme", () =>
      openReadme()
    )
  );
}

export function deactivate() {}
