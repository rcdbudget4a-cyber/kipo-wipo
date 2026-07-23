const CFG=window.PRO4A_CONFIG;let session=null,records=[],users=[],history=[],currentPage=1,pageSize=12,charts={},recordModal,viewModal,userModal;
const UNITS=["Cavite PPO","Laguna PPO","Rizal PPO","Batangas PPO","Quezon PPO","RHQ"];
const WORKFLOW=["Incident Recorded","Requirements Submitted","For Validation","RHE Processing","NAPOLCOM Processing","PSMBFI Processing","Financial Assistance Released","Completed"];
const CHECKLIST=["Incident Report","Spot Report","Medical Certificate","Death Certificate","Investigation Report","Endorsement","RHE Requirements","NAPOLCOM Requirements","PSMBFI Requirements","Other Supporting Documents"];
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let activeRequests = 0;

function setLoading(visible) {
    const loading = document.getElementById("loading");
    if (!loading) return;

    if (visible) {
        loading.classList.remove("d-none");
        loading.style.display = "flex";
    } else {
        loading.classList.add("d-none");
        loading.style.display = "none";
    }
}

function busy(isLoading) {
    if (isLoading) {
        activeRequests++;
    } else {
        activeRequests = Math.max(0, activeRequests - 1);
    }

    setLoading(activeRequests > 0);
}

function resetLoading() {
    activeRequests = 0;
    setLoading(false);
}

function toast(message) {
    const box = document.getElementById("toastBox");
    const div = document.createElement("div");
    div.className = "app-toast";
    div.textContent = message;
    box.appendChild(div);

    setTimeout(() => div.remove(), 3500);
}

async function api(action, payload = {}) {

    if (!CFG.API_URL || CFG.API_URL.includes("PASTE_")) {
        throw new Error("Please configure API_URL in config.js");
    }

    const data = new URLSearchParams();

    data.append(
        "data",
        JSON.stringify({
            action,
            token: session?.token || "",
            ...payload
        })
    );

    busy(true);

    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, 30000);

    try {

        const response = await fetch(CFG.API_URL, {
            method: "POST",
            body: data,
            redirect: "follow",
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }

        const result = await response.json();

        if (!result.ok) {
            throw new Error(result.error || "Request failed.");
        }

        return result;

    } catch (err) {

        if (err.name === "AbortError") {
            throw new Error("Server timeout.");
        }

        throw err;

    } finally {

        clearTimeout(timeout);

        busy(false);

    }
}

window.addEventListener("load", resetLoading);
window.addEventListener("pageshow", resetLoading);
window.addEventListener("error", resetLoading);
window.addEventListener("unhandledrejection", resetLoading);
