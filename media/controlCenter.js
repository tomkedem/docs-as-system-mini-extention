// media/controlCenter.js

(function () {
  const vscode = acquireVsCodeApi();

  function handleButtonClick(event) {
    const btn = event.currentTarget;
    const buttonId = btn.getAttribute("data-button-id");
    if (!buttonId) {
      return;
    }

    vscode.postMessage({
      type: "click",
      buttonId
    });
  }

  function bindButtons() {
    const buttons = document.querySelectorAll("[data-button-id]");
    buttons.forEach(btn => {
      btn.addEventListener("click", handleButtonClick);
    });
  }

  function setIconState(state) {
    // state: "pending" | "success" | "failed"
    const icons = document.querySelectorAll(
      '[data-validation-icon="project"], [data-validation-icon="validate"]'
    );

    icons.forEach(icon => {
      const pending = icon.dataset.iconPending;
      const success = icon.dataset.iconSuccess;
      const failed = icon.dataset.iconFailed;

      let next = pending;
      if (state === "success" && success) {
        next = success;
      } else if (state === "failed" && failed) {
        next = failed;
      }

      if (next) {
        icon.setAttribute("src", next);
      }
    });
  }

  function updateProjectStatus(ok) {
    const textEl = document.querySelector('[data-status-text="project"]');
    if (!textEl) {
      return;
    }

    if (ok) {
      textEl.textContent = "Project structure looks valid.";
      setIconState("success");
    } else {
      textEl.textContent =
        "Project structure has issues. Please fix before running full cycles.";
      setIconState("failed");
    }
  }

  function updateCoreDocsStatus(snapshot) {
    const textEl = document.querySelector('[data-status-text="core-docs"]');
    if (!textEl) {
      return;
    }

    if (!snapshot || typeof snapshot.overallReadiness !== "number") {
      textEl.textContent = "Core documents status: not validated yet.";
      textEl.className = "core-docs-status core-docs-status-unknown";
      return;
    }

    const level = snapshot.overallReadiness;
    let text;
    let statusClass = "unknown";

    switch (level) {
      case 0:
        text = "Core documents status: not validated yet.";
        statusClass = "unknown";
        break;
      case 1:
        text =
          "Core documents: files exist but some are empty or missing.";
        statusClass = "error";
        break;
      case 2:
        text =
          "Core documents: structure looks OK. Titles and required sections are present.";
        statusClass = "warning";
        break;
      case 3:
        text = "Core documents: content looks project specific.";
        statusClass = "ok";
        break;
      case 4:
        text =
          "Core documents: agent approved and ready for full cycles.";
        statusClass = "ok";
        break;
      default:
        text = "Core documents status: unknown.";
        statusClass = "unknown";
        break;
    }

    textEl.textContent = text;
    textEl.className = `core-docs-status core-docs-status-${statusClass}`;
  }

  window.addEventListener("message", event => {
    const message = event.data;
    if (!message || typeof message !== "object") {
      return;
    }

    if (message.type === "validationResult" && message.target === "project") {
      updateProjectStatus(Boolean(message.ok));
      return;
    }

    if (message.type === "coreDocsValidationUpdated") {
      updateCoreDocsStatus(message.snapshot);
      return;
    }
  });

  window.addEventListener("DOMContentLoaded", () => {
    bindButtons();

    // initial state is "pending" until we get the first validation result
    setIconState("pending");

    vscode.postMessage({
      type: "ready"
    });
  });
})();
