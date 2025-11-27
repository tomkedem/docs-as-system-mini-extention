// src/core/validation/state.ts

import * as vscode from "vscode";
import {
  CoreDocumentKind,
  CoreDocumentsValidationSnapshot,
  DocumentReadinessLevel,
  DocumentValidationResult,
} from "./types";

const SNAPSHOT_KEY = "docsAsSystem.coreDocumentsValidation";

const CORE_DOCUMENTS: readonly CoreDocumentKind[] = [
  "business-requirements",
  "project-spec",
  "architecture-blueprint",
  "implementation-plan",
];

/**
 * Creates an empty validation result for a single core document.
 */
function createEmptyDocumentResult(
  kind: CoreDocumentKind
): DocumentValidationResult {
  return {
    kind,
    readiness: DocumentReadinessLevel.NotChecked,
    issues: [],
  };
}

/**
 * Creates an empty snapshot for all core documents.
 */
export function createEmptySnapshot(): CoreDocumentsValidationSnapshot {
  return {
    overallReadiness: DocumentReadinessLevel.NotChecked,
    perDocument: CORE_DOCUMENTS.map((kind) =>
      createEmptyDocumentResult(kind)
    ),
    lastValidatedAt: undefined,
  };
}

/**
 * Safely normalizes a stored snapshot to the expected shape.
 * This allows us to evolve the type over time without breaking older state.
 */
function normalizeSnapshot(
  stored: CoreDocumentsValidationSnapshot | undefined
): CoreDocumentsValidationSnapshot {
  if (!stored) {
    return createEmptySnapshot();
  }

  // Ensure perDocument exists for all core documents
  const byKind = new Map<CoreDocumentKind, DocumentValidationResult>();
  if (Array.isArray(stored.perDocument)) {
    for (const doc of stored.perDocument) {
      if (doc && doc.kind) {
        byKind.set(doc.kind, {
          kind: doc.kind,
          readiness:
            doc.readiness ?? DocumentReadinessLevel.NotChecked,
          issues: Array.isArray(doc.issues) ? doc.issues : [],
        });
      }
    }
  }

  const perDocument = CORE_DOCUMENTS.map((kind) => {
    const existing = byKind.get(kind);
    return existing ?? createEmptyDocumentResult(kind);
  });

  const normalized: CoreDocumentsValidationSnapshot = {
    overallReadiness:
      stored.overallReadiness ??
      computeOverallReadiness(perDocument),
    perDocument,
    lastValidatedAt: stored.lastValidatedAt,
  };

  return withRecomputedOverallReadiness(normalized);
}

/**
 * Returns the current core documents validation snapshot from workspace state.
 * If nothing was stored yet, returns an empty snapshot.
 */
export function getCoreDocsValidationSnapshot(
  context: vscode.ExtensionContext
): CoreDocumentsValidationSnapshot {
  const stored = context.workspaceState.get<CoreDocumentsValidationSnapshot>(
    SNAPSHOT_KEY
  );

  return normalizeSnapshot(stored);
}

/**
 * Persists the given snapshot to workspace state.
 */
export async function updateCoreDocsValidationSnapshot(
  context: vscode.ExtensionContext,
  snapshot: CoreDocumentsValidationSnapshot
): Promise<void> {
  const normalized = withRecomputedOverallReadiness(snapshot);
  await context.workspaceState.update(SNAPSHOT_KEY, normalized);
}

/**
 * Resets the core document validation snapshot back to its initial state.
 */
export async function resetCoreDocsValidationSnapshot(
  context: vscode.ExtensionContext
): Promise<void> {
  const empty = createEmptySnapshot();
  await updateCoreDocsValidationSnapshot(context, empty);
}

/**
 * Computes the overall readiness level from all document results.
 * Overall readiness is the minimum readiness level of all core documents.
 */
export function computeOverallReadiness(
  perDocument: DocumentValidationResult[]
): DocumentReadinessLevel {
  if (!perDocument.length) {
    return DocumentReadinessLevel.NotChecked;
  }

  let minLevel = DocumentReadinessLevel.AgentApproved;

  for (const doc of perDocument) {
    if (doc.readiness < minLevel) {
      minLevel = doc.readiness;
    }
  }

  return minLevel;
}

/**
 * Returns a new snapshot with overallReadiness recomputed from perDocument.
 */
export function withRecomputedOverallReadiness(
  snapshot: CoreDocumentsValidationSnapshot
): CoreDocumentsValidationSnapshot {
  return {
    ...snapshot,
    overallReadiness: computeOverallReadiness(snapshot.perDocument),
  };
}

/**
 * Returns true if all core documents reached AgentApproved readiness level.
 */
export function isCoreDocsAgentApproved(
  snapshot: CoreDocumentsValidationSnapshot
): boolean {
  return (
    snapshot.overallReadiness === DocumentReadinessLevel.AgentApproved
  );
}

/**
 * Marks all core documents as AgentApproved and updates the timestamp.
 * This is typically used after the human confirms that the agent approved the documents.
 */
export function markCoreDocsAgentApproved(
  snapshot: CoreDocumentsValidationSnapshot
): CoreDocumentsValidationSnapshot {
  const updatedPerDoc = snapshot.perDocument.map((doc) => ({
    ...doc,
    readiness: DocumentReadinessLevel.AgentApproved,
  }));

  return {
    ...snapshot,
    perDocument: updatedPerDoc,
    overallReadiness: DocumentReadinessLevel.AgentApproved,
    lastValidatedAt: new Date().toISOString(),
  };
}
