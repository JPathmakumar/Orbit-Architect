/* =====================================================
   ORBIT ARCHITECT - COMPLETE MISSION ENGINE
   Mercury / Venus / Earth / Mars challenges
   Europa landing + surface exploration
   Asteroid storm + exit
   Workshop upgrades + saved spacecraft condition
   NASA scientist dialogue (Dr. Amara Okafor)
===================================================== */
"use strict";

/* 1. HTML ELEMENTS */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas?.getContext("2d");
if (!canvas || !ctx) throw new Error("Orbit Architect: gameCanvas was not found.");

const $ = id => document.getElementById(id);

const startButton = $("startMission");
const gameOverlay = $("gameOverlay");
const cameraButton = $("cameraButton");
const cameraModeLabel = $("cameraMode");
const fuelValue = $("fuelValue"), powerValue = $("powerValue");
const hullValue = $("hullValue"), distanceValue = $("distanceValue");
const fuelBar = $("fuelBar"), powerBar = $("powerBar"), hullBar = $("hullBar");
const objectiveText = $("objectiveText"), gameStatus = $("gameStatus");
const hullPanel = $("hullPanel");
const overlayTitle = $("overlayTitle"), overlayDescription = $("overlayDescription");

const WIDTH = 1000, HEIGHT = 600;
canvas.width = WIDTH;
canvas.height = HEIGHT;

/* 2. WORKSHOP DATA */
const WORKSHOP_KEY = "orbitWorkshopData";

const DEFAULT_WORKSHOP = {
    credits: 500,
    hull: 100,
    fuel: 100,
    engine: 100,
    shield: 100,
    engineLevel: 0,
    shieldLevel: 0,
    fuelLevel: 0
};

let workshop = { ...DEFAULT_WORKSHOP };

try {
    const savedWorkshop = localStorage.getItem(WORKSHOP_KEY);
    if (savedWorkshop) {
        workshop = {
            ...DEFAULT_WORKSHOP,
            ...JSON.parse(savedWorkshop)
        };
    }
} catch (error) {
    console.warn("Could not load workshop data.", error);
}

const engineLevel = Math.max(0, Math.min(3, Number(workshop.engineLevel) || 0));
const shieldLevel = Math.max(0, Math.min(3, Number(workshop.shieldLevel) || 0));
const fuelLevel = Math.max(0, Math.min(3, Number(workshop.fuelLevel) || 0));

/* 2.1 SPACECRAFT DESIGN INTEGRATION */

const DEFAULT_DESIGN_MODIFIERS = {
    speedMult: 1,
    fuelDrainMult: 1,
    damageMult: 1,
    radarRange: 1,
    powerDrain: 1,
    solar: false,
    nuclear: false
};

let designModifiers = { ...DEFAULT_DESIGN_MODIFIERS };

try {
    if (window.OrbitDesign?.getModifiers) {
        designModifiers = {
            ...DEFAULT_DESIGN_MODIFIERS,
            ...window.OrbitDesign.getModifiers()
        };
    }
} catch (error) {
    console.warn("Could not load spacecraft design.", error);
}

const upgrades = {
    engine: engineLevel > 0,
    shield: shieldLevel > 0,
    fuel: fuelLevel > 0,
    solar: Boolean(designModifiers.solar),
    rtg: Boolean(designModifiers.nuclear)
};

/* 3. CONFIG + WORLD */
const CONFIG = {
    maxFrameTime: 50,
    shipScreenX: 250,
    shipMinX: 100,
    shipMaxX: 900,
    acceleration: 0.0038,
    braking: 0.006,
    friction: 0.00018,
    normalMaxSpeed: (7 + engineLevel * 0.75) * designModifiers.speedMult,
    boostMaxSpeed: (10 + engineLevel) * designModifiers.speedMult,
    steeringSpeed: 0.32,
    asteroidLimit: 7,
    asteroidSpawnTime: 1250,
    stormDelay: 15000,
    invincibilityTime: 1200
};

const planets = [
    { name: "MERCURY", x: 900, color: "#b6a18a", radius: 35 },
    { name: "VENUS", x: 2200, color: "#e5a64e", radius: 48 },
    { name: "EARTH", x: 3700, color: "#2699e8", radius: 58 },
    { name: "MARS", x: 5300, color: "#d65c39", radius: 43 },
    { name: "JUPITER", x: 6900, color: "#d9a77c", radius: 100 }
];

const EXIT_X = 9000;

const stars = Array.from({ length: 220 }, () => ({
    x: Math.random() * 11000,
    y: Math.random() * HEIGHT,
    size: Math.random() > .85 ? 3 : 1,
    alpha: .3 + Math.random() * .7
}));

/* 4. STATE */
let cameraMode = "second";
let running = false, lastTime = 0, cameraX = 0;

let stormStarted = false, stormWait = 0, asteroidTimer = 0;
let damageFlash = 0, screenShake = 0, invincibility = 0;
let gameFinished = false;

let landingActive = false, landingComplete = false, landingStartTime = 0;

let miniGameActive = false, miniGameComplete = false, miniGameFailed = false;
let miniGameLastTime = 0, miniGameElapsed = 0;
let miniGameMessage = "", miniGameMessageTimer = 0;
let returnHold = 0;
let europaAttempted = false;

let challengeIndex = 0, activeChallenge = null, challengeResult = "";
let challengeLastTime = 0, challengeElapsed = 0;

let fuelHits = 0, fuelCells = [];
let circuitCells = [], circuitClicks = 0;
let shieldSequence = [], shieldStep = 0;
let radarTargets = [], radarFound = 0;

let samplesCollected = 0;

const ship = {
    x: CONFIG.shipScreenX,
    y: 300,
    speed: 0,
    fuel: Math.max(0, Math.min(100, Number(workshop.fuel ?? 100))),
    power: 100,
    hull: Math.max(0, Math.min(100, Number(workshop.hull ?? 100))),
    distance: 0
};

/* 5. SCORE CALCULATION */
function calculateTotalMissionScore(stats) {
    const challengeScore = Math.max(0, Number(stats.challengesCompleted) || 0) * 100;
    const europaScore = Math.max(0, Number(stats.samplesCollected) || 0) * 30;
    const fuelScore = Math.max(0, Math.min(100, Number(stats.fuelRemaining) || 0));
    const hullScore = Math.max(0, Math.min(100, Number(stats.hull) || 0));
    const completionScore = stats.missionComplete ? 150 : 0;
    const stormScore = stats.survivedStorm ? 100 : 0;

    return Math.min(
        1000,
        Math.round(
            challengeScore +
            europaScore +
            fuelScore +
            hullScore +
            completionScore +
            stormScore
        )
    );
}

const asteroids = [];
const keys = {};

let commandBuffer = "";
let commandTimer = null;

const secretCommands = {
    ZZMERCURY: 900,
    ZZVENUS: 2200,
    ZZEARTH: 3700,
    ZZMARS: 5300,
    ZZJUPITER: 6900,
    ZZSTORM: 7300,
    ZZEXIT: 9000
};

/* 6. SAVE WORKSHOP CONDITION */
function saveWorkshopCondition() {
    try {
        const current = JSON.parse(
            localStorage.getItem(WORKSHOP_KEY) || "{}"
        );

        const updated = {
            ...DEFAULT_WORKSHOP,
            ...workshop,
            ...current,
            hull: Math.max(0, Math.min(100, ship.hull)),
            fuel: Math.max(0, Math.min(100, ship.fuel))
        };

        localStorage.setItem(WORKSHOP_KEY, JSON.stringify(updated));
        workshop = updated;
    } catch (error) {
        console.warn("Could not save spacecraft condition.", error);
    }
}

/* 7. CAMERA + INPUT */
function switchCamera() {
    cameraMode = cameraMode === "second" ? "first" : "second";

    if (cameraModeLabel) {
        cameraModeLabel.textContent =
            cameraMode === "first" ? "FIRST PERSON" : "SECOND PERSON";
    }

    drawGame();
}

cameraButton?.addEventListener("click", switchCamera);

function processSecretCommand(key) {
    if (!/^[a-z]$/i.test(key)) return;

    commandBuffer = (commandBuffer + key.toUpperCase()).slice(-12);

    for (const [command, destination] of Object.entries(secretCommands)) {
        if (!commandBuffer.endsWith(command)) continue;

        if (!running || landingActive || miniGameActive || activeChallenge !== null) {
            return;
        }

        cameraX = destination;
        ship.speed = 0;
        ship.fuel = Math.max(ship.fuel, 40);

        if (destination >= 7300) {
            stormStarted = true;
            stormWait = CONFIG.stormDelay;
            if (hullPanel) hullPanel.style.display = "block";
        }

        asteroids.length = 0;
        invincibility = 1500;
        commandBuffer = "";

        if (objectiveText) {
            objectiveText.textContent = "NAVIGATION SYSTEM: LOCATION UPDATED";
        }

        break;
    }

    clearTimeout(commandTimer);
    commandTimer = setTimeout(() => commandBuffer = "", 2500);
}

window.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();

    if ([
        "w", "a", "s", "d", " ", "shift",
        "arrowup", "arrowdown", "arrowleft",
        "arrowright", "e", "enter"
    ].includes(key)) {
        event.preventDefault();
    }

    // M toggles the typing sound on/off.
    if (key === "m" && !event.repeat) {
        soundOn = !soundOn;
        return;
    }

    // Scientist dialogue captures input while it is on screen.
    if (dialogueActive) {
        if ([" ", "enter", "e"].includes(key) && !event.repeat) advanceDialogue();
        return;
    }

    if (key === "c" && !event.repeat &&
        !miniGameActive && activeChallenge === null) {
        switchCamera();
        return;
    }

    if (!event.repeat) processSecretCommand(key);

    if (activeChallenge !== null && !event.repeat) {
        handleChallengeKey(key);
    }

    if (miniGameActive && key === "e" && !event.repeat) {
        collectNearbySample();
    }

    keys[key] = true;
});

window.addEventListener("keyup", event => {
    keys[event.key.toLowerCase()] = false;
});

window.addEventListener("blur", () => {
    Object.keys(keys).forEach(key => keys[key] = false);
});

/* 8. RESET */
function resetGame() {
    window.orbitScore = 0;
    console.log("ORBIT SCORE RESET: 0/1000");

    try {
        if (window.OrbitScoring?.reset) {
            window.OrbitScoring.reset();
        }
    } catch (error) {
        console.warn("Could not reset scoring system.", error);
    }

    running = false;
    cameraX = 0;

    Object.assign(ship, {
        x: CONFIG.shipScreenX,
        y: 300,
        speed: 0,
        fuel: Math.max(0, Math.min(100, Number(workshop.fuel ?? 100))),
        power: 100,
        hull: Math.max(0, Math.min(100, Number(workshop.hull ?? 100))),
        distance: 0
    });

    asteroids.length = 0;

    stormStarted = false;
    stormWait = 0;
    asteroidTimer = 0;
    damageFlash = 0;
    screenShake = 0;
    invincibility = 0;
    gameFinished = false;

    landingActive = false;
    landingComplete = false;
    landingStartTime = 0;

    miniGameActive = false;
    miniGameComplete = false;
    miniGameFailed = false;
    miniGameLastTime = 0;
    miniGameElapsed = 0;
    miniGameMessage = "";
    miniGameMessageTimer = 0;
    returnHold = 0;
    europaAttempted = false;

    challengeIndex = 0;
    activeChallenge = null;
    challengeResult = "";
    challengeElapsed = 0;
    challengeLastTime = 0;

    fuelHits = 0;
    fuelCells = [];
    circuitClicks = 0;
    shieldStep = 0;
    radarFound = 0;
    samplesCollected = 0;

    dialogueActive = false;
    dialogueDone = null;

    Object.keys(keys).forEach(key => keys[key] = false);

    if (hullPanel) hullPanel.style.display = "none";

    if (objectiveText) {
        objectiveText.textContent = "Launch your spacecraft and begin your journey.";
    }

    if (cameraModeLabel) {
        cameraModeLabel.textContent =
            cameraMode === "first" ? "FIRST PERSON" : "SECOND PERSON";
    }

    if (overlayTitle) overlayTitle.textContent = "";
    if (overlayDescription) overlayDescription.textContent = "";

    updateDashboard();
    drawGame();
}

/* 9. PHYSICS */
function updatePhysics(dt) {
    const step = dt / 16.67;

    const accelerating = keys.w && ship.fuel > 0;
    const boosting = keys.shift && ship.fuel > 0;

    const maxSpeed = boosting
        ? CONFIG.boostMaxSpeed
        : CONFIG.normalMaxSpeed;

    const fuelMultiplier =
    Math.max(0.55, 1 - fuelLevel * 0.12) *
    designModifiers.fuelDrainMult;

    // Normal acceleration or boost. Never charge both.
    if (boosting) {
        ship.speed += 0.004 * dt;
        ship.fuel -= 0.025 * step * fuelMultiplier;
        ship.power -= 0.035 * step * designModifiers.powerDrain;
    } else if (accelerating) {
        ship.speed += CONFIG.acceleration * dt;
        ship.fuel -= 0.0035 * step * fuelMultiplier;
    }

    // Braking
    if (keys.s) ship.speed -= CONFIG.braking * dt;
    if (keys[" "]) ship.speed -= 0.012 * dt;

    // Natural coasting
    if (!accelerating && !boosting && !keys.s && !keys[" "]) {
        ship.speed -= CONFIG.friction * dt;
    }

    ship.speed = Math.max(0, Math.min(ship.speed, maxSpeed));

    // Steering
if (keys.a || keys.arrowleft) {
    ship.x -= CONFIG.steeringSpeed * dt;
}

if (keys.d || keys.arrowright) {
    ship.x += CONFIG.steeringSpeed * dt;
}

if (keys.arrowup) {
    ship.y -= 0.28 * dt;
}

if (keys.arrowdown) {
    ship.y += 0.28 * dt;
}

    ship.x = Math.max(CONFIG.shipMinX, Math.min(CONFIG.shipMaxX, ship.x));
    ship.y = Math.max(85, Math.min(510, ship.y));

    // Move spacecraft forward.
    if (ship.speed > 0) {
        cameraX += ship.speed * dt * 0.06;
    }

    // IMPORTANT: Do not clamp cameraX to EXIT_X.
    // The camera must be able to move far enough for the exit
    // gate to reach the spacecraft's actual screen position.

    ship.distance = Math.floor(cameraX / 10);

    // Power regeneration
    if (upgrades.solar) ship.power += 0.025 * step;
    if (upgrades.rtg) ship.power += 0.06 * step;

    ship.fuel = Math.max(0, Math.min(100, ship.fuel));
    ship.power = Math.max(0, Math.min(100, ship.power));

    invincibility = Math.max(0, invincibility - dt);
    damageFlash = Math.max(0, damageFlash - dt);
    screenShake = Math.max(0, screenShake - dt);
}

/* 10. ASTEROIDS */
function getScreenX(worldX) {
    return worldX - cameraX + CONFIG.shipScreenX;
}

function spawnAsteroid() {
    if (asteroids.length >= CONFIG.asteroidLimit) return;

    // Select a real asteroid from the NASA data, if available
    const nasaList =
        window.nasaDataLoaded && Array.isArray(window.nasaAsteroids)
            ? window.nasaAsteroids
            : [];

    const nasaAsteroid = nasaList.length > 0
        ? nasaList[Math.floor(Math.random() * nasaList.length)]
        : null;

    // Keep the original game physics and spawning behaviour
    asteroids.push({
        worldX: cameraX + 1000 + Math.random() * 500,
        y: 65 + Math.random() * 465,
        size: 13 + Math.random() * 22,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - .5) * .06,
        driftX: -.3 - Math.random() * .5,
        driftY: (Math.random() - .5) * 1.1,

        // NASA asteroid information
        isNASAObject: Boolean(nasaAsteroid),
        nasaId: nasaAsteroid?.id ?? null,
        nasaName: nasaAsteroid?.name ?? "Unidentified asteroid",
        nasaDiameter: nasaAsteroid?.diameter ?? null,
        nasaVelocity: nasaAsteroid?.velocity ?? null,
        nasaDistance: nasaAsteroid?.distance ?? null,
        nasaApproachDate: nasaAsteroid?.approachDate ?? null,
        nasaHazardous: nasaAsteroid?.hazardous ?? false
    });
}

function checkCollisions() {
    if (invincibility > 0) return;

    for (let i = asteroids.length - 1; i >= 0; i--) {
        const a = asteroids[i];
        const ax = getScreenX(a.worldX);

        if (Math.hypot(ax - ship.x, a.y - ship.y) < a.size + 22) {
            const collisionDamage = Math.max(
    1,
    (20 - shieldLevel * 4) * designModifiers.damageMult
);

            ship.hull = Math.max(0, ship.hull - collisionDamage);

            invincibility = CONFIG.invincibilityTime;
            damageFlash = 400;
            screenShake = 350;

            asteroids.splice(i, 1);

            if (ship.hull <= 0) {
                finishMission(false);
            }

            break;
        }
    }
}

function updateStorm(dt) {
    if (!stormStarted && cameraX > planets[4].x + 100) {
        stormWait += dt;

        if (stormWait >= CONFIG.stormDelay) {
            stormStarted = true;

            if (hullPanel) hullPanel.style.display = "block";

            if (objectiveText) {
                objectiveText.textContent = "WARNING: ASTEROID STORM! SURVIVE!";
            }
        }
    }

    if (!stormStarted) return;

    asteroidTimer += dt;

    if (asteroidTimer >= CONFIG.asteroidSpawnTime) {
        spawnAsteroid();
        asteroidTimer = 0;
    }

    for (let i = asteroids.length - 1; i >= 0; i--) {
        const a = asteroids[i];

        a.rotation += a.rotationSpeed * dt / 16.67;
        a.y += a.driftY * dt / 16.67;
        a.worldX += a.driftX * dt / 16.67;

        if (
            a.worldX < cameraX - 200 ||
            a.y < -100 ||
            a.y > HEIGHT + 100
        ) {
            asteroids.splice(i, 1);
        }
    }

    checkCollisions();
}

/* 11. SPACE DRAWING */
function drawBackground() {
    ctx.fillStyle = "#030914";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    stars.forEach(s => {
        const x = ((s.x - cameraX * .3) % WIDTH + WIDTH) % WIDTH;

        ctx.globalAlpha = s.alpha;
        ctx.fillStyle = "#fff";
        ctx.fillRect(x, s.y, s.size, s.size);
    });

    ctx.globalAlpha = 1;
}

function drawPlanets() {
    planets.forEach(p => {
        const x = getScreenX(p.x);
        const distance = Math.abs(p.x - cameraX);

        if (x < -250 || x > WIDTH + 250) return;

        const radius = p.radius * (
            1 + Math.max(0, 1 - distance / 1800) * 1.5
        );

        ctx.beginPath();
        ctx.arc(x, 300, radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        if (p.name === "JUPITER") {
            ctx.save();
            ctx.beginPath();
            ctx.arc(x, 300, radius, 0, Math.PI * 2);
            ctx.clip();

            for (let i = -100; i <= 100; i += 22) {
                ctx.fillStyle = i % 2 === 0 ? "#a86d4d" : "#f0c59c";
                ctx.fillRect(x - radius, 300 + i, radius * 2, 10);
            }

            ctx.restore();
        }

        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.font = "16px monospace";
        ctx.fillText(p.name, x, 300 + radius + 30);
    });
}

function drawAsteroids() {
    asteroids.forEach(a => {
        const x = getScreenX(a.worldX);
        if (x < -70 || x > WIDTH + 70) return;

        ctx.save();
        ctx.translate(x, a.y);
        ctx.rotate(a.rotation);
        ctx.fillStyle = "#929292";
        ctx.beginPath();

        for (let i = 0; i < 8; i++) {
            const angle = i * Math.PI / 4;
            const r = a.size * (i % 2 ? .75 : 1);
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r;

            i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }

        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#555";
        ctx.fillRect(-5, -3, 7, 6);
        ctx.restore();
    });
}

function drawShip() {
    if (invincibility > 0 && Math.floor(Date.now() / 100) % 2 === 0) {
        return;
    }

    ctx.save();
    ctx.translate(ship.x, ship.y);

    if (ship.speed > .3) {
        ctx.fillStyle = keys.shift ? "#35eaff" : "#ff9d24";
        ctx.beginPath();
        ctx.moveTo(-25, -9);
        ctx.lineTo(-25 - ship.speed * 5, 0);
        ctx.lineTo(-25, 9);
        ctx.fill();
    }

    ctx.fillStyle = "#35eaff";
    ctx.beginPath();
    ctx.moveTo(35, 0);
    ctx.lineTo(-20, -17);
    ctx.lineTo(-12, 0);
    ctx.lineTo(-20, 17);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, -5, 15, 10);

    ctx.fillStyle = "#1674a0";
    ctx.fillRect(-15, -25, 20, 9);
    ctx.fillRect(-15, 16, 20, 9);

    ctx.restore();
}

function drawExit() {
    const x = getScreenX(EXIT_X);
    if (x < -200 || x > WIDTH + 200) return;

    ctx.fillStyle = "#092b18";
    ctx.fillRect(x - 65, 190, 130, 80);

    ctx.strokeStyle = "#39ff88";
    ctx.lineWidth = 4;
    ctx.strokeRect(x - 65, 190, 130, 80);

    ctx.fillStyle = "#39ff88";
    ctx.textAlign = "center";
    ctx.font = "bold 24px monospace";
    ctx.fillText("EXIT", x, 240);
}

function drawRadar() {
    const rx = 790, ry = 45;
    const radarDistance = 1800 * designModifiers.radarRange;

    ctx.fillStyle = "rgba(2,15,30,.9)";
    ctx.fillRect(rx, ry, 175, 95);

    ctx.strokeStyle = "#35eaff";
    ctx.lineWidth = 2;
    ctx.strokeRect(rx, ry, 175, 95);

    ctx.fillStyle = "#35eaff";
    ctx.font = "11px monospace";
    ctx.textAlign = "left";
    ctx.fillText("RADAR", rx + 8, ry + 15);

    const cx = rx + 12, cy = ry + 55;

    ctx.fillStyle = "#fff";
    ctx.fillRect(cx - 3, cy - 3, 6, 6);

    planets.forEach(p => {
        const d = p.x - cameraX;

        if (d >= 0 && d <= radarDistance) {
            ctx.fillStyle = "#e6b85c";
            ctx.fillRect(
                cx + d / radarDistance * 145,
                cy - 2,
                5,
                5
            );
        }
    });

    asteroids.forEach(a => {
        const d = a.worldX - cameraX;

        if (d >= 0 && d <= radarDistance) {
            ctx.fillStyle = "#f55";
            ctx.fillRect(
                cx + d / radarDistance * 145,
                cy + (a.y - 300) / 8,
                4,
                4
            );
        }
    });
}

function drawFirstPerson() {
    ctx.fillStyle = "#071522";
    ctx.fillRect(0, 0, WIDTH, 28);
    ctx.fillRect(0, 0, 35, HEIGHT);
    ctx.fillRect(WIDTH - 35, 0, 35, HEIGHT);
    ctx.fillRect(0, HEIGHT - 105, WIDTH, 105);

    ctx.strokeStyle = "#35eaff";
    ctx.lineWidth = 4;
    ctx.strokeRect(35, 28, WIDTH - 70, HEIGHT - 133);

    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(480, 275);
    ctx.lineTo(520, 275);
    ctx.moveTo(500, 255);
    ctx.lineTo(500, 295);
    ctx.stroke();

    ctx.fillStyle = "#0c2941";
    ctx.fillRect(35, HEIGHT - 100, WIDTH - 70, 95);

    ctx.strokeStyle = "#1686aa";
    ctx.strokeRect(35, HEIGHT - 100, WIDTH - 70, 95);

    ctx.fillStyle = "#35eaff";
    ctx.textAlign = "left";
    ctx.font = "14px monospace";

    ctx.fillText("FLIGHT CONTROL", 65, HEIGHT - 72);
    ctx.fillText("SPEED: " + Math.round(ship.speed * 10), 65, HEIGHT - 43);
    ctx.fillText("FUEL: " + Math.round(ship.fuel) + "%", 350, HEIGHT - 72);
    ctx.fillText("HULL: " + Math.round(ship.hull) + "%", 350, HEIGHT - 43);
    ctx.fillText("POWER: " + Math.round(ship.power) + "%", 650, HEIGHT - 72);
    ctx.fillText("DIST: " + ship.distance, 650, HEIGHT - 43);

    ctx.fillStyle = "#35eaff";
    ctx.font = "12px monospace";
    ctx.fillText("FIRST PERSON // COCKPIT", 50, 20);
}

function drawDamageEffects() {
    if (damageFlash > 0) {
        ctx.fillStyle = "rgba(255,0,0,.25)";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }

    if (ship.hull < 40 && Math.floor(Date.now() / 300) % 2 === 0) {
        ctx.fillStyle = "#f33";
        ctx.font = "bold 20px monospace";
        ctx.textAlign = "center";
        ctx.fillText("HULL CRITICAL!", WIDTH / 2, 45);
    }
}

function drawGame() {
    ctx.save();

    if (screenShake > 0) {
        const a = 5 * (screenShake / 350);
        ctx.translate(
            (Math.random() - .5) * a,
            (Math.random() - .5) * a
        );
    }

    drawBackground();
    drawPlanets();
    drawAsteroids();
    drawExit();

    if (cameraMode === "second") {
        drawShip();
    } else {
        drawFirstPerson();
    }

    drawRadar();
    drawDamageEffects();

    ctx.restore();
}

/* 12. DASHBOARD */
function updateDashboard() {
    if (fuelValue) fuelValue.textContent = Math.round(ship.fuel) + "%";
    if (powerValue) powerValue.textContent = Math.round(ship.power) + "%";
    if (hullValue) hullValue.textContent = Math.round(ship.hull) + "%";
    if (distanceValue) distanceValue.textContent = ship.distance + " KM";

    if (fuelBar) fuelBar.style.width = ship.fuel + "%";
    if (powerBar) powerBar.style.width = ship.power + "%";
    if (hullBar) hullBar.style.width = ship.hull + "%";

    if (gameStatus) {
        gameStatus.textContent = stormStarted
            ? "ASTEROID STORM"
            : "EXPLORING SPACE";
    }

    if (
        objectiveText &&
        !stormStarted &&
        !landingActive &&
        !landingComplete &&
        !miniGameActive &&
        activeChallenge === null
    ) {
        const p = planets[challengeIndex];
        objectiveText.textContent = p
            ? "TRAVEL TO " + p.name
            : "REACH THE EXIT";
    }
}

/* 13. OVERLAY + FINISH */
function showOverlay(title, description, buttonText) {
    if (gameOverlay) gameOverlay.classList.remove("hidden");
    if (overlayTitle) overlayTitle.textContent = title;
    if (overlayDescription) overlayDescription.textContent = description;
    if (startButton) startButton.textContent = buttonText;
}

function finishMission(success) {
    if (gameFinished) return;

    let stats = {
        score: 0,
        rank: "ROOKIE EXPLORER",
        missionsCompleted: 0,
        challengesCompleted: 0,
        samplesCollected: samplesCollected,
        achievements: []
    };

    running = false;
    gameFinished = true;

    try {
        saveWorkshopCondition();
    } catch (error) {
        console.error("Workshop save failed:", error);
    }

    const totalScore = calculateTotalMissionScore({
        challengesCompleted: Math.min(challengeIndex, 4),
        samplesCollected: samplesCollected,
        fuelRemaining: ship.fuel,
        hull: ship.hull,
        missionComplete: success,
        survivedStorm: success && stormStarted
    });

    console.log("TOTAL MISSION SCORE:", totalScore);

    try {
        if (window.OrbitScoring) {
            if (success && window.OrbitScoring.completeMission) {
                window.OrbitScoring.completeMission("Orbit Architect");
            }

            // Set the actual calculated score.
            if (window.OrbitScoring.setFinalScore) {
                window.OrbitScoring.setFinalScore(totalScore);
            }

            // Retrieve the correct results.
            if (window.OrbitScoring.getResults) {
                stats = window.OrbitScoring.getResults() || stats;
            } else if (window.OrbitScoring.getStats) {
                stats = window.OrbitScoring.getStats() || stats;
            }
        }
    } catch (error) {
        console.error("Scoring system error:", error);
    }

    try {
        if (window.OrbitSave?.save) {
            window.OrbitSave.save({
                ...stats,
                missionFinished: true,
                missionSuccess: success,
                currentPlanet: success ? "EXIT" : "MISSION FAILED",
                samplesCollected: samplesCollected,
                totalMissionScore: totalScore
            });
        }
    } catch (error) {
        console.error("Mission save failed:", error);
    }

    showOverlay(
        success ? "MISSION COMPLETE!" : "MISSION FAILED",
        success
            ? `Congratulations, explorer! You completed Orbit Architect! TOTAL MISSION SCORE: ${totalScore}/1000`
            : `Your spacecraft could not complete the mission. TOTAL MISSION SCORE: ${totalScore}/1000`,
        "VIEW RESULTS →"
    );

    if (gameStatus) {
        gameStatus.textContent = success ? "MISSION COMPLETE" : "MISSION FAILED";
    }

    if (objectiveText) {
        objectiveText.textContent = success
            ? "MISSION OBJECTIVE COMPLETED"
            : "MISSION OBJECTIVE FAILED";
    }

    console.log("MISSION FINISHED:", success ? "SUCCESS" : "FAILED");
}

/* 14. PLANET CHALLENGES */
const challengeInfo = [
    {
        planet: "MERCURY",
        title: "FUEL REFILL",
        description: "Click the floating fuel cells before they drift away. Collect 8 cells."
    },
    {
        planet: "VENUS",
        title: "POWER REPAIR",
        description: "Click the four circuit tiles in the correct order: 1, 2, 3, 4."
    },
    {
        planet: "EARTH",
        title: "SHIELD CALIBRATION",
        description: "Press the matching key shown on screen. Complete 5 signals."
    },
    {
        planet: "MARS",
        title: "RADAR SCAN",
        description: "Click all 5 signal blips on the radar screen."
    }
];

/* ==========================================
   NASA SCIENTIST DIALOGUE
========================================== */
const SCIENTIST = { name: "DR. AMARA OKAFOR", role: "NASA MISSION SCIENTIST" };

const DIALOGUE = {
    challenges: [
        { // MERCURY
            intro: [
                "Explorer, this is Dr. Okafor at Mission Control. You're skimming Mercury, the closest planet to the Sun. Daytime surface temperatures here reach about 430°C.",
                "Your tanks are nearly dry, and Mercury has almost no atmosphere to slow anything down. Those floating fuel cells are just drifting on pure momentum.",
                "Click them before they escape. Collect 8 and we'll top you off. You have 45 seconds."
            ],
            retry: "Those cells move fast. Aim where they're heading, not where they are. Let's go again.",
            hints: [
                "Lead your target. Objects keep moving in a straight line out here.",
                "Good rhythm. Keep going.",
                "Almost there. Don't rush the last few."
            ],
            success: "Tanks at 100%. Textbook work. Mercury has only a razor-thin exosphere, so you were fighting pure inertia out there.",
            fail: "Don't worry. Even our engineers miss those cells. Anticipate their bounce and try again."
        },
        { // VENUS
            intro: [
                "Welcome to Venus. Its thick carbon dioxide atmosphere traps heat, making it hotter than Mercury at about 465°C. The pressure is roughly 90 times Earth's.",
                "That heat has fried part of your power grid. The circuits must be reconnected in sequence, or the surge will overload the whole system.",
                "Click the tiles in order: 1, 2, 3, 4. One slow pass beats a fast mistake."
            ],
            retry: "Remember: 1, 2, 3, 4, in that order. Take a breath and reconnect the grid.",
            hints: [
                "Start with tile one. The sequence matters.",
                "Current's flowing. Keep the order.",
                "One more connection to go."
            ],
            success: "Power restored to 100%. Venus is a harsh teacher, and that was clean work.",
            fail: "The grid overloaded. Venus does that to everyone. Reconnect from tile one."
        },
        { // EARTH
            intro: [
                "Earth, home. Our magnetic field deflects most of the solar wind, which is why life can thrive here. Your ship has no such luck.",
                "Your shield emitters have drifted out of calibration, and they need to be re-tuned with manual inputs. The system will show you a key.",
                "Press the matching key: W, A, S or D. Finish 5 signals in a row. A wrong key resets the sequence."
            ],
            retry: "A wrong key resets the sequence, so stay calm and match each signal.",
            hints: [
                "Eyes on the center. Match the key shown.",
                "Steady. Shields are warming up.",
                "Last signals. Don't let a mistake reset you."
            ],
            success: "Shields calibrated and hull plating reinforced. That's the same principle protecting our satellites every day.",
            fail: "Calibration drifted. Take your time, since one wrong key resets the sequence. Try again."
        },
        { // MARS
            intro: [
                "Mars. Our orbiters here use radar to look beneath the dust, and they've found buried ice. Olympus Mons, the tallest volcano in the solar system, is just over the horizon.",
                "Your navigation radar is picking up faint signals from our relay beacons. They're hard to see, so you'll have to find them manually.",
                "Click all 5 signal blips on the scope. Look closely, because they're small."
            ],
            retry: "Scan the whole scope, especially the edges of the rings. The signals hide there.",
            hints: [
                "Sweep the scope. Check every ring.",
                "Good eyes. More signals are out there.",
                "One or two left. Check the edges."
            ],
            success: "All five beacons located. Great work. Mission Control has a clean fix on you.",
            fail: "The signals faded. Radar interpretation takes patience. Scan again."
        }
    ],

    europa: {
        intro: [
            "Touchdown confirmed. You're standing on Europa, one of Jupiter's largest moons. Beneath this ice shell is a global ocean with more liquid water than all of Earth's oceans combined.",
            "Scientists believe that ocean could be one of the best places in the solar system to look for life. Your job is to collect 5 ice samples for the lab.",
            "Use WASD or the arrow keys to move, and press E near a sample to collect it. Avoid the dark cracks, since they'll damage your suit. Jupiter's radiation is strong, and your oxygen is limited.",
            "Collect all 5, then return to the lander at the bottom left corner and hold position to board. Good luck, explorer."
        ],
        retry: "Same plan: five samples, avoid the cracks, and get back to the lander. You've got this.",
        sample: [
            "Sample one secured. That ice could hold ocean material.",
            "Nice. Two samples in the bag.",
            "Halfway there. Watch your oxygen.",
            "Four down. One to go."
        ],
        damage: "Suit breach. Stay clear of those cracks!",
        allSamples: "That's all five! Get back to the lander now.",
        success: "Five samples secured. The science team is thrilled. Get back to orbit, because you have an asteroid storm ahead.",
        failSuit: "We lost suit integrity. The cracks are unforgiving. Let's try again.",
        failOxygen: "Oxygen depleted. Plan a route that collects samples efficiently, then head home."
    }
};

/* ---------- typing sound ---------- */
let audioCtx = null;
let soundOn = true;
let dialogueBlipCount = 0;

function getAudio() {
    if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
}

function playTypeBlip(char = "a") {
    if (!soundOn) return;
    const ac = getAudio();
    if (!ac) return;

    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    // Slight pitch variation per letter so it sounds like speech, not a buzz.
    osc.type = "square";
    osc.frequency.setValueAtTime(420 + (char.charCodeAt(0) % 12) * 18, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.035, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);

    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.06);
}

/* ---------- dialogue engine ---------- */
let dialogueActive = false, dialogueLines = [], dialogueIndex = 0;
let dialogueChars = 0, dialogueLast = 0;
let dialogueDone = null, dialogueBackdrop = null;

function startDialogue(lines, backdrop, onDone) {
    dialogueLines = Array.isArray(lines) ? lines : [lines];
    dialogueIndex = 0;
    dialogueChars = 0;
    dialogueBlipCount = 0;
    dialogueLast = 0;
    dialogueBackdrop = backdrop;
    dialogueDone = onDone;
    dialogueActive = true;

    if (gameOverlay) gameOverlay.classList.add("hidden");
    requestAnimationFrame(dialogueLoop);
}

function advanceDialogue() {
    if (!dialogueActive) return;

    const line = dialogueLines[dialogueIndex];

    // First press finishes the typewriter, second press moves on.
    if (dialogueChars < line.length) {
        dialogueChars = line.length;
        dialogueBlipCount = line.length;   // no sound burst when skipping
        return;
    }

    dialogueIndex++;
    dialogueChars = 0;
    dialogueBlipCount = 0;

    if (dialogueIndex >= dialogueLines.length) {
        dialogueActive = false;
        const done = dialogueDone;
        dialogueDone = null;
        done?.();
    }
}

function dialogueLoop(timestamp) {
    if (!dialogueActive) return;

    const dt = dialogueLast ? Math.min(timestamp - dialogueLast, 50) : 16.67;
    dialogueLast = timestamp;
    dialogueChars += dt * 0.045;

    const currentLine = dialogueLines[dialogueIndex] || "";
    const shown = Math.min(Math.floor(dialogueChars), currentLine.length);

    if (shown > dialogueBlipCount) {
        const ch = currentLine[shown - 1];
        // Skip spaces and play on every 2nd letter so it isn't too buzzy.
        if (ch && ch !== " " && shown % 2 === 0) playTypeBlip(ch);
        dialogueBlipCount = shown;
    }

    dialogueBackdrop?.();
    drawDialogueBox();

    requestAnimationFrame(dialogueLoop);
}

function wrapText(text, maxWidth) {
    const words = text.split(" ");
    const lines = [];
    let line = "";

    for (const word of words) {
        const test = line ? line + " " + word : word;
        if (ctx.measureText(test).width > maxWidth && line) {
            lines.push(line);
            line = word;
        } else {
            line = test;
        }
    }

    if (line) lines.push(line);
    return lines;
}

function drawDialogueBox() {
    const x = 40, y = 395, w = 920, h = 175;

    ctx.fillStyle = "rgba(1,10,25,.92)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#42eaff";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    // Portrait
    const px = x + 70, py = y + 85;

    ctx.fillStyle = "#0c2941";
    ctx.fillRect(x + 15, y + 15, 110, 145);
    ctx.strokeStyle = "#1686aa";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 15, y + 15, 110, 145);

    ctx.fillStyle = "#e8e8f0";               // suit collar
    ctx.beginPath();
    ctx.roundRect(px - 38, py + 25, 76, 45, 10);
    ctx.fill();

    ctx.fillStyle = "#8d5a3b";               // face
    ctx.beginPath();
    ctx.arc(px, py - 5, 27, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1b1b24";               // hair
    ctx.beginPath();
    ctx.arc(px, py - 14, 28, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#111";                  // eyes
    ctx.fillRect(px - 12, py - 6, 5, 5);
    ctx.fillRect(px + 7, py - 6, 5, 5);

    ctx.fillStyle = "#0b3d91";               // NASA-style patch
    ctx.beginPath();
    ctx.arc(px - 25, py + 45, 9, 0, Math.PI * 2);
    ctx.fill();

    // Name + role
    ctx.textAlign = "left";
    ctx.fillStyle = "#42eaff";
    ctx.font = "bold 18px monospace";
    ctx.fillText(SCIENTIST.name, x + 145, y + 32);

    ctx.fillStyle = "#7fb7c9";
    ctx.font = "12px monospace";
    ctx.fillText(SCIENTIST.role + " // LIVE COMMS", x + 145, y + 50);

    // Typed text
    const line = dialogueLines[dialogueIndex] || "";
    const typed = line.slice(0, Math.floor(dialogueChars));

    ctx.fillStyle = "#fff";
    ctx.font = "16px monospace";
    ctx.textAlign = "left";
    wrapText(typed, w - 185).forEach((t, i) => {
        ctx.fillText(t, x + 145, y + 82 + i * 24);
    });

    // Prompt
    if (dialogueChars >= line.length && Math.floor(Date.now() / 450) % 2 === 0) {
        ctx.textAlign = "right";
        ctx.fillStyle = "#42eaff";
        ctx.font = "13px monospace";
        ctx.fillText(
            dialogueIndex === dialogueLines.length - 1
                ? "CLICK / ENTER TO BEGIN ▶"
                : "CLICK / ENTER TO CONTINUE ▶",
            x + w - 18,
            y + h - 14
        );
    }
}

/* ---------- challenge helpers ---------- */
function drawChallengeScene(index) {
    if (index === 0) drawFuelChallenge();
    if (index === 1) drawPowerChallenge();
    if (index === 2) drawShieldChallenge();
    if (index === 3) drawRadarChallenge();
}

function getChallengeHint(index) {
    const progress = [
        fuelHits / 8,
        circuitClicks / 4,
        shieldStep / 5,
        radarFound / 5
    ][index];

    const hints = DIALOGUE.challenges[index].hints;
    return hints[Math.min(hints.length - 1, Math.floor(progress * hints.length))];
}

function drawScientistTicker(text) {
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0,8,20,.75)";
    ctx.fillRect(100, 566, 800, 28);
    ctx.strokeStyle = "#1686aa";
    ctx.lineWidth = 1;
    ctx.strokeRect(100, 566, 800, 28);

    ctx.fillStyle = "#42eaff";
    ctx.font = "13px monospace";
    ctx.fillText("DR. OKAFOR: " + text, 500, 585);
}

function scientistQuote(text) {
    return "\u201C" + text + "\u201D \u2014 Dr. Okafor";
}

/* ---------- challenge flow ---------- */
function beginChallenge(index) {
    const isRetry = challengeResult === "failed";

    challengeIndex = index;
    activeChallenge = index;
    challengeElapsed = 0;
    challengeLastTime = 0;
    challengeResult = "";

    fuelHits = 0;
    fuelCells = Array.from({ length: 4 }, spawnFuelCell);
    circuitClicks = 0;
    shieldStep = 0;
    radarFound = 0;

    if (index === 1) {
        circuitCells = [0, 0, 0, 0];
    }

    if (index === 2) {
        const options = ["w", "a", "s", "d"];
        shieldSequence = Array.from(
            { length: 5 },
            () => options[Math.floor(Math.random() * options.length)]
        );
    }

    if (index === 3) {
        radarTargets = Array.from({ length: 5 }, (_, i) => ({
            x: 230 + (i * 137) % 570,
            y: 180 + (i * 83) % 270,
            found: false
        }));
    }

    running = false;

    if (gameOverlay) gameOverlay.classList.add("hidden");

    if (gameStatus) {
        gameStatus.textContent = challengeInfo[index].planet + " CHALLENGE";
    }

    if (objectiveText) {
        objectiveText.textContent = challengeInfo[index].title;
    }

    // Dr. Okafor briefs the player first; the timer starts afterwards.
    startDialogue(
        isRetry ? [DIALOGUE.challenges[index].retry] : DIALOGUE.challenges[index].intro,
        () => drawChallengeScene(index),
        () => {
            challengeElapsed = 0;
            challengeLastTime = 0;
            requestAnimationFrame(challengeLoop);
        }
    );
}

function challengeSuccess() {
    if (activeChallenge === null) return;

    const completed = activeChallenge;

    try {
        if (window.OrbitScoring?.completeChallenge) {
            window.OrbitScoring.completeChallenge(challengeInfo[completed].title);
        }
    } catch (error) {
        console.warn("Challenge score could not be saved.", error);
    }

    if (completed === 0) ship.fuel = 100;
    if (completed === 1) ship.power = 100;
    if (completed === 2) ship.hull = Math.min(100, ship.hull + 40);
    if (completed === 3) ship.power = Math.min(100, ship.power + 20);

    activeChallenge = null;
    challengeResult = "success";

    showOverlay(
        challengeInfo[completed].planet + " CHALLENGE COMPLETE!",
        scientistQuote(DIALOGUE.challenges[completed].success),
        "CONTINUE FLIGHT →"
    );

    if (gameStatus) gameStatus.textContent = "CHALLENGE COMPLETE";

    updateDashboard();
}

function challengeFailure(reason) {
    if (activeChallenge === null) return;

    const failed = activeChallenge;
    activeChallenge = null;
    challengeResult = "failed";

    showOverlay(
        challengeInfo[failed].planet + " CHALLENGE FAILED",
        scientistQuote(DIALOGUE.challenges[failed].fail) + " " + reason,
        "RETRY CHALLENGE →"
    );

    if (gameStatus) gameStatus.textContent = "CHALLENGE FAILED";
}

/* Mercury fuel cells */
function spawnFuelCell() {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.4 + Math.random() * 1.6;

    return {
        x: 120 + Math.random() * 760,
        y: 160 + Math.random() * 320,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 24,
        pulse: Math.random() * 6
    };
}

function updateFuelCells(dt) {
    const step = dt / 16.67;

    fuelCells.forEach(c => {
        c.x += c.vx * step;
        c.y += c.vy * step;
        c.pulse += dt / 200;

        if (c.x < 70 || c.x > 930) {
            c.vx *= -1;
            c.x = Math.max(70, Math.min(930, c.x));
        }

        if (c.y < 140 || c.y > 490) {
            c.vy *= -1;
            c.y = Math.max(140, Math.min(490, c.y));
        }
    });
}

function attemptFuelRefill(p) {
    if (activeChallenge !== 0 || !p) return;

    for (let i = fuelCells.length - 1; i >= 0; i--) {
        const c = fuelCells[i];

        if (Math.hypot(c.x - p.x, c.y - p.y) < c.r + 8) {
            fuelHits++;
            fuelCells[i] = spawnFuelCell();

            if (fuelHits >= 8) challengeSuccess();
            return;
        }
    }
}

function handleChallengeKey(key) {
    if (activeChallenge === 2) {
        if (key === shieldSequence[shieldStep]) {
            shieldStep++;
            if (shieldStep >= 5) challengeSuccess();
        } else if (["w", "a", "s", "d"].includes(key)) {
            shieldStep = 0;
        }
    }
}

function canvasPoint(event) {
    const r = canvas.getBoundingClientRect();

    return {
        x: (event.clientX - r.left) * (WIDTH / r.width),
        y: (event.clientY - r.top) * (HEIGHT / r.height)
    };
}

canvas.addEventListener("click", event => {
    if (dialogueActive) {
        advanceDialogue();
        return;
    }

    if (activeChallenge === 0) {
        attemptFuelRefill(canvasPoint(event));
    } else if (activeChallenge === 1) {
        const p = canvasPoint(event);

        const boxes = [
            { x: 350, y: 240 },
            { x: 450, y: 240 },
            { x: 550, y: 240 },
            { x: 650, y: 240 }
        ];

        boxes.forEach((b, i) => {
            if (
                p.x >= b.x &&
                p.x <= b.x + 65 &&
                p.y >= b.y &&
                p.y <= b.y + 65 &&
                i === circuitClicks
            ) {
                circuitClicks++;
                if (circuitClicks >= 4) challengeSuccess();
            }
        });
    } else if (activeChallenge === 3) {
        const p = canvasPoint(event);

        radarTargets.forEach(t => {
            if (!t.found && Math.hypot(t.x - p.x, t.y - p.y) < 27) {
                t.found = true;
                radarFound++;
                if (radarFound >= 5) challengeSuccess();
            }
        });
    }
});

function drawChallengeBase(title, subtitle) {
    const g = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    g.addColorStop(0, "#06152a");
    g.addColorStop(1, "#102f4c");

    ctx.fillStyle = g;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    for (let i = 0; i < 65; i++) {
        ctx.fillStyle = "rgba(180,230,255,.35)";
        ctx.fillRect((i * 173) % WIDTH, (i * 97) % HEIGHT, 2, 2);
    }

    ctx.textAlign = "center";
    ctx.fillStyle = "#42eaff";
    ctx.font = "bold 30px monospace";
    ctx.fillText(title, WIDTH / 2, 75);

    ctx.fillStyle = "#fff";
    ctx.font = "17px monospace";
    ctx.fillText(subtitle, WIDTH / 2, 112);

    ctx.fillStyle = "rgba(0,8,20,.75)";
    ctx.fillRect(250, 510, 500, 48);

    ctx.strokeStyle = "#35eaff";
    ctx.lineWidth = 1;
    ctx.strokeRect(250, 510, 500, 48);

    ctx.fillStyle = "#fff";
    ctx.font = "15px monospace";
    ctx.fillText(
        "MISSION TIME: " + Math.max(0, Math.ceil(45 - challengeElapsed / 1000)) + "s",
        WIDTH / 2,
        540
    );
}

function drawFuelChallenge() {
    drawChallengeBase(
        "MERCURY // FUEL REFILL",
        "CLICK THE FLOATING FUEL CELLS TO COLLECT THEM"
    );

    fuelCells.forEach(c => {
        const glow = 1 + Math.sin(c.pulse) * .12;

        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.scale(glow, glow);

        ctx.shadowColor = "#28d879";
        ctx.shadowBlur = 20;
        ctx.fillStyle = "#103d2c";
        ctx.strokeStyle = "#28d879";
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.roundRect(-14, -22, 28, 44, 8);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = "#28d879";
        ctx.fillRect(-9, -4, 18, 20);

        ctx.fillStyle = "#fff";
        ctx.fillRect(-5, -28, 10, 7);

        ctx.restore();
    });

    ctx.textAlign = "center";
    ctx.fillStyle = "#42eaff";
    ctx.font = "bold 23px monospace";
    ctx.fillText("FUEL CELLS COLLECTED: " + fuelHits + "/8", 500, 500);
}

function drawPowerChallenge() {
    drawChallengeBase(
        "VENUS // POWER REPAIR",
        "CLICK THE CIRCUIT TILES IN ORDER: 1 → 2 → 3 → 4"
    );

    const labels = ["1", "2", "3", "4"];

    for (let i = 0; i < 4; i++) {
        const x = 350 + i * 100;

        ctx.fillStyle = i < circuitClicks ? "#176c65" : "#132e48";
        ctx.fillRect(x, 240, 65, 65);

        ctx.strokeStyle = i < circuitClicks ? "#52ffba" : "#42eaff";
        ctx.lineWidth = 3;
        ctx.strokeRect(x, 240, 65, 65);

        ctx.fillStyle = "#fff";
        ctx.font = "bold 28px monospace";
        ctx.textAlign = "center";
        ctx.fillText(labels[i], x + 32, 282);

        if (i < 3) {
            ctx.strokeStyle = "#42eaff";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(x + 65, 272);
            ctx.lineTo(x + 100, 272);
            ctx.stroke();
        }
    }

    ctx.fillStyle = "#fff";
    ctx.font = "20px monospace";
    ctx.textAlign = "center";
    ctx.fillText("CONNECTED CIRCUITS: " + circuitClicks + "/4", 500, 390);
}

function drawShieldChallenge() {
    drawChallengeBase(
        "EARTH // SHIELD CALIBRATION",
        "MATCH THE KEY DISPLAYED BELOW"
    );

    const key = shieldSequence[shieldStep] || "";

    ctx.fillStyle = "#103d59";
    ctx.beginPath();
    ctx.arc(500, 280, 85, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#42eaff";
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = "bold 60px monospace";
    ctx.textAlign = "center";
    ctx.fillText(key.toUpperCase(), 500, 302);

    ctx.font = "22px monospace";
    ctx.fillText("CALIBRATION: " + shieldStep + "/5", 500, 420);
}

function drawRadarChallenge() {
    drawChallengeBase(
        "MARS // RADAR SCAN",
        "CLICK THE FIVE HIDDEN SIGNALS"
    );

    ctx.strokeStyle = "#35eaff";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(500, 320, 190, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(500, 320, 125, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(500, 320, 60, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(310, 320);
    ctx.lineTo(690, 320);
    ctx.moveTo(500, 130);
    ctx.lineTo(500, 510);
    ctx.stroke();

    radarTargets.forEach(t => {
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.found ? 12 : 7, 0, Math.PI * 2);
        ctx.fillStyle = t.found ? "#39ff88" : "#ffdc58";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = t.found ? 0 : 18;
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    ctx.fillStyle = "#fff";
    ctx.font = "20px monospace";
    ctx.textAlign = "center";
    ctx.fillText("SIGNALS FOUND: " + radarFound + "/5", 500, 470);
}

function challengeLoop(timestamp) {
    if (activeChallenge === null || dialogueActive) return;

    const dt = challengeLastTime
        ? Math.min(timestamp - challengeLastTime, 50)
        : 16.67;

    challengeLastTime = timestamp;
    challengeElapsed += dt;

    if (activeChallenge === 0) updateFuelCells(dt);

    if (challengeElapsed > 45000) {
        challengeFailure("Time ran out. Try the challenge again.");
        return;
    }

    if (activeChallenge === 0) drawFuelChallenge();
    if (activeChallenge === 1) drawPowerChallenge();
    if (activeChallenge === 2) drawShieldChallenge();
    if (activeChallenge === 3) drawRadarChallenge();

    if (activeChallenge !== null) {
        drawScientistTicker(getChallengeHint(activeChallenge));
        requestAnimationFrame(challengeLoop);
    }
}

function resumeAfterChallenge() {
    const completedIndex = challengeIndex;

    challengeIndex = completedIndex + 1;
    challengeResult = "";
    running = true;
    lastTime = 0;

    ship.x = CONFIG.shipScreenX;
    ship.y = 300;
    ship.speed = 2.2;

    cameraX = planets[completedIndex].x + 180;
    ship.distance = Math.floor(cameraX / 10);

    if (gameOverlay) gameOverlay.classList.add("hidden");
    if (startButton) startButton.textContent = "MISSION RUNNING";

    if (gameStatus) {
        gameStatus.textContent = challengeIndex < planets.length
            ? "DEPARTING " + planets[challengeIndex].name
            : "APPROACHING JUPITER";
    }

    if (objectiveText) {
        objectiveText.textContent = "CONTINUE TO THE NEXT PLANET";
    }

    updateDashboard();
    requestAnimationFrame(gameLoop);
}

/* 15. EUROPA LANDING CINEMATIC */
function startLandingSequence() {
    if (landingActive || landingComplete || miniGameActive) return;

    running = false;
    landingActive = true;
    landingStartTime = performance.now();
    asteroids.length = 0;

    if (gameStatus) gameStatus.textContent = "EUROPA LANDING APPROACH";

    if (objectiveText) {
        objectiveText.textContent = "AUTOPILOT ENGAGED: PREPARING FOR LANDING";
    }

    requestAnimationFrame(landingAnimation);
}

function drawLandingScene(progress) {
    const t = Math.min(progress / 9000, 1);

    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, "#020817");
    sky.addColorStop(.65, "#102747");
    sky.addColorStop(1, "#294b70");

    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    for (let i = 0; i < 100; i++) {
        ctx.fillStyle = "rgba(255,255,255,.7)";
        ctx.fillRect((i * 137.5) % WIDTH, (i * 83.7) % 350, 2, 2);
    }

    const jx = 790, jy = 170, jr = 180;

    ctx.beginPath();
    ctx.arc(jx, jy, jr, 0, Math.PI * 2);

    const jg = ctx.createRadialGradient(730, 110, 15, jx, jy, jr);
    jg.addColorStop(0, "#f3d0a0");
    jg.addColorStop(.5, "#c28a69");
    jg.addColorStop(1, "#633e43");

    ctx.fillStyle = jg;
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(jx, jy, jr, 0, Math.PI * 2);
    ctx.clip();

    for (let i = -150; i <= 150; i += 28) {
        ctx.fillStyle = i % 2 === 0 ? "#a96f59" : "#e3b18a";
        ctx.fillRect(jx - 190, jy + i, 380, 12);
    }

    ctx.restore();

    const hy = 390 - Math.min(t, .8) * 70;

    ctx.fillStyle = "#91b8d0";
    ctx.beginPath();
    ctx.moveTo(0, hy + 45);
    ctx.lineTo(150, hy - 5);
    ctx.lineTo(300, hy + 30);
    ctx.lineTo(490, hy - 45);
    ctx.lineTo(700, hy + 10);
    ctx.lineTo(850, hy - 25);
    ctx.lineTo(1000, hy + 35);
    ctx.lineTo(1000, 600);
    ctx.lineTo(0, 600);
    ctx.fill();

    const ground = ctx.createLinearGradient(0, hy, 0, 600);
    ground.addColorStop(0, "#b8e6f4");
    ground.addColorStop(.4, "#6d9fba");
    ground.addColorStop(1, "#263f62");

    ctx.fillStyle = ground;
    ctx.fillRect(0, hy + 25, WIDTH, HEIGHT);

    ctx.fillStyle = "#24394e";
    ctx.fillRect(345, 460, 310, 15);

    ctx.strokeStyle = "#35eaff";
    ctx.lineWidth = 3;
    ctx.strokeRect(345, 460, 310, 15);

    for (let i = 0; i < 7; i++) {
        ctx.fillStyle = Math.floor(Date.now() / 250) % 2 === 0
            ? "#35eaff"
            : "#fff";

        ctx.fillRect(360 + i * 45, 463, 9, 8);
    }

    const descent = Math.min(t / .65, 1);

    ctx.save();
    ctx.translate(500, 65 + descent * 325);
    ctx.scale(1 + descent * .45, 1 + descent * .45);

    if (t < .78) {
        ctx.fillStyle = "#ffad35";
        ctx.beginPath();
        ctx.moveTo(-15, 15);
        ctx.lineTo(0, 45 + Math.random() * 18);
        ctx.lineTo(15, 15);
        ctx.fill();
    }

    ctx.fillStyle = "#35eaff";
    ctx.beginPath();
    ctx.moveTo(0, -35);
    ctx.lineTo(25, 15);
    ctx.lineTo(13, 30);
    ctx.lineTo(-13, 30);
    ctx.lineTo(-25, 15);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.fillRect(-7, -12, 14, 20);
    ctx.restore();

    if (t > .84) {
        ctx.fillStyle = "rgba(1,9,22,.8)";
        ctx.fillRect(170, 170, 660, 100);

        ctx.strokeStyle = "#35eaff";
        ctx.lineWidth = 2;
        ctx.strokeRect(170, 170, 660, 100);

        ctx.textAlign = "center";
        ctx.fillStyle = "#35eaff";
        ctx.font = "bold 30px monospace";
        ctx.fillText("EUROPA LANDING", 500, 215);

        ctx.fillStyle = "#fff";
        ctx.font = "16px monospace";
        ctx.fillText("TOUCHDOWN CONFIRMED", 500, 245);
    }
}

function landingAnimation(timestamp) {
    if (!landingActive) return;

    const elapsed = timestamp - landingStartTime;
    drawLandingScene(elapsed);

    if (elapsed < 9000) {
        requestAnimationFrame(landingAnimation);
        return;
    }

    landingActive = false;
    landingComplete = true;

    showOverlay(
        "WELCOME TO YOUR DESTINATION!",
        "Your spacecraft has landed safely at Europa. Prepare to explore Europa's icy surface.",
        "START EUROPA EXPLORATION →"
    );

    if (gameStatus) gameStatus.textContent = "LANDED ON EUROPA";
    if (objectiveText) objectiveText.textContent = "NEW OBJECTIVE: EXPLORE EUROPA";
}

/* 16. EUROPA SURFACE GAME */
const europaPlayer = {
    x: 120,
    y: 430,
    radius: 17,
    speed: 3.2,
    health: 3,
    invulnerable: 0
};

let iceSamples = [];
let iceCracks = [];
let europaParticles = [];

const miniGameDuration = 90;

function createEuropaLevel() {
    Object.assign(europaPlayer, {
        x: 120,
        y: 430,
        health: 3,
        invulnerable: 0
    });

    samplesCollected = 0;
    miniGameElapsed = 0;
    miniGameMessage = "COLLECT 5 ICE SAMPLES";
    miniGameMessageTimer = 2200;
    returnHold = 0;

    iceSamples = [
        { x: 260, y: 160 },
        { x: 450, y: 420 },
        { x: 650, y: 190 },
        { x: 790, y: 410 },
        { x: 900, y: 250 }
    ].map(p => ({ ...p, collected: false }));

    iceCracks = [
        { x: 330, y: 300, w: 150, h: 28, phase: 0 },
        { x: 570, y: 300, w: 190, h: 32, phase: 1.4 },
        { x: 820, y: 115, w: 110, h: 25, phase: 2.3 },
        { x: 130, y: 220, w: 120, h: 25, phase: .7 }
    ];

    europaParticles = Array.from({ length: 65 }, () => ({
        x: Math.random() * WIDTH,
        y: Math.random() * HEIGHT,
        size: 1 + Math.random() * 3,
        speed: .3 + Math.random() * 1.2
    }));
}

function startEuropaMiniGame() {
    if (!landingComplete || miniGameActive) return;

    const isRetry = europaAttempted;
    europaAttempted = true;

    landingComplete = false;
    miniGameActive = true;
    miniGameComplete = false;
    miniGameFailed = false;
    running = false;

    createEuropaLevel();

    if (gameOverlay) gameOverlay.classList.add("hidden");

    if (gameStatus) gameStatus.textContent = "EUROPA SURFACE EXPLORATION";
    if (objectiveText) objectiveText.textContent = "COLLECT 5 ICE SAMPLES";

    // Dr. Okafor briefs the player before the oxygen timer starts.
    startDialogue(
        isRetry ? [DIALOGUE.europa.retry] : DIALOGUE.europa.intro,
        drawEuropaMiniGame,
        () => {
            miniGameLastTime = 0;
            requestAnimationFrame(europaMiniGameLoop);
        }
    );
}

function drawEuropaBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    sky.addColorStop(0, "#07172d");
    sky.addColorStop(.55, "#183c5b");
    sky.addColorStop(1, "#8dc7df");

    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const jx = 820, jy = 115, jr = 95;
    const jg = ctx.createRadialGradient(jx - 25, jy - 25, 5, jx, jy, jr);

    jg.addColorStop(0, "#f3d5b0");
    jg.addColorStop(1, "#9a5c52");

    ctx.fillStyle = jg;
    ctx.beginPath();
    ctx.arc(jx, jy, jr, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(jx, jy, jr, 0, Math.PI * 2);
    ctx.clip();

    for (let i = -75; i <= 75; i += 18) {
        ctx.fillStyle = i % 2 ? "#c48d73" : "#e8c3a0";
        ctx.fillRect(jx - jr, jy + i, jr * 2, 8);
    }

    ctx.restore();

    ctx.fillStyle = "#477d9a";
    ctx.beginPath();
    ctx.moveTo(0, 345);
    ctx.lineTo(120, 270);
    ctx.lineTo(230, 340);
    ctx.lineTo(360, 255);
    ctx.lineTo(510, 340);
    ctx.lineTo(660, 260);
    ctx.lineTo(810, 335);
    ctx.lineTo(930, 265);
    ctx.lineTo(1000, 310);
    ctx.lineTo(1000, 600);
    ctx.lineTo(0, 600);
    ctx.fill();

    const ice = ctx.createLinearGradient(0, 330, 0, 600);
    ice.addColorStop(0, "#c7f0fa");
    ice.addColorStop(.45, "#78b5d0");
    ice.addColorStop(1, "#315d7d");

    ctx.fillStyle = ice;
    ctx.fillRect(0, 350, WIDTH, 250);

    ctx.strokeStyle = "rgba(240,255,255,.45)";
    ctx.lineWidth = 2;

    for (let i = 0; i < 14; i++) {
        const x = (i * 91 + 30) % WIDTH;
        ctx.beginPath();
        ctx.moveTo(x, 370 + (i % 3) * 45);
        ctx.lineTo(x + 35, 390 + (i % 3) * 45);
        ctx.lineTo(x + 65, 380 + (i % 3) * 45);
        ctx.stroke();
    }
}

function drawEuropaMiniGame() {
    drawEuropaBackground();

    europaParticles.forEach(p => {
        p.x -= p.speed;

        if (p.x < -5) {
            p.x = WIDTH + 5;
            p.y = Math.random() * HEIGHT;
        }

        ctx.fillStyle = "rgba(235,250,255,.55)";
        ctx.fillRect(p.x, p.y, p.size, p.size);
    });

    iceCracks.forEach(c => {
        const pulse = .65 + Math.sin(miniGameElapsed / 220 + c.phase) * .2;

        ctx.fillStyle = `rgba(5,28,55,${pulse})`;
        ctx.beginPath();
        ctx.moveTo(c.x, c.y + c.h / 2);
        ctx.lineTo(c.x + c.w * .18, c.y);
        ctx.lineTo(c.x + c.w * .34, c.y + c.h * .65);
        ctx.lineTo(c.x + c.w * .52, c.y - c.h * .2);
        ctx.lineTo(c.x + c.w * .68, c.y + c.h * .7);
        ctx.lineTo(c.x + c.w, c.y + c.h / 2);
        ctx.lineTo(c.x + c.w * .7, c.y + c.h + 12);
        ctx.lineTo(c.x + c.w * .45, c.y + c.h * .8);
        ctx.lineTo(c.x + c.w * .2, c.y + c.h + 10);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "#3beaff";
        ctx.lineWidth = 2;
        ctx.stroke();
    });

    iceSamples.forEach(s => {
        if (s.collected) return;

        const pulse = 1 + Math.sin(miniGameElapsed / 180 + s.x) * .12;

        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.scale(pulse, pulse);
        ctx.shadowColor = "#55eaff";
        ctx.shadowBlur = 20;
        ctx.fillStyle = "#bdf8ff";

        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.lineTo(12, -5);
        ctx.lineTo(8, 13);
        ctx.lineTo(-8, 13);
        ctx.lineTo(-12, -5);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    });

    if (!(europaPlayer.invulnerable > 0 &&
        Math.floor(Date.now() / 100) % 2 === 0)) {

        ctx.save();
        ctx.translate(europaPlayer.x, europaPlayer.y);

        ctx.fillStyle = "rgba(0,20,40,.3)";
        ctx.beginPath();
        ctx.ellipse(0, 22, 22, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#1d5574";
        ctx.fillRect(-15, -8, 9, 25);

        ctx.fillStyle = "#f0f7ff";
        ctx.beginPath();
        ctx.roundRect(-12, -17, 24, 38, 7);
        ctx.fill();

        ctx.fillStyle = "#d9faff";
        ctx.beginPath();
        ctx.arc(0, -20, 13, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#1785a8";
        ctx.beginPath();
        ctx.ellipse(1, -21, 8, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#254c66";
        ctx.fillRect(-12, 17, 9, 7);
        ctx.fillRect(3, 17, 9, 7);

        ctx.restore();
    }

    ctx.fillStyle = "rgba(1,10,25,.82)";
    ctx.fillRect(18, 18, 340, 92);

    ctx.strokeStyle = "#42eaff";
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, 340, 92);

    ctx.textAlign = "left";
    ctx.fillStyle = "#48eaff";
    ctx.font = "bold 18px monospace";
    ctx.fillText("EUROPA FIELD EXPLORATION", 34, 45);

    ctx.fillStyle = "#fff";
    ctx.font = "15px monospace";
    ctx.fillText("ICE SAMPLES: " + samplesCollected + "/5", 34, 72);
    ctx.fillText("SUIT INTEGRITY: " + europaPlayer.health + "/3", 34, 95);

    const secs = Math.max(
        0,
        Math.ceil(miniGameDuration - miniGameElapsed / 1000)
    );

    ctx.textAlign = "right";
    ctx.fillStyle = secs <= 15 ? "#ff6868" : "#fff";
    ctx.fillText("OXYGEN: " + secs + "s", WIDTH - 28, 42);

    if (miniGameMessageTimer > 0 && miniGameMessage) {
        ctx.fillStyle = "rgba(0,15,30,.8)";
        ctx.fillRect(120, 125, 760, 42);

        ctx.strokeStyle = "#42eaff";
        ctx.strokeRect(120, 125, 760, 42);

        ctx.fillStyle = "#fff";
        ctx.font = "bold 14px monospace";
        ctx.textAlign = "center";
        ctx.fillText(miniGameMessage, 500, 152);
    }
}

function setMiniGameMessage(message, duration = 1600) {
    miniGameMessage = message;
    miniGameMessageTimer = duration;
}

function collectNearbySample() {
    if (!miniGameActive) return;

    for (const s of iceSamples) {
        if (s.collected) continue;

        if (Math.hypot(
            s.x - europaPlayer.x,
            s.y - europaPlayer.y
        ) < 55) {
            s.collected = true;
            samplesCollected++;

            try {
                if (window.OrbitScoring?.collectSample) {
                    window.OrbitScoring.collectSample();
                }
            } catch (error) {
                console.warn("Sample score could not be saved.", error);
            }

            if (samplesCollected >= 5) {
                setMiniGameMessage("DR. OKAFOR: " + DIALOGUE.europa.allSamples, 3500);

                if (objectiveText) {
                    objectiveText.textContent = "RETURN TO THE LANDING ZONE";
                }
            } else {
                setMiniGameMessage(
                    "DR. OKAFOR: " + DIALOGUE.europa.sample[samplesCollected - 1],
                    2200
                );
            }

            return;
        }
    }

    setMiniGameMessage("MOVE CLOSER TO AN ICE SAMPLE");
}

function failEuropaMiniGame(reason) {
    if (!miniGameActive) return;

    miniGameActive = false;
    miniGameFailed = true;

    showOverlay(
        "EUROPA EXPLORATION FAILED",
        scientistQuote(
            reason === "OXYGEN DEPLETED"
                ? DIALOGUE.europa.failOxygen
                : DIALOGUE.europa.failSuit
        ) + ` You collected ${samplesCollected}/5 ice samples.`,
        "RETRY EUROPA EXPLORATION →"
    );

    if (gameStatus) gameStatus.textContent = "EXPLORATION FAILED";
}

function completeEuropaMiniGame() {
    if (!miniGameActive) return;

    miniGameActive = false;
    miniGameComplete = true;

    showOverlay(
        "EUROPA SAMPLES COLLECTED!",
        scientistQuote(DIALOGUE.europa.success),
        "RETURN TO SPACE FLIGHT →"
    );

    if (gameStatus) gameStatus.textContent = "EUROPA EXPLORATION COMPLETE";
    if (objectiveText) objectiveText.textContent = "BOARD THE SPACECRAFT";
}

function updateEuropaMiniGame(dt) {
    miniGameElapsed += dt;
    miniGameMessageTimer = Math.max(0, miniGameMessageTimer - dt);
    europaPlayer.invulnerable = Math.max(0, europaPlayer.invulnerable - dt);

    let dx = 0, dy = 0;

    if (keys.a || keys.arrowleft) dx--;
    if (keys.d || keys.arrowright) dx++;
    if (keys.w || keys.arrowup) dy--;
    if (keys.s || keys.arrowdown) dy++;

    if (dx || dy) {
        const len = Math.hypot(dx, dy);

        europaPlayer.x += dx / len * europaPlayer.speed * dt / 16.67;
        europaPlayer.y += dy / len * europaPlayer.speed * dt / 16.67;
    }

    europaPlayer.x = Math.max(25, Math.min(WIDTH - 25, europaPlayer.x));
    europaPlayer.y = Math.max(145, Math.min(HEIGHT - 45, europaPlayer.y));

    for (const c of iceCracks) {
        const cx = Math.max(c.x, Math.min(europaPlayer.x, c.x + c.w));
        const cy = Math.max(c.y - 8, Math.min(europaPlayer.y, c.y + c.h + 8));

        if (
            Math.hypot(europaPlayer.x - cx, europaPlayer.y - cy) < 13 &&
            europaPlayer.invulnerable <= 0
        ) {
            europaPlayer.health--;
            europaPlayer.invulnerable = 1300;

            setMiniGameMessage("DR. OKAFOR: " + DIALOGUE.europa.damage);

            if (europaPlayer.health <= 0) {
                failEuropaMiniGame("SUIT FAILURE");
                return;
            }

            break;
        }
    }

    const nearLander = europaPlayer.x < 85 && europaPlayer.y > 370;

    if (samplesCollected >= 5 && nearLander) {
        returnHold += dt;
        setMiniGameMessage("HOLD POSITION TO BOARD THE SPACECRAFT", 100);

        if (returnHold >= 900) {
            completeEuropaMiniGame();
        }
    } else {
        returnHold = 0;
    }

    if (miniGameElapsed >= miniGameDuration * 1000) {
        failEuropaMiniGame("OXYGEN DEPLETED");
    }
}

function europaMiniGameLoop(timestamp) {
    if (!miniGameActive || dialogueActive) return;

    const dt = miniGameLastTime
        ? Math.min(timestamp - miniGameLastTime, 50)
        : 16.67;

    miniGameLastTime = timestamp;

    updateEuropaMiniGame(dt);

    if (miniGameActive) {
        drawEuropaMiniGame();
        requestAnimationFrame(europaMiniGameLoop);
    }
}

/* 17. RETURN TO SPACE AFTER EUROPA */
function resumeSpaceFlight() {
    miniGameComplete = false;
    miniGameFailed = false;
    miniGameActive = false;

    landingComplete = true;
    landingActive = false;

    cameraX = planets[4].x + 180;

    ship.x = CONFIG.shipScreenX;
    ship.y = 300;
    ship.speed = 5.5;
    ship.distance = Math.floor(cameraX / 10);

    stormStarted = true;
    stormWait = 0;
    asteroidTimer = 0;
    asteroids.length = 0;

    running = true;
    gameFinished = false;
    lastTime = 0;

    if (hullPanel) hullPanel.style.display = "block";
    if (gameOverlay) gameOverlay.classList.add("hidden");
    if (startButton) startButton.textContent = "MISSION RUNNING";
    if (gameStatus) gameStatus.textContent = "ASTEROID STORM";

    if (objectiveText) {
        objectiveText.textContent = "DODGE THE ASTEROIDS AND REACH THE EXIT!";
    }

    Object.keys(keys).forEach(key => keys[key] = false);

    spawnAsteroid();
    requestAnimationFrame(gameLoop);
}

/* 18. MAIN LOOP */
function gameLoop(timestamp) {
    if (!running) return;

    const dt = lastTime
        ? Math.min(timestamp - lastTime, CONFIG.maxFrameTime)
        : 16.67;

    lastTime = timestamp;

    updatePhysics(dt);
    updateStorm(dt);

    if (!running) return;

    updateDashboard();

    // Planet challenges.
    if (
        challengeIndex < 4 &&
        cameraX >= planets[challengeIndex].x - 180
    ) {
        beginChallenge(challengeIndex);
        return;
    }

    // Europa landing.
    if (
        cameraX >= planets[4].x - 450 &&
        !landingComplete &&
        !landingActive
    ) {
        startLandingSequence();
        return;
    }

    // EXIT GATE:
    // Check the gate's actual screen position against the ship.
    // This works even if the player steers left or right.
    const exitScreenX = getScreenX(EXIT_X);

    if (exitScreenX <= ship.x) {
        // Align the exit with the ship before finishing.
        cameraX = EXIT_X + CONFIG.shipScreenX - ship.x;

        ship.speed = 0;
        ship.distance = Math.floor(cameraX / 10);

        drawGame();
        updateDashboard();

        finishMission(true);
        return;
    }

    // Fuel failure.
    if (ship.fuel <= 0 && ship.speed <= 0.1) {
        finishMission(false);
        return;
    }

    drawGame();
    requestAnimationFrame(gameLoop);
}

function startMission() {
    if (running) return;

    resetGame();

    running = true;
    lastTime = 0;

    if (gameOverlay) {
        gameOverlay.classList.add("hidden");
    }

    if (startButton) {
        startButton.textContent = "MISSION RUNNING";
    }

    console.log("ORBIT ARCHITECT MISSION LAUNCHED");

    requestAnimationFrame(gameLoop);
}

/* 20. BUTTON FLOW */
startButton?.addEventListener("click", () => {
    // Ignore the button while the scientist is talking.
    if (dialogueActive) return;

    // Mission finished: open results.
    if (gameFinished) {
        window.location.href = "results.html";
        return;
    }

    // Return to flight after Europa.
    if (miniGameComplete) {
        resumeSpaceFlight();
        return;
    }

    // Retry Europa exploration.
    if (miniGameFailed) {
        miniGameFailed = false;
        miniGameComplete = false;
        landingComplete = true;
        startEuropaMiniGame();
        return;
    }

    // A planetary challenge is currently active.
    if (activeChallenge !== null) return;

    // Continue after a successful planetary challenge.
    if (challengeResult === "success") {
        resumeAfterChallenge();
        return;
    }

    // Retry a failed planetary challenge.
    if (challengeResult === "failed") {
        beginChallenge(challengeIndex);
        return;
    }

    // Start Europa exploration after landing.
    if (landingComplete && !miniGameActive) {
        startEuropaMiniGame();
        return;
    }

    startMission();
});

/* 21. FULLSCREEN */
const gameContainer = document.querySelector(".game-container");

if (gameContainer) {
    gameContainer.addEventListener("click", event => {
        if (event.target.closest("button")) return;
        if (activeChallenge !== null) return;
        if (miniGameActive) return;

        if (!document.fullscreenElement) {
            gameContainer.requestFullscreen?.().catch(() => {});
        }
    });
}

/* 22. INITIALIZE */
resetGame();

if (startButton) {
    startButton.textContent = "START MISSION →";
}

console.log("ORBIT ARCHITECT: ALL PLANET CHALLENGES READY");
console.log("Workshop upgrades loaded:", {
    engineLevel,
    shieldLevel,
    fuelLevel
});
console.log("SPACECRAFT DESIGN LOADED:", designModifiers);

console.log("ACTIVE SPACECRAFT SYSTEMS:", {
    advancedEngine: designModifiers.speedMult > 1,
    extendedFuelTank: designModifiers.fuelDrainMult < 1,
    advancedRadar: designModifiers.radarRange > 1,
    heavyShield: designModifiers.damageMult < 1,
    solarPower: designModifiers.solar,
    nuclearPower: designModifiers.nuclear

/* 23. MOBILE TOUCH CONTROLS */
(function setupTouchControls() {
    const isTouchDevice =
        window.matchMedia("(pointer: coarse)").matches ||
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0;

    if (!isTouchDevice) return;

    canvas.style.touchAction = "none";

    /* ---------- styles ---------- */
    const style = document.createElement("style");
    style.textContent = `
        #touchControls {
            position: fixed; inset: 0; z-index: 50;
            pointer-events: none;
            touch-action: none;
            user-select: none; -webkit-user-select: none;
            -webkit-touch-callout: none;
        }
        #touchControls > * { display: none; pointer-events: auto; touch-action: none; }
        #touchControls > .show { display: block; }
        #touchControls > .show.tc-flex { display: flex; }
        #touchControls > .show.tc-grid { display: grid; }

        .tc-joystick {
            position: absolute; left: 24px; bottom: 24px;
            width: 140px; height: 140px; border-radius: 50%;
            background: rgba(2, 15, 30, .55);
            border: 3px solid rgba(66, 234, 255, .75);
            box-shadow: 0 0 14px rgba(66, 234, 255, .35);
        }
        .tc-knob {
            position: absolute; left: 50%; top: 50%;
            width: 58px; height: 58px; margin: -29px 0 0 -29px;
            border-radius: 50%;
            background: rgba(66, 234, 255, .85);
            border: 3px solid #fff;
            box-shadow: 0 0 12px #42eaff;
        }
        .tc-btn {
            font: bold 16px monospace; color: #fff;
            background: rgba(2, 15, 30, .65);
            border: 3px solid #42eaff; border-radius: 14px;
            box-shadow: 0 0 10px rgba(66, 234, 255, .4);
            touch-action: none; -webkit-tap-highlight-color: transparent;
        }
        .tc-btn.active { background: rgba(66, 234, 255, .75); color: #021; }

        .tc-flight {
            position: absolute; right: 20px; bottom: 24px;
            flex-direction: column; gap: 10px;
        }
        .tc-flight .tc-btn { width: 96px; height: 52px; }

        .tc-wasd {
            position: absolute; right: 24px; bottom: 24px;
            grid-template-columns: repeat(3, 70px);
            grid-template-rows: repeat(2, 70px);
            gap: 8px;
        }
        .tc-wasd .tc-btn { font-size: 26px; }
        .tc-wasd .k-w { grid-column: 2; grid-row: 1; }
        .tc-wasd .k-a { grid-column: 1; grid-row: 2; }
        .tc-wasd .k-s { grid-column: 2; grid-row: 2; }
        .tc-wasd .k-d { grid-column: 3; grid-row: 2; }

        .tc-collect {
            position: absolute; right: 30px; bottom: 40px;
            width: 100px; height: 100px; border-radius: 50%;
            font-size: 15px; line-height: 1.2;
        }
    `;
    document.head.appendChild(style);

    /* ---------- markup ---------- */
    const root = document.createElement("div");
    root.id = "touchControls";
    root.innerHTML = `
        <div class="tc-joystick" id="tcJoystick"><div class="tc-knob" id="tcKnob"></div></div>

        <div class="tc-flight tc-flex" id="tcFlight">
            <button class="tc-btn" data-hold="shift">BOOST</button>
            <button class="tc-btn" data-hold="w">GAS</button>
            <button class="tc-btn" data-hold="s">BRAKE</button>
        </div>

        <div class="tc-wasd tc-grid" id="tcWasd">
            <button class="tc-btn k-w" data-key="w">W</button>
            <button class="tc-btn k-a" data-key="a">A</button>
            <button class="tc-btn k-s" data-key="s">S</button>
            <button class="tc-btn k-d" data-key="d">D</button>
        </div>

        <button class="tc-btn tc-collect" id="tcCollect">E<br>COLLECT</button>
    `;
    (gameContainer || document.body).appendChild(root);

    // Stop taps on controls from triggering the fullscreen/canvas click handlers.
    root.addEventListener("click", e => e.stopPropagation());
    root.addEventListener("contextmenu", e => e.preventDefault());

    const joystick = $("tcJoystick");
    const knob = $("tcKnob");
    const flightPad = $("tcFlight");
    const wasdPad = $("tcWasd");
    const collectBtn = $("tcCollect");

    /* ---------- virtual joystick (pull circle) ---------- */
    let stickPointer = null;
    const STICK_KEYS = ["arrowleft", "arrowright", "arrowup", "arrowdown"];

    function releaseStick() {
        stickPointer = null;
        knob.style.transform = "translate(0px, 0px)";
        STICK_KEYS.forEach(k => keys[k] = false);
    }

    function moveStick(event) {
        const rect = joystick.getBoundingClientRect();
        const radius = rect.width / 2;

        let vx = event.clientX - (rect.left + radius);
        let vy = event.clientY - (rect.top + radius);

        const len = Math.hypot(vx, vy);
        if (len > radius) {
            vx = vx / len * radius;
            vy = vy / len * radius;
        }

        knob.style.transform = `translate(${vx}px, ${vy}px)`;

        const dead = radius * 0.3;
        keys.arrowleft  = vx < -dead;
        keys.arrowright = vx >  dead;
        keys.arrowup    = vy < -dead;
        keys.arrowdown  = vy >  dead;
    }

    joystick.addEventListener("pointerdown", event => {
        event.preventDefault();
        stickPointer = event.pointerId;
        joystick.setPointerCapture(event.pointerId);
        moveStick(event);
    });

    joystick.addEventListener("pointermove", event => {
        if (event.pointerId === stickPointer) moveStick(event);
    });

    ["pointerup", "pointercancel", "lostpointercapture"].forEach(type =>
        joystick.addEventListener(type, event => {
            if (event.pointerId === stickPointer) releaseStick();
        })
    );

    /* ---------- hold buttons (GAS / BOOST / BRAKE) ---------- */
    flightPad.querySelectorAll("[data-hold]").forEach(btn => {
        const key = btn.dataset.hold;

        btn.addEventListener("pointerdown", event => {
            event.preventDefault();
            btn.setPointerCapture(event.pointerId);
            keys[key] = true;
            btn.classList.add("active");
        });

        ["pointerup", "pointercancel", "lostpointercapture"].forEach(type =>
            btn.addEventListener(type, () => {
                keys[key] = false;
                btn.classList.remove("active");
            })
        );
    });

    /* ---------- WASD buttons (Earth shield calibration) ---------- */
    wasdPad.querySelectorAll("[data-key]").forEach(btn => {
        const key = btn.dataset.key;

        btn.addEventListener("pointerdown", event => {
            event.preventDefault();
            btn.classList.add("active");
            if (activeChallenge !== null && !dialogueActive) handleChallengeKey(key);
        });

        ["pointerup", "pointercancel", "pointerleave"].forEach(type =>
            btn.addEventListener(type, () => btn.classList.remove("active"))
        );
    });

    /* ---------- E button (Europa samples) ---------- */
    collectBtn.addEventListener("pointerdown", event => {
        event.preventDefault();
        collectBtn.classList.add("active");
        if (miniGameActive && !dialogueActive) collectNearbySample();
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach(type =>
        collectBtn.addEventListener(type, () => collectBtn.classList.remove("active"))
    );

    /* ---------- show the right controls for the current screen ---------- */
    let lastMode = "";

    function updateTouchControls() {
        let mode = "none";

        if (!dialogueActive) {
            if (activeChallenge === 2) mode = "shield";
            else if (miniGameActive) mode = "europa";
            else if (running && !landingActive && activeChallenge === null) mode = "flight";
        }

        if (mode === lastMode) return;
        lastMode = mode;

        joystick.classList.toggle("show", mode === "flight" || mode === "europa");
        flightPad.classList.toggle("show", mode === "flight");
        wasdPad.classList.toggle("show", mode === "shield");
        collectBtn.classList.toggle("show", mode === "europa");

        // Never leave a key stuck when controls disappear.
        releaseStick();
        ["w", "s", "shift"].forEach(k => keys[k] = false);
    }

    setInterval(updateTouchControls, 100);
})()

});