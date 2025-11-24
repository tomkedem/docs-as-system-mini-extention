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

/**
 * Extension activation entry point.
 */
export function activate(context: vscode.ExtensionContext) {
  const provider = new DocsAsSystemMiniProvider(context.extensionUri);

  const treeView = vscode.window.createTreeView("docsAsSystemMiniView", {
    treeDataProvider: provider
  });

  context.subscriptions.push(provider, treeView);

  // --------------------------------------------------------------------------
  // Commands
  // --------------------------------------------------------------------------

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "docsAsSystemMini.openControlCenter",
      () => openControlCenter(context)
    )
  );

  /**
   * Initialize project:
   * 1. Always validate before downloading files.
   * 2. If project is valid → skip initialization.
   * 3. If project is not valid → ask user whether to download files.
   * 4. After download → validate again and update UI state.
   */
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "docsAsSystemMini.initProject",
      async () => {
        // Step 1: always validate current project state
        const beforeOk = await validateDocsAsSystemMiniProject();

        setValidationStatus(beforeOk);
        provider.setValidationStatus(beforeOk);

        if (beforeOk) {
          vscode.window.showInformationMessage(
            "Docs-as-System mini: Project already initialized."
          );
          return;
        }

        // Step 2: validation failed → ask user whether to download files
        const answer = await vscode.window.showWarningMessage(
          "Some required Docs-as-System mini files are missing.\nDownload full template into this workspace?",
          "Yes",
          "No"
        );

        if (answer !== "Yes") {
          return;
        }

        // Step 3: perform initialization (download all files)
        const didInit = await initDocsAsSystemMini();

        if (!didInit) {
          // Initialization cancelled or errored → re-run validation anyway
          const recheck = await validateDocsAsSystemMiniProject();
          setValidationStatus(recheck);
          provider.setValidationStatus(recheck);
          return;
        }

        // Step 4: ensure disk writes are complete
        await new Promise(resolve => setTimeout(resolve, 150));

        // Step 5: validate again after initialization
        const afterOk = await validateDocsAsSystemMiniProject();

        setValidationStatus(afterOk);
        provider.setValidationStatus(afterOk);

        if (afterOk) {
          vscode.window.showInformationMessage(
            "Initialization completed and validation passed."
          );
        } else {
          vscode.window.showWarningMessage(
            "Initialization completed, but validation failed. See output."
          );
        }
      }
    )
  );

  /**
   * Manual validation command.
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

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "docsAsSystemMini.runFullCycle",
      () => runFullCycle()
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "docsAsSystemMini.startHumanEdit",
      () => startHumanEdit()
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "docsAsSystemMini.analyzeHumanChanges",
      () => analyzeHumanChanges()
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "docsAsSystemMini.validateDocsWithAgent",
      () => validateDocsWithAgent()
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "docsAsSystemMini.openQuickStart",
      () => openQuickStart()
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "docsAsSystemMini.openReadme",
      () => openReadme()
    )
  );

  // --------------------------------------------------------------------------
  // Automatic validation on extension activation
  // --------------------------------------------------------------------------

  /**
   * Always validate when the extension loads.
   * This ensures both the TreeView and Control Center
   * start with correct validation status.
   */
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
 * Extension deactivation.
 */
export function deactivate() {}
