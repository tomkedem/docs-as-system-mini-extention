// src/extension.ts

import * as vscode from "vscode";
import { DocsAsSystemMiniProvider } from "./ui/tree-view";
import {
  initDocsAsSystemMini,
  validateDocsAsSystemMiniProject,
} from "./core/project-init";
import {
  runFullCycle,
  startHumanEdit,
  analyzeHumanChanges,
  validateDocsWithAgent,
} from "./core/ai-workflow";
import { openQuickStart, openReadme } from "./core/files";
import { openControlCenter } from "./ui/control-center";
import { setValidationStatus } from "./core/validation-state";
import {
  getCoreDocsValidationSnapshot,
  isCoreDocsAgentApproved,
  updateCoreDocsValidationSnapshot,
} from "./core/validation/state";
import { validateCoreDocumentsBasic } from "./core/validation/core-docs-validator";
import { DocumentReadinessLevel } from "./core/validation/types";

/**
 * Extension activation entry point.
 */
export function activate(context: vscode.ExtensionContext): void {
  const provider = new DocsAsSystemMiniProvider(context.extensionUri);

  const treeView = vscode.window.createTreeView("docsAsSystemMiniView", {
    treeDataProvider: provider,
  });

  context.subscriptions.push(provider, treeView);

  // --------------------------------------------------------------------------
  // Commands
  // --------------------------------------------------------------------------

  /**
   * Initialize project:
   * 1. Validate current project state.
   * 2. If not initialized, download templates and files.
   * 3. Update TreeView and validation state.
   * 4. After download, validate again and update UI state.
   */
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "docsAsSystemMini.initProject",
      async () => {
        const beforeOk = await validateDocsAsSystemMiniProject();

        setValidationStatus(beforeOk);
        provider.setValidationStatus(beforeOk);

        if (beforeOk) {
          vscode.window.showInformationMessage(
            "Docs-as-System mini: Project already initialized."
          );
          return;
        }

        const afterInit = await initDocsAsSystemMini();
        const afterOk =
          afterInit && (await validateDocsAsSystemMiniProject());

        setValidationStatus(afterOk);
        provider.setValidationStatus(afterOk);

        if (afterOk) {
          vscode.window.showInformationMessage(
            "Docs-as-System mini: Project initialized and validated."
          );
        } else {
          vscode.window.showWarningMessage(
            "Docs-as-System mini: Project initialized, but validation did not fully pass. Please check the project structure."
          );
        }
      }
    )
  );

  /**
   * Open the Control Center webview.
   */
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "docsAsSystemMini.openControlCenter",
      async () => {
        await openControlCenter(context);
      }
    )
  );

  /**
   * Manual validation command for the overall Docs-as-System mini structure.
   */
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "docsAsSystemMini.validateProject",
      async () => {
        const ok = await validateDocsAsSystemMiniProject();

        setValidationStatus(ok);
        provider.setValidationStatus(ok);

        return ok;
      }
    )
  );

  /**
   * Validate core documents (BR, SPEC, BLUEPRINT, PLAN).
   * This runs a basic validation and stores the snapshot in workspace state.
   */
  context.subscriptions.push(
  vscode.commands.registerCommand(
    "docsAsSystemMini.validateCoreDocumentsBasic",
    async () => {
      const snapshot = await validateCoreDocumentsBasic();

      // Save the snapshot for any later computation (agent checks, UI, etc.)
      await updateCoreDocsValidationSnapshot(context, snapshot);

      // Determine if the local validation considers the docs ready enough
      const ok =
        snapshot.overallReadiness >=
        DocumentReadinessLevel.ContentLooksProjectSpecific;

      // Update the global validation status (used by the project status indicator)
      setValidationStatus(ok);

      if (ok) {
        vscode.window.showInformationMessage(
          "Core documents validation passed. Content looks adapted to the project."
        );
      } else {
        vscode.window.showWarningMessage(
          "Core documents validation found issues. Open the Control Center to review details."
        );
      }

      return snapshot;
    }
  )
);


  /**
   * Run full agent cycle.
   * This command is protected by core documents readiness.
   */
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "docsAsSystemMini.runFullCycle",
      async () => {
        const snapshot = getCoreDocsValidationSnapshot(context);

        if (!isCoreDocsAgentApproved(snapshot)) {
          vscode.window.showWarningMessage(
            "Core documents are not ready yet. Validate core documents and confirm agent approval before running a full cycle."
          );
          return;
        }

        await runFullCycle();
      }
    )
  );

  /**
   * Start Human Edit mode.
   */
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "docsAsSystemMini.startHumanEdit",
      () => {
        startHumanEdit();
      }
    )
  );

  /**
   * Analyze human changes made while Human Edit mode was active.
   */
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "docsAsSystemMini.analyzeHumanChanges",
      () => {
        analyzeHumanChanges();
      }
    )
  );

  /**
   * Ask the agent to validate core documents with a richer AI-driven check.
   */
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "docsAsSystemMini.validateDocsWithAgent",
      () => {
        validateDocsWithAgent();
      }
    )
  );

  /**
   * Open the Quick Start guide.
   */
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "docsAsSystemMini.openQuickStart",
      () => {
        openQuickStart();
      }
    )
  );

  /**
   * Open the main README for the methodology.
   */
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "docsAsSystemMini.openReadme",
      () => {
        openReadme();
      }
    )
  );

  // --------------------------------------------------------------------------
  // Automatic validation on extension activation
  // --------------------------------------------------------------------------

  validateDocsAsSystemMiniProject()
    .then((ok) => {
      setValidationStatus(ok);
      provider.setValidationStatus(ok);
    })
    .catch(() => {
      setValidationStatus(false);
      provider.setValidationStatus(false);
    });
}

/**
 * Extension deactivation.
 */
export function deactivate(): void {
  // No special cleanup required at the moment.
}
