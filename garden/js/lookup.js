// Online plant lookup: iNaturalist for photos + name resolution,
// Wikipedia REST summary for a prefillable description.
// Both APIs are keyless and CORS-open; reference photos are hotlinked, never committed.

export async function searchTaxa(query) {
    const url = `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(query)}&per_page=6&locale=en`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`iNaturalist ${resp.status}`);
    const json = await resp.json();
    return (json.results || [])
        .filter((r) => r.default_photo)
        .map((r) => ({
            commonName: r.preferred_common_name || "",
            scientificName: r.name || "",
            thumbUrl: r.default_photo.square_url || "",
            photoUrl: r.default_photo.medium_url || "",
            attribution: r.default_photo.attribution || "",
            wikiUrl: r.wikipedia_url || "",
        }));
}

// Description from Wikipedia; falls back to empty string so the field
// stays manually editable.
export async function fetchDescription(result) {
    let title = "";
    if (result.wikiUrl) {
        try { title = decodeURIComponent(new URL(result.wikiUrl).pathname.split("/").pop()); } catch { /* ignore */ }
    }
    if (!title) title = (result.scientificName || "").replace(/ /g, "_");
    if (!title) return { extract: "", wikiUrl: "" };
    const resp = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
    if (!resp.ok) return { extract: "", wikiUrl: result.wikiUrl || "" };
    const json = await resp.json();
    return {
        extract: json.extract || "",
        wikiUrl: (json.content_urls && json.content_urls.desktop && json.content_urls.desktop.page) || result.wikiUrl || "",
    };
}

export function debounce(fn, ms) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}
