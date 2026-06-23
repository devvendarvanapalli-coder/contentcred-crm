import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard,
  FlaskConical,
  Factory,
  ClipboardCheck,
  Package,
  BarChart3,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const NAV = [
  { to: "/gmp/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/gmp/materials", icon: FlaskConical, label: "Raw Materials" },
  { to: "/gmp/batches", icon: Factory, label: "Production Batches" },
  { to: "/gmp/qc", icon: ClipboardCheck, label: "Quality Control" },
  { to: "/gmp/packaging", icon: Package, label: "Packaging" },
  { to: "/gmp/reports", icon: BarChart3, label: "Reports" },
];

export default function GMPLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/med/login");
  }

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-blue-900">
      <div className="px-5 py-5 border-b border-blue-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">GMP</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">MediThread</p>
            <p className="text-green-400 text-xs mt-0.5">GMP Module</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-green-700 text-white"
                  : "text-blue-200 hover:bg-blue-800 hover:text-white"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-4 border-t border-blue-800 pt-4">
        <div className="flex items-center gap-3 px-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.name || "User"}</p>
            <p className="text-blue-300 text-xs truncate capitalize">{user?.role?.replace("_", " ") || ""}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-blue-300 hover:text-white hover:bg-blue-800 rounded-lg text-sm transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-60 lg:flex-shrink-0 flex-col">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-60 h-full">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-blue-900 border-b border-blue-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-green-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">GMP</span>
            </div>
            <span className="text-white font-semibold text-sm">MediThread GMP</span>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="text-white">
            <Menu size={22} />
          </button>
        </div>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
