// src/extension.ts

import * as vscode from "vscode";
import { DocsAsSystemMiniProvider } from "./ui/tree-view";
import {
  initDocsAsSystemMini,
  validateDocsAsSystemMiniProject
} from "./core/project-init";
import {
  runFullCycle,
  startHumanEdit,
  analyzeHumanChanges,
  validateDocsWithAgent
} from "./core/ai-workflow";
import { openQuickStart, openReadme } from "./core/files";
import { openControlCenter } from "./ui/control-center";
import { setValidationStatus } from "./core/validation-state";
import {
  getCoreDocsValidationSnapshot,
  isCoreDocsAgentApproved,
  updateCoreDocsValidationSnapshot
} from "./core/validation/state";
import { validateCoreDocumentsBasic } from "./core/validation/core-docs-validator";
import { DocumentReadinessLevel } from "./core/validation/types";

/**
 * Extension activation entry point.
 */
export function activate(context: vscode.ExtensionContext): void {
  const provider = new DocsAsSystemMiniProvider(context.extensionUri);

  const treeView = vscode.window.createTreeView("docsAsSystemMiniView", {
    treeDataProvider: provider
  });

  context.subscriptions.push(provider, treeView);

  // --------------------------------------------------------------------------
  // Commands
  // --------------------------------------------------------------------------

  /**
   * Initialize or repair project structure.
   * Also validates the project right after initialization.
   */
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "docsAsSystemMini.initProject",
      async () => {
        const folders = vscode.workspace.workspaceFolders;

        if (!folders || folders.length === 0) {
          vscode.window.showWarningMessage(
            "Docs-as-System mini: Please open a folder before initializing the project."
          );
          return;
        }

        // If the project is already valid, do not run init again.
        const existingOk = await validateDocsAsSystemMiniProject();

        setValidationStatus(existingOk);
        provider.setValidationStatus(existingOk);

        if (existingOk) {
          vscode.window.showInformationMessage(
            "Docs-as-System mini: Project already initialized and valid."
          );
          return;
        }

        const initOk = await initDocsAsSystemMini();

        if (!initOk) {
          vscode.window.showErrorMessage(
            "Docs-as-System mini: Failed to initialize project structure."
          );
          return;
        }

        const ok = await validateDocsAsSystemMiniProject();

        setValidationStatus(ok);
        provider.setValidationStatus(ok);

        if (ok) {
          vscode.window.showInformationMessage(
            "Docs-as-System mini: Project structure initialized successfully."
          );
        } else {
          vscode.window.showWarningMessage(
            "Docs-as-System mini: Project initialized, but validation still reports issues."
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
      () => {
        openControlCenter(context);
      }
    )
  );

  /**
   * Validate project structure.
   * Returns true when structure looks valid.
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
   * Validate core documents (BUSINESS_REQUIREMENTS, PROJECT_SPEC, etc).
   * Runs the basic validator and persists the snapshot.
   */
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "docsAsSystemMini.validateCoreDocumentsBasic",
      async () => {
        const previousSnapshot = getCoreDocsValidationSnapshot(context);

        const snapshot = await validateCoreDocumentsBasic();
        await updateCoreDocsValidationSnapshot(context, snapshot);

        if (
          snapshot.overallReadiness >=
          DocumentReadinessLevel.ContentLooksProjectSpecific
        ) {
          vscode.window.showInformationMessage(
            "Docs-as-System mini: Core documents basic validation passed. Content looks project specific."
          );
        } else {
          vscode.window.showWarningMessage(
            "Docs-as-System mini: Core documents basic validation found issues. Open the Control Center to review them."
          );
        }

        // If the docs used to be agent approved, let the user know that the status changed.
        const previouslyAgentApproved =
          previousSnapshot &&
          isCoreDocsAgentApproved(previousSnapshot);
        const nowAgentApproved = isCoreDocsAgentApproved(snapshot);

        if (previouslyAgentApproved && !nowAgentApproved) {
          vscode.window.showInformationMessage(
            "Docs-as-System mini: Core documents changed since the last agent approval. Consider running agent validation again."
          );
        }

        return snapshot;
      }
    )
  );

  /**
   * Run full agent cycle (understanding, planning, execution, self check, commit).
   */
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "docsAsSystemMini.runFullCycle",
      async () => {
        const snapshot = getCoreDocsValidationSnapshot(context);

        if (!snapshot) {
          vscode.window.showWarningMessage(
            "Docs-as-System mini: Core documents were not validated yet. Run Step 1 first."
          );
          return;
        }

        if (!isCoreDocsAgentApproved(snapshot)) {
          vscode.window.showWarningMessage(
            "Docs-as-System mini: Core documents are not marked as agent approved yet. It is recommended to validate them with the agent before running full cycles."
          );
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
      async () => {
        await startHumanEdit();
      }
    )
  );

  /**
   * Analyze manual changes after Human Edit mode.
   */
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "docsAsSystemMini.analyzeHumanChanges",
      async () => {
        await analyzeHumanChanges();
      }
    )
  );

  /**
   * Validate docs with the agent directly (without full cycle).
   */
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "docsAsSystemMini.validateDocsWithAgent",
      async () => {
        await validateDocsWithAgent();
      }
    )
  );

  /**
   * Open the Quick Start guide markdown.
   */
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "docsAsSystemMini.openQuickStart",
      async () => {
        await openQuickStart();
      }
    )
  );

  /**
   * Open the project README.
   */
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "docsAsSystemMini.openReadme",
      async () => {
        await openReadme();
      }
    )
  );

  // --------------------------------------------------------------------------
  // Automatic validation on activation
  // --------------------------------------------------------------------------

  // Try to validate project structure once when the extension loads,
  // so the tree view and Control Center start with a realistic status.
  validateDocsAsSystemMiniProject()
    .then(ok => {
      setValidationStatus(ok);
      provider.setValidationStatus(ok);
    })
    .catch(() => {
      setValidationStatus(false);
      provider.setValidationStatus(false);
    });
}

/**
 * Extension deactivation hook.
 */
export function deactivate(): void {
  // Nothing special to clean up at the moment.
}
