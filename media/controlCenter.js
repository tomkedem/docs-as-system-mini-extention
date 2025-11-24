// media/controlCenter.js

// VS Code API בתוך webview
const vscode = acquireVsCodeApi();

function wireButtons() {
  const buttons = document.querySelectorAll(".btn[data-button-id]");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-button-id");
      if (!id) {
        return;
      }
      vscode.postMessage({
        type: "click",
        buttonId: id
      });
    });
  });
}

function updateValidateButtonStatus(ok) {
  const iconEl = document.querySelector('[data-status-icon="validate"]');
  if (!iconEl) {
    return;
  }

  const pendingSrc = iconEl.getAttribute("data-icon-pending");
  const successSrc = iconEl.getAttribute("data-icon-success") || pendingSrc;
  const failedSrc = iconEl.getAttribute("data-icon-failed") || pendingSrc;

  const button = iconEl.closest("button");
  if (button) {
    button.classList.remove("btn-success", "btn-failed", "btn-pending");
  }

  if (ok === true) {
    iconEl.src = successSrc;
    if (button) {
      button.classList.add("btn-success");
    }
  } else if (ok === false) {
    iconEl.src = failedSrc;
    if (button) {
      button.classList.add("btn-failed");
    }
  } else {
    iconEl.src = pendingSrc;
    if (button) {
      button.classList.add("btn-pending");
    }
  }
}

// קבלת הודעות מה־extension
window.addEventListener("message", event => {
  const message = event.data;
  if (!message || typeof message !== "object") {
    return;
  }

  if (message.type === "validationResult" && message.target === "project") {
    updateValidateButtonStatus(message.ok);
  }
});

window.addEventListener("DOMContentLoaded", () => {
  wireButtons();

  // מבקש סטטוס נוכחי מה־extension
  vscode.postMessage({
    type: "ready"
  });
});
