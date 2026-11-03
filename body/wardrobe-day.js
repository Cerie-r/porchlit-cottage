// Some things come out on a day of their own: an outfit or a piece registered with
// outOn: 'YYYY-MM-DD' (the Christmas ones on the fifteenth of December) keeps its card back in the
// wardrobe until that day, by the home's own calendar (the house sends its day when it opens the
// wardrobe; opened by itself, the device's), and has it from then on. It only decides what there is to choose from: a look that has it on already keeps it, in the
// save and outside the home alike.
const DAY = /^\d{4}-\d{2}-\d{2}$/;
// The day it is, as 'YYYY-MM-DD', on this device's own calendar.
export const dayOf = (date = new Date()) => [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((n, i) => String(n).padStart(i ? 2 : 4, '0')).join('-');
// Whether something registered is out on that day: anything without a day of its own always is.
export const isOut = (entry, day = dayOf()) => !DAY.test(entry?.outOn ?? '') || (DAY.test(day ?? '') && day >= entry.outOn);
