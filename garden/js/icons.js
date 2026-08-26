// Fluent 3D emoji icons for UI chrome (assets/emoji, MIT — see assets/emoji/LICENSE.md).
// Per-plant icons are generated locally in avatar.js.

export const ICON_BASE = "/assets/emoji/";

export const UI = {
    today: "sun",
    plants: "potted-plant",
    add: "plus",
    settings: "gear",
    camera: "camera",
    water: "droplet",
    overdue: "alarm-clock",
    seedling: "seedling",
};

export function iconUrl(icon) {
    return `${ICON_BASE}${icon}.png`;
}
