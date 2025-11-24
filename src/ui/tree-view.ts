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

    // For regular items we use built-in theme icons by default.
    // For special items we can override iconPath explicitly.
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

  getTreeItem(element: DocsAsSystemMiniItem): vscode.TreeItem {
    return element;
  }

  getChildren(
    element?: DocsAsSystemMiniItem
  ): vscode.ProviderResult<DocsAsSystemMiniItem[]> {
    if (element) {
      return element.children;
    }

    // MY WORKSPACE
    const myWorkspace = new DocsAsSystemMiniItem(
      "MY WORKSPACE",
      undefined,
      undefined,
      [
        new DocsAsSystemMiniItem(
          "Control center",
          "docsAsSystemMini.openControlCenter",
          "Open the Docs-as-System mini Control Center",
          [],
          "graph"
        )
      ],
      undefined,
      true
    );

    // DAILY WORKFLOW
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
      validateDescription,
      [],
      undefined
    );

    validateItem.iconPath = this.getValidationIconPath();

    const dailyWorkflow = new DocsAsSystemMiniItem(
      "DAILY WORKFLOW",
      undefined,
      "Run the main Docs-as-System mini daily flow",
      [
        validateItem,
        new DocsAsSystemMiniItem(
          "Run full cycle",
          "docsAsSystemMini.runFullCycle",
          "Prepare the orchestration prompt and open the chat",
          [],
          "run"
        )
      ],
      undefined,
      true
    );

    // HYBRID HUMAN EDIT
    const hybridMode = new DocsAsSystemMiniItem(
      "HYBRID HUMAN EDIT",
      undefined,
      "Work in a safe hybrid mode between human and agent",
      [
        new DocsAsSystemMiniItem(
          "I'm editing manually now",
          "docsAsSystemMini.startHumanEdit",
          "Tell the agent that you are doing manual edits and pause the cycle",
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

    // DOCS AND SETUP
    const docsAndSetup = new DocsAsSystemMiniItem(
      "DOCS AND SETUP",
      undefined,
      "Initialize the project and open the docs",
      [
        new DocsAsSystemMiniItem(
          "Initialize project",
          "docsAsSystemMini.initProject",
          "Download all Docs-as-System mini files into this workspace",
          [],
          "cloud-download"
        ),
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

    return [myWorkspace, dailyWorkflow, hybridMode, docsAndSetup];
  }

  refresh(): void {
    this.onDidChangeTreeDataEmitter.fire();
  }

  setValidationStatus(ok: boolean): void {
    this.validationStatus = ok;
    this.refresh();
  }

  /**
   * Choose the correct SVG icon for the "Validate project" item
   * based on current validation status (pending / success / failed).
   */
  private getValidationIconPath():
    | vscode.ThemeIcon
    | { light: vscode.Uri; dark: vscode.Uri } {
    let lightFile = "validate-pending-light.svg";
    let darkFile = "validate-pending-dark.svg";

    if (this.validationStatus === true) {
      lightFile = "validate-success-light.svg";
      darkFile = "validate-success-dark.svg";
    } else if (this.validationStatus === false) {
      lightFile = "validate-failed-light.svg";
      darkFile = "validate-failed-dark.svg";
    }

    return {
      light: vscode.Uri.joinPath(
        this.extensionUri,
        "media",
        "icons",
        lightFile
      ),
      dark: vscode.Uri.joinPath(
        this.extensionUri,
        "media",
        "icons",
        darkFile
      )
    };
  }
}
