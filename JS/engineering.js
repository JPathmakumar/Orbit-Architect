
/* ==========================================
   ORBIT ARCHITECT
   ENGINEERING SIMULATOR
========================================== */


/* ==========================================
   1. GAME VARIABLES
========================================== */

const challenges = [
    "power",
    "engine",
    "antenna",
    "shield"
];

const completed = new Set();

let xp = 0;
let mistakes = 0;
let currentChallenge = "power";

let engineValue = 0;
let antennaAngle = 0;


/* ==========================================
   2. GET HTML ELEMENTS
========================================== */

const challengeContent = document.getElementById("challengeContent");
const gameMessage = document.getElementById("gameMessage");

const xpValue = document.getElementById("xpValue");
const challengeValue = document.getElementById("challengeValue");
const systemStatus = document.getElementById("systemStatus");

const engineeringLog = document.getElementById("engineeringLog");
const launchButton = document.getElementById("launchButton");


/* ==========================================
   3. LOG SYSTEM
========================================== */

function addLog(message) {

    if (!engineeringLog) return;

    const entry = document.createElement("p");

    entry.textContent = "> " + message;

    engineeringLog.prepend(entry);
}


function showMessage(message, type = "info") {

    if (!gameMessage) return;

    gameMessage.textContent = message;
    gameMessage.className = `game-message ${type}`;
}


/* ==========================================
   4. DASHBOARD
========================================== */

function updateDashboard() {

    xpValue.textContent = xp;

    challengeValue.textContent = `${completed.size}/4`;

    if (completed.size === 4) {

        systemStatus.textContent = "ALL SYSTEMS READY";

        launchButton.disabled = false;

        launchButton.textContent = "AUTHORIZE LAUNCH →";

        document.getElementById("launchTitle").textContent =
            "MISSION READY";

        document.getElementById("launchDescription").textContent =
            "All engineering challenges completed. Your spacecraft is cleared for launch.";

    } else {

        systemStatus.textContent = "SYSTEMS IN PROGRESS";

        launchButton.disabled = true;

        launchButton.textContent = "COMPLETE ALL SYSTEMS";

        document.getElementById("launchTitle").textContent =
            "LAUNCH LOCKED";

        document.getElementById("launchDescription").textContent =
            "Complete all four engineering challenges to authorize launch.";
    }

    challenges.forEach(id => {

        const status = document.getElementById(`${id}Status`);

        if (status) {

            status.textContent = completed.has(id)
                ? "APPROVED"
                : "INCOMPLETE";
        }

    });

}


/* ==========================================
   5. COMPLETE CHALLENGE
========================================== */

function completeChallenge(id) {

    if (completed.has(id)) return;

    completed.add(id);

    const earnedXP = mistakes === 0 ? 150 : 100;

    xp += earnedXP;

    showMessage(
        `SYSTEM APPROVED! +${earnedXP} XP`,
        "success"
    );

    addLog(`${id.toUpperCase()} SYSTEM APPROVED`);

    addLog(`+${earnedXP} XP EARNED`);

    updateDashboard();

    challengeContent.innerHTML = `

        <div class="challenge-intro">

            <div class="challenge-icon">✓</div>

            <h2>SYSTEM APPROVED</h2>

            <p>
                Engineering test successfully completed.
                Your spacecraft system is ready.
            </p>

            <h3>+${earnedXP} XP</h3>

            <button class="game-button" id="nextChallenge">
                NEXT CHALLENGE →
            </button>

        </div>

    `;

    document.getElementById("nextChallenge").addEventListener("click", () => {

        const next = challenges.find(challenge =>
            !completed.has(challenge)
        );

        if (next) {

            loadChallenge(next);

        } else {

            showFinalApproval();

        }

    });

}


/* ==========================================
   6. FINAL APPROVAL
========================================== */

function showFinalApproval() {

    challengeContent.innerHTML = `

        <div class="challenge-intro">

            <div class="challenge-icon">🚀</div>

            <h2>ALL SYSTEMS ONLINE</h2>

            <p>
                Every engineering test has been completed.
                Your spacecraft is ready for its mission to Europa.
            </p>

            <h3>${xp} TOTAL XP</h3>

            <p>LAUNCH AUTHORIZATION GRANTED</p>

        </div>

    `;

    updateDashboard();

    addLog("ALL ENGINEERING SYSTEMS APPROVED");

}


/* ==========================================
   7. POWER CIRCUIT GAME
========================================== */

function renderPowerGame() {

    let nextNumber = 1;

    let connectedPoints = [];

    const numbers = Array.from(
        { length: 9 },
        (_, i) => i + 1
    );

    for (let i = numbers.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1));

        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];

    }

    challengeContent.innerHTML = `

        <div class="challenge-intro">

            <div class="challenge-icon">⚡</div>

            <h2>POWER CIRCUIT</h2>

            <p>
                The spacecraft power grid has disconnected!
                Reconnect the circuit by finding the numbers
                in the correct order.
            </p>

        </div>

        <div class="game-instruction">
            CONNECT: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9
        </div>

        <div class="circuit-board" id="powerBoard">

            <svg
                id="circuitLines"
                viewBox="0 0 300 300"
                preserveAspectRatio="none"
            >

                <polyline
                    id="circuitPath"
                    points=""
                    fill="none"
                    stroke="#42e6a0"
                    stroke-width="5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />

            </svg>

            ${numbers.map((number, index) => `

                <button
                    class="circuit-node"
                    data-number="${number}"
                    data-position="${index}"
                    style="
                        grid-row: ${Math.floor(index / 3) + 1};
                        grid-column: ${(index % 3) + 1};
                    "
                >
                    ${number}
                </button>

            `).join("")}

        </div>

        <h3 id="powerProgress">NEXT NUMBER: 1</h3>

        <p class="game-instruction">
            FIND THE NUMBERS IN ORDER TO RESTORE POWER
        </p>

    `;

    const board = document.getElementById("powerBoard");

    const progress = document.getElementById("powerProgress");

    const path = document.getElementById("circuitPath");


    function getNodePosition(button) {

        const position = Number(button.dataset.position);

        const row = Math.floor(position / 3);

        const column = position % 3;

        return {
            x: column * 100 + 50,
            y: row * 100 + 50
        };

    }


    function updateCircuit() {

        const points = connectedPoints.map(point =>
            `${point.x},${point.y}`
        ).join(" ");

        path.setAttribute("points", points);

    }


    board.querySelectorAll(".circuit-node").forEach(button => {

        button.addEventListener("click", () => {

            const selectedNumber = Number(button.dataset.number);

            if (button.classList.contains("connected")) return;


            if (selectedNumber === nextNumber) {

                button.classList.add("connected");

                button.disabled = true;

                connectedPoints.push(getNodePosition(button));

                updateCircuit();

                nextNumber++;

                if (nextNumber > 9) {

                    progress.textContent = "POWER RESTORED!";

                    showMessage(
                        "ALL CONNECTIONS COMPLETE! POWER RESTORED!",
                        "success"
                    );

                    completeChallenge("power");

                    return;

                }

                progress.textContent =
                    `NEXT NUMBER: ${nextNumber}`;

                showMessage(
                    `CONNECTION ${selectedNumber} COMPLETE!`,
                    "success"
                );

            } else {

                mistakes++;

                showMessage(
                    `WRONG CONNECTION! FIND NUMBER ${nextNumber}.`,
                    "error"
                );

                button.classList.add("wrong");

                setTimeout(() => {
                    button.classList.remove("wrong");
                }, 500);

            }

        });

    });

}


/* ==========================================
   8. ENGINE CALIBRATION GAME
========================================== */

function renderEngineGame() {

    engineValue = 0;

    challengeContent.innerHTML = `

        <div class="challenge-intro">

            <div class="challenge-icon">🚀</div>

            <h2>ENGINE CALIBRATION</h2>

            <p>
                Adjust the spacecraft engine power.
                Reach 72% to calibrate the engine.
            </p>

        </div>

        <h2 class="engine-percentage" id="enginePercentage">
            0%
        </h2>

        <input
            type="range"
            min="0"
            max="100"
            value="0"
            id="engineSlider"
            class="game-slider"
        >

        <p class="game-instruction">
            TARGET: 72% (ALLOWANCE ±3%)
        </p>

        <div class="game-controls">

            <button class="game-button" id="testEngine">
                TEST ENGINE
            </button>

        </div>

    `;

    const slider = document.getElementById("engineSlider");

    const percentage = document.getElementById("enginePercentage");

    slider.addEventListener("input", () => {

        engineValue = Number(slider.value);

        percentage.textContent = `${engineValue}%`;

    });


    document.getElementById("testEngine").addEventListener("click", () => {

        if (engineValue >= 69 && engineValue <= 75) {

            completeChallenge("engine");

        } else {

            mistakes++;

            showMessage(
                "ENGINE CALIBRATION FAILED. ADJUST THE POWER.",
                "error"
            );

        }

    });

}


/* ==========================================
   9. ANTENNA ALIGNMENT GAME
========================================== */

function renderAntennaGame() {

    antennaAngle = 0;

    challengeContent.innerHTML = `

        <div class="challenge-intro">

            <div class="challenge-icon">📡</div>

            <h2>ANTENNA ALIGNMENT</h2>

            <p>
                Align the communication antenna with the target
                signal at exactly 45 degrees.
            </p>

        </div>

        <h2 id="antennaValue">
            0°
        </h2>

        <input
            type="range"
            min="0"
            max="90"
            value="0"
            id="antennaSlider"
            class="game-slider"
        >

        <div class="antenna-visual">

            <div class="antenna-base"></div>

            <div class="antenna-arm" id="antennaArm"></div>

        </div>

        <p class="game-instruction">
            TARGET ANGLE: 45°
        </p>

        <div class="game-controls">

            <button class="game-button" id="testAntenna">
                TEST SIGNAL
            </button>

        </div>

    `;

    const slider = document.getElementById("antennaSlider");

    const value = document.getElementById("antennaValue");

    const arm = document.getElementById("antennaArm");


    slider.addEventListener("input", () => {

        antennaAngle = Number(slider.value);

        value.textContent = `${antennaAngle}°`;

        arm.style.transform = `rotate(${antennaAngle}deg)`;

    });


    document.getElementById("testAntenna").addEventListener("click", () => {

        if (antennaAngle === 45) {

            completeChallenge("antenna");

        } else {

            mistakes++;

            showMessage(
                "SIGNAL NOT ALIGNED. TRY AGAIN.",
                "error"
            );

        }

    });

}


/* ==========================================
   10. RADIATION SHIELD DESIGN
========================================== */

function renderShieldGame() {

    let selectedMaterial = null;

    let shieldThickness = 1;

    let selectedCoverage = null;


    const materials = {

        polyethylene: {
            name: "POLYETHYLENE",
            description: "Hydrogen-rich shielding material",
            icon: "⬜",
            protection: 90,
            massFactor: 0.95
        },

        aluminium: {
            name: "ALUMINIUM",
            description: "Lightweight structural metal",
            icon: "🔩",
            protection: 65,
            massFactor: 2.70
        },

        water: {
            name: "WATER",
            description: "Hydrogen-rich shielding concept",
            icon: "💧",
            protection: 85,
            massFactor: 1.00
        }

    };


    challengeContent.innerHTML = `

        <div class="challenge-intro">

            <div class="challenge-icon">🛡️</div>

            <h2>RADIATION SHIELD DESIGN</h2>

            <p>
                Commander, our spacecraft is preparing for a
                high-radiation environment. Design a protective
                shield for the crew compartment.
            </p>

        </div>


        <div class="shield-scenario">

            <span class="engineering-eyebrow">
                MISSION SCENARIO
            </span>

            <h3>CREW RADIATION PROTECTION</h3>

            <p>
                Select a suitable shielding material, configure
                its thickness and protect the crew compartment.
                Balance protection with spacecraft mass.
            </p>

        </div>


        <h3 class="shield-section-title">
            01 // SELECT SHIELDING MATERIAL
        </h3>


        <div class="shield-materials">

            <button class="shield-material"
                data-material="polyethylene">

                <span class="shield-material-icon">⬜</span>

                <strong>POLYETHYLENE</strong>

                <small>Hydrogen-rich material</small>

            </button>


            <button class="shield-material"
                data-material="aluminium">

                <span class="shield-material-icon">🔩</span>

                <strong>ALUMINIUM</strong>

                <small>Lightweight structural metal</small>

            </button>


            <button class="shield-material"
                data-material="water">

                <span class="shield-material-icon">💧</span>

                <strong>WATER</strong>

                <small>Hydrogen-rich material</small>

            </button>

        </div>


        <h3 class="shield-section-title">
            02 // CONFIGURE SHIELD THICKNESS
        </h3>


        <div class="shield-adjustment">

            <div class="shield-value-row">

                <span>SHIELD THICKNESS</span>

                <strong id="shieldThicknessValue">1 cm</strong>

            </div>

            <input
                type="range"
                min="1"
                max="10"
                value="1"
                id="shieldThicknessSlider"
                class="game-slider"
            >

            <div class="shield-range-labels">

                <span>1 CM</span>

                <span>10 CM</span>

            </div>

        </div>


        <h3 class="shield-section-title">
            03 // PROTECTION ZONE
        </h3>


        <div class="shield-coverage">

            <button class="shield-zone"
                data-zone="crew">

                <span>👨‍🚀</span>

                <strong>CREW COMPARTMENT</strong>

            </button>


            <button class="shield-zone"
                data-zone="engine">

                <span>🚀</span>

                <strong>ENGINE SECTION</strong>

            </button>


            <button class="shield-zone"
                data-zone="storage">

                <span>📦</span>

                <strong>STORAGE SECTION</strong>

            </button>

        </div>


        <h3 class="shield-section-title">
            04 // ENGINEERING ANALYSIS
        </h3>


        <div class="shield-analysis">

            <div class="shield-analysis-card">

                <span>ESTIMATED PROTECTION INDEX</span>

                <strong id="shieldProtection">—</strong>

            </div>


            <div class="shield-analysis-card">

                <span>ESTIMATED ADDED MASS</span>

                <strong id="shieldMass">—</strong>

            </div>

        </div>


        <p class="shield-disclaimer">

            SIMULATED GAMEPLAY ESTIMATES — NOT REAL NASA
            RADIATION PROTECTION OR SPACECRAFT ENGINEERING DATA.

        </p>


        <div class="game-controls">

            <button class="game-button" id="testShield">

                TEST SHIELD DESIGN →

            </button>

        </div>


        <div id="shieldFeedback" class="shield-feedback"></div>

    `;


    const thicknessSlider =
        document.getElementById("shieldThicknessSlider");

    const thicknessValue =
        document.getElementById("shieldThicknessValue");

    const protectionDisplay =
        document.getElementById("shieldProtection");

    const massDisplay =
        document.getElementById("shieldMass");

    const feedback =
        document.getElementById("shieldFeedback");


    /* ======================================
       SHIELD ANALYSIS
    ====================================== */

    function updateShieldAnalysis() {

        thicknessValue.textContent =
            `${shieldThickness} cm`;

        if (!selectedMaterial) {

            protectionDisplay.textContent = "—";

            massDisplay.textContent = "—";

            return;

        }

        const material = materials[selectedMaterial];

        const thicknessFactor = shieldThickness / 5;

        const protection = Math.min(
            99,
            Math.round(material.protection * thicknessFactor)
        );


        // Fictional mass estimate for a 2 m² panel.
        const mass = (
            2 *
            (shieldThickness / 100) *
            material.massFactor *
            1000
        );


        protectionDisplay.textContent =
            `${protection}%`;

        massDisplay.textContent =
            `${Math.round(mass)} kg`;

    }


    /* ======================================
       MATERIAL SELECTION
    ====================================== */

    challengeContent
        .querySelectorAll("[data-material]")
        .forEach(button => {

            button.addEventListener("click", () => {

                selectedMaterial = button.dataset.material;

                challengeContent
                    .querySelectorAll("[data-material]")
                    .forEach(item => {

                        item.classList.toggle(
                            "selected",
                            item === button
                        );

                    });


                feedback.textContent =
                    `${materials[selectedMaterial].name} SELECTED`;

                feedback.className = "shield-feedback";

                updateShieldAnalysis();

            });

        });


    /* ======================================
       THICKNESS ADJUSTMENT
    ====================================== */

    thicknessSlider.addEventListener("input", () => {

        shieldThickness = Number(thicknessSlider.value);

        updateShieldAnalysis();

    });


    /* ======================================
       PROTECTION ZONE SELECTION
    ====================================== */

    challengeContent
        .querySelectorAll("[data-zone]")
        .forEach(button => {

            button.addEventListener("click", () => {

                selectedCoverage = button.dataset.zone;

                challengeContent
                    .querySelectorAll("[data-zone]")
                    .forEach(item => {

                        item.classList.toggle(
                            "selected",
                            item === button
                        );

                    });

            });

        });


    /* ======================================
       TEST SHIELD DESIGN
    ====================================== */

    document
        .getElementById("testShield")
        .addEventListener("click", () => {

            const correctMaterial =
                selectedMaterial === "polyethylene";

            const correctThickness =
                shieldThickness >= 5;

            const correctCoverage =
                selectedCoverage === "crew";


            if (
                correctMaterial &&
                correctThickness &&
                correctCoverage
            ) {

                feedback.textContent =
                    "SHIELD DESIGN APPROVED! CREW PROTECTION CONFIGURATION ACCEPTED.";

                feedback.className =
                    "shield-feedback success";

                showMessage(
                    "RADIATION SHIELDING DESIGN APPROVED!",
                    "success"
                );

                addLog("POLYETHYLENE SHIELD SELECTED");

                addLog(`SHIELD THICKNESS: ${shieldThickness} CM`);

                addLog("CREW COMPARTMENT PROTECTION CONFIGURED");

                completeChallenge("shield");

            } else {

                mistakes++;

                const reasons = [];

                if (!selectedMaterial) {

                    reasons.push(
                        "Select a shielding material."
                    );

                } else if (!correctMaterial) {

                    reasons.push(
                        "Review your shielding material selection."
                    );

                }

                if (!correctThickness) {

                    reasons.push(
                        "Increase shield thickness to at least 5 cm."
                    );

                }

                if (!selectedCoverage) {

                    reasons.push(
                        "Select a protection zone."
                    );

                } else if (!correctCoverage) {

                    reasons.push(
                        "Protect the crew compartment."
                    );

                }


                feedback.textContent = reasons.join(" ");

                feedback.className =
                    "shield-feedback error";

                showMessage(
                    "SHIELD DESIGN REQUIRES IMPROVEMENT.",
                    "error"
                );

            }

        });


    updateShieldAnalysis();

}


/* ==========================================
   11. LOAD CHALLENGE
========================================== */

function loadChallenge(id) {

    if (!challenges.includes(id)) return;

    currentChallenge = id;


    document.querySelectorAll("[data-challenge]").forEach(tab => {

        tab.classList.toggle(
            "active",
            tab.dataset.challenge === id
        );

    });


    const challengeNumber =
        document.getElementById("challengeNumber");

    if (challengeNumber) {

        challengeNumber.textContent =
            `CHALLENGE ${String(challenges.indexOf(id) + 1).padStart(2, "0")} / 04`;

    }


    if (completed.has(id)) {

        challengeContent.innerHTML = `

            <div class="challenge-intro">

                <div class="challenge-icon">✓</div>

                <h2>SYSTEM APPROVED</h2>

                <p>
                    This engineering challenge has already been completed.
                </p>

            </div>

        `;

        showMessage(
            "THIS SYSTEM IS ALREADY APPROVED.",
            "success"
        );

        return;

    }


    showMessage("ENGINEERING SIMULATOR READY.", "info");


    switch (id) {

        case "power":

            renderPowerGame();

            break;


        case "engine":

            renderEngineGame();

            break;


        case "antenna":

            renderAntennaGame();

            break;


        case "shield":

            renderShieldGame();

            break;

    }

}


/* ==========================================
   12. CHALLENGE TAB BUTTONS
========================================== */

document.querySelectorAll("[data-challenge]").forEach(tab => {

    tab.addEventListener("click", () => {

        loadChallenge(tab.dataset.challenge);

    });

});


/* ==========================================
   13. LAUNCH AUTHORIZATION
========================================== */

launchButton.addEventListener("click", () => {

    if (completed.size !== 4) {

        showMessage(
            "COMPLETE ALL ENGINEERING CHALLENGES FIRST.",
            "error"
        );

        return;

    }


    const engineeringData = {

        completed: [...completed],

        xp: xp,

        mistakes: mistakes,

        approved: true

    };


    sessionStorage.setItem(
        "orbitEngineering",
        JSON.stringify(engineeringData)
    );


    addLog("LAUNCH AUTHORIZATION CONFIRMED");

    showMessage(
        "LAUNCH AUTHORIZED! PREPARING SPACECRAFT...",
        "success"
    );


    window.location.href = "mission.html";

});


/* ==========================================
   14. INITIALIZE SIMULATOR
========================================== */

addLog("ENGINEERING SIMULATOR INITIALIZED");

addLog("FOUR SYSTEM TESTS REQUIRED");

addLog("POWER CIRCUIT READY");

addLog("ENGINE CALIBRATION READY");

addLog("ANTENNA ALIGNMENT READY");

addLog("RADIATION SHIELD DESIGN READY");


updateDashboard();

loadChallenge("power");
