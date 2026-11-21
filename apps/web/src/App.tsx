import { Route, Routes } from "react-router";
import { Shell } from "./components/Shell";
import { Landing } from "./pages/Landing";
import { Help, HelpCategory } from "./pages/Help";
import { Emergency } from "./pages/Emergency";
import { NotFound } from "./pages/NotFound";
import { lazyPage } from "./lib/lazy-page";

// Static content pages are code-split so the landing chunk stays under the JS budget.
const Offices = lazyPage(() => import("./pages/Offices"), "Offices");
const StatePage = lazyPage(() => import("./pages/StatePage"), "StatePage");
const LegalAid = lazyPage(() => import("./pages/LegalAid"), "LegalAid");
const Feedback = lazyPage(() => import("./pages/Feedback"), "Feedback");
const About = lazyPage(() => import("./pages/About"), "About");
const AboutData = lazyPage(() => import("./pages/About"), "AboutData");
const Privacy = lazyPage(() => import("./pages/Legal"), "Privacy");
const Terms = lazyPage(() => import("./pages/Legal"), "Terms");
const Disclaimer = lazyPage(() => import("./pages/Legal"), "Disclaimer");

export function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Landing />} />
        <Route path="help" element={<Help />} />
        <Route path="help/:category" element={<HelpCategory />} />
        <Route path="emergency" element={<Emergency />} />
        <Route path="offices" element={<Offices />} />
        <Route path="offices/:city" element={<Offices />} />
        <Route path="state/:code" element={<StatePage />} />
        <Route path="legal-aid" element={<LegalAid />} />
        <Route path="feedback" element={<Feedback />} />
        <Route path="about" element={<About />} />
        <Route path="about/data" element={<AboutData />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="terms" element={<Terms />} />
        <Route path="disclaimer" element={<Disclaimer />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
