// JS/resourceManager.js

import { COMPONENTS, BASE_SPACECRAFT } from "./components.js";

export function calculateStats(installedParts) {
    let budget = BASE_SPACECRAFT.budget;
    let mass = BASE_SPACECRAFT.mass;
    let power = BASE_SPACECRAFT.power;

    installedParts.forEach(partId => {
        const part = COMPONENTS[partId];

        if (!part) return;

        budget -= part.cost;
        mass += part.mass;
        power += part.power;
    });

    return {
        budget,
        mass,
        power,
        parts: installedParts.size
    };
}

export function canInstall(partId, installedParts) {
    const part = COMPONENTS[partId];

    if (!part) {
        return {
            allowed: false,
            message: "ERROR: COMPONENT NOT FOUND."
        };
    }

    if (installedParts.has(partId)) {
        return {
            allowed: false,
            message: "COMPONENT ALREADY INSTALLED."
        };
    }

    const stats = calculateStats(installedParts);

    if (stats.budget < part.cost) {
        return {
            allowed: false,
            message: "INSUFFICIENT MISSION BUDGET."
        };
    }

    return {
        allowed: true,
        message: `${part.name.toUpperCase()} READY FOR INSTALLATION.`
    };
}

export function checkEngineeringReadiness(installedParts) {
    const stats = calculateStats(installedParts);

    const problems = [];

    if (stats.budget < 0) {
        problems.push("Mission budget exceeded.");
    }

    if (stats.power < 0) {
        problems.push("Insufficient spacecraft power.");
    }

    return {
        ready: problems.length === 0,
        problems,
        stats
    };
}