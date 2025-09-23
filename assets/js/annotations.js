// Auto-apply RoughNotation annotations based on class names.
// Supported: highlight, underline, circle, box, strike-through, crossed-off, bracket

import { annotate, annotationGroup } from "https://unpkg.com/rough-notation?module";

const typeMap = [
  "highlight",
  "underline",
  "box",
  "circle",
  "strike-through",
  "crossed-off",
  "bracket"
];

const annotations = [];

typeMap.forEach(type => {
  document.querySelectorAll(`.rn-${type}`).forEach(el => {
    const anno = annotate(el, {
      type,
      color: getComputedStyle(document.documentElement).getPropertyValue("--accent-bg") || "#C8E6C9",
      strokeWidth: 3,
      padding: 2,
      iterations: 2,
      multiline: type === "highlight", // enable multi-line highlight
      animationDuration: 0,
      animate: false
    });
    annotations.push(anno);
  });
});

annotations.forEach(a=>a.show()); 