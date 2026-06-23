import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth, AuthProvider } from "./context/AuthContext";

// Original ContentCred routes
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Creators from "./pages/Creators";
import Sequences from "./pages/Sequences";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";

// GMP routes
import GMPLayout from "./pages/gmp/GMPLayout";
import GMPDashboard from "./pages/gmp/Dashboard";
import Materials from "./pages/gmp/Materials";
import Batches from "./pages/gmp/Batches";
import QualityControl from "./pages/gmp/QualityControl";
import Packaging from "./pages/gmp/Packaging";
import GMPReports from "./pages/gmp/Reports";

// Accounting routes
import AccLayout from "./pages/acc/AccLayout";
import AccDashboard from "./pages/acc/Dashboard";
import Parties from "./pages/acc/Parties";
import Invoices from "./pages/acc/Invoices";
import Purchases from "./pages/acc/Purchases";
import Payments from "./pages/acc/Payments";
import Ledger from "./pages/acc/Ledger";
import GSTReports from "./pages/acc/GSTReports";

// MediThread CRM routes
import Login from "./pages/med/Login";
import MedLayout from "./components/med/MedLayout";
import AdminDashboard from "./pages/med/admin/AdminDashboard";
import AllLeads from "./pages/med/admin/AllLeads";
import GPSTracker from "./pages/med/admin/GPSTracker";
import SalesReps from "./pages/med/admin/SalesReps";
import Reports from "./pages/med/admin/Reports";
import Orders from "./pages/med/admin/Orders";
import RepDashboard from "./pages/med/rep/RepDashboard";
import RepLeads from "./pages/med/rep/RepLeads";
import LogVisit from "./pages/med/rep/LogVisit";
import RepOrders from "./pages/med/rep/RepOrders";

function RequireAuth({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/med/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === "admin" ? "/med/admin" : "/med/rep"} replace />;
  return children;
}

function MedApp() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<Login />} />

        {/* Admin routes */}
        <Route path="admin/*" element={
          <RequireAuth role="admin">
            <MedLayout>
              <Routes>
                <Route index element={<AdminDashboard />} />
                <Route path="leads" element={<AllLeads />} />
                <Route path="orders" element={<Orders />} />
                <Route path="reps" element={<SalesReps />} />
                <Route path="gps" element={<GPSTracker />} />
                <Route path="reports" element={<Reports />} />
              </Routes>
            </MedLayout>
          </RequireAuth>
        } />

        {/* Rep routes */}
        <Route path="rep/*" element={
          <RequireAuth>
            <MedLayout>
              <Routes>
                <Route index element={<RepDashboard />} />
                <Route path="leads" element={<RepLeads />} />
                <Route path="visits" element={<LogVisit />} />
                <Route path="orders" element={<RepOrders />} />
              </Routes>
            </MedLayout>
          </RequireAuth>
        } />

        <Route index element={<Navigate to="login" replace />} />
      </Routes>
    </AuthProvider>
  );
}

function ContentCredApp() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/creators" element={<Creators />} />
          <Route path="/sequences" element={<Sequences />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

function GMPApp() {
  return (
    <AuthProvider>
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="*" element={
          <RequireAuth>
            <GMPLayout>
              <Routes>
                <Route path="dashboard" element={<GMPDashboard />} />
                <Route path="materials" element={<Materials />} />
                <Route path="batches" element={<Batches />} />
                <Route path="qc" element={<QualityControl />} />
                <Route path="packaging" element={<Packaging />} />
                <Route path="reports" element={<GMPReports />} />
              </Routes>
            </GMPLayout>
          </RequireAuth>
        } />
      </Routes>
    </AuthProvider>
  );
}

function AccApp() {
  return (
    <AuthProvider>
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="*" element={
          <RequireAuth>
            <AccLayout>
              <Routes>
                <Route path="dashboard" element={<AccDashboard />} />
                <Route path="parties" element={<Parties />} />
                <Route path="invoices" element={<Invoices />} />
                <Route path="purchases" element={<Purchases />} />
                <Route path="payments" element={<Payments />} />
                <Route path="ledger" element={<Ledger />} />
                <Route path="gst" element={<GSTReports />} />
              </Routes>
            </AccLayout>
          </RequireAuth>
        } />
      </Routes>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/med/*" element={<MedApp />} />
      <Route path="/gmp/*" element={<GMPApp />} />
      <Route path="/acc/*" element={<AccApp />} />
      <Route path="/*" element={<ContentCredApp />} />
    </Routes>
  );
}
