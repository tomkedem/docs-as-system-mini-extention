import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";

export const GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/tomkedem/Docs-as-System-mini/main";

export interface TemplateFile {
  src: string;
  dest: string;
}

// Template files to download into the workspace
export const TEMPLATE_FILES: TemplateFile[] = [
  // automation scripts
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
  // project docs - editable project documents
  {
    src: "docs/project/BUSINESS_REQUIREMENTS.mini.md",
    dest: "docs/project/BUSINESS_REQUIREMENTS.mini.md"
  },
  {
    src: "docs/project/PROJECT_SPECIFICATION.mini.md",
    dest: "docs/project/PROJECT_SPECIFICATION.mini.md"
  },
  {
    src: "docs/project/ARCHITECTURE_BLUEPRINT.mini.md",
    dest: "docs/project/ARCHITECTURE_BLUEPRINT.mini.md"
  },
  {
    src: "docs/project/IMPLEMENTATION_PLAN.mini.md",
    dest: "docs/project/IMPLEMENTATION_PLAN.mini.md"
  },

  // project templates - read only reference templates for validation
  {
    src: "templates/project/BUSINESS_REQUIREMENTS_TEMPLATE.mini.md",
    dest: "templates/project/BUSINESS_REQUIREMENTS_TEMPLATE.mini.md"
  },
  {
    src: "templates/project/PROJECT_SPECIFICATION_TEMPLATE.mini.md",
    dest: "templates/project/PROJECT_SPECIFICATION_TEMPLATE.mini.md"
  },
  {
    src: "templates/project/ARCHITECTURE_BLUEPRINT_TEMPLATE.mini.md",
    dest: "templates/project/ARCHITECTURE_BLUEPRINT_TEMPLATE.mini.md"
  },
  {
    src: "templates/project/IMPLEMENTATION_PLAN_TEMPLATE.mini.md",
    dest: "templates/project/IMPLEMENTATION_PLAN_TEMPLATE.mini.md"
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
  // core docs validation prompt
  {
    src: "docs/prompts/PROMPTS_LIBRARY/prompt_validate_core_docs.mini.md",
    dest: "docs/prompts/PROMPTS_LIBRARY/prompt_validate_core_docs.mini.md"
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

  // templates
  {
    src: "templates/log/IMPLEMENTATION_LOG_TEMPLATE.mini.md",
    dest: "templates/log/IMPLEMENTATION_LOG_TEMPLATE.mini.md"
  },

  // root files
  { src: "QUICK_START_GUIDE.md", dest: "QUICK_START_GUIDE.md" },
  { src: "README.md", dest: "README.md" }
];

// Files required by validation
export const REQUIRED_FILES: string[] = [
  // editable project docs
  "docs/project/BUSINESS_REQUIREMENTS.mini.md",
  "docs/project/PROJECT_SPECIFICATION.mini.md",
  "docs/project/ARCHITECTURE_BLUEPRINT.mini.md",
  "docs/project/IMPLEMENTATION_PLAN.mini.md",

  // project templates - used as reference for validation
  "templates/project/BUSINESS_REQUIREMENTS_TEMPLATE.mini.md",
  "templates/project/PROJECT_SPECIFICATION_TEMPLATE.mini.md",
  "templates/project/ARCHITECTURE_BLUEPRINT_TEMPLATE.mini.md",
  "templates/project/IMPLEMENTATION_PLAN_TEMPLATE.mini.md",

  // agent configuration and policies
  "docs/agent/AGENT_CONFIG.mini.yaml",
  "docs/agent/AGENT_OPERATIONAL_POLICY.mini.md",
  "docs/agent/HUMAN_OPERATIONAL_POLICY.mini.md",

  // core prompts and logs
  "docs/prompts/PROMPTS_LIBRARY/prompt_main_orchestration.mini.md",
  "docs/logs/IMPLEMENTATION_LOG.mini.md",

  // root docs
  "QUICK_START_GUIDE.md",
  "README.md"
];

/**
 * Get the root folder of the current workspace.
 */
export function getWorkspaceRoot(): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    vscode.window.showErrorMessage(
      "No workspace folder is open. Open a folder before using Docs-as-System mini."
    );
    return undefined;
  }
  return folders[0].uri.fsPath;
}

/**
 * Download a single file from a URL to a destination path.
 */
export function downloadFile(url: string, destPath: string): Promise<void> {
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

/**
 * Open the Quick Start guide in Markdown preview.
 */
export async function openQuickStart(): Promise<void> {
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
  await vscode.commands.executeCommand("markdown.showPreview", uri);
}

/**
 * Open the method README in Markdown preview.
 */
export async function openReadme(): Promise<void> {
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
  await vscode.commands.executeCommand("markdown.showPreview", uri);
}
