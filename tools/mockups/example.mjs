// Example mockup spec: copy this file, change the cards, and run `npm run mockup -- tools/mockups/<name>.mjs`.
// Cards can show a movement animation (a pattern from js/movements.js or a draft one) or any HTML that uses the
// app's own classes and color tokens (var(--red), var(--surface), ...), so the mockup matches what gets built.
export default {
  title: "Example mockup",
  note: "Two animations from the app and one card drawn with the app's own classes.",
  layout: "grid",
  cards: [
    { title: "Seated hip abduction", pattern: "abductionSeated", kind: "none", roles: { Glutes: 1 } },
    { title: "Seated hip adduction", pattern: "adduction", kind: "none", roles: { Quadriceps: 1 } },
    { title: "A button row", caption: "Uses .primary and .secondary from css/app.css.",
      html: `<div class="edit-actions"><button class="primary" type="button">Log set</button><button class="secondary" type="button">Rest</button></div>` },
  ],
};
