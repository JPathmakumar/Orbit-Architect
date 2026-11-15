
/* =====================================================
   ORBIT ARCHITECT - EVENT MANAGER
   Allows mission.js, scoring.js and other systems
   to communicate with each other.
===================================================== */

"use strict";

(function () {
    const listeners = {};

    const OrbitEvents = {
        on(eventName, callback) {
            if (typeof callback !== "function") return;

            if (!listeners[eventName]) {
                listeners[eventName] = [];
            }

            listeners[eventName].push(callback);
        },

        off(eventName, callback) {
            if (!listeners[eventName]) return;

            listeners[eventName] = listeners[eventName].filter(
                listener => listener !== callback
            );
        },

        once(eventName, callback) {
            const wrapper = data => {
                this.off(eventName, wrapper);
                callback(data);
            };

            this.on(eventName, wrapper);
        },

        emit(eventName, data = {}) {
            console.log(`[ORBIT EVENT] ${eventName}`, data);

            const callbacks = listeners[eventName] || [];

            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(
                        `Orbit event error (${eventName}):`,
                        error
                    );
                }
            });
        },

        clear(eventName) {
            if (eventName) {
                delete listeners[eventName];
            } else {
                Object.keys(listeners).forEach(key => {
                    delete listeners[key];
                });
            }
        }
    };

    window.OrbitEvents = OrbitEvents;

    console.log("ORBIT ARCHITECT EVENT MANAGER READY");
})();
