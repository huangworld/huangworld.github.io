import { PHOTO_DIR, RAW_BASE, OWNER, REPO, BRANCH, DATA_PATH } from "./config.js";
import * as gh from "./gh.js";
import { searchTaxa, fetchDescription, debounce } from "./lookup.js";
import { compress } from "./image.js";

const $main = document.getElementById("main");
const $title = document.getElementById("view-title");
const $banner = document.getElementById("banner");
const $toast = document.getElementById("toast");
const $refresh = document.getElementById("refresh-btn");

const state = {
    data: null,
    sha: null,
    loadError: null,
    // session-local blob URLs for photos uploaded this session (raw CDN may lag)
    localPhotoUrls: new Map(),
};

const canWrite = () => Boolean(gh.token());

// ---------- date helpers (local calendar days, never UTC parsing) ----------

function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseLocalDate(s) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
}

function startOfToday() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween(a, b) {
    return Math.round((b - a) / 86400000);
}

// null → no schedule; {status:"never"} | {status:"due", daysOver} | {status:"upcoming", daysUntil}
function dueInfo(plant) {
    if (!plant.waterEveryDays || plant.waterEveryDays < 1) return null;
    const last = plant.log && plant.log[0] && plant.log[0].date;
    if (!last) return { status: "never" };
    const due = parseLocalDate(last);
    due.setDate(due.getDate() + plant.waterEveryDays);
    const daysOver = daysBetween(due, startOfToday());
    if (daysOver >= 0) return { status: "due", daysOver };
    return { status: "upcoming", daysUntil: -daysOver };
}

function relativeDay(dateStr) {
    const diff = daysBetween(parseLocalDate(dateStr), startOfToday());
    if (diff === 0) return "today";
    if (diff === 1) return "yesterday";
    return `${diff} days ago`;
}

// ---------- tiny DOM helpers ----------

function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (k === "class") node.className = v;
        else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
        else if (v !== false && v != null) node.setAttribute(k, v === true ? "" : v);
    }
    for (const c of children.flat()) {
        if (c == null || c === false) continue;
        node.append(c.nodeType ? c : document.createTextNode(c));
    }
    return node;
}

let toastTimer;
function toast(msg) {
    $toast.textContent = msg;
    $toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $toast.hidden = true; }, 3000);
}

function photoUrl(plant) {
    if (plant.photo) {
        if (state.localPhotoUrls.has(plant.photo)) return state.localPhotoUrls.get(plant.photo);
        return RAW_BASE + plant.photo;
    }
    if (plant.ref && plant.ref.photoUrl) return plant.ref.photoUrl;
    return null;
}

function thumb(plant) {
    const url = photoUrl(plant);
    return url
        ? el("img", { class: "thumb", src: url, alt: "", loading: "lazy" })
        : el("div", { class: "thumb placeholder" }, "🌱");
}

// ---------- data loading ----------

async function load({ silent = false } = {}) {
    if (!silent) $refresh.classList.add("spinning");
    try {
        const { data, sha } = await gh.getData();
        state.data = data;
        state.sha = sha;
        state.loadError = null;
    } catch (e) {
        state.loadError = e;
    } finally {
        $refresh.classList.remove("spinning");
    }
    updateBanner();
    render();
}

function updateBanner() {
    if (!canWrite()) {
        $banner.hidden = false;
        $banner.innerHTML = "";
        $banner.append(
            "Read-only — ",
            el("a", { href: "#/settings" }, "add a token in Settings"),
            " to log and edit."
        );
    } else {
        $banner.hidden = true;
    }
}

// Every mutation: apply against freshest data on GitHub, then refresh local state.
async function commitChange(mutate, message) {
    const next = await gh.putData(mutate, message);
    state.data = next;
    render();
}

function handleWriteError(e) {
    if (e.status === 401) {
        toast("Token rejected — expired? Check Settings.");
        location.hash = "#/settings";
    } else if (e.status === 403 && !canWrite()) {
        toast("Read-only: add a token in Settings first.");
    } else {
        toast(`Save failed: ${e.message || e}`);
    }
}

// ---------- routing ----------

const routes = [
    { pattern: /^#?\/?$/, view: viewToday, tab: "today", title: "Today" },
    { pattern: /^#\/all$/, view: viewAll, tab: "all", title: "Plants" },
    { pattern: /^#\/add$/, view: viewAdd, tab: "add", title: "New Plant" },
    { pattern: /^#\/settings$/, view: viewSettings, tab: "settings", title: "Settings" },
    { pattern: /^#\/plant\/(.+)$/, view: viewDetail, tab: "all", title: "Plant" },
    { pattern: /^#\/edit\/(.+)$/, view: viewEdit, tab: "all", title: "Edit Plant" },
];

function render() {
    const hash = location.hash || "#/";
    for (const r of routes) {
        const m = hash.match(r.pattern);
        if (m) {
            $title.textContent = r.title;
            document.querySelectorAll(".tabbar a").forEach((a) => {
                a.classList.toggle("active", a.dataset.tab === r.tab);
            });
            $main.innerHTML = "";
            r.view($main, ...m.slice(1));
            return;
        }
    }
    location.hash = "#/";
}

// ---------- views ----------

function loadingOrError(container) {
    if (state.loadError) {
        container.append(el("div", { class: "empty-state" },
            `Couldn't load plant data (${state.loadError.message || state.loadError}). `,
            el("button", { class: "btn small secondary", onclick: () => load() }, "Retry")));
        return true;
    }
    if (!state.data) {
        container.append(el("div", { class: "empty-state" }, "Loading…"));
        return true;
    }
    return false;
}

function waterButton(plant) {
    return el("button", {
        class: "btn small",
        disabled: !canWrite(),
        onclick: async (ev) => {
            const btn = ev.currentTarget;
            btn.disabled = true;
            try {
                await commitChange((d) => {
                    const p = d.plants.find((x) => x.id === plant.id);
                    if (p) p.log.unshift({ date: todayStr(), note: "" });
                    return d;
                }, `garden: water ${plant.name} (${todayStr()})`);
                toast(`Watered ${plant.name} 💧`);
            } catch (e) {
                btn.disabled = false;
                handleWriteError(e);
            }
        },
    }, "Watered");
}

function plantRow(plant, subEl, extra) {
    return el("div", { class: "card plant-row" },
        el("a", { class: "row-link", href: `#/plant/${plant.id}`, style: "display:flex;align-items:center;gap:0.85rem;flex:1;min-width:0" },
            thumb(plant),
            el("div", { class: "row-main" },
                el("div", { class: "row-title" }, plant.name),
                subEl)),
        extra || null);
}

function viewToday(container) {
    if (loadingOrError(container)) return;
    const due = [];
    for (const plant of state.data.plants) {
        const info = dueInfo(plant);
        if (info && (info.status === "due" || info.status === "never")) due.push({ plant, info });
    }
    due.sort((a, b) => (b.info.daysOver ?? -1) - (a.info.daysOver ?? -1));

    if (!due.length) {
        container.append(el("div", { class: "empty-state" },
            state.data.plants.length ? "Nothing due today." : "No plants yet — add your first one."));
        return;
    }
    for (const { plant, info } of due) {
        const label = info.status === "never"
            ? "never watered"
            : info.daysOver === 0 ? "due today" : `${info.daysOver} day${info.daysOver > 1 ? "s" : ""} overdue`;
        container.append(plantRow(plant,
            el("div", { class: `row-sub ${info.daysOver > 0 ? "overdue" : "due"}` }, label),
            waterButton(plant)));
    }
}

function viewAll(container) {
    if (loadingOrError(container)) return;
    if (!state.data.plants.length) {
        container.append(el("div", { class: "empty-state" }, "No plants yet — add your first one."));
        return;
    }
    const sorted = [...state.data.plants].sort((a, b) => a.name.localeCompare(b.name));
    for (const plant of sorted) {
        const last = plant.log && plant.log[0];
        const bits = [];
        if (plant.waterEveryDays) bits.push(`every ${plant.waterEveryDays} d`);
        bits.push(last ? `watered ${relativeDay(last.date)}` : "never watered");
        container.append(plantRow(plant, el("div", { class: "row-sub" }, bits.join(" · "))));
    }
}

function viewDetail(container, id) {
    if (loadingOrError(container)) return;
    const plant = state.data.plants.find((p) => p.id === id);
    if (!plant) {
        container.append(el("div", { class: "empty-state" }, "Plant not found."));
        return;
    }
    $title.textContent = plant.name;

    const url = photoUrl(plant);
    if (url) container.append(el("img", { class: "hero-photo", src: url, alt: plant.name }));
    if (!plant.photo && plant.ref && plant.ref.attribution) {
        container.append(el("div", { class: "attribution" }, `Reference photo: ${plant.ref.attribution}`));
    }

    if (plant.kind) container.append(el("div", {}, el("span", { class: "badge" }, plant.kind)));
    if (plant.description) container.append(el("p", { style: "margin-top:0.75rem" }, plant.description));
    if (plant.ref && plant.ref.wikiUrl) {
        container.append(el("p", {}, el("a", { href: plant.ref.wikiUrl, target: "_blank", rel: "noopener" }, "Wikipedia ↗")));
    }

    const info = dueInfo(plant);
    const schedule = plant.waterEveryDays
        ? `Water every ${plant.waterEveryDays} days` +
          (info?.status === "due" ? (info.daysOver === 0 ? " — due today" : ` — ${info.daysOver} d overdue`) :
           info?.status === "upcoming" ? ` — next in ${info.daysUntil} d` : "")
        : "No watering schedule";
    container.append(el("div", { class: "section-title" }, "Schedule"));
    container.append(el("div", { class: "card" }, schedule));

    // actions
    const noteInput = el("input", { type: "text", placeholder: "Optional note (e.g. deep soak)", style: "margin-bottom:0.6rem", disabled: !canWrite() });
    container.append(el("div", { class: "section-title" }, "Log watering"));
    container.append(noteInput);
    container.append(el("div", { class: "actions-row" },
        el("button", {
            class: "btn",
            disabled: !canWrite(),
            onclick: async (ev) => {
                ev.currentTarget.disabled = true;
                try {
                    const note = noteInput.value.trim();
                    await commitChange((d) => {
                        const p = d.plants.find((x) => x.id === plant.id);
                        if (p) p.log.unshift({ date: todayStr(), note });
                        return d;
                    }, `garden: water ${plant.name} (${todayStr()})`);
                    toast(`Watered ${plant.name} 💧`);
                } catch (e) {
                    ev.currentTarget.disabled = false;
                    handleWriteError(e);
                }
            },
        }, "Watered today"),
        el("a", { class: "btn secondary", href: `#/edit/${plant.id}`, style: canWrite() ? "" : "pointer-events:none;opacity:.45" }, "Edit"),
        el("button", {
            class: "btn danger",
            disabled: !canWrite(),
            onclick: async () => {
                if (!confirm(`Delete ${plant.name} and its diary?`)) return;
                try {
                    await commitChange((d) => {
                        d.plants = d.plants.filter((x) => x.id !== plant.id);
                        return d;
                    }, `garden: remove plant ${plant.name}`);
                    location.hash = "#/all";
                } catch (e) { handleWriteError(e); }
            },
        }, "Delete")));

    // diary
    container.append(el("div", { class: "section-title" }, "Watering diary"));
    if (!plant.log || !plant.log.length) {
        container.append(el("p", { class: "settings-note" }, "No entries yet."));
    } else {
        for (const entry of plant.log) {
            container.append(el("div", { class: "diary-entry" },
                el("span", {}, entry.date),
                el("span", { class: "note" }, entry.note || ""),
                canWrite() && el("button", {
                    class: "del", title: "Delete entry",
                    onclick: async () => {
                        if (!confirm(`Remove diary entry ${entry.date}?`)) return;
                        try {
                            // Match by content, not view index — fresh data may differ.
                            await commitChange((d) => {
                                const p = d.plants.find((x) => x.id === plant.id);
                                if (p) {
                                    const j = p.log.findIndex((l) => l.date === entry.date && l.note === entry.note);
                                    if (j !== -1) p.log.splice(j, 1);
                                }
                                return d;
                            }, `garden: remove log entry for ${plant.name}`);
                        } catch (e) { handleWriteError(e); }
                    },
                }, "✕")));
        }
    }
}

// ---------- add / edit form ----------

function plantForm(container, existing) {
    const draft = {
        name: existing?.name || "",
        kind: existing?.kind || "",
        description: existing?.description || "",
        waterEveryDays: existing?.waterEveryDays ?? 3,
        ref: existing?.ref ? { ...existing.ref } : null,
        photoBase64: null,
        photoBlobUrl: null,
    };

    const nameInput = el("input", { type: "text", placeholder: "e.g. Basil, Monstera…", value: draft.name, autocomplete: "off" });
    const descInput = el("textarea", { placeholder: "Notes about this plant…" }, draft.description);
    const results = el("div", { class: "lookup-results" });

    const runLookup = debounce(async () => {
        const q = nameInput.value.trim();
        results.innerHTML = "";
        if (q.length < 3) return;
        try {
            const taxa = await searchTaxa(q);
            for (const t of taxa) {
                results.append(el("button", {
                    class: "lookup-result", type: "button",
                    onclick: async (ev) => {
                        results.querySelectorAll(".lookup-result").forEach((b) => b.classList.remove("selected"));
                        ev.currentTarget.classList.add("selected");
                        if (t.commonName && !nameInput.value.trim()) nameInput.value = t.commonName;
                        draft.ref = { photoUrl: t.photoUrl, attribution: t.attribution, wikiUrl: t.wikiUrl };
                        try {
                            const { extract, wikiUrl } = await fetchDescription(t);
                            if (wikiUrl) draft.ref.wikiUrl = wikiUrl;
                            if (extract && !descInput.value.trim()) descInput.value = extract;
                        } catch { /* description stays manual */ }
                    },
                },
                    t.thumbUrl ? el("img", { src: t.thumbUrl, alt: "" }) : null,
                    el("span", {},
                        el("div", {}, t.commonName || t.scientificName),
                        el("div", { class: "sci" }, t.scientificName))));
            }
        } catch { /* lookup is best-effort */ }
    }, 300);
    nameInput.addEventListener("input", runLookup);

    // kind toggle
    const kinds = ["vegetable", "houseplant"];
    const kindBtns = kinds.map((k) =>
        el("button", {
            type: "button",
            class: draft.kind === k ? "selected" : "",
            onclick: (ev) => {
                draft.kind = draft.kind === k ? "" : k;
                kindBtns.forEach((b, i) => b.classList.toggle("selected", kinds[i] === draft.kind));
            },
        }, k));

    // photo
    const fileInput = el("input", { type: "file", accept: "image/*", capture: "environment", style: "display:none" });
    const preview = el("img", { class: "photo-preview", hidden: true, alt: "Photo preview" });
    const existingUrl = existing ? photoUrl(existing) : null;
    if (existingUrl && existing.photo) {
        preview.src = existingUrl;
        preview.hidden = false;
    }
    fileInput.addEventListener("change", async () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        try {
            const { blob, base64 } = await compress(file);
            draft.photoBase64 = base64;
            if (draft.photoBlobUrl) URL.revokeObjectURL(draft.photoBlobUrl);
            draft.photoBlobUrl = URL.createObjectURL(blob);
            preview.src = draft.photoBlobUrl;
            preview.hidden = false;
        } catch (e) {
            toast(`Couldn't process photo: ${e.message || e}`);
        }
    });

    // watering stepper
    const stepperValue = el("span", { class: "stepper-value" });
    const renderStepper = () => {
        stepperValue.textContent = draft.waterEveryDays
            ? `every ${draft.waterEveryDays} day${draft.waterEveryDays > 1 ? "s" : ""}`
            : "no schedule";
    };
    renderStepper();

    const saveBtn = el("button", { class: "btn", type: "button", disabled: !canWrite() }, existing ? "Save changes" : "Add plant");
    saveBtn.addEventListener("click", async () => {
        const name = nameInput.value.trim();
        if (!name) { toast("Give the plant a name."); return; }
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving…";
        try {
            const id = existing?.id || `p_${Date.now()}`;
            let photoPath = existing?.photo || null;
            if (draft.photoBase64) {
                photoPath = `${PHOTO_DIR}/${id}-${Date.now()}.jpg`;
                await gh.putPhoto(photoPath, draft.photoBase64, `garden: photo for ${name}`);
                state.localPhotoUrls.set(photoPath, draft.photoBlobUrl);
            }
            const fields = {
                name,
                kind: draft.kind,
                description: descInput.value.trim(),
                photo: photoPath,
                ref: draft.ref,
                waterEveryDays: draft.waterEveryDays || null,
            };
            await commitChange((d) => {
                if (existing) {
                    const p = d.plants.find((x) => x.id === id);
                    if (p) Object.assign(p, fields);
                } else {
                    d.plants.push({ id, ...fields, createdAt: new Date().toISOString(), log: [] });
                }
                return d;
            }, existing ? `garden: update ${name}` : `garden: add plant ${name}`);
            toast(existing ? "Saved." : `Added ${name} 🌱`);
            location.hash = `#/plant/${id}`;
        } catch (e) {
            saveBtn.disabled = false;
            saveBtn.textContent = existing ? "Save changes" : "Add plant";
            handleWriteError(e);
        }
    });

    container.append(
        el("label", { class: "field" },
            el("span", { class: "label-text" }, "Name"),
            nameInput),
        results,
        el("label", { class: "field" },
            el("span", { class: "label-text" }, "Type"),
            el("div", { class: "kind-toggle" }, kindBtns)),
        el("label", { class: "field" },
            el("span", { class: "label-text" }, "Description"),
            descInput),
        el("div", { class: "field" },
            el("span", { class: "label-text" }, "Photo"),
            el("button", { class: "btn secondary", type: "button", onclick: () => fileInput.click() }, "📷 Take / choose photo"),
            fileInput,
            preview),
        el("div", { class: "field" },
            el("span", { class: "label-text" }, "Watering"),
            el("div", { class: "stepper" },
                el("button", { type: "button", onclick: () => { draft.waterEveryDays = Math.max(0, (draft.waterEveryDays || 0) - 1); renderStepper(); } }, "−"),
                stepperValue,
                el("button", { type: "button", onclick: () => { draft.waterEveryDays = (draft.waterEveryDays || 0) + 1; renderStepper(); } }, "＋"))),
        el("div", { class: "actions-row" }, saveBtn));
    if (!canWrite()) {
        container.append(el("p", { class: "settings-note" }, "Read-only — add a token in Settings to save."));
    }
}

function viewAdd(container) {
    if (loadingOrError(container)) return;
    plantForm(container, null);
}

function viewEdit(container, id) {
    if (loadingOrError(container)) return;
    const plant = state.data.plants.find((p) => p.id === id);
    if (!plant) {
        container.append(el("div", { class: "empty-state" }, "Plant not found."));
        return;
    }
    plantForm(container, plant);
}

// ---------- settings ----------

function viewSettings(container) {
    const status = el("div", { class: "token-status" });
    const input = el("input", { type: "password", placeholder: "github_pat_…", autocomplete: "off" });
    if (canWrite()) {
        status.textContent = "Token saved on this device — writes enabled.";
        status.classList.add("ok");
    } else {
        status.textContent = "No token — the dashboard is read-only on this device.";
    }

    container.append(
        status,
        el("label", { class: "field" },
            el("span", { class: "label-text" }, "Fine-grained personal access token"),
            input),
        el("div", { class: "actions-row" },
            el("button", {
                class: "btn", type: "button",
                onclick: async (ev) => {
                    const t = input.value.trim();
                    if (!t) return;
                    ev.currentTarget.disabled = true;
                    const ok = await gh.validateToken(t).catch(() => false);
                    ev.currentTarget.disabled = false;
                    if (!ok) {
                        status.textContent = "That token couldn't access the repo — check its scope and expiry.";
                        status.className = "token-status bad";
                        return;
                    }
                    gh.setToken(t);
                    input.value = "";
                    status.textContent = "Token saved — writes enabled.";
                    status.className = "token-status ok";
                    updateBanner();
                    load({ silent: true });
                },
            }, "Save token"),
            el("button", {
                class: "btn secondary", type: "button",
                onclick: () => {
                    gh.clearToken();
                    status.textContent = "Token forgotten — read-only.";
                    status.className = "token-status";
                    updateBanner();
                    render();
                },
            }, "Forget token")),
        el("div", { class: "section-title" }, "How to create the token"),
        el("div", { class: "settings-note" },
            el("ol", {},
                el("li", {}, el("a", { href: "https://github.com/settings/personal-access-tokens/new", target: "_blank", rel: "noopener" }, "GitHub → generate a fine-grained token ↗")),
                el("li", {}, `Repository access: Only select repositories → ${OWNER}/${REPO}.`),
                el("li", {}, "Permissions → Repository permissions → Contents: Read and write. Nothing else."),
                el("li", {}, "Set an expiration (up to 1 year), generate, and paste the github_pat_… value above.")),
            el("p", {}, "The token is stored only in this browser's localStorage and sent only to api.github.com. Anyone with access to this unlocked device could use it, but its scope is limited to this one public repo's contents.")),
        el("div", { class: "section-title" }, "Data"),
        el("div", { class: "settings-note" },
            el("p", {},
                "All entries, diaries, and photos live in the site repo — ",
                el("a", { href: `https://github.com/${OWNER}/${REPO}/blob/${BRANCH}/${DATA_PATH}`, target: "_blank", rel: "noopener" }, "open plants.json on GitHub ↗"),
                ". Every save is a commit, so the git history is the audit log.")));
}

// ---------- boot ----------

window.addEventListener("hashchange", render);
$refresh.addEventListener("click", () => load());
updateBanner();
render();
load({ silent: true });
