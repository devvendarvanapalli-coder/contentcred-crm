import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Creators from "./pages/Creators";
import Sequences from "./pages/Sequences";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Campaigns from "./pages/Campaigns";
import CampaignDetail from "./pages/CampaignDetail";
import Discover from "./pages/Discover";
import SubmitPage from "./pages/SubmitPage";

// Public routes (no sidebar)
function PublicLayout({ children }) {
  return <div className="min-h-screen">{children}</div>;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes — no sidebar */}
      <Route path="/discover" element={<PublicLayout><Discover /></PublicLayout>} />
      <Route path="/submit/:token" element={<PublicLayout><SubmitPage /></PublicLayout>} />

      {/* Admin routes — with sidebar */}
      <Route path="/*" element={
        <div className="flex min-h-screen bg-gray-50">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/"              element={<Dashboard />} />
              <Route path="/creators"      element={<Creators />} />
              <Route path="/campaigns"     element={<Campaigns />} />
              <Route path="/campaigns/:id" element={<CampaignDetail />} />
              <Route path="/sequences"     element={<Sequences />} />
              <Route path="/analytics"     element={<Analytics />} />
              <Route path="/settings"      element={<Settings />} />
            </Routes>
          </main>
        </div>
      } />
    </Routes>
  );
}
