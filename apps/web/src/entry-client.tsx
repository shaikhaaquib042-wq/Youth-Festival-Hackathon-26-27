import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { isLocale, LANG_META, type Locale } from "@raasta/i18n";
import { App } from "./App";
import { LangProvider, basenameFor } from "./lib/lang";
import "./styles/app.css";

function detectLang(): Locale {
  const seg = window.location.pathname.split("/")[1];
  return isLocale(seg) ? seg : "en";
}

const lang = detectLang();
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
}
