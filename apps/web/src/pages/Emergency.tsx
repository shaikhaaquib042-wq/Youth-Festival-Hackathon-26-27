import { Phone } from "lucide-react";
import { useLang, useT, rUrl } from "../lib/lang";

export function Emergency() {
  const lang = useLang();
  const tt = useT();
  return (
    <div className="container stack page">
      <h1>{tt("ui.emergency.h1")}</h1>
      <p className="page-lead">{tt("ui.emergency.lead")}</p>
      <div className="grid-2">
        <a className="btn btn-primary em-call" href="tel:1930">
          <Phone size={24} aria-hidden="true" />
          <span>
            <strong>{tt("ui.emergency.call_1930")}</strong>
            <small>{tt("ui.emergency.call_1930_note")}</small>
          </span>
        </a>
        <a className="btn btn-secondary em-call" href="tel:112">
          <Phone size={24} aria-hidden="true" />
          <span>
            <strong>{tt("ui.emergency.call_112")}</strong>
            <small>{tt("ui.emergency.call_112_note")}</small>
          </span>
        </a>
      </div>
      <section className="card card-warm stack" aria-labelledby="upi-h">
        <h2 id="upi-h">{tt("ui.emergency.upi_h2")}</h2>
        <ol className="action-list">
          <li>
            <strong>{tt("ui.emergency.step1.title")}</strong> {tt("ui.emergency.step1.body")}
          </li>
          <li>
            <strong>{tt("ui.emergency.step2.title")}</strong> {tt("ui.emergency.step2.body")}{" "}
            <a href="https://cybercrime.gov.in" rel="noopener noreferrer">
              cybercrime.gov.in
            </a>
            .
          </li>
          <li>
            <strong>{tt("ui.emergency.step3.title")}</strong> {tt("ui.emergency.step3.body")}
          </li>
        </ol>
        <p>
          <a className="btn btn-secondary" href={rUrl(lang, "/r/doc/bank_fraud_intimation")}>
            {tt("ui.emergency.letter")}
          </a>
        </p>
      </section>
      <p className="sh-muted">{tt("ui.emergency.never_share")}</p>
    </div>
  );
}
