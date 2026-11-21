import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const outDir = resolve('screenshots');
mkdirSync(outDir, { recursive: true });

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9991;
const chrome = spawn(chromePath, [
  '--headless=new',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  `--remote-debugging-port=${port}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--hide-scrollbars'
]);

await new Promise((r) => setTimeout(r, 1500));

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.callbacks = new Map();
    this.ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id && this.callbacks.has(data.id)) {
        const { resolve, reject } = this.callbacks.get(data.id);
        this.callbacks.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data.result);
      }
    };
  }
  ready() {
    return new Promise((r) => {
      if (this.ws.readyState === 1) r();
      else this.ws.onopen = r;
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression) {
    const res = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) {
      console.error('Eval error:', res.exceptionDetails);
    }
    return res.result?.value;
  }
  async screenshot(filename) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const p = resolve(outDir, filename);
    writeFileSync(p, buffer);
    console.log(`Saved screenshot: ${filename} (${buffer.length} bytes)`);
  }
  async setViewport(width, height) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: width < 600
    });
  }
  async navigate(url) {
    await this.send('Page.navigate', { url });
    await new Promise((r) => setTimeout(r, 1800));
  }
  async close() {
    this.ws.close();
  }
}

async function getClient() {
  const resp = await fetch(`http://localhost:${port}/json/new`, { method: 'PUT' });
  const target = await resp.json();
  const client = new CDPClient(target.webSocketDebuggerUrl);
  await client.ready();
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  return client;
}

try {
  const client = await getClient();

  async function setupPage({ theme = 'dark', lang = 'en', hazard = 'flood', setup = '0', width = 390, height = 844 }) {
    await client.setViewport(width, height);
    await client.navigate(`http://localhost:5174/?setup=${setup}&theme=${theme}&hazard=${hazard}`);
    await client.eval(`
      try {
        localStorage.setItem('sajag.onboarded', '1');
        window.__i18n?.setLang('${lang}');
      } catch (e) {}
    `);
    await new Promise((r) => setTimeout(r, 500));
  }

  // ── 1. Onboarding ──────────────────────────────────────────────────────────
  console.log('--- 1. Onboarding ---');
  await client.setViewport(390, 844);
  await client.navigate('http://localhost:5174/?setup=1&theme=dark');
  await new Promise((r) => setTimeout(r, 1000));
  await client.screenshot('01-onboarding-dark-phone.png');

  await client.navigate('http://localhost:5174/?setup=1&theme=light');
  await new Promise((r) => setTimeout(r, 1000));
  await client.screenshot('01-onboarding-light-phone.png');

  // Step 2 (Who are you) & Step 3 (Location)
  await client.navigate('http://localhost:5174/?setup=1&theme=dark');
  await new Promise((r) => setTimeout(r, 600));
  await client.eval(`document.querySelector('.tile[data-lang="mr"]')?.click()`);
  await new Promise((r) => setTimeout(r, 600));
  await client.screenshot('01b-onboarding-who-dark.png');

  await client.eval(`document.querySelector('.tile[data-who="worker"]')?.click()`);
  await new Promise((r) => setTimeout(r, 600));
  await client.screenshot('01c-onboarding-loc-dark.png');

  // Onboarding 320px
  await client.setViewport(320, 640);
  await client.navigate('http://localhost:5174/?setup=1&theme=dark');
  await new Promise((r) => setTimeout(r, 600));
  await client.screenshot('01-onboarding-dark-320.png');

  // ── 2. Main Screen (Flood & Heat, 390, 1440, 320) ─────────────────────────
  console.log('--- 2. Main screen ---');
  await setupPage({ theme: 'dark', width: 390, height: 844 });
  await client.screenshot('02-main-flood-dark-390.png');

  await setupPage({ theme: 'light', width: 390, height: 844 });
  await client.screenshot('02-main-flood-light-390.png');

  await setupPage({ theme: 'dark', width: 1440, height: 900 });
  await client.screenshot('02-main-flood-dark-1440.png');

  await setupPage({ theme: 'light', width: 1440, height: 900 });
  await client.screenshot('02-main-flood-light-1440.png');

  await setupPage({ theme: 'dark', width: 320, height: 640 });
  await client.screenshot('02-main-flood-dark-320.png');

  // Heat side
  await setupPage({ theme: 'dark', hazard: 'heat', width: 390, height: 844 });
  await client.screenshot('03-main-heat-dark-390.png');

  await setupPage({ theme: 'light', hazard: 'heat', width: 390, height: 844 });
  await client.screenshot('03-main-heat-light-390.png');

  // Collapsed status card
  await setupPage({ theme: 'dark', width: 390, height: 844 });
  await client.eval(`document.querySelector('.btn-card-fold')?.click()`);
  await new Promise((r) => setTimeout(r, 400));
  await client.screenshot('03b-card-collapsed-dark.png');

  // ── 3. More Menu Sheet ────────────────────────────────────────────────────
  console.log('--- 3. More Menu ---');
  await setupPage({ theme: 'dark', width: 390, height: 844 });
  await client.eval(`document.getElementById('more-btn')?.click()`);
  await new Promise((r) => setTimeout(r, 500));
  await client.screenshot('04-more-sheet-dark.png');

  await setupPage({ theme: 'light', width: 390, height: 844 });
  await client.eval(`document.getElementById('more-btn')?.click()`);
  await new Promise((r) => setTimeout(r, 500));
  await client.screenshot('04-more-sheet-light.png');

  // ── 4. Help Sheet ─────────────────────────────────────────────────────────
  console.log('--- 4. Help Sheet ---');
  await setupPage({ theme: 'dark', width: 390, height: 844 });
  await client.eval(`document.getElementById('help-btn')?.click()`);
  await new Promise((r) => setTimeout(r, 500));
  await client.screenshot('05-help-sheet-dark.png');

  await setupPage({ theme: 'light', width: 390, height: 844 });
  await client.eval(`document.getElementById('help-btn')?.click()`);
  await new Promise((r) => setTimeout(r, 500));
  await client.screenshot('05-help-sheet-light.png');

  // ── 5. Sign-in Sheet ──────────────────────────────────────────────────────
  console.log('--- 5. Sign-in Sheet ---');
  await setupPage({ theme: 'dark', width: 390, height: 844 });
  await client.eval(`import('/src/ui/signin.js').then(m => m.openSignIn());`);
  await new Promise((r) => setTimeout(r, 500));
  await client.screenshot('06-signin-sheet-dark.png');

  await setupPage({ theme: 'light', width: 390, height: 844 });
  await client.eval(`import('/src/ui/signin.js').then(m => m.openSignIn());`);
  await new Promise((r) => setTimeout(r, 500));
  await client.screenshot('06-signin-sheet-light.png');

  // ── 6. Route Panel + Verdict ──────────────────────────────────────────────
  console.log('--- 6. Route Panel + Verdict ---');
  await setupPage({ theme: 'dark', width: 390, height: 844 });
  await client.eval(`document.getElementById('route-btn')?.click();`);
  await new Promise((r) => setTimeout(r, 500));
  await client.screenshot('07-route-panel-dark.png');

  await client.eval(`document.querySelector('.route-panel [data-saved="0"]')?.click();`);
  await new Promise((r) => setTimeout(r, 2000));
  await client.screenshot('07b-route-verdict-dark.png');

  await setupPage({ theme: 'light', width: 390, height: 844 });
  await client.eval(`
    document.getElementById('route-btn')?.click();
    setTimeout(() => document.querySelector('.route-panel [data-saved="0"]')?.click(), 300);
  `);
  await new Promise((r) => setTimeout(r, 2200));
  await client.screenshot('07b-route-verdict-light.png');

  // ── 7. Heat Shift Panel ───────────────────────────────────────────────────
  console.log('--- 7. Heat Shift Panel ---');
  await setupPage({ theme: 'dark', hazard: 'heat', width: 390, height: 844 });
  await client.eval(`document.getElementById('shift-btn')?.click();`);
  await new Promise((r) => setTimeout(r, 500));
  await client.screenshot('08-shift-panel-dark.png');

  await client.eval(`document.querySelector('.shift-panel [data-act="start"]')?.click();`);
  await new Promise((r) => setTimeout(r, 1200));
  await client.screenshot('08b-shift-active-dark.png');

  // ── 8. I Feel Unwell Sheet ────────────────────────────────────────────────
  console.log('--- 8. I Feel Unwell Sheet ---');
  await setupPage({ theme: 'dark', hazard: 'heat', width: 390, height: 844 });
  await client.eval(`document.getElementById('unwell-btn')?.click();`);
  await new Promise((r) => setTimeout(r, 500));
  await client.screenshot('09-unwell-ask-dark.png');

  await client.eval(`
    document.querySelector('.sheet [data-sign="confusion"]')?.click();
    document.querySelector('.sheet [data-act="go"]')?.click();
  `);
  await new Promise((r) => setTimeout(r, 500));
  await client.screenshot('09b-unwell-emergency-dark.png');

  // ── 9. Voice Overlay ──────────────────────────────────────────────────────
  console.log('--- 9. Voice Overlay ---');
  await setupPage({ theme: 'dark', width: 390, height: 844 });
  await client.eval(`document.getElementById('voice-btn')?.click();`);
  await new Promise((r) => setTimeout(r, 500));
  await client.screenshot('10-voice-overlay-dark.png');

  // ── 10. Scenario Bar ──────────────────────────────────────────────────────
  console.log('--- 10. Scenario Bar ---');
  await client.navigate('http://localhost:5174/?setup=0&theme=dark&scenario=pune-2019-09-25');
  await new Promise((r) => setTimeout(r, 2000));
  await client.screenshot('11-scenario-flood-dark.png');

  await client.navigate('http://localhost:5174/?setup=0&theme=dark&scenario=pune-heat-afternoon');
  await new Promise((r) => setTimeout(r, 2000));
  await client.screenshot('11-scenario-heat-dark.png');

  // ── 11. Official Alert Banner ─────────────────────────────────────────────
  console.log('--- 11. Official Alert Banner ---');
  await setupPage({ theme: 'dark', width: 390, height: 844 });
  await client.eval(`
    const b = document.getElementById('alert-banner');
    b.hidden = false;
    b.innerHTML = '<span class="tag-sim">SIMULATED</span> <b>Official Alert · SACHET/IMD</b> · 10m ago — Heavy rainfall warning for Pune district <a href="#">↗</a>';
  `);
  await client.screenshot('12-alert-banner-dark.png');

  await client.eval(`document.getElementById('alert-banner')?.classList.add('simulated');`);
  await client.screenshot('12b-alert-banner-sim-dark.png');

  // ── 12. City Switch Banner ────────────────────────────────────────────────
  console.log('--- 12. City Switch Banner ---');
  await setupPage({ theme: 'dark', width: 390, height: 844 });
  await client.eval(`
    const aside = document.createElement('aside');
    aside.id = 'sajag-city-switch';
    aside.innerHTML = '<span class="sj-city-text">You seem to be in Mumbai. Switch?</span><span class="sj-city-actions"><button type="button" data-city-act="switch">Switch</button><button type="button" data-city-act="stay">Stay in Pune</button></span>';
    document.body.append(aside);
  `);
  await new Promise((r) => setTimeout(r, 300));
  await client.screenshot('13-city-switch-dark.png');

  // ── 13. Pin Popups (Flood & Cooling) ──────────────────────────────────────
  console.log('--- 13. Pin Popups ---');
  await setupPage({ theme: 'dark', width: 390, height: 844 });
  await client.eval(`
    const pop = document.createElement('div');
    pop.className = 'maplibregl-popup maplibregl-popup-anchor-bottom';
    pop.style.position = 'absolute'; pop.style.left = '30px'; pop.style.top = '150px'; pop.style.zIndex = '100';
    pop.innerHTML = '<div class="maplibregl-popup-content"><div class="pin-popup"><div class="pin-title">Swargate Underpass</div><div class="popup-depth-line"><span class="ico">🌊</span> <span>Knee-deep · Underpass</span></div><div><b>Evidence: 2 reports (5m ago)</b> <span class="badge-proof">📷 Proof</span></div><div class="vote-row"><button>👍 Still there (3)</button><button>✓ Cleared (0)</button></div></div></div>';
    document.getElementById('app').append(pop);
  `);
  await client.screenshot('14-pin-popup-flood-dark.png');

  await setupPage({ theme: 'dark', hazard: 'heat', width: 390, height: 844 });
  await client.eval(`
    const pop = document.createElement('div');
    pop.className = 'maplibregl-popup maplibregl-popup-anchor-bottom';
    pop.style.position = 'absolute'; pop.style.left = '30px'; pop.style.top = '150px'; pop.style.zIndex = '100';
    pop.innerHTML = '<div class="maplibregl-popup-content"><div class="pin-popup"><div class="pin-title">Sarasbaug Water Station</div><div>Amenities: 🚰 Drinking water · 🌳 Shade</div><a class="btn btn-primary popup-directions" href="#">🧭 Directions</a></div></div>';
    document.getElementById('app').append(pop);
  `);
  await client.screenshot('14b-pin-popup-cooling-dark.png');

  // ── 14. Report Sheet (Flood & Heat) ───────────────────────────────────────
  console.log('--- 14. Report Sheet ---');
  await setupPage({ theme: 'dark', width: 390, height: 844 });
  await client.eval(`
    // Render report sheet directly into DOM for QA verification
    const s = document.createElement('div');
    s.className = 'report-sheet';
    s.innerHTML = \`
      <div class="report-header">
        <div class="rs-hint">Drag map to position pin under 📍</div>
        <button class="btn btn-ghost" style="padding:4px 10px;font-size:18px;">✕</button>
      </div>
      <div class="report-step-title">What do you see?</div>
      <div class="report-tiles">
        <button class="report-tile-btn selected"><span class="tile-icon">🌊</span><span class="tile-text">Water on road</span></button>
        <button class="report-tile-btn"><span class="tile-icon">🚧</span><span class="tile-text">Blocked drain</span></button>
      </div>
      <div class="report-step-title">How deep is it?</div>
      <div class="report-tiles tiles-3">
        <button class="report-tile-btn"><span class="tile-icon">🦶</span><span class="tile-text">Ankle</span></button>
        <button class="report-tile-btn selected"><span class="tile-icon">🦵</span><span class="tile-text">Knee</span></button>
        <button class="report-tile-btn"><span class="tile-icon">🧍</span><span class="tile-text">Waist+</span></button>
      </div>
      <label class="report-proof-tile">
        <span class="proof-icon">📷</span>
        <span class="proof-label"><b>Photo proof</b> <small class="proof-opt">(optional)</small></span>
      </label>
      <button class="btn btn-primary btn-submit-big">Send report</button>
    \`;
    document.getElementById('app').append(s);
  `);
  await client.screenshot('15-report-sheet-flood-dark.png');

  await setupPage({ theme: 'dark', hazard: 'heat', width: 390, height: 844 });
  await client.eval(`
    const s = document.createElement('div');
    s.className = 'report-sheet';
    s.innerHTML = \`
      <div class="report-header">
        <div class="rs-hint">Add cooling point</div>
        <button class="btn btn-ghost" style="padding:4px 10px;font-size:18px;">✕</button>
      </div>
      <div class="report-step-title">Select amenities</div>
      <div class="report-tiles tiles-3">
        <button class="report-tile-btn selected"><span class="tile-icon">🚰</span><span class="tile-text">Water</span></button>
        <button class="report-tile-btn selected"><span class="tile-icon">🌳</span><span class="tile-text">Shade</span></button>
        <button class="report-tile-btn"><span class="tile-icon">💊</span><span class="tile-text">ORS</span></button>
      </div>
      <button class="btn btn-primary btn-submit-big">Send report</button>
    \`;
    document.getElementById('app').append(s);
  `);
  await client.screenshot('15b-report-sheet-heat-dark.png');

  // ── 15. Toast ─────────────────────────────────────────────────────────────
  console.log('--- 15. Toast ---');
  await setupPage({ theme: 'dark', width: 390, height: 844 });
  await client.eval(`
    const t = document.getElementById('toast');
    t.hidden = false;
    t.textContent = 'Report submitted. Thank you for keeping Pune safe!';
  `);
  await client.screenshot('16-toast-dark.png');

  // ── 16. Languages on 390 & 320 ────────────────────────────────────────────
  console.log('--- 16. Languages (mr, hi, kn, te) ---');
  for (const lang of ['mr', 'hi', 'kn', 'te']) {
    await setupPage({ theme: 'dark', lang, width: 390, height: 844 });
    await client.screenshot(`17-lang-${lang}-phone-dark.png`);

    await setupPage({ theme: 'dark', lang, width: 320, height: 640 });
    await client.screenshot(`17-lang-${lang}-narrow-dark.png`);
  }

  // ── 17. Automated Contrast & Style Check ───────────────────────────────────
  console.log('--- 17. Contrast and computed style audit ---');
  const audit = await client.eval(`
    (() => {
      function getRGB(str) {
        const m = str.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/);
        if (!m) return null;
        return { r: +m[1], g: +m[2], b: +m[3], a: m[4] != null ? +m[4] : 1 };
      }
      function lum({ r, g, b }) {
        const a = [r, g, b].map(v => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
      }
      function contrast(c1, c2) {
        const l1 = lum(c1), l2 = lum(c2);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      }

      const issues = [];
      const testEls = document.querySelectorAll('#action-bar button, .card-headline, .card-subline, #hazard-toggle button, #disclaimer');
      testEls.forEach(el => {
        const cs = window.getComputedStyle(el);
        const color = getRGB(cs.color);
        let bg = getRGB(cs.backgroundColor);
        let cur = el;
        while ((!bg || bg.a === 0) && cur.parentElement) {
          cur = cur.parentElement;
          bg = getRGB(window.getComputedStyle(cur).backgroundColor);
        }
        if (color && bg && bg.a >= 0.8) {
          const ratio = contrast(color, bg);
          if (ratio < 4.5) {
            issues.push({ text: el.textContent?.trim().slice(0, 30), selector: el.tagName + '.' + el.className, ratio: ratio.toFixed(2), color: cs.color, bg: cs.backgroundColor });
          }
        }
      });
      return issues;
    })()
  `);
  console.log('Automated contrast audit issues found:', audit);

  await client.close();
  console.log('=== COMPLETE ===');
} finally {
  chrome.kill();
}
