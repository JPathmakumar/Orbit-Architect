
/* =====================================================
   ORBIT ARCHITECT - SCORING SYSTEM
   Tracks mission performance and achievements.
   FIXED: Prevents scoreReset infinite recursion.
===================================================== */

"use strict";

(function () {

    /* ==========================================
       1. CONFIGURATION
    ========================================== */

    const STORAGE_KEY = "orbitArchitectCurrentScore";

    const POINTS = {
        challenge: 250,
        sample: 100,
        missionComplete: 500,
        asteroidHit: -50,
        fuelCollected: 25
    };

    /* ==========================================
       2. SCORE VARIABLES
    ========================================== */

    let score = 0;
    let challengesCompleted = 0;
    let samplesCollected = 0;

    let planetsCompleted = [];
    let achievements = [];

    let missionStartedAt = null;
    let missionFinished = false;

    /* ==========================================
       3. ACHIEVEMENTS
    ========================================== */

    function addAchievement(name) {

        if (!achievements.includes(name)) {

            achievements.push(name);

            if (window.OrbitEvents) {
                OrbitEvents.emit("achievementUnlocked", {
                    name
                });
            }
        }
    }

    /* ==========================================
       4. ADD POINTS
    ========================================== */

    function addPoints(points, reason = "Mission activity") {

        const amount = Number(points) || 0;

        score = Math.max(0, score + amount);

        if (window.OrbitEvents) {
            OrbitEvents.emit("scoreChanged", {
                score,
                points: amount,
                reason
            });
        }

        return score;
    }

    /* ==========================================
       5. RESET SCORING SYSTEM
    ========================================== */

    function reset() {

        score = 0;

        challengesCompleted = 0;
        samplesCollected = 0;

        planetsCompleted = [];
        achievements = [];

        missionStartedAt = Date.now();
        missionFinished = false;

        // Notify other systems that scoring has reset.
        // IMPORTANT: The scoring system does NOT listen
        // to its own scoreReset event.

        if (window.OrbitEvents) {
            OrbitEvents.emit("scoreReset", {});
        }

        return getResults();
    }

    /* ==========================================
       6. COMPLETE CHALLENGE
    ========================================== */

    function completeChallenge(planetName) {

        challengesCompleted++;

        addPoints(
            POINTS.challenge,
            "Challenge completed"
        );

        if (planetName) {

            const name = String(planetName);

            if (!planetsCompleted.includes(name)) {
                planetsCompleted.push(name);
            }
        }

        if (challengesCompleted >= 1) {
            addAchievement("FIRST CHALLENGE");
        }

        if (challengesCompleted >= 4) {
            addAchievement("SOLAR SYSTEM SPECIALIST");
        }

        return getResults();
    }

    /* ==========================================
       7. COLLECT EUROPA ICE SAMPLE
    ========================================== */

    function collectSample() {

        samplesCollected++;

        addPoints(
            POINTS.sample,
            "Europa ice sample collected"
        );

        if (samplesCollected >= 1) {
            addAchievement("FIRST ICE SAMPLE");
        }

        if (samplesCollected >= 8) {
            addAchievement("EUROPA SCIENTIST");
        }

        return samplesCollected;
    }

    /* ==========================================
       8. ASTEROID COLLISION
    ========================================== */

    function recordAsteroidHit() {

        addPoints(
            POINTS.asteroidHit,
            "Asteroid collision"
        );

        return score;
    }

    /* ==========================================
       9. FUEL COLLECTION
    ========================================== */

    function recordFuelCollected() {

        addPoints(
            POINTS.fuelCollected,
            "Fuel collected"
        );

        return score;
    }

    /* ==========================================
       10. COMPLETE MISSION
    ========================================== */

    function completeMission(missionName = "Orbit Architect") {

        if (!missionFinished) {

            missionFinished = true;

            addPoints(
                POINTS.missionComplete,
                "Mission completed"
            );

            addAchievement("MISSION COMPLETE");

            if (challengesCompleted >= 4) {
                addAchievement("PLANETARY EXPLORER");
            }

            if (samplesCollected >= 8) {
                addAchievement("EUROPA MASTER");
            }

            if (window.OrbitEvents) {

                OrbitEvents.emit("missionCompleted", {
                    missionName,
                    score
                });

            }
        }

        return getResults();
    }

    /* ==========================================
       11. PLAYER RANK
    ========================================== */

    function getRank() {

        if (score >= 2000) {
            return "LEGENDARY SPACE COMMANDER";
        }

        if (score >= 1500) {
            return "ELITE SPACE EXPLORER";
        }

        if (score >= 1000) {
            return "MASTER ASTRONAUT";
        }

        if (score >= 500) {
            return "SPACE EXPLORER";
        }

        return "ROOKIE EXPLORER";
    }

    /* ==========================================
       12. GET MISSION RESULTS
    ========================================== */

    function getResults() {

        return {

            score,

            rank: getRank(),

            challengesCompleted,

            samplesCollected,

            iceSamples: samplesCollected,

            planetsCompleted: [
                ...planetsCompleted
            ],

            achievements: [
                ...achievements
            ],

            missionCompleted: missionFinished,

            missionStartedAt

        };
    }

    /* ==========================================
       13. EVENT LISTENERS
    ========================================== */

    if (window.OrbitEvents) {

        // DO NOT listen for scoreReset here.
        // reset() already emits that event.
        // Listening to it here would cause infinite recursion.

        OrbitEvents.on("challengeCompleted", data => {

            completeChallenge(
                data?.planet || data?.planetName
            );

        });

        OrbitEvents.on("sampleCollected", () => {

            collectSample();

        });

        OrbitEvents.on("iceSampleCollected", () => {

            collectSample();

        });

        OrbitEvents.on("asteroidHit", () => {

            recordAsteroidHit();

        });

        OrbitEvents.on("fuelCollected", () => {

            recordFuelCollected();

        });

    }

    /* ==========================================
       14. PUBLIC SCORING API
    ========================================== */

    
window.OrbitScoring = {

    reset,
    addPoints,
    completeChallenge,
    collectSample,
    recordAsteroidHit,
    recordFuelCollected,
    completeMission,
    getResults,
    getRank,

    // Set the final calculated mission score.
    setFinalScore(finalScore) {

        score = Math.max(
            0,
            Math.min(1000, Math.round(Number(finalScore) || 0))
        );

        if (window.OrbitEvents) {
            OrbitEvents.emit("scoreChanged", {
                score,
                points: 0,
                reason: "Final mission score"
            });
        }

        return score;
    }

};


    /* ==========================================
       15. INITIALIZATION
    ========================================== */

    console.log(
        "ORBIT ARCHITECT SCORING SYSTEM READY"
    );

})();
