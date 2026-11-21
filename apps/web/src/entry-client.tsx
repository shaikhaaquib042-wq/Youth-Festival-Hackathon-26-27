import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { isLocale, LANG_META, registerDict, type Locale } from "@raasta/i18n";
import { App } from "./App";
import { LangProvider, basenameFor } from "./lib/lang";
import { canAnimate } from "./lib/motion";
import "./styles/app.css";

function detectLang(): Locale {
  const seg = window.location.pathname.split("/")[1];
  return isLocale(seg) ? seg : "en";
}

const lang = detectLang();
// Production pages embed only the active locale dictionary; dev imports every locale through the full index.
const dictEl = document.getElementById("raasta-i18n");
if (dictEl?.textContent) {
  try {
    registerDict(lang, JSON.parse(dictEl.textContent) as Record<string, string>);
  } catch {
    /* keep the English fallback */
  }
}
const root = document.getElementById("root");

if (root) {
  document.documentElement.lang = LANG_META[lang].tag;
  document.documentElement.dir = LANG_META[lang].dir;
  const tree = (
    <StrictMode>
      <LangProvider value={lang}>
        <BrowserRouter basename={basenameFor(lang)}>
          <App />
        </BrowserRouter>
      </LangProvider>
    </StrictMode>
  );
  if (root.hasChildNodes()) hydrateRoot(root, tree);
  else createRoot(root).render(tree);
  initReveal(root);
}

/** Scroll reveal for elements with class "reveal". Only on capable devices; prerendered content stays visible otherwise. */
function initReveal(scope: HTMLElement) {
  if (!canAnimate() || !("IntersectionObserver" in window)) return;
  document.documentElement.classList.add("motion");
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: "0px 0px -8% 0px" },
  );
  let queued = false;
  const scan = () => {
    queued = false;
    const h = window.innerHeight || 800;
    scope.querySelectorAll(".reveal:not(.in)").forEach((el) => {
      // Already on screen: show now, never wait for an observer callback.
      if (el.getBoundingClientRect().top < h) el.classList.add("in");
      else io.observe(el);
    });
  };
  scan();
  new MutationObserver(() => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(scan);
    }
  }).observe(scope, { childList: true, subtree: true });
}
