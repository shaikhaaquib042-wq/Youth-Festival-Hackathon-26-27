import { FileText, Phone, ShieldAlert } from "lucide-react";
import { useLang, useT, rUrl } from "../lib/lang";
import "../styles/pages.css";

export function Emergency() {
  const lang = useLang();
  const tt = useT();
  return (
    <div className="container page em">
      <header className="em-head">
        <span className="em-badge" aria-hidden="true">
          <ShieldAlert size={30} />
        </span>
        <div>
          <h1>{tt("ui.emergency.h1")}</h1>
          <p className="page-lead">{tt("ui.emergency.lead")}</p>
        </div>
      </header>

      <div className="em-calls">
        <a className="em-call em-call-main" href="tel:1930">
          <span className="em-call-icon" aria-hidden="true">
            <Phone size={26} />
          </span>
          <span>
            <strong>{tt("ui.emergency.call_1930")}</strong>
            <small>{tt("ui.emergency.call_1930_note")}</small>
          </span>
        </a>
        <a className="em-call em-call-alt" href="tel:112">
          <span className="em-call-icon" aria-hidden="true">
            <Phone size={24} />
          </span>
          <span>
            <strong>{tt("ui.emergency.call_112")}</strong>
            <small>{tt("ui.emergency.call_112_note")}</small>
          </span>
        </a>
      </div>

      <section className="em-steps-wrap" aria-labelledby="upi-h">
        <h2 id="upi-h">{tt("ui.emergency.upi_h2")}</h2>
        <ol className="em-steps" role="list">
          <li className="reveal">
            <span className="em-n" aria-hidden="true">1</span>
            <h3>{tt("ui.emergency.step1.title")}</h3>
            <p>{tt("ui.emergency.step1.body")}</p>
          </li>
          <li className="reveal">
            <span className="em-n" aria-hidden="true">2</span>
            <h3>{tt("ui.emergency.step2.title")}</h3>
            <p>
              {tt("ui.emergency.step2.body")}{" "}
              <a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer">
                cybercrime.gov.in
              </a>
            </p>
          </li>
          <li className="reveal">
            <span className="em-n" aria-hidden="true">3</span>
            <h3>{tt("ui.emergency.step3.title")}</h3>
            <p>{tt("ui.emergency.step3.body")}</p>
            <a className="btn btn-secondary em-letter" href={rUrl(lang, "/r/doc/bank_fraud_intimation")}>
              <FileText size={18} aria-hidden="true" />
              <span>{tt("ui.emergency.letter")}</span>
            </a>
          </li>
        </ol>
      </section>
      <p className="em-never">{tt("ui.emergency.never_share")}</p>
    </div>
  );
}
