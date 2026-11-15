// JS/spacecraftBuilder.js

import { COMPONENTS } from "./components.js";

import {
    calculateStats,
    canInstall,
    checkEngineeringReadiness
} from "./resourceManager.js";

// ==============================
// GET HTML ELEMENTS
// ==============================

const budgetValue = document.getElementById("budgetValue");
const massValue = document.getElementById("massValue");
const powerValue = document.getElementById("powerValue");
const partsValue = document.getElementById("partsValue");

const installedList = document.getElementById("installedList");
const workshopMessage = document.getElementById("workshopMessage");
const engineeringButton = document.getElementById("engineeringButton");

// ==============================
// LOAD SAVED SPACECRAFT
// ==============================

const savedWorkshop = JSON.parse(
    sessionStorage.getItem("orbitWorkshop") || "null"
);

const installedParts = new Set(
    savedWorkshop?.installed || []
);

// ==============================
// INSTALL COMPONENT
// ==============================

function installComponent(partId) {
    const result = canInstall(partId, installedParts);

    if (!result.allowed) {
        showMessage(result.message);
        return;
    }

    installedParts.add(partId);

    showMessage(`${COMPONENTS[partId].name.toUpperCase()} INSTALLED!`);

    updateWorkshop();
}

// ==============================
// REMOVE COMPONENT
// ==============================

function removeComponent(partId) {
    if (!installedParts.has(partId)) return;

    installedParts.delete(partId);

    showMessage(`${COMPONENTS[partId].name.toUpperCase()} REMOVED.`);

    updateWorkshop();
}

// ==============================
// UPDATE RESOURCE DISPLAY
// ==============================

function updateWorkshop() {
    const stats = calculateStats(installedParts);

    budgetValue.textContent = `$${stats.budget}M`;
    massValue.textContent = `${stats.mass} KG`;
    powerValue.textContent = `${stats.power} W`;
    partsValue.textContent = stats.parts;

    updateInstalledList();
    updateEngineeringButton();
    saveWorkshop();
}

// ==============================
// UPDATE INSTALLED PARTS LIST
// ==============================

function updateInstalledList() {
    installedList.innerHTML = "";

    if (installedParts.size === 0) {
        installedList.innerHTML = `
            <p class="empty-message">
                NO COMPONENTS INSTALLED.
            </p>
        `;
        return;
    }

    installedParts.forEach(partId => {
        const part = COMPONENTS[partId];

        if (!part) return;

        const item = document.createElement("div");

        item.className = "installed-part";

        item.innerHTML = `
            <span>${part.name}</span>

            <button
                class="remove-button"
                data-remove="${partId}"
                type="button"
            >
                REMOVE
            </button>
        `;

        installedList.appendChild(item);
    });
}

// ==============================
// ENGINEERING REVIEW BUTTON
// ==============================

function updateEngineeringButton() {
    const review = checkEngineeringReadiness(installedParts);

    engineeringButton.disabled = !review.ready;

    if (!review.ready) {
        engineeringButton.title = review.problems.join(" ");
    } else {
        engineeringButton.title = "SPACECRAFT READY FOR ENGINEERING REVIEW.";
    }
}

// ==============================
// SAVE WORKSHOP PROGRESS
// ==============================

function saveWorkshop() {
    sessionStorage.setItem(
        "orbitWorkshop",
        JSON.stringify({
            installed: [...installedParts]
        })
    );
}

// ==============================
// WORKSHOP MESSAGE
// ==============================

function showMessage(message) {
    workshopMessage.textContent = message;
}

// ==============================
// INSTALL BUTTON LISTENERS
// ==============================

document.querySelectorAll("[data-component]").forEach(button => {
    button.addEventListener("click", () => {
        const partId = button.dataset.component;

        installComponent(partId);
    });
});

// ==============================
// REMOVE BUTTON LISTENER
// ==============================

installedList.addEventListener("click", event => {
    const button = event.target.closest("[data-remove]");

    if (!button) return;

    removeComponent(button.dataset.remove);
});

// ==============================
// ENGINEERING REVIEW
// ==============================

engineeringButton.addEventListener("click", () => {
    const review = checkEngineeringReadiness(installedParts);

    if (!review.ready) {
        showMessage(review.problems.join(" "));
        return;
    }

    saveWorkshop();

    window.location.href = "engineering.html";
});

// ==============================
// INITIALIZE WORKSHOP
// ==============================

updateWorkshop();

showMessage("SPACECRAFT WORKSHOP ONLINE.");