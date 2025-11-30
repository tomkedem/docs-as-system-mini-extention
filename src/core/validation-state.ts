// src/core/validation-state.ts

import * as vscode from "vscode";

/**
 * Represents the coarse project validation status.
 * - true: project structure is valid
 * - false: project structure has issues
 * - undefined: validation has not been run yet
 */
export type ValidationStatus = boolean | undefined;

let currentStatus: ValidationStatus;

const validationEmitter = new vscode.EventEmitter<ValidationStatus>();

/**
 * Returns the last known validation status for the project.
 */
export function getValidationStatus(): ValidationStatus {
  return currentStatus;
}

/**
 * Updates the validation status and notifies listeners.
 */
export function setValidationStatus(status: ValidationStatus): void {
  currentStatus = status;
  validationEmitter.fire(status);
}

/**
 * Subscribes to changes in the project validation status.
 */
export function onValidationStatusChange(
  listener: (status: ValidationStatus) => void
): vscode.Disposable {
  return validationEmitter.event(listener);
}
