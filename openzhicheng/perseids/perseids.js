import rough from 'https://unpkg.com/roughjs@4.6.6/bundled/rough.esm.js';

// Pin sources and forecast coverage are deliberately separate: a weather station
// is not necessarily an observing site or a public parking entrance.
const places = [
 { name: 'Alpine Vista Point', tag: 'Easy eastbound stop', lat: 32.836633, lng: -116.660483,
   summary: 'An easy I-8 pull-off and a step away from city lights. Low coastal clouds can still reach this area.',
   pin: 'I-8 eastbound vista point. Check access before your trip.',
   chart: 'AlpnCA', station: 'Alpine', coverage: 'Nearby forecast; low clouds and marine-layer edges can be missed.',
   evidence: 'https://www.reddit.com/r/sandiego/comments/1vjz1vv/',
   source: 'https://www.waymarking.com/waymarks/WMQCQ9_Alpine_Vista_Point_Alpine_CA' },
 { name: 'Sunrise Highway turnout', tag: 'The shortlist’s favorite compromise', lat: 32.826405, lng: -116.496107,
   summary: 'The lower Sunrise Highway turnout: a balance of elevation, open sky and a shorter mountain drive.',
   pin: 'Exact coordinates from the observer report: 32.826405, −116.496107. Parking availability is not guaranteed.',
   chart: 'MtLagOBCA', station: 'Mount Laguna Observatory', coverage: 'Nearby mountain forecast, not the turnout itself. Compare Cloud Cover and ECMWF Cloud when both rows are present.',
   evidence: 'https://www.reddit.com/r/sandiego/comments/nutai5/' },
 { name: 'Kwaaymii Point / Mt. Laguna', tag: 'Mountain outlook', lat: 32.934674, lng: -116.482676,
   summary: 'A mountain destination with a broad view toward the desert. A good option when you want more than a quick roadside stop.',
   pin: 'Kwaaymii Point area. Confirm road access and a safe place to stop.',
   chart: 'MtLagOBCA', station: 'Mount Laguna Observatory', coverage: 'Nearby mountain forecast. Compare the two cloud models when available, then check satellite imagery.',
   evidence: 'https://www.reddit.com/r/sandiego/comments/1tvhyd4/',
   source: 'https://www.sdnhm.org/education/canyoneer-hikes/kwaaymii-point/' },
 { name: 'Lake Henshaw / Palomar Mountain', tag: 'North County alternative', lat: 33.231984, lng: -116.760022,
   summary: 'An alternative region to compare when the southern mountains look cloudy. Conditions can differ substantially with elevation.',
   pin: 'Broad-area pin at Lake Henshaw, not an observing turnout or the observatory entrance.',
   chart: 'PalomarOb', station: 'Palomar Observatory', coverage: 'Regional comparison only: the observatory is higher than Lake Henshaw. Use its all-sky camera as an additional check.',
   extra: 'https://sites.astro.caltech.edu/palomar/observer/seeing.html',
   evidence: 'https://www.reddit.com/r/sandiego/comments/1eqs1qt/',
   source: 'https://www.topozone.com/california/san-diego-ca/park/lake-henshaw/' },
 { name: 'Culp Valley', tag: 'Commit to darker sky', lat: 33.220541, lng: -116.458858,
   summary: 'An elevated desert option for a longer night out, away from the urban glow and above the Borrego valley floor.',
   pin: 'Culp Valley Primitive Campground area; check current access and road conditions.',
   chart: 'BrrgSpCA', station: 'Borrego Springs', coverage: 'Proxy forecast. Culp Valley is higher and west of town; inspect the full cloud maps before relying on it.',
   evidence: 'https://www.reddit.com/r/AnzaBorrego/comments/1mr0g9m/',
   source: 'https://www.hikespeak.com/campgrounds/culp-valley-campground-anza-borrego-desert/' },
 { name: 'Blair Valley / Little Blair Valley', tag: 'Desert night out', lat: 33.02547, lng: -116.3869,
   summary: 'A desert choice for an outing centered on dark sky, rather than the shortest drive from San Diego.',
   pin: 'Little Blair Valley forecast-area pin, not a verified parking entrance.',
   chart: 'LBVCA', station: 'Little Blair Valley', coverage: 'A chart for the valley itself. Check the forecast date and the full cloud map for your chosen location.',
   evidence: 'https://www.reddit.com/r/AnzaBorrego/comments/1mr0g9m/',
   source: 'https://www.cleardarksky.com/c/LBVCAkey.html' },
 { name: 'Borrego Springs / Ocotillo Wells', tag: 'Wide desert sky', lat: 33.256, lng: -116.375,
   summary: 'A wider desert region with open horizons. A longer, potentially hot trip; compare cloud movement before heading out.',
   pin: 'Broad-area pin at Borrego Springs. Ocotillo Wells is farther east; choose a specific legal observing spot before navigating.',
   chart: 'BrrgSpCA', station: 'Borrego Springs', coverage: 'Local to Borrego Springs; less representative of Ocotillo Wells. Satellite imagery helps show clouds crossing the region.',
   evidence: 'https://www.reddit.com/r/sandiego/comments/1vmymhv/' },
 { name: 'Torrey Pines State Beach', tag: 'Coastal fallback', lat: 32.927, lng: -117.259,
   summary: 'The stay-near-home option for brighter meteors, with more city light and a greater dependence on a clear coast.',
   pin: 'Approximate beach-area pin. Confirm beach access and parking hours; this is not a promise of overnight access.',
   chart: 'CrpsObCA', station: 'Scripps Ranch Observatory', coverage: 'Inland proxy, not a beach forecast. Prioritize the cloud satellite view because marine stratus can move quickly.',
   evidence: 'https://www.reddit.com/r/sandiego/comments/1epgd46/' },
];
const $ = id => document.getElementById(id);
const SVG = 'http://www.w3.org/2000/svg';
const ink = '#2E8B57';
const ORIGIN = { lat: 32.8801, lng: -117.2340 }; // UCSD
const routes = new Map();
let activeRoute = null;
let selected = null;
let opener = null;
let map;
const markers = [];
const buttons = [];
const chartBase = 'https://www.cleardarksky.com/c/';

function sketch(wrap, seed) {
 let svg = wrap.querySelector(':scope > svg.rough');
 if (!svg) { svg = document.createElementNS(SVG, 'svg'); svg.classList.add('rough'); svg.setAttribute('aria-hidden', 'true'); wrap.prepend(svg); }
 const { width, height } = wrap.getBoundingClientRect();
 if (!width || !height) return;
 svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
 svg.replaceChildren(rough.svg(svg).rectangle(2, 2, width - 4, height - 4, { stroke: ink, strokeWidth: 1.1, roughness: 1.4, bowing: 1.2, seed }));
}
function pin(i) {
 const button = document.createElement('button'); button.type = 'button'; button.className = 'pin';
 button.setAttribute('aria-label', `Show sky conditions: ${places[i].name}`);
 button.title = places[i].name;
 const svg = document.createElementNS(SVG, 'svg'); svg.setAttribute('viewBox', '0 0 30 38'); svg.setAttribute('aria-hidden', 'true');
 const rc = rough.svg(svg);
 svg.appendChild(rc.circle(15, 13, 21, { stroke: ink, fill: '#F7F9FC', fillStyle: 'solid', roughness: .6, seed: 12 }));
 svg.appendChild(rc.circle(15, 13, 19, { stroke: ink, strokeWidth: 1.1, fill: ink, fillStyle: 'zigzag', fillWeight: 3.2, hachureGap: 4.5, hachureAngle: -45, roughness: .8, seed: 100 + i * 7 }));
 svg.appendChild(rc.line(15, 24, 15, 37, { stroke: ink, strokeWidth: 1.2, roughness: .5, seed: 12 }));
 button.appendChild(svg); button.addEventListener('click', event => { event.stopPropagation(); select(i, button); }); return button;
}
function loadChart() {
 const p = places[selected];
 $('chart-status').textContent = 'Loading the provider’s latest chart…';
 const img = new Image(); img.id = 'chart'; img.alt = `Hourly astronomy forecast for ${p.station}: cloud cover, transparency, darkness and other observing conditions`;
 img.onload = () => { if ($('chart') === img) $('chart-status').textContent = 'Check the issue time and forecast hours printed on the chart below.'; };
 img.onerror = () => { if ($('chart') === img) { img.hidden = true; $('chart-status').textContent = 'The chart image could not load. Open Clear Sky Chart above to check the forecast directly.'; } };
 $('chart').replaceWith(img);
 // Refresh on selection, keeping the provider’s date visible; never infer current conditions from a cached image.
 img.src = `${chartBase}${p.chart}csk.gif?refresh=${Date.now()}`;
 $('chart-image-link').parentElement.scrollLeft = 0;
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


function drawRoute() {
 map?.getSource('route')?.setData(activeRoute ? { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: activeRoute.coords } } : { type: 'FeatureCollection', features: [] });
}
async function showRoute(i) {
 activeRoute = null; drawRoute();
 $('route-status').textContent = 'Routing from UCSD…';
 if (!routes.has(i)) {
  const p = places[i];
  const request = fetch('https://valhalla1.openstreetmap.de/route', {
   method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Client-Id': 'huangworld.github.io' },
   signal: AbortSignal.timeout(20000),
   body: JSON.stringify({ locations: [{ lat: ORIGIN.lat, lon: ORIGIN.lng }, { lat: p.lat, lon: p.lng }], costing: 'auto', units: 'miles' }),
  }).then(r => { if (!r.ok) throw new Error(`Routing HTTP ${r.status}`); return r.json(); })
   .then(j => ({ coords: j.trip.legs.flatMap(leg => decodePolyline(leg.shape)), seconds: j.trip.summary.time, miles: j.trip.summary.length }));
  routes.set(i, request);
 }
 try {
  const route = await routes.get(i);
  if (selected !== i) return;
  activeRoute = route; drawRoute();
  const minutes = Math.round(route.seconds / 60), h = Math.floor(minutes / 60), m = minutes % 60;
  $('route-status').textContent = `From UCSD · ${h ? h + ' h ' : ''}${m} min · ${Math.round(route.miles)} mi · Valhalla`;
 } catch (error) {
  routes.delete(i);
  if (selected === i) $('route-status').textContent = 'Route unavailable. Reopen this location to retry. The sky forecast is still available.';
 }
}

function select(i, trigger) {
 opener = trigger;
 selected = i; const p = places[i];
 buttons.forEach((b, n) => b.setAttribute('aria-pressed', String(n === i)));
 markers.forEach((m, n) => m.getElement().setAttribute('aria-pressed', String(n === i)));
 $('place-name').textContent = p.name; $('place-tag').textContent = p.tag;
 $('place-summary').textContent = p.summary; $('pin-note').textContent = p.pin;
 const chartURL = `${chartBase}${p.chart}key.html`;
 $('chart-link').href = chartURL; $('chart-image-link').href = chartURL;
 $('satellite').href = `https://www.cleardarksky.com/maps/satellite/${p.chart}.html`;
 $('station-note').textContent = `Forecast station: ${p.station}. ${p.coverage}`;
 $('evidence').href = p.evidence;
 $('directions').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name === 'Sunrise Highway turnout' ? `${p.lat},${p.lng}` : p.name)}`;
 $('extra').hidden = !p.extra; if (p.extra) $('extra').href = p.extra;
 loadChart();
 showRoute(i);
 if (!$('forecast').open) $('forecast').showModal();
 $('forecast').scrollTop = 0;
}
places.forEach((p, i) => {
 const b = document.createElement('button'); b.type = 'button'; b.className = 'place sketch'; b.setAttribute('aria-controls', 'forecast');
 for (const [tag, cls, text] of [['span','tag',p.tag], ['strong','',p.name], ['span','summary',p.summary], ['span','action','Cloud & stargazing conditions ↗']]) {
  const child = document.createElement(tag); child.className = cls; child.textContent = text; b.appendChild(child);
 }
 b.addEventListener('click', () => select(i, b)); buttons.push(b); $('places').appendChild(b);
});
$('refresh').addEventListener('click', loadChart);
function fit() {
 if (!map) return;
 const bounds = new maplibregl.LngLatBounds().extend([ORIGIN.lng, ORIGIN.lat]); places.forEach(p => bounds.extend([p.lng, p.lat]));
 map.fitBounds(bounds, { padding: 48, maxZoom: 9, duration: 0 });
}
$('fit').addEventListener('click', fit);
try {
 map = new maplibregl.Map({ container: 'map', style: new URL('../driving/style.json', import.meta.url).href, center: [-116.75, 33.04], zoom: 8, dragRotate: false, attributionControl: { compact: true } });
 map.touchZoomRotate.disableRotation(); map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
 places.forEach((p, i) => markers.push(new maplibregl.Marker({ element: pin(i), anchor: 'bottom' }).setLngLat([p.lng, p.lat]).addTo(map)));
 const origin = document.createElement('div'); origin.className = 'origin'; origin.title = 'Start: UCSD'; origin.setAttribute('aria-label', 'Starting point: UCSD'); origin.setAttribute('role', 'img');
 const star = document.createElementNS(SVG, 'svg'); star.setAttribute('viewBox', '0 0 28 28');
 const points = Array.from({ length: 10 }, (_, n) => { const a = -Math.PI / 2 + n * Math.PI / 5, r = n % 2 ? 5 : 12; return [14 + Math.cos(a) * r, 14 + Math.sin(a) * r]; });
 const rc = rough.svg(star);
 star.appendChild(rc.polygon(points, { stroke: '#555', fill: '#F7F9FC', fillStyle: 'solid', roughness: .5, seed: 2 }));
 star.appendChild(rc.polygon(points, { stroke: '#555', fill: '#555', fillStyle: 'zigzag', fillWeight: 2.4, hachureGap: 3.5, hachureAngle: -45, roughness: .7, seed: 2 }));
 origin.appendChild(star);
 new maplibregl.Marker({ element: origin, anchor: 'center' }).setLngLat([ORIGIN.lng, ORIGIN.lat]).addTo(map);
 map.on('load', () => {
  map.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'route', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ink, 'line-width': 3, 'line-opacity': .85 } });
  fit(); drawRoute();
 });
 map.on('error', () => { $('map-status').textContent = 'Some map details could not load. You can still select every location from the cards below.'; });
} catch (error) { $('map-status').textContent = 'Map unavailable. Choose a location from the cards below to view its forecast.'; }
// Nothing is selected or fetched until a visitor opens a location.
[...buttons, ...markers.map(m => m.getElement())].forEach(el => el.setAttribute('aria-pressed', 'false'));
const dialog = $('forecast');
$('close-forecast').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
 const r = dialog.getBoundingClientRect();
 if (event.target === dialog && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)) dialog.close();
});
dialog.addEventListener('close', () => {
 opener?.focus({ preventScroll: true });
 [...buttons, ...markers.map(m => m.getElement())].forEach(el => el.setAttribute('aria-pressed', 'false'));
});
const observer = new ResizeObserver(() => document.querySelectorAll('.sketch').forEach((el, i) => sketch(el, 20 + i)));
document.querySelectorAll('.sketch').forEach(el => observer.observe(el));
