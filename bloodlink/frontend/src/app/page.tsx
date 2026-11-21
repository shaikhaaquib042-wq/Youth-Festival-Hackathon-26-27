import { redirect } from "next/navigation";

// Per PRD Section 3: There is no landing or marketing page.
// Users enter directly into functional utility screens.
export default function RootPage() {
  redirect("/request");
}
