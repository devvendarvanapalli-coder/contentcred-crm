import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard, Users, MapPin, FileText, ShoppingCart,
  LogOut, Menu, X, Activity
} from "lucide-react";
import { useState } from "react";

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? "bg-blue-700 text-white"
            : "text-blue-100 hover:bg-blue-700/60"
        }`
      }
    >
      <Icon size={18} />
      {label}
    </NavLink>
  );
}

export default function MedLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const isAdmin = user?.role === "admin";

  const adminLinks = [
    { to: "/med/admin", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/med/admin/leads", icon: FileText, label: "All Leads" },
    { to: "/med/admin/orders", icon: ShoppingCart, label: "Orders" },
    { to: "/med/admin/reps", icon: Users, label: "Sales Reps" },
    { to: "/med/admin/gps", icon: MapPin, label: "GPS Tracker" },
    { to: "/med/admin/reports", icon: Activity, label: "Reports" },
  ];

  const repLinks = [
    { to: "/med/rep", icon: LayoutDashboard, label: "My Dashboard" },
    { to: "/med/rep/leads", icon: FileText, label: "My Leads" },
    { to: "/med/rep/visits", icon: MapPin, label: "Log Visit" },
    { to: "/med/rep/orders", icon: ShoppingCart, label: "My Orders" },
  ];

  const links = isAdmin ? adminLinks : repLinks;

  function handleLogout() {
    logout();
    navigate("/med/login");
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-blue-900 flex flex-col transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static md:flex`}
      >
        <div className="px-6 py-5 border-b border-blue-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-teal-400 rounded-lg flex items-center justify-center">
              <span className="text-blue-900 font-bold text-xs">MT</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">MediThread</p>
              <p className="text-blue-300 text-xs">Sales CRM</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {links.map(l => <NavItem key={l.to} {...l} />)}
        </nav>

        <div className="px-3 py-4 border-t border-blue-800">
          <div className="px-4 py-2 mb-2">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-blue-300 text-xs capitalize">{user?.role?.replace("_", " ")}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-blue-100 hover:bg-blue-700/60 transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 md:hidden">
          <button onClick={() => setOpen(true)} className="text-gray-600">
            <Menu size={22} />
          </button>
          <span className="font-semibold text-gray-800">MediThread CRM</span>
        </header>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
