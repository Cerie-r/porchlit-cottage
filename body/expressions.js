// The residents' faces: which expression each wears (a look keeps its index as `mouth`, the first two
// being the frown and the smile there always were). Each says how its eyes are: open, both closed
// ('happy', none uses it now) or one closed in a wink (the wearer's left). The shapes are made in
// body/face.js; the pictures here are the wardrobe's buttons.
const eye = (x, y = 10) => `<circle cx="${x}" cy="${y}" r="1.7" fill="#4a4446" stroke="none"/>`;
const shut = x => `<path d="M${x - 2.4} 10.6q2.4-3 4.8 0" stroke="#4a4446" stroke-width="1.7"/>`;
const open = eye(8) + eye(16);
const svg = body => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#8a6f66" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
export const EXPRESSIONS = [
  {id: 'frown', name: '委屈', eyes: 'open', icon: svg(open + '<path d="M9.5 16.4q2.5-2 5 0"/>')},
  {id: 'smile', name: '微笑', eyes: 'open', icon: svg(open + '<path d="M8.6 14.6q3.4 3.6 6.8 0"/>')},
  {id: 'grin', name: '开心', eyes: 'open', icon: svg(open + '<path d="M8 13.8h8q-.8 5-4 5t-4-5z" fill="#7a3f44" stroke="none"/><path d="M9.8 17.4q2.2-1.6 4.4 0q-1 1.2-2.2 1.2t-2.2-1.2z" fill="#e58f93" stroke="none"/>')},
  {id: 'cat', name: '猫猫嘴', eyes: 'open', icon: svg(open + '<path d="M8 14.6q2 2.6 4 .2q2 2.4 4-.2"/>')},
  {id: 'oh', name: '惊讶', eyes: 'open', icon: svg(open + '<ellipse cx="12" cy="16" rx="1.6" ry="2.1" fill="#7a3f44" stroke="none"/>')},
  {id: 'wink', name: '眨眼', eyes: 'wink', icon: svg(eye(8) + shut(16) + '<path d="M8.6 14.4q3.4 3.4 6.8 0"/><path d="M12.4 16.2h2.2v1.2q0 1.4-1.1 1.4t-1.1-1.4z" fill="#e58f93" stroke="none"/>')},
  {id: 'shy', name: '害羞', eyes: 'open', icon: svg(open + '<ellipse cx="5.5" cy="13.4" rx="2" ry="1" fill="#e7b3ad" stroke="none"/><ellipse cx="18.5" cy="13.4" rx="2" ry="1" fill="#e7b3ad" stroke="none"/><path d="M8.8 15.6q1.1-1.4 2.1 0t2.2 0t2.1 0"/>')}
];
// What a look may keep as its expression: one of these, or the first.
export const expressionOf = value => Number.isInteger(value) && value >= 0 && value < EXPRESSIONS.length ? value : 0;
