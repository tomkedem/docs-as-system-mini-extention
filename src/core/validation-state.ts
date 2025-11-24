// src/core/validation-state.ts

export type ValidationStatus = boolean | undefined;

type Listener = (status: ValidationStatus) => void;

let currentStatus: ValidationStatus = undefined;
const listeners = new Set<Listener>();

export function getValidationStatus(): ValidationStatus {
  return currentStatus;
}

export function setValidationStatus(status: boolean): void {
  currentStatus = status;
  for (const listener of listeners) {
    try {
      listener(currentStatus);
    } catch {
      // לא נפל בגלל מאזין אחד
    }
  }
}

export function onValidationStatusChange(
  listener: Listener
): { dispose: () => void } {
  listeners.add(listener);
  return {
    dispose: () => {
      listeners.delete(listener);
    }
  };
}
