import rough from 'https://unpkg.com/roughjs@4.6.6/bundled/rough.esm.js';

const SVG = 'http://www.w3.org/2000/svg';
const ink = getComputedStyle(document.documentElement).getPropertyValue('--accent-text').trim() || '#2E8B57';
const opts = { strokeWidth: 1.1, roughness: 1.4, bowing: 1.2 };

const buttons = [...document.querySelectorAll('.pub-filters button')];
const rows = [...document.querySelectorAll('.publications-table tr[data-type]')];
const empty = document.querySelector('.pub-empty');
const on = Object.fromEntries(buttons.map(b => [b.dataset.type, true]));

function drawCheckbox(btn, i) {
    const box = btn.querySelector('.box');
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('viewBox', '-4 -4 26 26');
    svg.setAttribute('aria-hidden', 'true');
    const rc = rough.svg(svg);
    const stroke = on[btn.dataset.type] ? ink : '#9a9a96';
    svg.appendChild(rc.rectangle(0, 0, 18, 18, { ...opts, stroke, seed: 21 + i }));
    if (on[btn.dataset.type]) {
        svg.appendChild(rc.path('M 3 9 L 8 14 L 16 2', { ...opts, stroke, strokeWidth: 2, roughness: 1.2, seed: 23 + i }));
    }
    box.replaceChildren(svg);
}

function applyFilters() {
    rows.forEach(row => row.classList.toggle('filtered-out', !on[row.dataset.type]));
    empty.hidden = rows.some(row => !row.classList.contains('filtered-out'));
    // RoughNotation only repositions its overlays on window resize.
    window.dispatchEvent(new Event('resize'));
}

buttons.forEach((btn, i) => {
    drawCheckbox(btn, i);
    btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        on[type] = !on[type];
        btn.classList.toggle('on', on[type]);
        btn.setAttribute('aria-pressed', String(on[type]));
        drawCheckbox(btn, i);
        applyFilters();
    });
});
