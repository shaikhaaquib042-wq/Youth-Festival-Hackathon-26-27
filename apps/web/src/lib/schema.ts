import { APP_NAME, SITE_URL, TAGLINE } from "@raasta/config";
import { LANG_META, t, type Locale } from "@raasta/i18n";
import { localePath } from "./lang";
import { normalizePath } from "./meta";
import { findCategory } from "./content";
import { pagesT } from "./pages-i18n";

const PATH_LABEL: Record<string, string> = {
  "/help": "ui.crumb.help",
  "/offices": "ui.crumb.offices",
  "/legal-aid": "ui.crumb.legal_aid",
  "/emergency": "ui.crumb.emergency",
  "/feedback": "ui.crumb.feedback",
  "/about": "ui.crumb.about",
  "/about/data": "ui.crumb.data",
  "/privacy": "ui.crumb.privacy",
  "/terms": "ui.crumb.terms",
  "/disclaimer": "ui.crumb.disclaimer",
};

/** WebSite on the home page, BreadcrumbList on inner pages. Names and URLs come from the app's own routes. */
export function schemaFor(lang: Locale, rawPath: string): object[] {
  const path = normalizePath(rawPath);
  const url = (p: string) => SITE_URL + localePath(lang, p);
  if (path === "/") {
    return [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: APP_NAME,
        description: TAGLINE,
        url: url("/"),
        inLanguage: LANG_META[lang].tag,
      },
    ];
  }
  const parts = path.split("/").filter(Boolean);
  const items: { name: string; url: string }[] = [{ name: pagesT(lang, "ui.crumb.home"), url: url("/") }];
  let cum = "";
  parts.forEach((seg, i) => {
    cum += `/${seg}`;
    let name: string | undefined;
    if (PATH_LABEL[cum]) name = pagesT(lang, PATH_LABEL[cum]);
    else if (parts[0] === "state" && i === 1) name = pagesT(lang, "ui.crumb.state", { code: seg.toUpperCase() });
    else if (parts[0] === "help" && i === 1 && findCategory(seg)) name = t(lang, `category.${seg}`);
    if (name) items.push({ name, url: url(cum) });
  });
  if (items.length < 2) return [];
  return [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((it, idx) => ({ "@type": "ListItem", position: idx + 1, name: it.name, item: it.url })),
    },
  ];
}
