import rough from 'https://unpkg.com/roughjs@4.6.6/bundled/rough.esm.js';

const frames = [...document.querySelectorAll('[data-sketch-frame]')];
const ink = getComputedStyle(document.documentElement).getPropertyValue('--accent-text').trim() || '#2E8B57';
const observer = new ResizeObserver(entries => {
    for (const { target } of entries) {
        const { width, height } = target.getBoundingClientRect();
        if (!width || !height) continue;
        let svg = target.querySelector(':scope > svg.sketch-border');
        if (!svg) {
            svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('aria-hidden', 'true');
            svg.classList.add('sketch-border');
            target.append(svg);
        }
        target.classList.add('sketch-ready');
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.replaceChildren(rough.svg(svg).rectangle(2, 2, width - 4, height - 4, {
            stroke: ink, strokeWidth: 1.1, roughness: 1.4, bowing: 1.2,
            seed: 31 + frames.indexOf(target),
            ...(target.matches('.fun-hub .card') ? { fill: '#edf5ed', fillStyle: 'solid' } : {}),
        }));
        svg.querySelector('[fill="#edf5ed"]')?.classList.add('sketch-hover-fill');
    }
});
frames.forEach(frame => observer.observe(frame));
