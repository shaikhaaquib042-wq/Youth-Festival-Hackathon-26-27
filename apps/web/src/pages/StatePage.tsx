import { Link, useParams } from "react-router";
import { legalAid, stateByCode } from "../lib/site-data";
import { useLang, localePath } from "../lib/lang";
import { usePageT } from "../lib/pages-i18n";

const inr = (n: number) => `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n)}`;

export function StatePage() {
  const tt = usePageT();
  const lang = useLang();
  const { code = "" } = useParams();
  const up = code.toUpperCase();
  const st = stateByCode(up);

  if (!st) {
    return (
      <div className="container stack page state-page">
        <h1>{tt("ui.state.unknown_h1")}</h1>
        <p className="page-lead">{tt("ui.state.unknown_lead")}</p>
        <p>
          <Link to="/legal-aid">{tt("ui.state.legal_aid_link")}</Link>
        </p>
      </div>
    );
  }

  const name = st.name;
  const aid = legalAid.states.find((s) => s.state_code === up);
  const ceiling = st.legal_aid_ceiling_inr;

  return (
    <div className="container stack page state-page">
      <h1>{tt("ui.state.h1", { name })}</h1>
      <p className="page-lead">
        {st.coverage === "deep"
          ? tt("ui.state.coverage_deep", { name })
          : tt("ui.state.coverage_standard", { name })}
      </p>

      <section className="card stack" aria-labelledby="portal-h">
        <h2 id="portal-h">{tt("ui.state.portal_h2")}</h2>
        {st.grievance_portal ? (
          <>
            <p>
              <a href={st.grievance_portal.url} rel="noopener noreferrer">
                {st.grievance_portal.name}
              </a>
            </p>
            {!st.grievance_portal.verified ? <p className="sh-muted">{tt("ui.check_link")}</p> : null}
          </>
        ) : (
          <p>{tt("ui.state.portal_none", { name })}</p>
        )}
      </section>

      {st.slsa ? (
        <section className="card stack" aria-labelledby="slsa-h">
          <h2 id="slsa-h">{tt("ui.state.slsa_h2")}</h2>
          <p>
            <a href={st.slsa.url} rel="noopener noreferrer">
              {st.slsa.name}
            </a>
          </p>
          {!st.slsa.verified ? <p className="sh-muted">{tt("ui.check_link")}</p> : null}
        </section>
      ) : null}

      <section className="card stack" aria-labelledby="ceiling-h">
        <h2 id="ceiling-h">{tt("ui.state.ceiling_h2")}</h2>
        {ceiling !== null ? (
          <p>{tt("ui.state.ceiling", { name, amount: inr(ceiling) })}</p>
        ) : (
          <p>{tt("ui.state.ceiling_none", { name })}</p>
        )}
        {aid?.ceiling_note ? <p className="sh-muted">{aid.ceiling_note}</p> : null}
        <p>
          <Link className="btn btn-secondary" to="/legal-aid">
            {tt("ui.state.legal_aid_link")}
          </Link>
        </p>
      </section>

      <p>
        <Link to="/offices">{tt("ui.state.offices_link")}</Link>
      </p>
    </div>
  );
}
