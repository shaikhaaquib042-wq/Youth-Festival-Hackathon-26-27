// Top stack layout: top bar → (replay bar) → (official alert banner) → status cards, each placed under the
// real height of the one above. Fixed pixel offsets broke when the banner wrapped to 2–3 lines, the top bar
// wrapped, or a phone notch / installed-app status bar pushed the top bar down.
const GAP = 8;
const setTop = (el, y) => { const v = `${Math.round(y)}px`; if (el.style.top !== v) el.style.top = v; }; // no-op when unchanged (no observer loop)
const vis = (el) => el && !el.hidden && getComputedStyle(el).display !== 'none';

function layout() {
  const app = document.getElementById('app'); const top = document.getElementById('topbar');
  if (!app || !top) return;
  const base = app.getBoundingClientRect().top;
  let y = top.getBoundingClientRect().bottom - base + GAP;
  const sb = document.getElementById('scenario-bar');
  if (vis(sb)) { setTop(sb, y); y += sb.offsetHeight + GAP; }
  const ab = document.getElementById('alert-banner');
  if (vis(ab)) { setTop(ab, y); y += ab.offsetHeight + GAP; }
  const cards = document.getElementById('status-cards-root');
  if (cards) setTop(cards, y);
}

let raf = 0;
const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(layout); };

export function initTopStack() {
  const ro = new ResizeObserver(schedule);
  const mo = new MutationObserver(schedule);
  const watch = () => {
    for (const id of ['topbar', 'scenario-bar', 'alert-banner']) {
      const el = document.getElementById(id);
      if (el && !el.dataset.stackWatched) { el.dataset.stackWatched = '1'; ro.observe(el); mo.observe(el, { attributes: true, attributeFilter: ['hidden', 'class', 'style'], childList: true, subtree: true }); }
    }
  };
  watch();
  // scenario bar is created later by the player
  new MutationObserver(() => { watch(); schedule(); }).observe(document.getElementById('app') ?? document.body, { childList: true });
  addEventListener('resize', schedule);
  addEventListener('orientationchange', schedule);
  schedule(); setTimeout(schedule, 500); setTimeout(schedule, 2000);
}
