const CFG = window.PRO4A_CONFIG;

let session = null;
let records = [];
let users = [];
let history = [];
let currentPage = 1;
let pageSize = 12;
let charts = {};
let recordModal;
let viewModal;
let userModal;

const UNITS = [
  "Cavite PPO",
  "Laguna PPO",
  "Rizal PPO",
  "Batangas PPO",
  "Quezon PPO",
  "RHQ"
];

const WORKFLOW = [
  "Incident Recorded",
  "Requirements Submitted",
  "For Validation",
  "RHE Processing",
  "NAPOLCOM Processing",
  "PSMBFI Processing",
  "Financial Assistance Released",
  "Completed"
];

const CHECKLIST = [
  "Incident Report",
  "Spot Report",
  "Medical Certificate",
  "Death Certificate",
  "Investigation Report",
  "Endorsement",
  "RHE Requirements",
  "NAPOLCOM Requirements",
  "PSMBFI Requirements",
  "Other Supporting Documents"
];

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

let activeRequests = 0;

function setLoadingVisible(visible) {
  const loadingElement = document.getElementById("loading");

  if (!loadingElement) {
    return;
  }

  if (visible) {
    loadingElement.classList.remove("d-none");
    loadingElement.style.setProperty("display", "flex", "important");
  } else {
    loadingElement.classList.add("d-none");
    loadingElement.style.setProperty("display", "none", "important");
  }
}

function busy(isLoading) {
  if (isLoading) {
    activeRequests++;
  } else {
    activeRequests = Math.max(0, activeRequests - 1);
  }

  setLoadingVisible(activeRequests > 0);
}

function resetLoading() {
  activeRequests = 0;
  setLoadingVisible(false);
}

function toast(message) {
  const toastBox = document.getElementById("toastBox");

  if (!toastBox) {
    alert(message);
    return;
  }

  const item = document.createElement("div");
  item.className = "app-toast";
  item.textContent = message;

  toastBox.appendChild(item);

  setTimeout(() => {
    item.remove();
  }, 3500);
}

async function api(action, payload = {}) {
  if (!CFG || !CFG.API_URL || CFG.API_URL.includes("PASTE_")) {
    throw new Error(
      "The Apps Script API URL is missing from config.js."
    );
  }

  const requestData = new URLSearchParams();

  requestData.append(
    "data",
    JSON.stringify({
      action: action,
      token: session?.token || "",
      ...payload
    })
  );

  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 30000);

  busy(true);

  try {
    const response = await fetch(CFG.API_URL, {
      method: "POST",
      body: requestData,
      redirect: "follow",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(
        "Server returned HTTP status " + response.status
      );
    }

    const responseText = await response.text();

    let result;

    try {
      result = JSON.parse(responseText);
    } catch {
      console.error("Invalid API response:", responseText);

      throw new Error(
        "The server returned an invalid response."
      );
    }

    if (!result.ok) {
      throw new Error(
        result.error || "Request failed."
      );
    }

    return result;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        "The request timed out. Please try again."
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
    busy(false);
  }
}
