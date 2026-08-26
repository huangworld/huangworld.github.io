// GitHub Contents API client: plants.json read/write + photo uploads.
// All writes go through putData(mutate, message) so concurrent edits from
// two devices re-apply against the freshest data instead of clobbering.

import { API_BASE, BRANCH, DATA_PATH, RAW_BASE, TOKEN_KEY } from "./config.js";

export function token() {
    try { return localStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; }
}
export function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }

function headers() {
    const h = {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    };
    const t = token();
    if (t) h.Authorization = "Bearer " + t;
    return h;
}

// The API returns base64 with embedded newlines; strip them, then decode
// the bytes as UTF-8 (plain atob alone corrupts non-ASCII notes).
function b64DecodeUtf8(b64) {
    const bin = atob(b64.replace(/\n/g, ""));
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

function b64EncodeUtf8(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin);
}

export class GhError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

async function apiFetch(path, opts = {}) {
    const resp = await fetch(API_BASE + path, { ...opts, headers: { ...headers(), ...(opts.headers || {}) } });
    if (!resp.ok) {
        let detail = "";
        try { detail = (await resp.json()).message || ""; } catch { /* ignore */ }
        throw new GhError(resp.status, detail || `GitHub API ${resp.status}`);
    }
    return resp.json();
}

// Returns { data, sha }. sha is null when served from the raw fallback
// (unauthenticated + rate-limited), which implies read-only.
export async function getData() {
    try {
        const resp = await apiFetch(`/contents/${DATA_PATH}?ref=${BRANCH}`);
        return { data: JSON.parse(b64DecodeUtf8(resp.content)), sha: resp.sha };
    } catch (e) {
        if (!token() && (e.status === 403 || e.status === 429)) {
            const raw = await fetch(`${RAW_BASE}${DATA_PATH}?v=${Date.now()}`);
            if (raw.ok) return { data: await raw.json(), sha: null };
        }
        throw e;
    }
}

// Fetch-mutate-put with one retry on a stale sha (409, or 422 sha mismatch).
export async function putData(mutate, message) {
    for (let attempt = 0; attempt < 2; attempt++) {
        const { data, sha } = await getData();
        if (!sha) throw new GhError(403, "Read-only: no token");
        const next = mutate(structuredClone(data));
        next.updatedAt = new Date().toISOString();
        try {
            await apiFetch(`/contents/${DATA_PATH}`, {
                method: "PUT",
                body: JSON.stringify({
                    message,
                    content: b64EncodeUtf8(JSON.stringify(next, null, 2)),
                    sha,
                    branch: BRANCH,
                }),
            });
            return next;
        } catch (e) {
            const stale = e.status === 409 || (e.status === 422 && /sha/i.test(e.message));
            if (!stale || attempt === 1) throw e;
        }
    }
}

export async function putPhoto(path, base64Jpeg, message) {
    await apiFetch(`/contents/${path}`, {
        method: "PUT",
        body: JSON.stringify({ message, content: base64Jpeg, branch: BRANCH }),
    });
    return path;
}

// Token validation: 200 on the repo endpoint means the PAT can at least read it.
export async function validateToken(t) {
    const resp = await fetch(API_BASE, {
        headers: {
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            Authorization: "Bearer " + t,
        },
    });
    return resp.ok;
}
