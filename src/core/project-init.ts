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

export async function initDocsAsSystemMini() {
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

export async function validateDocsAsSystemMiniProject(): Promise<boolean> {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    return false;
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

  return allOk;
}
