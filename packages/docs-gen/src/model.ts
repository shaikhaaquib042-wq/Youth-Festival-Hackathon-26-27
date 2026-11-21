import type { OfficeRef } from "@raasta/rules/types";

export type VarValue = string | number | boolean | null | undefined;
export type Vars = Record<string, VarValue>;

export interface DocParty {
  name?: string;
  address?: string;
  email?: string;
  phone?: string;
}

/**
 * Paragraph conventions (understood by every renderer):
 * - a line starting with "## " is a bold section heading
 * - a line starting with "- " is a bullet
 * - "\n" inside a paragraph is a hard line break
 */
export interface DocModel {
  templateId: string;
  title: string;
  lang: string;
  to: { name: string; address?: string; email?: string };
  from: { name?: string; address?: string; phone?: string };
  date: string;
  subject: string;
  paragraphs: string[];
  enclosures: string[];
  signatureBlock: string[];
  footer: string;
}

export interface TemplateVariable {
  id: string;
  label_en: string;
  type: "text" | "number" | "date" | "textarea";
  required: boolean;
}

export interface BuildCtx {
  office?: OfficeRef;
  lang: string;
  now: Date | string | number;
}

export interface TemplateDef {
  id: string;
  title_en: string;
  variables: TemplateVariable[];
  build(vars: Vars, ctx: BuildCtx): DocModel;
}
