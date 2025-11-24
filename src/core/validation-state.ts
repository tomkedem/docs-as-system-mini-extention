import * as vscode from "vscode";

export type ValidationStatus = boolean | undefined;

let currentStatus: ValidationStatus = undefined;

const validationEmitter = new vscode.EventEmitter<ValidationStatus>();

/**
 * Get current validation status.
 */
export function getValidationStatus(): ValidationStatus {
  return currentStatus;
}

/**
 * Set validation status and notify listeners.
 */
export function setValidationStatus(status: ValidationStatus): void {
  currentStatus = status;
  validationEmitter.fire(status);
}

/**
 * Subscribe to validation status changes.
 */
export function onValidationStatusChange(
  listener: (status: ValidationStatus) => void
): vscode.Disposable {
  return validationEmitter.event(listener);
}
