import { APP_NAME } from "@raasta/config";
import { t, type Locale } from "@raasta/i18n";
import { findCategory } from "./content";

export interface PageMeta {
  title: string;
  description: string;
  noindex?: boolean;
}

export function normalizePath(path: string): string {
  const p = path.split("?")[0].split("#")[0] || "/";
  return p.length > 1 ? p.replace(/\/+$/, "") : p;
}

export function metaFor(lang: Locale, rawPath: string): PageMeta {
  const path = normalizePath(rawPath);
  const home = path === "/";
  const parts = path.split("/").filter(Boolean);

  if (parts[0] === "help" && parts[1]) {
    const cat = findCategory(parts[1]);
    if (cat) {
      const name = t(lang, `category.${cat.id}`);
      return {
        title: `${name} | ${APP_NAME}`,
        description: t(lang, "ui.meta.category.desc", { name }),
      };
    }
  }
  if (parts[0] === "state" && parts[1]) {
    const code = parts[1].toUpperCase();
    return {
      title: `${t(lang, "ui.meta.state.title", { code })} | ${APP_NAME}`,
      description: t(lang, "ui.meta.state.desc", { code }),
    };
  }

  const slug = home ? "home" : parts.join("_");
  const key = `ui.meta.${slug}`;
  const title = t(lang, `${key}.title`);
  if (title === `${key}.title`) {
    return { title: `${t(lang, "ui.notfound.title")} | ${APP_NAME}`, description: t(lang, "ui.notfound.lead"), noindex: true };
  }
  return {
    title: home ? title : `${title} | ${APP_NAME}`,
    description: t(lang, `${key}.desc`),
  };
}
