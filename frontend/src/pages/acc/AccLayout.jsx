import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LayoutDashboard, Users, FileText, ShoppingBag, CreditCard, BookOpen, BarChart2, LogOut, Menu } from "lucide-react";
import { useState } from "react";

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink to={to} end={to.endsWith("dashboard")}
      className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? "bg-purple-600 text-white" : "text-purple-100 hover:bg-purple-600/60"}`}>
      <Icon size={18} />{label}
    </NavLink>
  );
}

export default function AccLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const links = [
    { to: "/acc/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/acc/parties", icon: Users, label: "Parties" },
    { to: "/acc/invoices", icon: FileText, label: "Sales Invoices" },
    { to: "/acc/purchases", icon: ShoppingBag, label: "Purchases" },
    { to: "/acc/payments", icon: CreditCard, label: "Payments" },
    { to: "/acc/ledger", icon: BookOpen, label: "Ledger" },
    { to: "/acc/gst", icon: BarChart2, label: "GST Reports" },
  ];
  function handleLogout() { logout(); navigate("/med/login"); }
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-purple-900 flex flex-col transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static md:flex`}>
        <div className="px-6 py-5 border-b border-purple-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
              <span className="text-purple-900 font-bold text-xs">₹</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">MediThread</p>
              <p className="text-purple-300 text-xs">Accounting</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {links.map(l => <NavItem key={l.to} {...l} />)}
        </nav>
        <div className="px-3 py-4 border-t border-purple-800">
          <div className="px-4 py-2 mb-2">
            <p className="text-white text-sm font-medium truncate">{user?.name}</p>
            <p className="text-purple-300 text-xs capitalize">{user?.role?.replace("_", " ")}</p>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-purple-100 hover:bg-purple-600/60 transition-colors">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setOpen(false)} />}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 md:hidden">
          <button onClick={() => setOpen(true)} className="text-gray-600"><Menu size={22} /></button>
          <span className="font-semibold text-gray-800">MediThread Accounting</span>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
