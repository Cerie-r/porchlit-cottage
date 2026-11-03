// The trip she's on, while she's out (src/explore-trips.js): kept in this tab's sessionStorage between the house, the
// book's title map and its pages, which are separate page loads. The house takes it back when she comes home.
// A copy waits in localStorage too: a tab closed (or thrown away by the phone) in the middle of a trip, or the house
// opened in another tab, still brings the basket home (readStrayTrip) instead of losing it with the trip counted.
import {cleanTrip} from './explore-trips.js';

const KEY = 'porchlit-explore-trip', STRAY = 'porchlit-explore-trip-out';
export function readTrip() {
  try { return cleanTrip(JSON.parse(sessionStorage.getItem(KEY))); } catch { return null; }
}
export function writeTrip(trip) {
  try { sessionStorage.setItem(KEY, JSON.stringify(trip)); } catch { return false; }
  try { localStorage.setItem(STRAY, JSON.stringify(trip)); } catch {}
  return true;
}
export function dropTrip() {
  try { sessionStorage.removeItem(KEY); } catch {}
  try { localStorage.removeItem(STRAY); } catch {}
}
// The trip left behind by a tab that's gone, for the house to bring home: only when this tab isn't on one itself.
export function readStrayTrip() {
  try { return cleanTrip(JSON.parse(localStorage.getItem(STRAY))); } catch { return null; }
}
// What the home has of going out, as this device last saved it (read only: the house writes it).
export function savedExplore() {
  try { return JSON.parse(localStorage.getItem('porchlit-home-layout-v1'))?.explore ?? null; } catch { return null; }
}
