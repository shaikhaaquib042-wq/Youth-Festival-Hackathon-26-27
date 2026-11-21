export type {
  BuildCtx, DocModel, DocParty, TemplateDef, TemplateVariable, VarValue, Vars,
} from "./model";
export { templates, getTemplate, buildDoc } from "./registry";
export { renderPdf, PDF_LOSSY_NOTE } from "./render/pdf";
export { renderPrintHtml, escapeHtml } from "./render/printHtml";
export { renderLabels, renderEnvelopeDL, POST_LINE, POSTING_REMINDER } from "./render/labels";
export type { LabelArgs } from "./render/labels";
export {
  buildMailto, buildGmail, buildOutlook, buildWhatsApp, EMAIL_URL_LIMIT, ATTACH_NOTE,
} from "./email";
export type { EmailArgs, EmailLink } from "./email";
export { BLANK } from "./templates/util";
