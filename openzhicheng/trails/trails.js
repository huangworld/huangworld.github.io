/* Notes live in the HTML so they remain readable even when the map is unavailable. */
(() => {
    const SVG = 'http://www.w3.org/2000/svg';
    const ink = '#2E8B57';
    const sketchOptions = { stroke: ink, strokeWidth: 1.1, roughness: 1.4, bowing: 1.2 };
    function drawFrame() {
        if (!window.rough) return;
        const frame = document.querySelector('.map-frame');
        let svg = frame.querySelector('.rough');
        if (!svg) {
            svg = document.createElementNS(SVG, 'svg');
            svg.classList.add('rough');
            svg.setAttribute('aria-hidden', 'true');
            frame.prepend(svg);
        }
        const { width, height } = frame.getBoundingClientRect();
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.replaceChildren(rough.svg(svg).rectangle(2, 2, width - 4, height - 4, { ...sketchOptions, seed: 31 }));
        frame.classList.add('drawn');
    }
    // Different pen pressure and single/double passes, with a shared visual vocabulary.
    const pens = [
        { strokeWidth: .9, roughness: 1.1, bowing: .8 },
        { strokeWidth: 1.3, roughness: .7, bowing: .5, disableMultiStroke: true },
        { strokeWidth: 1.1, roughness: 1.5, bowing: 1.3 },
        { strokeWidth: 1.5, roughness: .8, bowing: .7 },
        { strokeWidth: 1, roughness: 1.2, bowing: 1.1 },
    ];
    const digits = ['M 6 8 L 11 3 L 11 23 M 6 23 L 17 23', 'M 4 7 C 5 -1 19 0 18 8 C 18 12 9 16 4 23 L 19 23', 'M 4 4 C 20 -2 23 12 11 12 C 25 11 22 28 4 22', 'M 15 24 L 15 2 L 3 17 L 21 17', 'M 19 3 L 5 3 L 4 12 C 22 6 25 29 3 23'];
    function numberArt(n, color = ink) {
        const svg = document.createElementNS(SVG, 'svg'); svg.setAttribute('viewBox', '0 0 24 28'); svg.setAttribute('aria-hidden', 'true');
        const index = n === 'B' ? 3 : n - 1;
        const path = n === 'B' ? 'M 5 24 L 6 3 C 23 0 23 13 7 13 M 7 13 C 26 9 25 27 5 24' : digits[index];
        svg.append(rough.svg(svg).path(path, { ...pens[index], stroke: color, fill: 'none', seed: 71 + index }));
        return svg;
    }
    function placeNumberArt(number, favourite, color = ink) {
        const svg = numberArt(number, color);
        if (favourite) {
            svg.setAttribute('viewBox', '0 0 34 28');
            const suffix = numberArt('B', color);
            suffix.setAttribute('x', '22'); suffix.setAttribute('y', '0');
            suffix.setAttribute('width', '11'); suffix.setAttribute('height', '13');
            svg.append(suffix);
        }
        return svg;
    }
    function drawCard(article, i) {
        let svg = article.querySelector(':scope > .card-sketch');
        if (!svg) { svg = document.createElementNS(SVG, 'svg'); svg.classList.add('card-sketch'); svg.setAttribute('aria-hidden', 'true'); article.prepend(svg); }
        const { width, height } = article.getBoundingClientRect();
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.replaceChildren(rough.svg(svg).rectangle(3, 3, width - 6, height - 6, { ...pens[i], stroke: article.classList.contains('active') ? ink : '#a4c4a6', fill: article.classList.contains('active') ? '#edf5ed' : '#F7F9FC', fillStyle: 'solid', seed: 40 + i }));
    }
    function sketchNotes() {
        if (!window.rough) return;
        document.querySelectorAll('.notes article').forEach((article, i) => {
            article.classList.add('sketched');
            const number = article.querySelector('.number');
            const favourite = article.hasAttribute('data-brian-favourite');
            number.setAttribute('aria-label', favourite ? `${i + 1}, Brian Hempel’s favourite` : String(i + 1));
            number.replaceChildren(placeNumberArt(i + 1, favourite));
            article.querySelectorAll('a, .locate').forEach((link, j) => {
                if (link.querySelector('.sketch-arrow')) return;
                link.textContent = link.textContent.replace('↗', '').trim() + ' ';
                const svg = document.createElementNS(SVG, 'svg'); svg.classList.add('sketch-arrow'); svg.setAttribute('viewBox', '0 0 22 22'); svg.setAttribute('aria-hidden', 'true');
                const rc = rough.svg(svg), style = { ...pens[i], stroke: ink, seed: 90 + i * 7 + j };
                svg.append(rc.path('M 4 18 Q 10 11 18 4 M 8 4 L 18 4 L 18 14', style)); link.append(svg);
            });
            drawCard(article, i);
        });
    }
    let pinSequence = 0;
    function pinArt(number, favourite = false) {
        const svg = document.createElementNS(SVG, 'svg');
        svg.setAttribute('viewBox', '0 0 30 38');
        svg.setAttribute('aria-hidden', 'true');
        const rc = rough.svg(svg);
        const fill = document.createElementNS(SVG, 'g');
        {
            const defs = document.createElementNS(SVG, 'defs');
            const clip = document.createElementNS(SVG, 'clipPath');
            clip.id = `pin-fill-${++pinSequence}`;
            const circle = document.createElementNS(SVG, 'circle');
            circle.setAttribute('cx', '15'); circle.setAttribute('cy', '13');
            circle.setAttribute('r', '10');
            clip.append(circle); defs.append(clip); svg.append(defs);
            fill.setAttribute('clip-path', `url(#${clip.id})`);
        }
        fill.append(rc.circle(15, 13, 23, { ...sketchOptions, stroke: 'none', fill: '#F7F9FC', fillStyle: 'solid', roughness: .6, seed: 12 }));
        fill.append(rc.circle(15, 13, 21, { stroke: 'none', strokeWidth: 1.1, fill: '#F7F9FC', fillStyle: 'zigzag', fillWeight: 3.2, hachureGap: 4.5, hachureAngle: -45, roughness: .8, seed: 100 + number * 7 }));
        svg.append(fill);
        const outline = rc.circle(15, 13, 23, { ...sketchOptions, fill: 'none', roughness: .6, seed: 12 });
        if (favourite) outline.setAttribute('transform', 'rotate(90 15 13)');
        svg.append(outline);
        svg.append(rc.line(15, 25, 15, 37, { ...sketchOptions, roughness: .5, seed: 12 }));
        const numeral = placeNumberArt(number, favourite, ink);
        numeral.setAttribute('x', favourite ? '5' : '9'); numeral.setAttribute('y', favourite ? '7' : '5'); numeral.setAttribute('width', favourite ? '18' : '12'); numeral.setAttribute('height', '16');
        svg.append(numeral);
        return svg;
    }
    sketchNotes();
    if (window.rough) document.querySelector('.brian-mark').replaceChildren(numberArt('B'));
    drawFrame();
    new ResizeObserver(drawFrame).observe(document.querySelector('.map-frame'));
    const status = document.getElementById('map-status');
    if (!window.maplibregl) {
        status.textContent = 'The map is unavailable here. My notes and Maps links are still ready to use.';
        return;
    }
    const origin = [-117.2274, 32.8770];
    const articles = [...document.querySelectorAll('.notes article')];
    const places = articles.flatMap((article, index) => JSON.parse(article.dataset.places)
        .map(([name, lng, lat]) => ({ name, coords: [lng, lat], article, favourite: article.hasAttribute('data-brian-favourite'), number: index + 1 })));
    let map;
    try {
        map = new maplibregl.Map({
        container: 'map', style: '/openzhicheng/driving/style.json',
        center: [-116.95, 33.1], zoom: 8,
        attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false
    });
    } catch (error) {
        status.textContent = 'The map is unavailable here. My notes and Maps links are still ready to use.';
        return;
    }
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    const bounds = new maplibregl.LngLatBounds(origin, origin);
    places.forEach(place => bounds.extend(place.coords));
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450;
    const fitAll = () => map.fitBounds(bounds, { padding: 55, duration, maxZoom: 10 });
    map.on('resize', () => map.fitBounds(bounds, { padding: 45, duration: 0, maxZoom: 10 }));
    let label, selected = null, activeRoute = null;
    const routeCache = new Map();
    const routeStatus = document.getElementById('route-status');
    function drawRoute() {
        map.getSource('route')?.setData(activeRoute ? { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: activeRoute.coords } } : { type: 'FeatureCollection', features: [] });
    }
    async function routeTo(place) {
        activeRoute = null; drawRoute(); routeStatus.textContent = `Routing to ${place.name}…`;
        if (!routeCache.has(place)) {
            routeCache.set(place, fetch('https://valhalla1.openstreetmap.de/route', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Client-Id': 'huangworld.github.io' }, signal: AbortSignal.timeout(20000),
                body: JSON.stringify({ locations: [{ lon: origin[0], lat: origin[1] }, { lon: place.coords[0], lat: place.coords[1] }], costing: 'auto', units: 'miles' }),
            }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
              .then(j => ({ coords: j.trip.legs.flatMap(leg => decodePolyline(leg.shape)), time: j.trip.summary.time, miles: j.trip.summary.length })));
        }
        try {
            const route = await routeCache.get(place);
            if (selected !== place) return;
            activeRoute = route; drawRoute();
            const mins = Math.round(route.time / 60), h = Math.floor(mins / 60);
            routeStatus.textContent = `UCSD Graduate Housing → ${place.name} · ${h ? h + ' h ' : ''}${mins % 60} min · ${Math.round(route.miles)} mi (Valhalla driving route)`;
            const routeBounds = new maplibregl.LngLatBounds(); route.coords.forEach(c => routeBounds.extend(c));
            map.fitBounds(routeBounds, { padding: 50, duration, maxZoom: 12 });
        } catch (error) {
            routeCache.delete(place);
            if (selected === place) routeStatus.textContent = 'Could not load the driving route. Click the marker again to retry.';
        }
    }

        function decodePolyline(str) {
            let i = 0, lat = 0, lng = 0; const out = [];
            while (i < str.length) {
                for (const which of [0, 1]) {
                    let shift = 0, result = 0, b;
                    do { b = str.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
                    const d = (result & 1) ? ~(result >> 1) : (result >> 1);
                    if (which === 0) lat += d; else lng += d;
                }
                out.push([lng / 1e6, lat / 1e6]);
            }
            return out;
        }

    function select(place) {
        selected = place;
        routeTo(place);
        articles.forEach(article => article.classList.toggle('active', article === place.article));
        places.forEach(p => p.element.setAttribute('aria-pressed', String(p.article === place.article)));
        label?.remove();
        label = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 20 })
            .setLngLat(place.coords).setText(place.favourite ? `${place.name} · Brian Hempel’s favourite` : place.name).addTo(map);
        map.easeTo({ center: place.coords, duration });
        if (window.rough) articles.forEach(drawCard);
    }
    places.forEach(place => {
        const element = document.createElement('button');
        element.type = 'button';
        element.className = 'pin';
        if (window.rough) element.append(pinArt(place.number, place.favourite));
        else {
            element.textContent = place.number;
            if (place.favourite) { const suffix = document.createElement('sup'); suffix.textContent = 'B'; element.append(suffix); }
        }
        element.setAttribute('aria-pressed', 'false');
        element.title = place.favourite ? `${place.name}: Brian Hempel’s favourite` : place.name;
        if (place.favourite) {
            const tooltip = document.createElement('span');
            tooltip.className = 'pin-tooltip';
            tooltip.textContent = 'Brian Hempel’s favourite';
            tooltip.setAttribute('aria-hidden', 'true');
            element.append(tooltip);
        }
        element.setAttribute('aria-label', `${element.title}: ${place.article.querySelector('.written').textContent}`);
        element.addEventListener('click', () => select(place));
        place.element = element;
        new maplibregl.Marker({ element, anchor: 'bottom' }).setLngLat(place.coords).addTo(map);
    });
    articles.forEach(article => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'locate';
        button.textContent = 'Find on map ↗';
        button.addEventListener('click', () => {
            select(places.find(place => place.article === article));
            document.querySelector('.map-column').scrollIntoView({ block: 'nearest', behavior: duration ? 'smooth' : 'instant' });
        });
        article.append(button);
    });
    sketchNotes();
    if (window.rough) {
        const cardObserver = new ResizeObserver(() => articles.forEach(drawCard));
        articles.forEach(article => cardObserver.observe(article));
    }
    const star = document.createElement('span');
    star.className = 'origin'; star.title = 'UCSD Graduate Housing';
    star.setAttribute('aria-label', 'Start: UCSD Graduate Housing');
    if (window.rough) {
        const svg = document.createElementNS(SVG, 'svg');
        svg.setAttribute('viewBox', '0 0 26 26');
        svg.setAttribute('aria-hidden', 'true');
        const points = Array.from({ length: 10 }, (_, i) => {
            const angle = -Math.PI / 2 + i * Math.PI / 5;
            const radius = i % 2 ? 4.8 : 11;
            return [13 + Math.cos(angle) * radius, 13 + Math.sin(angle) * radius];
        });
        const rc = rough.svg(svg);
        svg.append(rc.polygon(points, {
            ...sketchOptions, stroke: '#555', strokeWidth: 1.2, roughness: .55,
            fill: '#F7F9FC', fillStyle: 'solid', seed: 2,
        }));
        svg.append(rc.polygon(points, {
            ...sketchOptions, stroke: '#555', strokeWidth: 1.2, roughness: .8,
            fill: '#555', fillStyle: 'zigzag', fillWeight: 2.4,
            hachureGap: 3.5, hachureAngle: -45, seed: 2,
        }));
        star.append(svg);
        document.getElementById('origin-legend').replaceChildren(svg.cloneNode(true));
    } else {
        star.textContent = '★';
    }
    new maplibregl.Marker({ element: star }).setLngLat(origin).addTo(map);
    const reset = document.getElementById('reset-map');
    reset.hidden = false;
    reset.addEventListener('click', () => {
        selected = null; activeRoute = null; drawRoute(); routeStatus.textContent = '';
        label?.remove();
        articles.forEach(article => article.classList.remove('active'));
        places.forEach(place => place.element.setAttribute('aria-pressed', 'false'));
        if (window.rough) articles.forEach(drawCard);
        fitAll();
    });
    map.on('load', () => {
        map.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addLayer({ id: 'route', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ink, 'line-width': 3, 'line-opacity': .85 } });
        drawRoute();
    });
    fitAll();
    map.on('error', () => { status.textContent = 'Some map details could not load. You can still use the notes and Maps links.'; });
    map.on('idle', () => { if (map.areTilesLoaded()) status.textContent = ''; });
})();
