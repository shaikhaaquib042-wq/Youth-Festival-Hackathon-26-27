// NDMA SACHET CAP RSS → official alerts for the city — ORCHESTRATOR-OWNED.
// Titles are often in Marathi (e.g. "पुणे"), so matching uses the city pack's multilingual `sachet.match` list.
import { CONFIG, cityPack } from '../../config.js';

const stateOf = (feedUrl) => feedUrl.match(/rss_([a-z]+)\.xml/)?.[1] ?? 'maharashtra';

/** @returns {Promise<Array<{id,title,category,link,author,publishedAt,matched:boolean}>>} */
export async function fetchSachetAlerts(pack = cityPack()) {
  const res = await fetch(`${CONFIG.SACHET_PATH}?state=${stateOf(pack.sachet.feed)}`);
  if (!res.ok) throw new Error(`SACHET ${res.status}`);
  const doc = new DOMParser().parseFromString(await res.text(), 'application/xml');
  const terms = pack.sachet.match.map((t) => t.toLowerCase());
  return [...doc.querySelectorAll('item')].map((it) => {
    const get = (tag) => it.querySelector(tag)?.textContent?.trim() ?? '';
    const title = get('title');
    const text = `${title} ${get('description')}`.toLowerCase();
    return {
      id: get('guid'),
      title,
      category: get('category'),
      link: get('link'),
      author: get('author'),
      publishedAt: new Date(get('pubDate')).toISOString(),
      matched: terms.some((t) => text.includes(t)),
    };
  });
}

/** Poll and call back with the alerts that mention this city, newest first. Returns a stop function. */
export function watchSachet(onAlerts, pack = cityPack()) {
  let stopped = false;
  const tick = async () => {
    try {
      const all = await fetchSachetAlerts(pack);
      if (!stopped) onAlerts(all.filter((a) => a.matched).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)));
    } catch (e) {
      console.warn('[sachet]', e.message);
    }
  };
  tick();
  const id = setInterval(tick, CONFIG.SACHET_POLL_MS);
  return () => { stopped = true; clearInterval(id); };
}
