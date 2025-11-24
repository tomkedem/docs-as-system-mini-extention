import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import {
  TEMPLATE_FILES,
  REQUIRED_FILES,
  GITHUB_RAW_BASE,
  getWorkspaceRoot,
  downloadFile
} from "./files";

/**
 * Initialize a Docs-as-System mini project in the current workspace.
 * This function does NOT ask the user for confirmation.
 * It only performs the initialization work and returns:
 * - true  if initialization completed without a fatal error
 * - false if workspace is missing or a fatal error occurred
 */
export async function initDocsAsSystemMini(): Promise<boolean> {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    return false;
  }

  const output = vscode.window.createOutputChannel("Docs-as-System mini");
  output.show(true);
  output.appendLine("Initializing Docs-as-System mini project...");

  const REQUIRED_FOLDERS = ["src", "docs/logs/summaries"];

  // Ensure required folders and local .gitignore files exist
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
    // Download all template files from the GitHub base repository
    for (const tpl of TEMPLATE_FILES) {
      const url = `${GITHUB_RAW_BASE}/${tpl.src}`;
      const dest = path.join(workspaceRoot, tpl.dest);

      output.appendLine(`Downloading: ${tpl.src}`);
      await downloadFile(url, dest);
    }

    output.appendLine("Initialization completed.");
    vscode.window.showInformationMessage(
      "Docs-as-System mini initialized successfully."
    );

    return true;
  } catch (err: any) {
    output.appendLine(
      "ERROR during initialization: " + String(err?.message ?? err)
    );
    vscode.window.showErrorMessage(
      "Docs-as-System mini initialization failed. See output for details."
    );
    return false;
  }
}

/**
 * Validate that all required Docs-as-System mini files exist in the workspace.
 * Returns true if all required files are present, otherwise false.
 */
export async function validateDocsAsSystemMiniProject(): Promise<boolean> {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    return false;
  }

  const output = vscode.window.createOutputChannel("Docs-as-System mini");
  output.show(true);
  output.appendLine("Validating Docs-as-System mini project...");

  let allOk = true;

  // Check existence of all required files
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

  return allOk;
}
