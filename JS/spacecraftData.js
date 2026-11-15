/* =====================================================
   ORBIT ARCHITECT - SPACECRAFT DATA + EVALUATION
   Shared by design.html and mission.js (optional hook).

   ALL VALUES BELOW ARE FICTIONAL GAME SPECIFICATIONS.
   They are not NASA engineering data.

   Exposes: window.OrbitDesign
===================================================== */
"use strict";

(function () {

    const STORAGE_KEY = "orbitSpacecraftDesign";
    const BUDGET = 1200; // game credits

    const SYSTEMS = [
        {
            id: "engine",
            label: "Engine",
            perfLabel: "Thrust",
            options: [
                {
                    id: "standard",
                    name: "Standard Engine",
                    description: "A dependable chemical thruster built for steady cruising. Easy to power and easy to afford.",
                    mass: 420, cost: 150, power: -40, rating: 55,
                    pros: ["Low power draw", "Affordable", "Light enough to keep the ship agile"],
                    cons: ["Lower top speed", "Slow to build up speed"]
                },
                {
                    id: "advanced",
                    name: "Advanced Engine",
                    description: "A high-output plasma drive that reaches much higher cruising speeds, at a steep price in power and mass.",
                    mass: 610, cost: 380, power: -180, rating: 85,
                    pros: ["High top speed", "Faster boost"],
                    cons: ["Heavy", "Expensive", "Needs a lot of electrical power"]
                }
            ]
        },
        {
            id: "fuel",
            label: "Fuel Tank",
            perfLabel: "Capacity",
            options: [
                {
                    id: "compact",
                    name: "Compact Fuel Tank",
                    description: "A small, lightweight tank. Good for short, efficient flights but it runs dry sooner.",
                    mass: 300, cost: 100, power: 0, rating: 45,
                    pros: ["Light", "Cheap", "No power needed"],
                    cons: ["Short range", "Fuel drains faster over a long mission"]
                },
                {
                    id: "extended",
                    name: "Extended Fuel Tank",
                    description: "Double-length tank sized for the long trip out to Jupiter and Europa.",
                    mass: 640, cost: 260, power: 0, rating: 85,
                    pros: ["Long range", "Fuel lasts much longer"],
                    cons: ["Adds a lot of mass", "Costs more"]
                }
            ]
        },
        {
            id: "radar",
            label: "Radar",
            perfLabel: "Detection",
            options: [
                {
                    id: "basic",
                    name: "Basic Radar",
                    description: "A small dish with a short scanning range. Enough to spot trouble, but not far ahead.",
                    mass: 90, cost: 80, power: -60, rating: 40,
                    pros: ["Light", "Cheap", "Modest power use"],
                    cons: ["Short detection range", "Less warning in an asteroid field"]
                },
                {
                    id: "advanced",
                    name: "Advanced Radar",
                    description: "A phased-array style scanner that tracks hazards far ahead of the ship.",
                    mass: 160, cost: 260, power: -140, rating: 85,
                    pros: ["Long detection range", "More time to react"],
                    cons: ["Power hungry", "Expensive"]
                }
            ]
        },
        {
            id: "shield",
            label: "Shield",
            perfLabel: "Protection",
            options: [
                {
                    id: "lightweight",
                    name: "Lightweight Shield",
                    description: "A thin deflector layer that adds little weight and takes only a small hit from impacts.",
                    mass: 250, cost: 120, power: -50, rating: 40,
                    pros: ["Light", "Cheap", "Low power use"],
                    cons: ["Weak against asteroid impacts"]
                },
                {
                    id: "heavy",
                    name: "Heavy Shield",
                    description: "Layered armour with an energy field. Built to survive an asteroid storm.",
                    mass: 700, cost: 340, power: -120, rating: 85,
                    pros: ["Strong impact protection", "Hull survives the storm"],
                    cons: ["Very heavy", "Expensive", "Draws a lot of power"]
                }
            ]
        },
        {
            id: "power",
            label: "Power System",
            perfLabel: "Output",
            options: [
                {
                    id: "solar",
                    name: "Solar Power",
                    description: "Folding solar arrays. Clean and light, but sunlight gets weaker far from the Sun.",
                    mass: 180, cost: 140, power: 300, rating: 50,
                    pros: ["Light", "Cheap", "No fuel needed"],
                    cons: ["Low output", "Weak near Jupiter and Europa"]
                },
                {
                    id: "nuclear",
                    name: "Nuclear Power",
                    description: "A radioisotope generator that keeps producing steady power anywhere in the Solar System.",
                    mass: 380, cost: 420, power: 550, rating: 90,
                    pros: ["High, steady output", "Works in deep space"],
                    cons: ["Heavy", "Most expensive part"]
                }
            ]
        }
    ];

    const DEFAULT_SELECTION = {
        engine: "standard",
        fuel: "compact",
        radar: "basic",
        shield: "lightweight",
        power: "solar"
    };

    function clamp(v, lo, hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    function getSystem(id) {
        return SYSTEMS.find(s => s.id === id);
    }

    function getOption(systemId, optionId) {
        const system = getSystem(systemId);
        if (!system) return null;
        return system.options.find(o => o.id === optionId) || system.options[0];
    }

    // Make sure a selection is complete and contains only real option ids.
    function sanitize(selection) {
        const clean = {};
        SYSTEMS.forEach(system => {
            const wanted = selection && selection[system.id];
            const found = system.options.some(o => o.id === wanted);
            clean[system.id] = found ? wanted : DEFAULT_SELECTION[system.id];
        });
        return clean;
    }

    // Mass range, used to turn total mass into a 0..1 penalty.
    const MIN_MASS = SYSTEMS.reduce((t, s) => t + Math.min(...s.options.map(o => o.mass)), 0);
    const MAX_MASS = SYSTEMS.reduce((t, s) => t + Math.max(...s.options.map(o => o.mass)), 0);

    function evaluate(rawSelection) {
        const selection = sanitize(rawSelection);
        const chosen = {};
        SYSTEMS.forEach(s => { chosen[s.id] = getOption(s.id, selection[s.id]); });

        let mass = 0, cost = 0, generation = 0, consumption = 0;

        Object.values(chosen).forEach(o => {
            mass += o.mass;
            cost += o.cost;
            if (o.power > 0) generation += o.power;
            else consumption += -o.power;
        });

        const margin = generation - consumption;
        const massPenalty = clamp((mass - MIN_MASS) / (MAX_MASS - MIN_MASS), 0, 1);

        const ratings = {
            speed: Math.round(chosen.engine.rating * (1 - 0.25 * massPenalty)),
            range: Math.round(chosen.fuel.rating * (1 - 0.15 * massPenalty)),
            detection: chosen.radar.rating,
            protection: chosen.shield.rating,
            power: clamp(Math.round(50 + margin / 6), 0, 100)
        };

        const budgetOk = cost <= BUDGET;
        const powerOk = margin >= 0;

        const warnings = [];
        if (!budgetOk) {
            warnings.push({ level: "error", text: "Over budget by " + (cost - BUDGET) + " credits. Choose cheaper parts." });
        }
        if (!powerOk) {
            warnings.push({ level: "warn", text: "Power shortfall of " + (-margin) + " W. Your ship will lose power during the mission." });
        }
        if (massPenalty > 0.7) {
            warnings.push({ level: "warn", text: "Very heavy design. Top speed and range are reduced." });
        }
        if (chosen.power.id === "solar") {
            warnings.push({ level: "info", text: "Solar output is weaker far from the Sun (Jupiter and Europa)." });
        }

        return {
            selection, chosen, mass, cost, generation, consumption, margin,
            massPenalty, ratings, budgetOk, powerOk, valid: budgetOk, warnings
        };
    }

    // Values the mission engine can use. Everything is a multiplier or a
    // plain number so mission.js only needs to read it.
    function modifiersFor(rawSelection) {
        const e = evaluate(rawSelection);

        return {
            speedMult: 0.8 + (e.ratings.speed / 100) * 0.5,
            fuelDrainMult: clamp(1.4 - (e.ratings.range / 100) * 0.8, 0.6, 1.4),
            damageMult: clamp(1.25 - (e.ratings.protection / 100) * 0.7, 0.4, 1.25),
            radarRange: Math.round(1000 + e.ratings.detection * 20),
            powerDrain: e.margin < 0 ? (-e.margin) / 12000 : 0,
            solar: e.selection.power === "solar",
            nuclear: e.selection.power === "nuclear"
        };
    }

    function save(selection) {
        try {
            const clean = sanitize(selection);
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                selection: clean,
                savedAt: new Date().toISOString()
            }));
            return true;
        } catch (error) {
            console.warn("Could not save spacecraft design.", error);
            return false;
        }
    }

    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return parsed && parsed.selection ? sanitize(parsed.selection) : null;
        } catch (error) {
            return null;
        }
    }

    function clear() {
        try { localStorage.removeItem(STORAGE_KEY); } catch (error) { /* ignore */ }
    }

    // Returns null when the player never designed a ship, so mission.js
    // keeps its original behaviour.
    function getModifiers() {
        const selection = load();
        return selection ? modifiersFor(selection) : null;
    }

    window.OrbitDesign = {
        STORAGE_KEY, BUDGET, SYSTEMS, DEFAULT_SELECTION,
        getSystem, getOption, sanitize, evaluate,
        modifiersFor, getModifiers, save, load, clear
    };

})();