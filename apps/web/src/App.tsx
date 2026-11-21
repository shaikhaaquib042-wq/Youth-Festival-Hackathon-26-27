import { Route, Routes } from "react-router";
import { Shell } from "./components/Shell";
import { Landing } from "./pages/Landing";
import { Help, HelpCategory } from "./pages/Help";
import { Emergency } from "./pages/Emergency";
import { NotFound } from "./pages/NotFound";
import { Stub } from "./pages/Stub";

export function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Landing />} />
        <Route path="help" element={<Help />} />
        <Route path="help/:category" element={<HelpCategory />} />
        <Route path="emergency" element={<Emergency />} />
        <Route path="offices" element={<Stub slug="offices" />} />
        <Route path="state/:code" element={<Stub slug="state" />} />
        <Route path="legal-aid" element={<Stub slug="legal_aid" />} />
        <Route path="feedback" element={<Stub slug="feedback" />} />
        <Route path="about" element={<Stub slug="about" />} />
        <Route path="about/data" element={<Stub slug="about_data" />} />
        <Route path="privacy" element={<Stub slug="privacy" />} />
        <Route path="terms" element={<Stub slug="terms" />} />
        <Route path="disclaimer" element={<Stub slug="disclaimer" />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
