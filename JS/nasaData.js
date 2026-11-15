
"use strict";

/* =====================================================
   ORBIT ARCHITECT - NASA ASTEROID INTELLIGENCE
   NASA NeoWs API Integration
   Features:
   - NASA live asteroid data
   - HTTP 429 rate-limit protection
   - Duplicate request prevention
   - Automatic fallback data
   - Safe DOM rendering
   - Seven-day asteroid tracking
===================================================== */

/* ==========================================
   GLOBAL DATA
========================================== */

window.nasaAsteroids = [];
window.nasaDataLoaded = false;
window.nasaDataSource = "BACKUP";

const NASA_API_KEY = "DEMO_KEY";

const NASA_API_URL =
    "https://api.nasa.gov/neo/rest/v1/feed";

let nasaRequest = null;

/* ==========================================
   BACKUP ASTEROID DATA
   Used when NASA API is unavailable.
========================================== */

function getBackupAsteroids() {

    const today = new Date().toISOString().split("T")[0];

    return [
        {
            id: "backup-001",
            name: "2024 BX1",
            diameter: 35,
            velocity: 28500,
            distance: 1250000,
            approachDate: today,
            hazardous: false
        },
        {
            id: "backup-002",
            name: "2023 DW",
            diameter: 48,
            velocity: 41200,
            distance: 2450000,
            approachDate: today,
            hazardous: false
        },
        {
            id: "backup-003",
            name: "2022 AE1",
            diameter: 120,
            velocity: 36800,
            distance: 3800000,
            approachDate: today,
            hazardous: true
        }
    ];
}

/* ==========================================
   LOAD NASA DATA
========================================== */

async function loadNASAData() {

    // Prevent duplicate requests.
    if (nasaRequest) {
        return nasaRequest;
    }

    if (window.nasaDataLoaded) {
        return;
    }

    nasaRequest = fetchNASAData();

    try {
        await nasaRequest;
    } finally {
        nasaRequest = null;
    }
}

/* ==========================================
   FETCH NASA ASTEROID DATA
========================================== */

async function fetchNASAData() {

    const panel = document.getElementById("nasaPanel");

    if (panel) {
        panel.textContent =
            "CONNECTING TO NASA ASTEROID DATABASE...";
    }

    try {

        const start = new Date();
        const end = new Date(start);

        // NASA NeoWs feed supports a maximum
        // date range of seven consecutive days.
        end.setUTCDate(end.getUTCDate() + 6);

        const formatDate = date =>
            date.toISOString().split("T")[0];

        const url =
            `${NASA_API_URL}` +
            `?start_date=${formatDate(start)}` +
            `&end_date=${formatDate(end)}` +
            `&api_key=${NASA_API_KEY}`;

        const response = await fetch(url);

        /* RATE LIMIT HANDLING */

        if (response.status === 429) {
            throw new Error(
                "NASA API rate limit reached. Using backup data."
            );
        }

        if (!response.ok) {
            throw new Error(
                `NASA API error: ${response.status}`
            );
        }

        const data = await response.json();

        if (!data.near_earth_objects) {
            throw new Error("NASA returned invalid asteroid data.");
        }

        /* PROCESS ASTEROIDS */

        const asteroids = Object.values(
            data.near_earth_objects
        )
            .flat()
            .map(asteroid => {

                const approach =
                    asteroid.close_approach_data?.[0];

                if (!approach) {
                    return null;
                }

                return {
                    id: asteroid.id,
                    name: asteroid.name,

                    diameter:
                        asteroid.estimated_diameter
                            .meters.estimated_diameter_max,

                    velocity:
                        Number(
                            approach.relative_velocity
                                .kilometers_per_hour
                        ),

                    distance:
                        Number(
                            approach.miss_distance.kilometers
                        ),

                    approachDate:
                        approach.close_approach_date,

                    hazardous:
                        asteroid.is_potentially_hazardous_asteroid
                };

            })
            .filter(Boolean)
            .sort((a, b) => a.distance - b.distance);

        window.nasaAsteroids = asteroids;
        window.nasaDataLoaded = true;
        window.nasaDataSource = "NASA LIVE";

        displayNASAData();

        console.log(
            "ORBIT ARCHITECT: NASA DATA LOADED",
            window.nasaAsteroids
        );

    } catch (error) {

        console.warn(
            "NASA DATA UNAVAILABLE:",
            error.message
        );

        // Use backup data instead of breaking the game.
        window.nasaAsteroids = getBackupAsteroids();

        window.nasaDataLoaded = true;
        window.nasaDataSource = "BACKUP";

        displayNASAData();

        console.log(
            "ORBIT ARCHITECT: BACKUP ASTEROID DATA LOADED",
            window.nasaAsteroids
        );
    }
}

/* ==========================================
   DISPLAY NASA DATA
========================================== */

function displayNASAData() {

    let panel = document.getElementById("nasaPanel");

    if (!panel) {

        panel = document.createElement("section");
        panel.id = "nasaPanel";

        Object.assign(panel.style, {

            position: "fixed",
            top: "15px",
            right: "15px",

            width: "310px",
            maxHeight: "75vh",

            overflowY: "auto",

            padding: "16px",

            background: "rgba(3, 12, 30, 0.96)",
            color: "#ffffff",

            border: "1px solid #168bff",
            borderRadius: "12px",

            boxShadow:
                "0 0 25px rgba(22, 139, 255, 0.25)",

            zIndex: "9999",

            fontFamily: "Arial, sans-serif",
            fontSize: "12px"

        });

        document.body.appendChild(panel);
    }

    panel.replaceChildren();

    /* HEADER */

    const heading = document.createElement("h2");

    heading.textContent =
        "NASA ASTEROID INTELLIGENCE (NAI)";

    heading.style.color = "#55baff";
    heading.style.fontSize = "17px";

    panel.appendChild(heading);

    /* DATA SOURCE */

    const source = document.createElement("p");

    source.textContent =
        window.nasaDataSource === "NASA LIVE"
            ? "LIVE NASA/JPL DATA"
            : "BACKUP SIMULATION DATA";

    source.style.color =
        window.nasaDataSource === "NASA LIVE"
            ? "#75dfaa"
            : "#ffc66d";

    panel.appendChild(source);

    /* SUBTITLE */

    const subtitle = document.createElement("p");

    subtitle.textContent =
        "NEAR-EARTH OBJECTS | NEXT 7 DAYS";

    panel.appendChild(subtitle);

    /* ASTEROID COUNT */

    const count = document.createElement("p");

    count.textContent =
        `ASTEROIDS TRACKED: ${window.nasaAsteroids.length}`;

    panel.appendChild(count);

    /* ASTEROID CARDS */

    window.nasaAsteroids
        .slice(0, 5)
        .forEach((asteroid, index) => {

            const card = document.createElement("div");

            Object.assign(card.style, {
                borderTop: "1px solid #245078",
                padding: "10px 0"
            });

            const name = document.createElement("strong");

            name.textContent =
                `${index + 1}. ${asteroid.name}`;

            name.style.color = "#65c5ff";

            const details = document.createElement("p");

            details.textContent =
                `Estimated diameter: ${asteroid.diameter.toFixed(1)} m`;

            const distance = document.createElement("p");

            distance.textContent =
                `Earth distance: ${asteroid.distance.toLocaleString(
                    "en-US",
                    { maximumFractionDigits: 0 }
                )} km`;

            const velocity = document.createElement("p");

            velocity.textContent =
                `Velocity: ${asteroid.velocity.toFixed(0)} km/h`;

            const date = document.createElement("p");

            date.textContent =
                `Close approach: ${asteroid.approachDate}`;

            const warning = document.createElement("p");

            warning.textContent = asteroid.hazardous
                ? "NASA classification: Potentially hazardous"
                : "NASA classification: Not classified as potentially hazardous";

            warning.style.color =
                asteroid.hazardous
                    ? "#ff7777"
                    : "#75dfaa";

            card.append(
                name,
                details,
                distance,
                velocity,
                date,
                warning
            );

            panel.appendChild(card);

        });

    /* FOOTER */

    const footer = document.createElement("small");

    footer.textContent =
        window.nasaDataSource === "NASA LIVE"
            ? "Source: NASA/JPL NeoWs API"
            : "Source: Orbit Architect backup demonstration data";

    footer.style.color = "#8ba8c8";

    panel.appendChild(footer);
}

/* ==========================================
   START NASA CONNECTION
========================================== */

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        loadNASAData,
        { once: true }
    );

} else {

    loadNASAData();

}

console.log(
    "ORBIT ARCHITECT: NASA ASTEROID INTELLIGENCE READY"
);
