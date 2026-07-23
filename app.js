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
    loadingElement.style.setProperty(
      "display",
      "flex",
      "important"
    );
  } else {
    loadingElement.classList.add("d-none");
    loadingElement.style.setProperty(
      "display",
      "none",
      "important"
    );
  }
}

function busy(isLoading) {
  if (isLoading) {
    activeRequests++;
  } else {
    activeRequests = Math.max(
      0,
      activeRequests - 1
    );
  }

  setLoadingVisible(activeRequests > 0);
}

function resetLoading() {
  activeRequests = 0;
  setLoadingVisible(false);
}

function toast(message) {
  const toastBox =
    document.getElementById("toastBox");

  if (!toastBox) {
    alert(message);
    return;
  }

  const item =
    document.createElement("div");

  item.className = "app-toast";
  item.textContent = message;

  toastBox.appendChild(item);

  setTimeout(() => {
    item.remove();
  }, 3500);
}

async function api(action, payload = {}) {
  if (
    !CFG ||
    !CFG.API_URL ||
    CFG.API_URL.includes("PASTE_")
  ) {
    throw new Error(
      "The Apps Script API URL is missing from config.js."
    );
  }

  const requestData =
    new URLSearchParams();

  requestData.append(
    "data",
    JSON.stringify({
      action: action,
      token: session?.token || "",
      ...payload
    })
  );

  const controller =
    new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 30000);

  busy(true);

  try {
    const response = await fetch(
      CFG.API_URL,
      {
        method: "POST",
        body: requestData,
        redirect: "follow",
        signal: controller.signal
      }
    );

    if (!response.ok) {
      throw new Error(
        "Server returned HTTP status " +
        response.status
      );
    }

    const responseText =
      await response.text();

    let result;

    try {
      result =
        JSON.parse(responseText);
    } catch (parseError) {
      console.error(
        "Invalid API response:",
        responseText
      );

      throw new Error(
        "The server returned an invalid response."
      );
    }

    if (!result.ok) {
      throw new Error(
        result.error ||
        "Request failed."
      );
    }

    return result;
  } catch (error) {
    if (
      error.name === "AbortError"
    ) {
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

function esc(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]
  );
}

function fmtDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (isNaN(date)) {
    return String(value);
  }

  return date.toLocaleDateString(
    "en-PH",
    {
      year: "numeric",
      month: "short",
      day: "2-digit"
    }
  );
}

function statusChip(status) {
  const className = String(status)
    .toLowerCase()
    .replaceAll(" ", "-");

  return `
    <span class="status-chip status-${className}">
      ${esc(status)}
    </span>
  `;
}

function typeChip(type) {
  return `
    <span class="type-chip type-${String(type).toLowerCase()}">
      ${esc(type)}
    </span>
  `;
}

function checklistObj(value) {
  try {
    if (
      typeof value === "object" &&
      value
    ) {
      return value;
    }

    return JSON.parse(
      value || "{}"
    );
  } catch {
    return {};
  }
}

function workflow(stage) {
  const index = Math.max(
    0,
    WORKFLOW.indexOf(stage)
  );

  return `
    <div class="workflow-track">
      ${WORKFLOW.map((item, i) => `
        <div class="workflow-node ${
          i < index
            ? "done"
            : i === index
            ? "current"
            : ""
        }">
          <div class="workflow-icon">
            ${
              i < index
                ? '<i class="bi bi-check-lg"></i>'
                : i + 1
            }
          </div>
          <span>${item}</span>
        </div>
      `).join("")}
    </div>
  `;
}

$$(".auth-tab").forEach(button => {
  button.onclick = () => {
    $$(".auth-tab").forEach(item => {
      item.classList.remove("active");
    });

    button.classList.add("active");

    $("#loginForm").classList.toggle(
      "d-none",
      button.dataset.tab !== "login"
    );

    $("#signupForm").classList.toggle(
      "d-none",
      button.dataset.tab !== "signup"
    );
  };
});

$$(".toggle-password").forEach(button => {
  button.onclick = () => {
    const input =
      $("#" + button.dataset.target);

    input.type =
      input.type === "password"
        ? "text"
        : "password";

    button.innerHTML = `
      <i class="bi bi-${
        input.type === "password"
          ? "eye"
          : "eye-slash"
      }"></i>
    `;
  };
});

$("#loginForm").onsubmit =
  async event => {
    event.preventDefault();

    try {
      const result = await api(
        "login",
        {
          username:
            $("#loginUsername")
              .value
              .trim(),

          password:
            $("#loginPassword")
              .value
        }
      );

      session = result.session;

      localStorage.setItem(
        "pro4a_session",
        JSON.stringify(session)
      );

      await openApp();
    } catch (error) {
      toast(error.message);
    }
  };

$("#signupForm").onsubmit =
  async event => {
    event.preventDefault();

    try {
      await api(
        "signup",
        {
          name:
            $("#signupName")
              .value
              .trim(),

          unit:
            $("#signupUnit").value,

          username:
            $("#signupUsername")
              .value
              .trim(),

          password:
            $("#signupPassword")
              .value
        }
      );

      event.target.reset();

      toast(
        "Registration submitted for Administrator approval."
      );
    } catch (error) {
      toast(error.message);
    }
  };

$("#logoutBtn").onclick =
  async () => {
    try {
      await api("logout");
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    }

    localStorage.removeItem(
      "pro4a_session"
    );

    location.reload();
  };

$("#menuBtn").onclick = () => {
  $("#sidebar").classList.add("open");
};

$("#closeMenu").onclick = () => {
  $("#sidebar").classList.remove("open");
};

$("#themeBtn").onclick = () => {
  document.body.classList.toggle(
    "dark"
  );

  localStorage.setItem(
    "pro4a_theme",
    document.body.classList.contains(
      "dark"
    )
      ? "dark"
      : "light"
  );

  updateThemeIcon();
};

function updateThemeIcon() {
  $("#themeBtn").innerHTML = `
    <i class="bi bi-${
      document.body.classList.contains(
        "dark"
      )
        ? "sun"
        : "moon-stars"
    }"></i>
  `;
}

$$(".nav-btn").forEach(button => {
  button.onclick = () => {
    showPage(
      button.dataset.page
    );
  };
});

$$("[data-page-jump]").forEach(
  button => {
    button.onclick = () => {
      showPage(
        button.dataset.pageJump
      );
    };
  }
);
function showPage(page) {
  if (
    page === "users" &&
    session.role !== "admin"
  ) {
    return;
  }

  $$(".page").forEach(section => {
    section.classList.remove("active");
  });

  $("#" + page + "Page")
    .classList
    .add("active");

  $$(".nav-btn").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === page
    );
  });

  const titles = {
    dashboard: [
      "Executive Dashboard",
      "Real-time claims overview and accountable actions"
    ],

    records: [
      "KIPO/WIPO Records",
      "Personnel registry, workflow, and documentary monitoring"
    ],

    users: [
      "User Management",
      "Approval, access status, unit assignment, and password reset"
    ],

    history: [
      "Activity History",
      "Accountable actions by authorized users"
    ],

    reports: [
      "Reports",
      "Export and print monitoring summaries"
    ],

    profile: [
      "My Profile",
      "Account information and password management"
    ]
  };

  $("#pageTitle").textContent =
    titles[page][0];

  $("#pageSubtitle").textContent =
    titles[page][1];

  $("#sidebar").classList.remove(
    "open"
  );

  if (page === "dashboard") {
    loadDashboard();
  }

  if (page === "records") {
    loadRecords();
  }

  if (page === "users") {
    loadUsers();
  }

  if (page === "history") {
    loadHistory();
  }
}

async function openApp() {
  try {
    const result = await api(
      "validateSession"
    );

    session = result.session;

    localStorage.setItem(
      "pro4a_session",
      JSON.stringify(session)
    );
  } catch (error) {
    localStorage.removeItem(
      "pro4a_session"
    );

    $("#authView")
      .classList
      .remove("d-none");

    $("#appView")
      .classList
      .add("d-none");

    resetLoading();

    return;
  }

  $("#authView")
    .classList
    .add("d-none");

  $("#appView")
    .classList
    .remove("d-none");

  $("#sideName").textContent =
    session.name;

  $("#sideUnit").textContent =
    session.unit;

  $("#roleBadge").textContent =
    session.role === "admin"
      ? "Administrator"
      : "Unit User";

  $("#welcomeText").textContent =
    `Welcome, ${session.name}`;

  $$(".admin-only").forEach(
    element => {
      element.classList.toggle(
        "d-none",
        session.role !== "admin"
      );
    }
  );

  $("#profileName").value =
    session.name;

  $("#profileUnit").value =
    session.unit;

  recordModal =
    new bootstrap.Modal(
      document.getElementById(
        "recordModal"
      )
    );

  viewModal =
    new bootstrap.Modal(
      document.getElementById(
        "viewModal"
      )
    );

  userModal =
    new bootstrap.Modal(
      document.getElementById(
        "userModal"
      )
    );

  await refreshBadge();

  showPage("dashboard");
}

async function refreshBadge() {
  if (
    session.role !== "admin"
  ) {
    return;
  }

  try {
    const result = await api(
      "pendingUserCount"
    );

    $("#pendingBadge").textContent =
      result.count;

    $("#pendingBadge")
      .classList
      .toggle(
        "d-none",
        !result.count
      );
  } catch (error) {
    console.error(
      "Unable to refresh pending users:",
      error
    );
  }
}

async function loadDashboard() {
  try {
    const result = await api(
      "dashboardV2"
    );

    const metrics =
      result.metrics;

    $("#mTotal").textContent =
      metrics.total;

    $("#mKipo").textContent =
      metrics.kipo;

    $("#mWipo").textContent =
      metrics.wipo;

    $("#mPending").textContent =
      metrics.pending;

    $("#mCompleted").textContent =
      metrics.completed;

    drawChart(
      "unitChart",
      "bar",
      Object.keys(
        result.byUnit
      ),
      Object.values(
        result.byUnit
      ),
      "Claims"
    );

    drawChart(
      "typeChart",
      "doughnut",
      [
        "KIPO",
        "WIPO"
      ],
      [
        metrics.kipo,
        metrics.wipo
      ],
      "Claims"
    );

    drawChart(
      "workflowChart",
      "bar",
      Object.keys(
        result.byWorkflow
      ),
      Object.values(
        result.byWorkflow
      ),
      "Claims",
      {
        indexAxis: "y"
      }
    );

    $("#recentActivity")
      .innerHTML =
      result.recent
        .map(item => `
          <div class="activity-item">
            <div class="activity-dot">
              <i class="bi bi-clock-history"></i>
            </div>

            <div>
              <b>${esc(item.action)}</b>

              <p>
                ${esc(item.details)}
              </p>

              <small>
                ${esc(item.dateTime)}
                •
                ${esc(item.user)}
              </small>
            </div>
          </div>
        `)
        .join("") ||
        `
          <p class="text-secondary">
            No recent activity.
          </p>
        `;
  } catch (error) {
    toast(error.message);
  }
}

function drawChart(
  id,
  type,
  labels,
  data,
  label,
  extraOptions = {}
) {
  if (charts[id]) {
    charts[id].destroy();
  }

  const canvas =
    document.getElementById(id);

  if (!canvas) {
    return;
  }

  charts[id] =
    new Chart(
      canvas,
      {
        type: type,

        data: {
          labels: labels,

          datasets: [
            {
              label: label,
              data: data
            }
          ]
        },

        options: {
          responsive: true,

          maintainAspectRatio: true,

          plugins: {
            legend: {
              display:
                type === "doughnut"
            }
          },

          ...extraOptions
        }
      }
    );
}

async function loadRecords() {
  try {
    const result = await api(
      "listRecords"
    );

    records =
      result.records || [];

    currentPage = 1;

    renderRecords();
  } catch (error) {
    toast(error.message);
  }
}

function filtered() {
  const searchText =
    $("#searchBox")
      .value
      .toLowerCase();

  const selectedType =
    $("#typeFilter").value;

  const selectedYear =
    $("#yearFilter").value;

  const selectedStatus =
    $("#statusFilter").value;

  return records.filter(record => {
    const matchesSearch =
      !searchText ||
      JSON.stringify(record)
        .toLowerCase()
        .includes(searchText);

    const matchesType =
      !selectedType ||
      record.type ===
        selectedType;

    const matchesYear =
      !selectedYear ||
      String(record.year) ===
        selectedYear;

    const matchesStatus =
      !selectedStatus ||
      record.status ===
        selectedStatus;

    return (
      matchesSearch &&
      matchesType &&
      matchesYear &&
      matchesStatus
    );
  });
}

function renderRecords() {
  const allRecords =
    filtered();

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        allRecords.length /
        pageSize
      )
    );

  currentPage =
    Math.min(
      currentPage,
      totalPages
    );

  const startIndex =
    (currentPage - 1) *
    pageSize;

  const pageRecords =
    allRecords.slice(
      startIndex,
      startIndex + pageSize
    );

  $("#recordCount").textContent =
    `${allRecords.length} record${
      allRecords.length === 1
        ? ""
        : "s"
    }`;

  $("#recordsBody").innerHTML =
    pageRecords
      .map(record => `
        <tr>
          <td>
            <span class="claim-id">
              ${esc(record.claimId)}
            </span>

            <br>

            <small>
              ${esc(record.year)}
            </small>
          </td>

          <td>
            ${typeChip(record.type)}
          </td>

          <td>
            <strong>
              ${esc(record.rankName)}
            </strong>

            <br>

            <small>
              ${esc(
                record.badgeNumber ||
                ""
              )}
            </small>
          </td>

          <td>
            ${esc(record.unit)}

            <br>

            <small>
              ${esc(
                record.office ||
                ""
              )}
            </small>
          </td>

          <td>
            <span class="stage-chip">
              ${esc(
                record.workflowStage ||
                "Incident Recorded"
              )}
            </span>
          </td>

          <td>
            ${statusChip(
              record.status
            )}
          </td>

          <td>
            <div class="action-row">
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary"
                onclick="viewRecord('${record.id}')"
                title="View"
              >
                <i class="bi bi-eye"></i>
              </button>

              <button
                type="button"
                class="btn btn-sm btn-outline-primary"
                onclick="editRecord('${record.id}')"
                title="Edit"
              >
                <i class="bi bi-pencil"></i>
              </button>

              ${
                session.role ===
                "admin"
                  ? `
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-danger"
                      onclick="deleteRecord('${record.id}')"
                      title="Delete"
                    >
                      <i class="bi bi-trash"></i>
                    </button>
                  `
                  : ""
              }
            </div>
          </td>
        </tr>
      `)
      .join("") ||
      `
        <tr>
          <td
            colspan="7"
            class="text-center py-5 text-secondary"
          >
            No records found.
          </td>
        </tr>
      `;

  $("#pageInfo").textContent =
    `Page ${currentPage} of ${totalPages}`;

  $("#prevPage").disabled =
    currentPage <= 1;

  $("#nextPage").disabled =
    currentPage >= totalPages;
}

[
  "searchBox",
  "typeFilter",
  "yearFilter",
  "statusFilter"
].forEach(id => {
  const element =
    $("#" + id);

  element.addEventListener(
    id === "searchBox"
      ? "input"
      : "change",

    () => {
      currentPage = 1;
      renderRecords();
    }
  );
});

$("#prevPage").onclick = () => {
  if (currentPage > 1) {
    currentPage--;
    renderRecords();
  }
};

$("#nextPage").onclick = () => {
  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filtered().length /
        pageSize
      )
    );

  if (
    currentPage <
    totalPages
  ) {
    currentPage++;
    renderRecords();
  }
};

$("#refreshBtn").onclick =
  loadRecords;

$("#addBtn").onclick = () => {
  openRecord();
};

window.editRecord = id => {
  const record =
    records.find(
      item =>
        item.id === id
    );

  if (!record) {
    toast(
      "Record not found."
    );

    return;
  }

  openRecord(record);
};

function setWorkflowOptions(
  selected
) {
  $("#workflowStage")
    .innerHTML =
    WORKFLOW
      .map(item => `
        <option
          value="${esc(item)}"
          ${
            item === selected
              ? "selected"
              : ""
          }
        >
          ${esc(item)}
        </option>
      `)
      .join("");

  $("#workflowPreview")
    .innerHTML =
    workflow(selected);
}

$("#workflowStage").onchange =
  () => {
    $("#workflowPreview")
      .innerHTML =
      workflow(
        $("#workflowStage")
          .value
      );
  };

function renderChecklist(
  data = {}
) {
  $("#checklistForm")
    .innerHTML =
    CHECKLIST
      .map(documentName => `
        <label class="check-item">
          <input
            class="form-check-input me-2 checklist-box"
            type="checkbox"
            data-doc="${esc(documentName)}"
            ${
              data[documentName]
                ? "checked"
                : ""
            }
          >

          <strong>
            ${esc(documentName)}
          </strong>
        </label>
      `)
      .join("");
}
function openRecord(record = null) {
  $("#recordModalTitle").textContent =
    record
      ? "Edit Personnel Claim"
      : "Add KIPO/WIPO Personnel";

  $("#recordId").value =
    record?.id || "";

  $("#recordType").value =
    record?.type || "KIPO";

  $("#recordYear").value =
    record?.year || 2026;

  $("#recordStatus").value =
    record?.status || "Pending";

  $("#recordBadge").value =
    record?.badgeNumber || "";

  $("#recordName").value =
    record?.rankName || "";

  $("#recordUnit").value =
    record?.unit || session.unit;

  $("#recordOffice").value =
    record?.office || "";

  $("#recordProvince").value =
    record?.province || "";

  $("#recordDate").value =
    /^\d{4}-\d{2}-\d{2}$/.test(
      record?.dateIncident || ""
    )
      ? record.dateIncident
      : "";

  $("#recordInjury").value =
    record?.injury || "";

  $("#recordBenefits").value =
    record?.benefits || "";

  $("#recordRemarks").value =
    record?.remarks || "";

  $("#recordUnit").disabled =
    session.role !== "admin";

  setWorkflowOptions(
    record?.workflowStage ||
    "Incident Recorded"
  );

  renderChecklist(
    checklistObj(
      record?.checklistJson
    )
  );

  recordModal.show();
}

$("#recordForm").onsubmit =
  async event => {
    event.preventDefault();

    const checklist = {};

    $$(".checklist-box").forEach(
      checkbox => {
        checklist[
          checkbox.dataset.doc
        ] = checkbox.checked;
      }
    );

    const record = {
      id:
        $("#recordId").value,

      type:
        $("#recordType").value,

      year:
        $("#recordYear").value,

      status:
        $("#recordStatus").value,

      badgeNumber:
        $("#recordBadge")
          .value
          .trim(),

      rankName:
        $("#recordName")
          .value
          .trim(),

      unit:
        session.role === "admin"
          ? $("#recordUnit").value
          : session.unit,

      office:
        $("#recordOffice")
          .value
          .trim(),

      province:
        $("#recordProvince")
          .value
          .trim(),

      dateIncident:
        $("#recordDate").value,

      injury:
        $("#recordInjury")
          .value
          .trim(),

      workflowStage:
        $("#workflowStage").value,

      checklistJson:
        JSON.stringify(
          checklist
        ),

      benefits:
        $("#recordBenefits")
          .value
          .trim(),

      remarks:
        $("#recordRemarks")
          .value
          .trim()
    };

    try {
      await api(
        record.id
          ? "updateRecordV2"
          : "addRecordV2",
        {
          record: record
        }
      );

      recordModal.hide();

      toast(
        record.id
          ? "Record updated successfully."
          : "New claim record created."
      );

      await loadRecords();
    } catch (error) {
      toast(error.message);
    }
  };

window.deleteRecord =
  async id => {
    const record =
      records.find(
        item =>
          item.id === id
      );

    if (!record) {
      toast(
        "Record not found."
      );

      return;
    }

    const confirmed =
      confirm(
        `Delete ${record.claimId} — ${record.rankName}? This action will be recorded in the audit history.`
      );

    if (!confirmed) {
      return;
    }

    try {
      await api(
        "deleteRecord",
        {
          id: id
        }
      );

      toast(
        "Record deleted."
      );

      await loadRecords();
    } catch (error) {
      toast(error.message);
    }
  };

window.viewRecord = id => {
  const record =
    records.find(
      item =>
        item.id === id
    );

  if (!record) {
    toast(
      "Record not found."
    );

    return;
  }

  const checklist =
    checklistObj(
      record.checklistJson
    );

  $("#viewTitle").textContent =
    record.rankName;

  $("#viewClaim").textContent =
    `${record.claimId} • ${record.type} • CY ${record.year}`;

  $("#viewBody").innerHTML = `
    <div class="detail-grid">

      <div class="detail-box">
        <label>Unit</label>
        <strong>
          ${esc(record.unit)}
        </strong>
      </div>

      <div class="detail-box">
        <label>Office</label>
        <strong>
          ${esc(
            record.office ||
            "—"
          )}
        </strong>
      </div>

      <div class="detail-box">
        <label>Badge Number</label>
        <strong>
          ${esc(
            record.badgeNumber ||
            "—"
          )}
        </strong>
      </div>

      <div class="detail-box">
        <label>Date of Incident</label>
        <strong>
          ${esc(
            fmtDate(
              record.dateIncident
            )
          )}
        </strong>
      </div>

      <div class="detail-box">
        <label>Status</label>
        ${statusChip(
          record.status
        )}
      </div>

      <div class="detail-box">
        <label>Workflow</label>
        <strong>
          ${esc(
            record.workflowStage ||
            "Incident Recorded"
          )}
        </strong>
      </div>

      <div class="detail-box detail-full">
        <label>
          Nature of Injury / Case
        </label>

        <strong>
          ${esc(
            record.injury ||
            "—"
          )}
        </strong>
      </div>

      <div class="detail-box detail-full">
        <label>
          Benefits / Assistance
        </label>

        <strong>
          ${esc(
            record.benefits ||
            "—"
          )}
        </strong>
      </div>

      <div class="detail-box detail-full">
        <label>Remarks</label>

        <strong>
          ${esc(
            record.remarks ||
            "—"
          )}
        </strong>
      </div>
    </div>

    <h6 class="mt-4">
      Claim Workflow
    </h6>

    ${
      workflow(
        record.workflowStage ||
        "Incident Recorded"
      )
    }

    <h6 class="mt-4">
      Document Checklist
    </h6>

    <div class="checklist-grid">
      ${
        CHECKLIST
          .map(documentName => `
            <div class="check-item">
              <i class="bi bi-${
                checklist[documentName]
                  ? "check-circle-fill text-success"
                  : "circle text-secondary"
              } me-2"></i>

              ${esc(documentName)}
            </div>
          `)
          .join("")
      }
    </div>
  `;

  viewModal.show();
};

async function loadUsers() {
  try {
    const result = await api(
      "listUsersV2"
    );

    users =
      result.users || [];

    $("#usersBody").innerHTML =
      users
        .map(user => `
          <tr>
            <td>
              <strong>
                ${esc(user.name)}
              </strong>
            </td>

            <td>
              ${esc(user.username)}
            </td>

            <td>
              ${esc(user.unit)}
            </td>

            <td>
              ${statusChip(
                user.status
              )}
            </td>

            <td>
              ${esc(
                fmtDate(
                  user.createdAt
                )
              )}
            </td>

            <td>
              <div class="action-row">
                ${
                  user.status ===
                  "Pending"
                    ? `
                      <button
                        type="button"
                        class="btn btn-sm btn-success"
                        onclick="setUser('${user.id}','Approved')"
                      >
                        Approve
                      </button>

                      <button
                        type="button"
                        class="btn btn-sm btn-danger"
                        onclick="setUser('${user.id}','Rejected')"
                      >
                        Reject
                      </button>
                    `
                    : `
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-warning"
                        onclick="setUser('${user.id}','${
                          user.status ===
                          "Approved"
                            ? "Disabled"
                            : "Approved"
                        }')"
                      >
                        ${
                          user.status ===
                          "Approved"
                            ? "Disable"
                            : "Enable"
                        }
                      </button>
                    `
                }

                <button
                  type="button"
                  class="btn btn-sm btn-outline-primary"
                  onclick="manageUser('${user.id}')"
                  title="Manage User"
                >
                  <i class="bi bi-gear"></i>
                </button>
              </div>
            </td>
          </tr>
        `)
        .join("") ||
        `
          <tr>
            <td colspan="6">
              No users.
            </td>
          </tr>
        `;
  } catch (error) {
    toast(error.message);
  }
}

window.setUser =
  async (
    id,
    status
  ) => {
    try {
      await api(
        "setUserStatus",
        {
          id: id,
          status: status
        }
      );

      toast(
        `User ${status.toLowerCase()}.`
      );

      await loadUsers();
      await refreshBadge();
    } catch (error) {
      toast(error.message);
    }
  };

window.manageUser = id => {
  const user =
    users.find(
      item =>
        item.id === id
    );

  if (!user) {
    toast(
      "User not found."
    );

    return;
  }

  $("#userId").value =
    user.id;

  $("#manageUserName").value =
    user.name;

  $("#manageUserUnit").value =
    user.unit;

  $("#tempPassword").value =
    "";

  userModal.show();
};

$("#userForm").onsubmit =
  async event => {
    event.preventDefault();

    try {
      await api(
        "updateUserAdmin",
        {
          id:
            $("#userId").value,

          name:
            $("#manageUserName")
              .value
              .trim(),

          unit:
            $("#manageUserUnit")
              .value,

          tempPassword:
            $("#tempPassword")
              .value
        }
      );

      userModal.hide();

      toast(
        "User account updated."
      );

      await loadUsers();
    } catch (error) {
      toast(error.message);
    }
  };

async function loadHistory() {
  try {
    const result = await api(
      "history"
    );

    history =
      result.history || [];

    $("#historyBody").innerHTML =
      history
        .map(item => `
          <tr>
            <td>
              ${esc(item.dateTime)}
            </td>

            <td>
              <strong>
                ${esc(item.user)}
              </strong>
            </td>

            <td>
              ${esc(item.unit)}
            </td>

            <td>
              <span class="stage-chip">
                ${esc(item.action)}
              </span>
            </td>

            <td>
              ${esc(item.details)}
            </td>
          </tr>
        `)
        .join("") ||
        `
          <tr>
            <td colspan="5">
              No activity.
            </td>
          </tr>
        `;
  } catch (error) {
    toast(error.message);
  }
}

$("#profileForm").onsubmit =
  async event => {
    event.preventDefault();

    try {
      const result = await api(
        "updateProfile",
        {
          name:
            $("#profileName")
              .value
              .trim(),

          currentPassword:
            $("#currentPassword")
              .value,

          newPassword:
            $("#newPassword")
              .value
        }
      );

      session =
        result.session;

      localStorage.setItem(
        "pro4a_session",
        JSON.stringify(session)
      );

      $("#sideName").textContent =
        session.name;

      $("#currentPassword").value =
        "";

      $("#newPassword").value =
        "";

      toast(
        "Profile updated."
      );
    } catch (error) {
      toast(error.message);
    }
  };
function downloadCsv(
  fileName,
  rows
) {
  if (!rows.length) {
    toast(
      "No records to export."
    );

    return;
  }

  const keys =
    Object.keys(rows[0]);

  const csvRows = [
    keys.join(","),

    ...rows.map(row =>
      keys
        .map(key => {
          const value =
            String(
              row[key] ?? ""
            ).replaceAll(
              '"',
              '""'
            );

          return `"${value}"`;
        })
        .join(",")
    )
  ];

  const csv =
    csvRows.join("\n");

  const blob =
    new Blob(
      [
        "\ufeff" + csv
      ],
      {
        type:
          "text/csv;charset=utf-8;"
      }
    );

  const downloadUrl =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href =
    downloadUrl;

  link.download =
    fileName;

  document.body.appendChild(
    link
  );

  link.click();

  link.remove();

  URL.revokeObjectURL(
    downloadUrl
  );
}

$("#exportCsvBtn").onclick =
  () => {
    const exportRows =
      filtered().map(
        record => ({
          ClaimID:
            record.claimId,

          Type:
            record.type,

          Year:
            record.year,

          RankName:
            record.rankName,

          BadgeNumber:
            record.badgeNumber,

          Unit:
            record.unit,

          Office:
            record.office,

          Province:
            record.province,

          DateIncident:
            record.dateIncident,

          Workflow:
            record.workflowStage,

          Status:
            record.status,

          InjuryCase:
            record.injury,

          Benefits:
            record.benefits,

          Remarks:
            record.remarks
        })
      );

    downloadCsv(
      "PRO4A_KIPO_WIPO_Registry.csv",
      exportRows
    );
  };

$$(".report-btn").forEach(
  button => {
    button.onclick = () => {
      const reportType =
        button.dataset.report;

      if (
        reportType === "unit"
      ) {
        const totals = {};

        records.forEach(
          record => {
            totals[
              record.unit
            ] =
              (
                totals[
                  record.unit
                ] || 0
              ) + 1;
          }
        );

        const reportRows =
          Object.entries(
            totals
          ).map(
            (
              [
                Unit,
                Claims
              ]
            ) => ({
              Unit,
              Claims
            })
          );

        downloadCsv(
          "Claims_By_Unit.csv",
          reportRows
        );

        return;
      }

      if (
        reportType === "year"
      ) {
        const totals = {};

        records.forEach(
          record => {
            totals[
              record.year
            ] =
              (
                totals[
                  record.year
                ] || 0
              ) + 1;
          }
        );

        const reportRows =
          Object.entries(
            totals
          ).map(
            (
              [
                Year,
                Claims
              ]
            ) => ({
              Year,
              Claims
            })
          );

        downloadCsv(
          "Claims_By_Year.csv",
          reportRows
        );

        return;
      }

      const totals = {};

      records.forEach(
        record => {
          const stage =
            record.workflowStage ||
            "Incident Recorded";

          totals[stage] =
            (
              totals[stage] ||
              0
            ) + 1;
        }
      );

      const reportRows =
        Object.entries(
          totals
        ).map(
          (
            [
              Workflow,
              Claims
            ]
          ) => ({
            Workflow,
            Claims
          })
        );

      downloadCsv(
        "Claims_By_Workflow.csv",
        reportRows
      );
    };
  }
);

$("#printBtn").onclick =
  () => {
    showPage("records");

    setTimeout(
      () => {
        window.print();
      },
      300
    );
  };

async function initializeApp() {
  resetLoading();

  if (
    localStorage.getItem(
      "pro4a_theme"
    ) === "dark"
  ) {
    document.body.classList.add(
      "dark"
    );
  }

  updateThemeIcon();

  const storedSession =
    localStorage.getItem(
      "pro4a_session"
    );

  if (!storedSession) {
    $("#authView")
      .classList
      .remove("d-none");

    $("#appView")
      .classList
      .add("d-none");

    resetLoading();

    return;
  }

  try {
    session =
      JSON.parse(
        storedSession
      );

    await openApp();
  } catch (error) {
    console.error(
      "Initialization error:",
      error
    );

    localStorage.removeItem(
      "pro4a_session"
    );

    $("#authView")
      .classList
      .remove("d-none");

    $("#appView")
      .classList
      .add("d-none");

    resetLoading();
  }
}

resetLoading();

window.addEventListener(
  "DOMContentLoaded",
  () => {
    resetLoading();
  }
);

window.addEventListener(
  "load",
  () => {
    resetLoading();
  }
);

window.addEventListener(
  "pageshow",
  () => {
    resetLoading();
  }
);

window.addEventListener(
  "unhandledrejection",
  event => {
    console.error(
      "Unhandled promise rejection:",
      event.reason
    );

    resetLoading();
  }
);

window.addEventListener(
  "error",
  event => {
    console.error(
      "JavaScript error:",
      event.error ||
      event.message
    );

    resetLoading();
  }
);

initializeApp();
