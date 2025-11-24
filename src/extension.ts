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

export function activate(context: vscode.ExtensionContext) {
  // מעבירים את extensionUri ל־provider כדי שיוכל לטעון אייקונים מה־media
  const provider = new DocsAsSystemMiniProvider(context.extensionUri);

  const treeView = vscode.window.createTreeView("docsAsSystemMiniView", {
    treeDataProvider: provider
  });

  context.subscriptions.push(
    provider,
    treeView,

    vscode.commands.registerCommand(
      "docsAsSystemMini.openControlCenter",
      () => openControlCenter(context)
    ),

    vscode.commands.registerCommand("docsAsSystemMini.initProject", () =>
      initDocsAsSystemMini()
    ),

    vscode.commands.registerCommand(
      "docsAsSystemMini.validateProject",
      async () => {
        const ok = await validateDocsAsSystemMiniProject();

        // עדכון סטייט גלובלי + עדכון ה־TreeView
        setValidationStatus(ok);
        provider.setValidationStatus(ok);

        return ok;
      }
    ),

    vscode.commands.registerCommand("docsAsSystemMini.runFullCycle", () =>
      runFullCycle()
    ),

    vscode.commands.registerCommand("docsAsSystemMini.startHumanEdit", () =>
      startHumanEdit()
    ),

    vscode.commands.registerCommand("docsAsSystemMini.analyzeHumanChanges", () =>
      analyzeHumanChanges()
    ),

    vscode.commands.registerCommand(
      "docsAsSystemMini.validateDocsWithAgent",
      () => validateDocsWithAgent()
    ),

    vscode.commands.registerCommand("docsAsSystemMini.openQuickStart", () =>
      openQuickStart()
    ),

    vscode.commands.registerCommand("docsAsSystemMini.openReadme", () =>
      openReadme()
    )
  );
}

export function deactivate() {}
