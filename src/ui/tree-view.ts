import * as vscode from "vscode";
import {
  getValidationStatus,
  onValidationStatusChange,
  ValidationStatus
} from "../core/validation-state";

export class DocsAsSystemMiniItem extends vscode.TreeItem {
  constructor(
    label: string,
    public readonly commandId?: string,
    public readonly description?: string,
    public readonly children: DocsAsSystemMiniItem[] = [],
    iconId?: string,
    public readonly isSectionHeader: boolean = false
  ) {
    super(
      label,
      children.length > 0
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None
    );

    this.label = label;

    if (description) {
      this.description = description;
      this.tooltip = description;
    }

    if (commandId) {
      this.command = {
        command: commandId,
        title: label
      };
    }

    if (iconId && !isSectionHeader) {
      this.iconPath = new vscode.ThemeIcon(iconId);
    }

    if (isSectionHeader) {
      this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
      this.contextValue = "sectionHeader";
      this.iconPath = undefined;
    }
  }
}

export class DocsAsSystemMiniProvider
  implements vscode.TreeDataProvider<DocsAsSystemMiniItem>, vscode.Disposable
{
  private readonly onDidChangeTreeDataEmitter =
    new vscode.EventEmitter<DocsAsSystemMiniItem | undefined | void>();

  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  private validationStatus: ValidationStatus = getValidationStatus();
  private readonly validationSubscription = onValidationStatusChange(status => {
    this.validationStatus = status;
    this.refresh();
  });

  constructor(private readonly extensionUri: vscode.Uri) {}

  dispose(): void {
    this.validationSubscription?.dispose();
  }

  private getSuccessIcon():
    | vscode.Uri
    | { light: vscode.Uri; dark: vscode.Uri } {
    return {
      light: vscode.Uri.joinPath(
        this.extensionUri,
        "media",
        "icons",
        "validate-success-light.svg"
      ),
      dark: vscode.Uri.joinPath(
        this.extensionUri,
        "media",
        "icons",
        "validate-success-dark.svg"
      )
    };
  }

  private getFailedIcon():
    | vscode.Uri
    | { light: vscode.Uri; dark: vscode.Uri } {
    return {
      light: vscode.Uri.joinPath(
        this.extensionUri,
        "media",
        "icons",
        "validate-failed-light.svg"
      ),
      dark: vscode.Uri.joinPath(
        this.extensionUri,
        "media",
        "icons",
        "validate-failed-dark.svg"
      )
    };
  }

  private getPendingIcon():
    | vscode.Uri
    | { light: vscode.Uri; dark: vscode.Uri } {
    return {
      light: vscode.Uri.joinPath(
        this.extensionUri,
        "media",
        "icons",
        "validate-pending-light.svg"
      ),
      dark: vscode.Uri.joinPath(
        this.extensionUri,
        "media",
        "icons",
        "validate-pending-dark.svg"
      )
    };
  }

  getTreeItem(element: DocsAsSystemMiniItem): vscode.TreeItem {
    return element;
  }

  getChildren(
    element?: DocsAsSystemMiniItem
  ): vscode.ProviderResult<DocsAsSystemMiniItem[]> {
    if (element) {
      return element.children;
    }

    const myWorkspace = new DocsAsSystemMiniItem(
      "MY WORKSPACE",
      undefined,
      undefined,
      [
        new DocsAsSystemMiniItem(
          "Control center",
          "docsAsSystemMini.openControlCenter",
          "Open the visual Docs-as-System mini dashboard",
          [],
          "graph"
        )
      ],
      undefined,
      true
    );

    const validateLabel =
      this.validationStatus === true
        ? "Validate project"
        : this.validationStatus === false
        ? "Validate project (FAILED)"
        : "Validate project (not run yet)";

    const validateDescription =
      this.validationStatus === true
        ? "All required files are present."
        : this.validationStatus === false
        ? "Missing required files. See output."
        : "Validation not run yet. Run this before working with the agent.";

    const validateItem = new DocsAsSystemMiniItem(
      validateLabel,
      "docsAsSystemMini.validateProject",
      validateDescription
    );

    if (this.validationStatus === true) {
      validateItem.iconPath = this.getSuccessIcon();
    } else if (this.validationStatus === false) {
      validateItem.iconPath = this.getFailedIcon();
    } else {
      validateItem.iconPath = this.getPendingIcon();
    }

    const projectTools = new DocsAsSystemMiniItem(
      "PROJECT TOOLS",
      undefined,
      "Create and validate a Docs-as-System mini project",
      [
        new DocsAsSystemMiniItem(
          "Initialize project",
          "docsAsSystemMini.initProject",
          "Download all Docs-as-System mini files into this workspace",
          [],
          "cloud-download"
        ),
        validateItem
      ],
      undefined,
      true
    );

    const aiWorkflow = new DocsAsSystemMiniItem(
      "AI WORKFLOW",
      undefined,
      "Run the full Docs-as-System mini agent cycle",
      [
        new DocsAsSystemMiniItem(
          "Run full cycle",
          "docsAsSystemMini.runFullCycle",
          "Copy the orchestration prompt and open chat",
          [],
          "run"
        )
      ],
      undefined,
      true
    );

    const hybridMode = new DocsAsSystemMiniItem(
      "HYBRID HUMAN EDIT",
      undefined,
      "Work in a safe hybrid mode between human and agent",
      [
        new DocsAsSystemMiniItem(
          "I'm editing manually now",
          "docsAsSystemMini.startHumanEdit",
          "Tell the agent that you are doing manual edits",
          [],
          "edit"
        ),
        new DocsAsSystemMiniItem(
          "Analyze manual changes",
          "docsAsSystemMini.analyzeHumanChanges",
          "Ask the agent to analyze what changed after manual edits",
          [],
          "search"
        )
      ],
      undefined,
      true
    );

    const docsHelp = new DocsAsSystemMiniItem(
      "DOCS AND HELP",
      undefined,
      "Read the Docs-as-System mini docs inside this project",
      [
        new DocsAsSystemMiniItem(
          "Open Quick Start Guide",
          "docsAsSystemMini.openQuickStart",
          "Short guide for getting started with Docs-as-System mini",
          [],
          "rocket"
        ),
        new DocsAsSystemMiniItem(
          "Open method README",
          "docsAsSystemMini.openReadme",
          "Full description of the methodology inside this project",
          [],
          "file-text"
        )
      ],
      undefined,
      true
    );

    return [myWorkspace, projectTools, aiWorkflow, hybridMode, docsHelp];
  }

  refresh(): void {
    this.onDidChangeTreeDataEmitter.fire();
  }

  setValidationStatus(ok: boolean): void {
    this.validationStatus = ok;
    this.refresh();
  }
}
