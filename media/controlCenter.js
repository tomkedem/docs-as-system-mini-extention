// controlCenter.js

(function () {
  // VS Code messaging bridge
  const vscode = acquireVsCodeApi();

  /** @type {import("../core/validation/model").ValidationSnapshot | null} */
  let coreSnapshot = null;
  let selectedDocumentPath = null;

  document.addEventListener("DOMContentLoaded", () => {
    wireButtons();
    vscode.postMessage({ type: "ready" });
  });

  window.addEventListener("message", event => {
    const message = event.data;
    if (!message || typeof message !== "object") {
      return;
    }

    switch (message.type) {
      case "validationResult":
        handleProjectValidationResult(message);
        break;
      case "coreDocsValidationUpdated":
        handleCoreDocsValidationUpdated(message.snapshot);
        break;
    }
  });

  function wireButtons() {
    const buttons = document.querySelectorAll("[data-button-id]");
    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        const buttonId = btn.getAttribute("data-button-id");
        vscode.postMessage({
          type: "click",
          buttonId
        });
      });
    });
  }

  // -----------------------------
  // Project validation status
  // -----------------------------

  function handleProjectValidationResult(message) {
    if (!message || message.target !== "project") {
      return;
    }

    const ok = !!message.ok;
    const textEl = document.querySelector('[data-status-text="project"]');
    const iconEl = document.querySelector(
      '[data-validation-icon="project"]'
    );

    if (!textEl || !iconEl) {
      return;
    }

    if (ok) {
      textEl.textContent = "Project structure looks valid.";
      setValidationIcon(iconEl, "success");
    } else {
      textEl.textContent =
        "Project structure has issues. Open the Output panel for details.";
      setValidationIcon(iconEl, "failed");
    }
  }

  function setValidationIcon(img, state) {
    const pending = img.getAttribute("data-icon-pending");
    const success = img.getAttribute("data-icon-success");
    const failed = img.getAttribute("data-icon-failed");

    switch (state) {
      case "success":
        if (success) {
          img.src = success;
        }
        break;
      case "failed":
        if (failed) {
          img.src = failed;
        }
        break;
      default:
        if (pending) {
          img.src = pending;
        }
        break;
    }
  }

  // -----------------------------
  // Core documents validation
  // -----------------------------

  function handleCoreDocsValidationUpdated(snapshot) {
    if (!snapshot) {
      coreSnapshot = null;
      renderCoreDocsEmpty();
      updateCoreDocsStatus();
      return;
    }

    coreSnapshot = snapshot;
    renderCoreDocsList();
    renderSelectedDocument();
    updateCoreDocsStatus();
  }

  function renderCoreDocsEmpty() {
    const listEl = document.getElementById("core-docs-list");
    const issuesEl = document.getElementById("core-docs-issues");
    const titleEl = document.getElementById("core-docs-details-title");
    const subtitleEl = document.getElementById(
      "core-docs-details-subtitle"
    );

    if (listEl) {
      listEl.innerHTML = "";
    }

    if (issuesEl) {
      issuesEl.innerHTML = "";
    }

    if (titleEl) {
      titleEl.textContent = "No document selected";
    }

    if (subtitleEl) {
      subtitleEl.textContent =
        "Run core docs validation, then select a document on the left.";
    }
  }

  function renderCoreDocsList() {
    const listEl = document.getElementById("core-docs-list");
    if (!listEl) {
      return;
    }

    listEl.innerHTML = "";

    if (!coreSnapshot || !coreSnapshot.documents?.length) {
      const empty = document.createElement("div");
      empty.className = "core-docs-empty";
      empty.textContent =
        "No validation results available yet. Run core docs validation first.";
      listEl.appendChild(empty);
      return;
    }

    coreSnapshot.documents.forEach(doc => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "core-docs-doc-row";

      const sevClass = severityToRowClass(doc.severity);
      if (sevClass) {
        item.classList.add(sevClass);
      }

      if (!selectedDocumentPath) {
        selectedDocumentPath = doc.path;
      }
      if (doc.path === selectedDocumentPath) {
        item.classList.add("core-docs-doc-row-selected");
      }

      const title = document.createElement("div");
      title.className = "core-docs-doc-title";
      title.textContent = doc.displayName || doc.path;

      const status = document.createElement("div");
      status.className = "core-docs-doc-status";
      if (doc.readinessLabel) {
        status.textContent = doc.readinessLabel;
      } else {
        const sevForLabel = doc.severity || "OK";
        status.textContent =
          sevForLabel === "OK"
            ? "Ready"
            : sevForLabel === "WARNING"
            ? "Needs attention"
            : "Has critical issues";
      }

      const meta = document.createElement("div");
      meta.className = "core-docs-doc-meta";

      const issuesCount = document.createElement("span");
      if (doc.issues && doc.issues.length) {
        issuesCount.textContent =
          doc.issues.length === 1
            ? "1 issue"
            : `${doc.issues.length} issues`;
      } else {
        issuesCount.textContent = "No issues";
      }

      const severity = document.createElement("span");
      severity.className = "core-docs-doc-severity";
      const sev = doc.severity || "OK";
      severity.textContent = sev;
      if (sev === "OK") {
        severity.classList.add("core-docs-doc-severity-ok");
      } else if (sev === "WARNING") {
        severity.classList.add("core-docs-doc-severity-warning");
      } else if (sev === "BLOCKER") {
        severity.classList.add("core-docs-doc-severity-blocker");
      }

      meta.appendChild(issuesCount);
      meta.appendChild(severity);

      item.appendChild(title);
      item.appendChild(status);
      item.appendChild(meta);

      item.addEventListener("click", () => {
        selectedDocumentPath = doc.path;
        renderCoreDocsList();
        renderSelectedDocument();
      });

      listEl.appendChild(item);
    });
  }

  function severityToRowClass(severity) {
    const sev = severity || "OK";
    switch (sev) {
      case "BLOCKER":
        return "core-docs-doc-row-sev-blocker";
      case "WARNING":
        return "core-docs-doc-row-sev-warning";
      case "OK":
      default:
        return "core-docs-doc-row-sev-ok";
    }
  }

  function renderSelectedDocument() {
    const titleEl = document.getElementById("core-docs-details-title");
    const subtitleEl = document.getElementById(
      "core-docs-details-subtitle"
    );
    const issuesEl = document.getElementById("core-docs-issues");

    if (!titleEl || !subtitleEl || !issuesEl) {
      return;
    }

    if (!coreSnapshot || !coreSnapshot.documents?.length) {
      titleEl.textContent = "No document selected";
      subtitleEl.textContent =
        "Run core docs validation, then select a document on the left.";
      issuesEl.innerHTML = "";
      return;
    }

    const doc =
      coreSnapshot.documents.find(d => d.path === selectedDocumentPath) ||
      coreSnapshot.documents[0];

    selectedDocumentPath = doc.path;

    titleEl.textContent = doc.displayName || doc.path;

    const readinessPart = doc.readinessLabel
      ? `State: ${doc.readinessLabel}. `
      : "";
    subtitleEl.textContent =
      readinessPart +
      (doc.path || "");

    issuesEl.innerHTML = "";

    if (!doc.issues || !doc.issues.length) {
      const noIssues = document.createElement("div");
      noIssues.className = "core-docs-no-issues";
      noIssues.textContent = "No issues were reported for this document.";
      issuesEl.appendChild(noIssues);
      return;
    }

    doc.issues.forEach(issue => {
      const card = document.createElement("div");
      card.className = "core-docs-issue-card";

      const header = document.createElement("div");
      header.className = "core-docs-issue-header";

      const msg = document.createElement("div");
      msg.className = "core-docs-issue-message";
      msg.textContent = issue.message;

      const pill = document.createElement("div");
      pill.className = "core-docs-issue-pill";
      const sev = issue.severity || "OK";
      pill.textContent = sev;

      if (sev === "OK") {
        pill.classList.add("core-docs-issue-pill-ok");
      } else if (sev === "WARNING") {
        pill.classList.add("core-docs-issue-pill-warning");
      } else if (sev === "BLOCKER") {
        pill.classList.add("core-docs-issue-pill-blocker");
      }

      header.appendChild(msg);
      header.appendChild(pill);

      const meta = document.createElement("div");
      meta.className = "core-docs-issue-meta";
      if (issue.sectionPath) {
        meta.textContent = issue.sectionPath;
      } else if (issue.id) {
        meta.textContent = issue.id;
      }

      const details = document.createElement("div");
      details.className = "core-docs-issue-details";
      if (issue.suggestion) {
        details.textContent = issue.suggestion;
      } else if (issue.details) {
        details.textContent = issue.details;
      }

      card.appendChild(header);
      if (meta.textContent) {
        card.appendChild(meta);
      }
      if (details.textContent) {
        card.appendChild(details);
      }

      issuesEl.appendChild(card);
    });
  }

  function updateCoreDocsStatus() {
    const textEl = document.querySelector('[data-status-text="core-docs"]');
    if (!textEl) {
      return;
    }

    if (!coreSnapshot || typeof coreSnapshot.overallReadiness !== "number") {
      textEl.textContent = "Core documents status: not validated yet.";
      textEl.className = "core-docs-status core-docs-status-unknown";
      return;
    }

    // Prefer the summary message coming from TypeScript, but
    // keep a simple severity-based color for the status line.
    textEl.textContent =
      coreSnapshot.summaryMessage ||
      "Core documents validation status is available.";

    const sev = coreSnapshot.summarySeverity || "OK";
    let statusClass = "unknown";

    if (sev === "BLOCKER") {
      statusClass = "error";
    } else if (sev === "WARNING") {
      statusClass = "warning";
    } else if (sev === "OK") {
      statusClass = "ok";
    }

    textEl.className = "core-docs-status core-docs-status-" + statusClass;
  }
})();
