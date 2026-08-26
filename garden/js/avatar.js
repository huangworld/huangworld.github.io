// Procedural isometric plant avatars, generated locally and deterministically
// from the plant's name: the name seeds pot shape/color, foliage archetype
// variation, leaf count, and hue, so every plant gets its own icon and the
// same name renders identically on every device.

// ---------- seeded randomness ----------

function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

function mulberry32(seed) {
    let a = seed;
    return () => {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ---------- archetype detection ----------

const ARCHETYPES = [
    [/monstera|philodendron|split/, "splitleaf"],
    [/pothos|ivy|vine|trailing|string of/, "trailing"],
    [/snake ?plant|sansevieria|dracaena|yucca|agave/, "spiky"],
    [/palm|fern|areca|majesty/, "fronds"],
    [/cactus|succulent|aloe|euphorbia/, "cactus"],
    [/tomato/, ["fruit", "#e23b2e"]],
    [/strawberr/, ["fruit", "#d5294a"]],
    [/blueberr/, ["fruit", "#4a5fb5"]],
    [/pepper|chili|chilli|jalape/, ["fruit", "#d94f1e"]],
    [/lemon|citrus|yuzu/, ["fruit", "#e8c332"]],
    [/lime/, ["fruit", "#9dbf3b"]],
    [/orange|kumquat/, ["fruit", "#e8912d"]],
    [/grape/, ["fruit", "#7b4fa5"]],
    [/eggplant|aubergine/, ["fruit", "#5c3a77"]],
    [/cucumber|zucchini|courgette|bean|\bpeas?\b|okra/, ["fruit", "#4d8f3c"]],
    [/carrot/, ["root", "#e8862d"]],
    [/radish/, ["root", "#d5294a"]],
    [/beet/, ["root", "#8f2050"]],
    [/potato|ginger|turmeric/, ["root", "#c9a15f"]],
    [/onion|shallot/, ["root", "#b48ac2"]],
    [/garlic/, ["root", "#e8e0d2"]],
    [/lettuce|salad|leafy|kale|spinach|chard|bok ?choy|cabbage|arugula|greens/, "rosette"],
    [/basil|mint|herb|cilantro|coriander|parsley|rosemary|thyme|oregano|sage|dill|chive|lemongrass/, "herb"],
    [/rose\b|tulip|hibiscus|orchid|peony|lily|jasmine|blossom|flower|geranium|begonia|violet|daisy/, "flower"],
    [/sunflower|marigold/, ["flower", "#e8b62d"]],
    [/lavender/, ["flower", "#8f7bc9"]],
];

function archetypeFor(name, kind) {
    const n = (name || "").toLowerCase();
    for (const [re, a] of ARCHETYPES) {
        if (re.test(n)) return Array.isArray(a) ? a : [a, null];
    }
    return [kind === "houseplant" ? "broadleaf" : "sprout", null];
}

// ---------- palette helpers ----------

const hsl = (h, s, l) => `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;

const POT_PALETTES = [
    [14, 62, 56],   // terracotta
    [18, 30, 75],   // sand
    [210, 12, 78],  // porcelain grey
    [205, 38, 55],  // dusty blue
    [340, 30, 72],  // blush
    [160, 22, 62],  // sage
    [42, 48, 62],   // mustard
    [0, 0, 92],     // white
];

// ---------- svg builders ----------

function leafEllipse(cx, cy, rx, ry, rot, fill, opacity = 1) {
    return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" opacity="${opacity}" transform="rotate(${rot} ${cx} ${cy})"/>`;
}

function pot(rng) {
    const [ph, ps, pl] = POT_PALETTES[Math.floor(rng() * POT_PALETTES.length)];
    const base = hsl(ph, ps, pl);
    const light = hsl(ph, ps, Math.min(96, pl + 12));
    const dark = hsl(ph, ps, pl - 14);
    const soil = "#6b4a33";
    const style = Math.floor(rng() * 3);
    const shadow = `<ellipse cx="32" cy="57.5" rx="14" ry="2.8" fill="rgba(0,0,0,0.13)"/>`;
    if (style === 0) {
        // isometric cube planter
        return shadow +
            `<path d="M21 41 L32 45 L32 57 L21 53 Z" fill="${base}"/>` +
            `<path d="M43 41 L32 45 L32 57 L43 53 Z" fill="${dark}"/>` +
            `<path d="M21 41 L32 37 L43 41 L32 45 Z" fill="${light}"/>` +
            `<path d="M24.5 41 L32 38.3 L39.5 41 L32 43.7 Z" fill="${soil}"/>`;
    }
    if (style === 1) {
        // tapered pot with rim
        return shadow +
            `<path d="M22.5 43 L41.5 43 L38.8 56.5 L25.2 56.5 Z" fill="${base}"/>` +
            `<path d="M32 43 L41.5 43 L38.8 56.5 L32 56.5 Z" fill="rgba(0,0,0,0.10)"/>` +
            `<rect x="21" y="39.5" width="22" height="4.6" rx="2.2" fill="${light}"/>` +
            `<ellipse cx="32" cy="40.6" rx="8.6" ry="2" fill="${soil}"/>`;
    }
    // round bowl
    return shadow +
        `<path d="M21.5 42 Q22 56.5 32 56.5 Q42 56.5 42.5 42 Z" fill="${base}"/>` +
        `<path d="M32 42 Q42 56.5 32 56.5 Q42 56.5 42.5 42 Z" fill="rgba(0,0,0,0.10)"/>` +
        `<ellipse cx="32" cy="42" rx="10.5" ry="3" fill="${light}"/>` +
        `<ellipse cx="32" cy="42" rx="7.8" ry="2.1" fill="${soil}"/>`;
}

function stems(count, rng, color) {
    let s = "";
    for (let i = 0; i < count; i++) {
        const x = 32 + (rng() - 0.5) * 8;
        s += `<path d="M32 42 Q${x} 34 ${x + (rng() - 0.5) * 4} ${26 + rng() * 6}" stroke="${color}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
    }
    return s;
}

function foliage(arch, accent, rng) {
    const hue = 105 + rng() * 45;              // per-plant green
    const leaf = hsl(hue, 42, 38);
    const leafLight = hsl(hue, 45, 50);
    const leafDark = hsl(hue, 45, 27);
    const stem = hsl(hue, 35, 32);
    let s = "";

    const fan = (n, spread, cy, rx, ry, lift) => {
        for (let i = 0; i < n; i++) {
            const t = n === 1 ? 0 : i / (n - 1) - 0.5;
            const a = t * spread + (rng() - 0.5) * 8;
            const cx = 32 + t * spread * 0.28 + (rng() - 0.5) * 2;
            const y = cy - (1 - Math.abs(t) * 1.4) * lift + (rng() - 0.5) * 2;
            const fill = i % 2 ? leafLight : leaf;
            s += `<path d="M32 42 Q${(32 + cx) / 2 + t * 4} ${y + ry} ${cx} ${y}" stroke="${stem}" stroke-width="1.2" fill="none"/>`;
            s += leafEllipse(cx, y, rx + rng() * 1.5, ry + rng() * 2, a, fill);
            s += `<line x1="${cx}" y1="${y + ry * 0.6}" x2="${cx}" y2="${y - ry * 0.6}" stroke="${leafDark}" stroke-width="0.7" opacity="0.5" transform="rotate(${a} ${cx} ${y})"/>`;
        }
    };

    switch (arch) {
        case "broadleaf":
            fan(4 + Math.floor(rng() * 3), 95, 26, 5.5, 9, 8);
            break;
        case "splitleaf": {
            const n = 3 + Math.floor(rng() * 2);
            fan(n, 90, 25, 6.5, 10, 8);
            // monstera-style slits cut across the leaves in background color
            for (let i = 0; i < n * 2; i++) {
                const x = 20 + rng() * 24, y = 16 + rng() * 16, a = -30 + rng() * 60;
                s += `<rect x="${x}" y="${y}" width="6.5" height="1.6" rx="0.8" fill="#FBFAF8" transform="rotate(${a} ${x} ${y})"/>`;
            }
            break;
        }
        case "trailing": {
            // vines spilling over the pot with little heart leaves
            const vines = 3 + Math.floor(rng() * 2);
            for (let v = 0; v < vines; v++) {
                const dir = v % 2 ? 1 : -1;
                const ex = 32 + dir * (10 + rng() * 9);
                const ey = 46 + rng() * 9;
                s += `<path d="M32 41 Q${32 + dir * 7} ${33 + rng() * 4} ${ex} ${ey}" stroke="${stem}" stroke-width="1.3" fill="none"/>`;
                const n = 3 + Math.floor(rng() * 2);
                for (let i = 1; i <= n; i++) {
                    const t = i / n;
                    const lx = 32 + (ex - 32) * t + (rng() - 0.5) * 3;
                    const ly = 41 + (ey - 41) * t * t - 3 + (rng() - 0.5) * 2;
                    s += leafEllipse(lx, ly, 3.2, 4.1, dir * (20 + rng() * 40), i % 2 ? leafLight : leaf);
                }
            }
            s += leafEllipse(30, 34, 4, 5.5, -15, leaf) + leafEllipse(35, 33, 3.6, 5, 20, leafLight);
            break;
        }
        case "spiky": {
            const blades = 5 + Math.floor(rng() * 3);
            for (let i = 0; i < blades; i++) {
                const t = i / (blades - 1) - 0.5;
                const x = 32 + t * 14;
                const h = 20 + rng() * 9 - Math.abs(t) * 8;
                const bend = t * 6 + (rng() - 0.5) * 3;
                s += `<path d="M${x - 1.7} 42 Q${x + bend} ${42 - h * 0.6} ${x + bend} ${42 - h} Q${x + bend + 1} ${42 - h * 0.6} ${x + 1.7} 42 Z" fill="${i % 2 ? leafLight : leaf}"/>`;
                s += `<path d="M${x - 0.4} 42 Q${x + bend} ${42 - h * 0.6} ${x + bend} ${42 - h}" stroke="${hsl(58, 50, 55)}" stroke-width="0.6" fill="none" opacity="0.7"/>`;
            }
            break;
        }
        case "fronds": {
            const n = 5 + Math.floor(rng() * 3);
            for (let i = 0; i < n; i++) {
                const t = i / (n - 1) - 0.5;
                const a = t * 110;
                const ex = 32 + Math.sin((a * Math.PI) / 180) * 16;
                const ey = 40 - Math.cos((a * Math.PI) / 180) * 17 - 2;
                s += `<path d="M32 42 Q${(32 + ex) / 2 + t * 6} ${(42 + ey) / 2 - 6} ${ex} ${ey}" stroke="${i % 2 ? leafLight : leaf}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
                for (let j = 1; j <= 3; j++) {
                    const ft = j / 4;
                    const fx = 32 + (ex - 32) * ft;
                    const fy = 42 + (ey - 42) * ft - 6 * ft;
                    s += leafEllipse(fx, fy, 1.6, 3.4, a + 90 + (rng() - 0.5) * 20, i % 2 ? leafLight : leaf, 0.9);
                }
            }
            break;
        }
        case "cactus": {
            const g = hsl(hue + 10, 38, 42), gl = hsl(hue + 10, 38, 52);
            s += `<rect x="27.5" y="18" width="9" height="26" rx="4.5" fill="${g}"/>`;
            s += `<rect x="27.5" y="18" width="4.5" height="26" rx="2.2" fill="${gl}" opacity="0.5"/>`;
            if (rng() > 0.35) s += `<path d="M27.5 30 Q20 29 20.5 22 Q20.5 19 23 19 Q25.5 19 25.5 22 L25.5 26 Q25.5 28 27.5 28 Z" fill="${g}"/>`;
            if (rng() > 0.35) s += `<path d="M36.5 33 Q44 32 43.5 25 Q43.5 22 41 22 Q38.5 22 38.5 25 L38.5 29 Q38.5 31 36.5 31 Z" fill="${g}"/>`;
            for (let i = 0; i < 10; i++) {
                s += `<circle cx="${26 + rng() * 12}" cy="${20 + rng() * 22}" r="0.55" fill="${hsl(60, 30, 80)}"/>`;
            }
            if (rng() > 0.5) s += `<circle cx="32" cy="16.5" r="2.6" fill="${accent || "#e06fa4"}"/><circle cx="32" cy="16.5" r="1" fill="#fff" opacity="0.7"/>`;
            break;
        }
        case "rosette": {
            const n = 8 + Math.floor(rng() * 3);
            for (let i = 0; i < n; i++) {
                const a = (i / n) * 360;
                const cx = 32 + Math.sin((a * Math.PI) / 180) * 8;
                const cy = 33 + Math.cos((a * Math.PI) / 180) * 5.5;
                s += leafEllipse(cx, cy, 4.5, 7.5, a, i % 2 ? leafLight : leaf, 0.95);
            }
            s += leafEllipse(32, 32, 4.5, 5.5, 0, hsl(hue, 40, 55));
            break;
        }
        case "herb": {
            s += stems(4 + Math.floor(rng() * 2), rng, stem);
            const n = 11 + Math.floor(rng() * 5);
            for (let i = 0; i < n; i++) {
                const cx = 22 + rng() * 20;
                const cy = 20 + rng() * 16;
                s += leafEllipse(cx, cy, 2.1, 3.4, rng() * 360, rng() > 0.5 ? leafLight : leaf, 0.95);
            }
            break;
        }
        case "flower": {
            const petal = accent || hsl(rng() * 360, 62, 66);
            s += `<path d="M32 42 Q31 30 32 22" stroke="${stem}" stroke-width="1.6" fill="none"/>`;
            s += leafEllipse(28, 34, 2.6, 4.2, -35, leaf) + leafEllipse(36, 31, 2.6, 4.2, 35, leafLight);
            const petals = 5 + Math.floor(rng() * 2);
            for (let i = 0; i < petals; i++) {
                const a = (i / petals) * 360 + rng() * 10;
                const cx = 32 + Math.sin((a * Math.PI) / 180) * 4.6;
                const cy = 19 + Math.cos((a * Math.PI) / 180) * 4.6;
                s += leafEllipse(cx, cy, 3, 4.4, a, petal);
            }
            s += `<circle cx="32" cy="19" r="2.7" fill="${hsl(45, 80, 60)}"/>`;
            break;
        }
        case "fruit": {
            s += stems(3, rng, stem);
            const n = 9 + Math.floor(rng() * 4);
            for (let i = 0; i < n; i++) {
                s += leafEllipse(22 + rng() * 20, 19 + rng() * 16, 2.4, 3.8, rng() * 360, rng() > 0.5 ? leafLight : leaf, 0.95);
            }
            const fruits = 3 + Math.floor(rng() * 3);
            for (let i = 0; i < fruits; i++) {
                const cx = 23 + rng() * 18, cy = 22 + rng() * 14, r = 2.4 + rng() * 1;
                s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${accent}"/>`;
                s += `<circle cx="${cx - r * 0.35}" cy="${cy - r * 0.35}" r="${r * 0.3}" fill="#fff" opacity="0.5"/>`;
            }
            break;
        }
        case "root": {
            // feathery top + the root itself front and center
            for (let i = 0; i < 6; i++) {
                const t = i / 5 - 0.5;
                s += `<path d="M32 30 Q${32 + t * 12} ${22 + rng() * 3} ${32 + t * 16} ${13 + rng() * 5}" stroke="${i % 2 ? leafLight : leaf}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
            }
            const rc = accent || "#e8862d";
            s += `<path d="M27 30 Q27 28.5 32 28.5 Q37 28.5 37 30 L33.5 44.5 Q32.7 46.5 32 46.5 Q31.3 46.5 30.5 44.5 Z" fill="${rc}"/>`;
            s += `<path d="M29.5 33 L34 33 M30 36.5 L33.8 36.5 M30.6 40 L33.2 40" stroke="rgba(0,0,0,0.18)" stroke-width="0.8"/>`;
            break;
        }
        default: // sprout
            s += `<path d="M32 42 Q31.5 32 32 26" stroke="${stem}" stroke-width="1.7" fill="none"/>`;
            s += leafEllipse(26.5, 26, 4.6, 6.4, -38, leaf);
            s += leafEllipse(37.5, 24.5, 4.6, 6.4, 38, leafLight);
            if (rng() > 0.5) s += leafEllipse(32, 19, 3, 4.5, (rng() - 0.5) * 20, hsl(hue, 45, 44));
            break;
    }
    return s;
}

// Returns an <svg> element. Same (name, kind) → identical icon everywhere.
export function plantAvatar(name, kind, className) {
    const seed = hashString((name || "plant").trim().toLowerCase());
    const rng = mulberry32(seed);
    const [arch, accent] = archetypeFor(name, kind);
    const flip = rng() > 0.5;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 64 64");
    if (className) svg.setAttribute("class", className);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-hidden", "true");
    const body = `<g${flip ? ' transform="scale(-1,1) translate(-64,0)"' : ""}>${pot(rng)}${foliage(arch, accent, rng)}</g>`;
    svg.innerHTML = body;
    return svg;
}
