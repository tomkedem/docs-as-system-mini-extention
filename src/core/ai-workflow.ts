import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { getWorkspaceRoot } from "./files";

const PROMPT_START_MARKER = "<!-- PROMPT_START -->";
const PROMPT_END_MARKER = "<!-- PROMPT_END -->";

/**
 * Load a prompt body from a Markdown file.
 * The function looks for PROMPT_START / PROMPT_END markers.
 * If both markers exist, it returns only the content between them.
 * Otherwise it returns the full file content.
 */
async function loadPromptBodyFromFile(
  relativePath: string,
  promptDescription: string
): Promise<string | undefined> {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    return undefined;
  }

  const fullPath = path.join(workspaceRoot, ...relativePath.split("/"));

  if (!fs.existsSync(fullPath)) {
    vscode.window.showErrorMessage(
      `Docs-as-System mini: Could not find ${relativePath}. Run Initialize project to restore templates.`
    );
    return undefined;
  }

  let content: string;
  try {
    const buffer = fs.readFileSync(fullPath);
    content = buffer.toString("utf8");
  } catch {
    vscode.window.showErrorMessage(
      `Docs-as-System mini: Failed to read ${relativePath} for ${promptDescription}.`
    );
    return undefined;
  }

  const startIndex = content.indexOf(PROMPT_START_MARKER);
  const endIndex = content.indexOf(PROMPT_END_MARKER);

  let promptBody: string;

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const between = content.substring(
      startIndex + PROMPT_START_MARKER.length,
      endIndex
    );
    promptBody = between.trim();
  } else {
    // Fallback if markers are missing
    promptBody = content.trim();
  }

  if (!promptBody) {
    vscode.window.showErrorMessage(
      `Docs-as-System mini: ${promptDescription} prompt is empty after processing. Check ${relativePath}.`
    );
    return undefined;
  }

  return promptBody;
}

/**
 * Prepare and run the full Docs-as-System mini agent cycle.
 * Copies the orchestration prompt from the prompt file to clipboard
 * and opens the chat.
 */
export async function runFullCycle(): Promise<void> {
  const prompt = await loadPromptBodyFromFile(
    "docs/prompts/PROMPTS_LIBRARY/prompt_main_orchestration.mini.md",
    "Main orchestration"
  );

  if (!prompt) {
    return;
  }

  await vscode.env.clipboard.writeText(prompt);
  await vscode.commands.executeCommand("workbench.action.chat.open");

  vscode.window.showInformationMessage(
    "Docs-as-System mini: Main orchestration prompt copied to clipboard. Paste it into your AI chat and run it from there."
  );
}

/**
 * Start Human Edit Mode.
 * Tells the agent to stop the current cycle and wait for manual edits,
 * using the Human Edit Mode prompt file.
 */
export async function startHumanEdit(): Promise<void> {
  const prompt = await loadPromptBodyFromFile(
    "docs/prompts/HUMAN_EDIT_MODE/prompt_human_edit_mode.mini.md",
    "Human Edit Mode"
  );

  if (!prompt) {
    return;
  }

  await vscode.env.clipboard.writeText(prompt);
  await vscode.commands.executeCommand("workbench.action.chat.open");

  vscode.window.showInformationMessage(
    "Docs-as-System mini: Human Edit Mode prompt copied to clipboard. Paste it into your AI chat."
  );
}

/**
 * Ask the agent to analyze human changes after a Human Edit Mode session.
 * Uses the prompt_analyze_human_changes.mini.md file.
 */
export async function analyzeHumanChanges(): Promise<void> {
  const prompt = await loadPromptBodyFromFile(
    "docs/prompts/HUMAN_EDIT_MODE/prompt_analyze_human_changes.mini.md",
    "Analyze Human Changes"
  );

  if (!prompt) {
    return;
  }

  await vscode.env.clipboard.writeText(prompt);
  await vscode.commands.executeCommand("workbench.action.chat.open");

  vscode.window.showInformationMessage(
    "Docs-as-System mini: Analyze Human Changes prompt copied to clipboard. Paste it into your AI chat."
  );
}

/**
 * Ask the agent to validate the core project documents.
 * Uses the prompt_validate_core_docs.mini.md file.
 */
export async function validateDocsWithAgent(): Promise<void> {
  const prompt = await loadPromptBodyFromFile(
    "docs/prompts/PROMPTS_LIBRARY/prompt_validate_core_docs.mini.md",
    "Core docs validation"
  );

  if (!prompt) {
    return;
  }

  await vscode.env.clipboard.writeText(prompt);
  await vscode.commands.executeCommand("workbench.action.chat.open");

  vscode.window.showInformationMessage(
    "Docs-as-System mini: Core docs validation prompt copied to clipboard. Paste it into your AI chat and run it from there."
  );
}
