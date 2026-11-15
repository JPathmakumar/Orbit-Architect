
/* =====================================================
   ORBIT ARCHITECT - SAVE SYSTEM
   Saves and loads mission results.
===================================================== */

"use strict";

(function () {

    const STORAGE_KEY = "orbitArchitectResults";

    function save(data = {}) {
        let scoringData = {};

        if (window.OrbitScoring) {
            scoringData = OrbitScoring.getResults();
        }

        const previous = load() || {};

        const results = {
            ...previous,
            ...scoringData,
            ...data,

            score: Number(
                data.score ?? scoringData.score ?? 0
            ),

            rank:
                data.rank ||
                scoringData.rank ||
                "ROOKIE EXPLORER",

            missionsCompleted: Number(
                data.missionsCompleted ??
                previous.missionsCompleted ??
                0
            ),

            challengesCompleted: Number(
                data.challengesCompleted ??
                scoringData.challengesCompleted ??
                0
            ),

            samplesCollected: Number(
                data.samplesCollected ??
                data.iceSamples ??
                scoringData.samplesCollected ??
                0
            ),

            achievements: Array.isArray(data.achievements)
                ? data.achievements
                : (
                    Array.isArray(scoringData.achievements)
                        ? scoringData.achievements
                        : []
                ),

            savedAt: new Date().toISOString()
        };

        if (results.missionCompleted) {
            results.missionsCompleted = Math.max(
                1,
                Number(previous.missionsCompleted || 0) + 1
            );
        }

        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(results)
            );

            console.log("ORBIT RESULTS SAVED", results);

            if (window.OrbitEvents) {
                OrbitEvents.emit("resultsSaved", results);
            }

            return results;

        } catch (error) {
            console.error("Could not save Orbit Architect results:", error);
            return null;
        }
    }

    function load() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);

            if (!saved) return null;

            return JSON.parse(saved);

        } catch (error) {
            console.error("Could not load Orbit Architect results:", error);
            return null;
        }
    }

    function deleteSave() {
        localStorage.removeItem(STORAGE_KEY);
        console.log("ORBIT RESULTS DELETED");
    }

    function hasSave() {
        return load() !== null;
    }

    window.OrbitSave = {
        save,
        load,
        deleteSave,
        hasSave
    };

    console.log("ORBIT ARCHITECT SAVE SYSTEM READY");

})();
