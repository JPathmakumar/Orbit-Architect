
/* =====================================================
   ORBIT ARCHITECT
   SPACECRAFT WORKSHOP SYSTEM
   NON-LOCALSTORAGE VERSION
===================================================== */

"use strict";

/* ==========================================
   WORKSHOP DATA
========================================== */

const DEFAULT_WORKSHOP = {
    credits: 1000,

    hull: 100,
    fuel: 100,
    engine: 100,
    shield: 100,

    engineLevel: 0,
    shieldLevel: 0,
    fuelLevel: 0
};

// In-memory workshop data only
let workshop = { ...DEFAULT_WORKSHOP };


/* ==========================================
   DISPLAY MESSAGES
========================================== */

function showMessage(message, type = "success") {

    const element = document.getElementById("workshopMessage");

    if (!element) return;

    element.textContent = message;
    element.className = `message ${type}`;
}


/* ==========================================
   SPEND CREDITS
========================================== */

function spendCredits(amount) {

    if (workshop.credits < amount) {

        showMessage("NOT ENOUGH WORKSHOP CREDITS!", "error");

        return false;
    }

    workshop.credits -= amount;

    return true;
}


/* ==========================================
   UPDATE STATUS BARS
========================================== */

function updateBar(name, value) {

    const valueElement = document.getElementById(`${name}Value`);
    const barElement = document.getElementById(`${name}Bar`);

    if (!valueElement || !barElement) return;

    valueElement.textContent = `${Math.round(value)}%`;

    barElement.style.width =
        `${Math.max(0, Math.min(100, value))}%`;
}


/* ==========================================
   CALCULATE READINESS
========================================== */

function calculateReadiness() {

    const average = (
        workshop.hull +
        workshop.fuel +
        workshop.engine +
        workshop.shield
    ) / 4;

    const upgradeBonus = (
        workshop.engineLevel +
        workshop.shieldLevel +
        workshop.fuelLevel
    ) * 2;

    return Math.min(
        100,
        Math.round(average + upgradeBonus)
    );
}


/* ==========================================
   UPDATE WORKSHOP DISPLAY
========================================== */

function updateWorkshop() {

    document.getElementById("creditsValue").textContent =
        workshop.credits;

    updateBar("hull", workshop.hull);
    updateBar("fuel", workshop.fuel);
    updateBar("engine", workshop.engine);
    updateBar("shield", workshop.shield);

    document.getElementById("engineLevel").textContent =
        `LEVEL ${workshop.engineLevel}`;

    document.getElementById("shieldLevel").textContent =
        `LEVEL ${workshop.shieldLevel}`;

    document.getElementById("fuelLevel").textContent =
        `LEVEL ${workshop.fuelLevel}`;

    const readiness = calculateReadiness();

    document.getElementById("readinessValue").textContent =
        `${readiness}%`;

    const description =
        document.getElementById("readinessDescription");

    if (readiness >= 90) {

        description.textContent =
            "Excellent! Your spacecraft is ready for deep-space exploration.";

    } else if (readiness >= 70) {

        description.textContent =
            "Your spacecraft is in good condition. Consider a few upgrades.";

    } else {

        description.textContent =
            "Warning! Your spacecraft needs maintenance before launch.";
    }

    document.getElementById("repairButton").disabled =
        workshop.hull >= 100;

    document.getElementById("refuelButton").disabled =
        workshop.fuel >= 100;

    document.getElementById("buyEngine").disabled =
        workshop.engineLevel >= 3;

    document.getElementById("buyShield").disabled =
        workshop.shieldLevel >= 3;

    document.getElementById("buyFuel").disabled =
        workshop.fuelLevel >= 3;
}


/* ==========================================
   REPAIR HULL
========================================== */

document.getElementById("repairButton").addEventListener("click", () => {

    if (workshop.hull >= 100) {
        showMessage("HULL IS ALREADY AT FULL INTEGRITY.", "error");
        return;
    }

    if (!spendCredits(100)) return;

    workshop.hull = 100;

    updateWorkshop();

    showMessage("HULL REPAIRED TO 100%!");
});


/* ==========================================
   REFILL FUEL
========================================== */

document.getElementById("refuelButton").addEventListener("click", () => {

    if (workshop.fuel >= 100) {
        showMessage("FUEL TANK IS ALREADY FULL.", "error");
        return;
    }

    if (!spendCredits(75)) return;

    workshop.fuel = 100;

    updateWorkshop();

    showMessage("FUEL TANK REFILLED!");
});


/* ==========================================
   ENGINE UPGRADE
========================================== */

document.getElementById("buyEngine").addEventListener("click", () => {

    if (workshop.engineLevel >= 3) return;

    if (!spendCredits(150)) return;

    workshop.engineLevel++;

    workshop.engine = Math.min(
        100,
        workshop.engine + 10
    );

    updateWorkshop();

    showMessage(
        `ENGINE UPGRADED TO LEVEL ${workshop.engineLevel}!`
    );
});


/* ==========================================
   SHIELD UPGRADE
========================================== */

document.getElementById("buyShield").addEventListener("click", () => {

    if (workshop.shieldLevel >= 3) return;

    if (!spendCredits(150)) return;

    workshop.shieldLevel++;

    workshop.shield = Math.min(
        100,
        workshop.shield + 10
    );

    updateWorkshop();

    showMessage(
        `ENERGY SHIELD UPGRADED TO LEVEL ${workshop.shieldLevel}!`
    );
});


/* ==========================================
   FUEL EFFICIENCY UPGRADE
========================================== */

document.getElementById("buyFuel").addEventListener("click", () => {

    if (workshop.fuelLevel >= 3) return;

    if (!spendCredits(125)) return;

    workshop.fuelLevel++;

    updateWorkshop();

    showMessage(
        `FUEL EFFICIENCY UPGRADED TO LEVEL ${workshop.fuelLevel}!`
    );
});


/* ==========================================
   INITIALIZE
========================================== */

updateWorkshop();

console.log("ORBIT ARCHITECT WORKSHOP READY");
