import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { getWorkspaceRoot } from "./files";

/**
 * Prepare and run the full Docs-as-System mini agent cycle.
 * Copies the orchestration prompt to clipboard and opens the chat.
 */
export async function runFullCycle(): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    return;
  }

  const promptLines = [
    "Run the full Docs-as-System mini lifecycle using the official orchestration prompt.",
    "Load and execute the file:",
    "",
    "docs/prompts/PROMPTS_LIBRARY/prompt_main_orchestration.mini.md",
    "",
    "Behavior:",
    "- Do not skip steps.",
    "- Follow the orchestration prompt exactly as written.",
    "- Use only the project files in this workspace.",
    "- Do not invent missing documents.",
    "",
    "Your role:",
    "- Explain each major step you take.",
    "- Ask for human approval when the prompt requires it.",
    "- When preparing code changes, always show a clear diff or summary.",
    "- When preparing a commit, follow the official scripts in docs/automation.",
    "",
    "If you detect missing or invalid core documents, stop the cycle and ask the human to fix them before continuing."
  ];

  const prompt = promptLines.join("\n");

  await vscode.env.clipboard.writeText(prompt);
  await vscode.commands.executeCommand("workbench.action.chat.open");

  vscode.window.showInformationMessage(
    "Docs-as-System mini: Main orchestration prompt copied to clipboard. Paste it into your AI chat and run it from there."
  );
}

/**
 * Start Human Edit Mode.
 * Tells the agent to stop the current cycle and wait for manual edits.
 */
export async function startHumanEdit(): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    return;
  }

  const promptLines = [
    "The human is now performing manual edits outside the current Docs-as-System mini cycle.",
    "Stop the current development cycle immediately and switch to Human Edit Mode.",
    "Use the prompt file:",
    "docs/prompts/HUMAN_EDIT_MODE/prompt_human_edit_mode.mini.md",
    "",
    "Do not continue the cycle.",
    "Do not fix anything automatically.",
    "Wait for explicit human confirmation before taking any further action."
  ];

  const prompt = promptLines.join("\n");

  await vscode.env.clipboard.writeText(prompt);
  await vscode.commands.executeCommand("workbench.action.chat.open");

  vscode.window.showInformationMessage(
    "Docs-as-System mini: Human Edit Mode prompt copied to clipboard. Paste it into your AI chat."
  );
}

/**
 * Ask the agent to analyze human changes after a Human Edit Mode session.
 */
export async function analyzeHumanChanges(): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    return;
  }

  const promptLines = [
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
    "",
    "Then wait for further human instructions."
  ];

  const prompt = promptLines.join("\n");

  await vscode.env.clipboard.writeText(prompt);
  await vscode.commands.executeCommand("workbench.action.chat.open");

  vscode.window.showInformationMessage(
    "Docs-as-System mini: Analyze Human Changes prompt copied to clipboard. Paste it into your AI chat."
  );
}

/**
 * Ask the agent to validate the core project documents.
 * This copies the validation prompt (without header/footer) to the clipboard
 * and opens the chat, so the user does not need to copy anything manually.
 */

export async function validateDocsWithAgent(): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    return;
  }

  const promptPath = path.join(
    workspaceRoot,
    "docs",
    "prompts",
    "PROMPTS_LIBRARY",
    "prompt_validate_core_docs.mini.md"
  );

  if (!fs.existsSync(promptPath)) {
    vscode.window.showErrorMessage(
      "Docs-as-System mini: Could not find docs/prompts/PROMPTS_LIBRARY/prompt_validate_core_docs.mini.md. Run Initialize project to restore templates."
    );
    return;
  }

  let content: string;
  try {
    const buffer = fs.readFileSync(promptPath);
    content = buffer.toString("utf8");
  } catch {
    vscode.window.showErrorMessage(
      "Docs-as-System mini: Failed to read prompt_validate_core_docs.mini.md."
    );
    return;
  }

  const startMarker = "<!-- PROMPT_START -->";
  const endMarker = "<!-- PROMPT_END -->";

  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);

  let promptBody = "";

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const between = content.substring(
      startIndex + startMarker.length,
      endIndex
    );
    promptBody = between.trim();
  } else {
    // Fallback: if markers are missing, use full content
    promptBody = content.trim();
  }

  if (!promptBody) {
    vscode.window.showErrorMessage(
      "Docs-as-System mini: Validation prompt is empty after processing. Check prompt_validate_core_docs.mini.md."
    );
    return;
  }

  await vscode.env.clipboard.writeText(promptBody);
  await vscode.commands.executeCommand("workbench.action.chat.open");

  vscode.window.showInformationMessage(
    "Docs-as-System mini: Core docs validation prompt copied to clipboard. Paste it into your AI chat and run it from there."
  );
}

