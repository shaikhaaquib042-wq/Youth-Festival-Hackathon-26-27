import { useParams } from "react-router";
import { useT } from "../lib/lang";

/** Placeholder page with a real heading and one sentence. Later agents replace these. */
export function Stub({ slug }: { slug: string }) {
  const tt = useT();
  const { code } = useParams();
  const vars = { code: (code ?? "").toUpperCase() };
  return (
    <div className="container stack page">
      <h1>{tt(`ui.stub.${slug}.h1`, vars)}</h1>
      <p className="page-lead">{tt(`ui.stub.${slug}.lead`, vars)}</p>
    </div>
  );
}
