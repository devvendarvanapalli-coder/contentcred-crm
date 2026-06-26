import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, Mail, BarChart2, Settings, Zap, Scissors } from "lucide-react";

const nav = [
  { to: "/",          label: "Dashboard",  icon: LayoutDashboard },
  { to: "/creators",  label: "Creators",   icon: Users },
  { to: "/campaigns", label: "Campaigns",  icon: Scissors },
  { to: "/sequences", label: "Sequences",  icon: Mail },
  { to: "/analytics", label: "Analytics",  icon: BarChart2 },
  { to: "/settings",  label: "Settings",   icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="w-60 min-h-screen bg-brand-950 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-brand-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">ContentCred</p>
            <p className="text-brand-300 text-xs opacity-70">Creator CRM</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-600 text-white"
                  : "text-brand-200 hover:bg-brand-800 hover:text-white"
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-4 border-t border-brand-800">
        <p className="text-brand-400 text-xs opacity-50">v1.0.0 · ContentCred</p>
      </div>
    </aside>
  );
}
