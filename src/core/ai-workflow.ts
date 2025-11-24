import * as vscode from "vscode";
import { getWorkspaceRoot } from "./files";

export async function runFullCycle() {
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

export async function startHumanEdit() {
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

export async function analyzeHumanChanges() {
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

export async function validateDocsWithAgent() {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    return;
  }

  const prompt = [
    "Before running any Docs-as-System mini development cycle, validate that the core project documents are PROPERLY WRITTEN, not just present.",
    "",
    "Work inside this existing project workspace in VS Code.",
    "Use these core files as your single source of truth:",
    "- docs/project/BUSINESS_REQUIREMENTS.mini.md",
    "- docs/project/PROJECT_SPEC.mini.md",
    "- docs/project/ARCHITECTURE_BLUEPRINT.mini.md",
    "- docs/project/IMPLEMENTATION_PLAN.mini.md",
    "",
    "Your task now:",
    "1. Open and carefully read each of these four documents.",
    "2. Check that they are not just placeholders and not generic templates.",
    "3. Verify that they describe THIS project concretely:",
    "   - clear business problem and scope in BUSINESS_REQUIREMENTS",
    "   - logical behavior and flows in PROJECT_SPEC",
    "   - system structure and integration in ARCHITECTURE_BLUEPRINT",
    "   - concrete steps and tasks in IMPLEMENTATION_PLAN",
    "4. Identify missing parts, contradictions, or hand waiving text like 'TBD', 'later', or generic boilerplate.",
    "",
    "Output a short structured report in English or Hebrew:",
    "- For each document: READY / PARTIAL / NOT READY",
    "- Short explanation why",
    "- A concrete checklist of what the human should fix before running the main orchestration prompt.",
    "",
    "Very important:",
    "- Do NOT start implementing code.",
    "- Do NOT start the full Docs-as-System mini cycle.",
    "- Focus only on evaluating and improving the quality of the documents."
  ].join("\n");

  await vscode.env.clipboard.writeText(prompt);
  await vscode.commands.executeCommand("workbench.action.chat.open");

  vscode.window.showInformationMessage(
    "Docs-as-System mini document validation prompt copied to clipboard. Paste it in your AI chat to validate the core docs."
  );
}
