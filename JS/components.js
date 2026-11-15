// JS/components.js

export const COMPONENTS = {
    solar: {
        name: "Solar Array",
        mass: 80,
        power: 180,
        cost: 35
    },

    rtg: {
        name: "RTG Generator",
        mass: 45,
        power: 120,
        cost: 100
    },

    antenna: {
        name: "High-Gain Antenna",
        mass: 35,
        power: 25,
        cost: 25
    },

    camera: {
        name: "Science Camera",
        mass: 25,
        power: -35,
        cost: 20
    },

    radar: {
        name: "Ice-Penetrating Radar",
        mass: 60,
        power: -90,
        cost: 75
    },

    shield: {
        name: "Radiation Shielding",
        mass: 100,
        power: 0,
        cost: 60
    },

    engine: {
        name: "Propulsion System",
        mass: 110,
        power: -20,
        cost: 90
    }
};

export const BASE_SPACECRAFT = {
    budget: 500,
    mass: 120,
    power: 40
};