import * as vscode from "vscode";
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
    "docs/prompts/PROMPTS_LIBRARY/prompt_main_orchestration.mini.md",
    "",
    "Do not skip any steps.",
    "Do not call other prompts manually in the middle of the cycle."
  ];

  const prompt = promptLines.join("\n");

  await vscode.env.clipboard.writeText(prompt);
  await vscode.commands.executeCommand("workbench.action.chat.open");

  vscode.window.showInformationMessage(
    "Docs-as-System mini: Full cycle prompt copied to clipboard. Paste it into your AI chat window."
  );
}

/**
 * Start Human Edit Mode: tell the agent that the human is performing manual edits.
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
    "Docs-as-System mini: Human Edit Mode prompt copied to clipboard. Paste it into your AI chat when you start manual edits."
  );
}

/**
 * Ask the agent to analyze manual changes done by the human.
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
    "Then wait for further human instructions."
  ];

  const prompt = promptLines.join("\n");

  await vscode.env.clipboard.writeText(prompt);
  await vscode.commands.executeCommand("workbench.action.chat.open");

  vscode.window.showInformationMessage(
    "Docs-as-System mini: Analyze Human Changes prompt copied to clipboard. Paste it into your AI chat after you finish manual edits."
  );
}

/**
 * Ask the agent to perform deeper validation of documentation,
 * beyond simple file existence checks.
 */
export async function validateDocsWithAgent(): Promise<void> {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    return;
  }

  const promptLines = [
    "Validate that the core Docs-as-System mini documents are complete, consistent, and ready for the next development cycle.",
    "",
    "Focus on:",
    "- docs/project/BUSINESS_REQUIREMENTS.mini.md",
    "- docs/project/PROJECT_SPEC.mini.md",
    "- docs/project/ARCHITECTURE_BLUEPRINT.mini.md",
    "- docs/project/IMPLEMENTATION_PLAN.mini.md",
    "",
    "Check for:",
    "- missing sections in the templates",
    "- contradictions between documents",
    "- ambiguous requirements or unclear responsibilities",
    "",
    "Do NOT change any files yourself.",
    "Return a clear checklist of issues for the human to fix."
  ];

  const prompt = promptLines.join("\n");

  await vscode.env.clipboard.writeText(prompt);
  await vscode.commands.executeCommand("workbench.action.chat.open");

  vscode.window.showInformationMessage(
    "Docs-as-System mini: Agent-based docs validation prompt copied to clipboard. Paste it into your AI chat."
  );
}
