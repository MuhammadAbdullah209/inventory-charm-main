import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Package, Truck, ShoppingCart, Receipt, ScanLine, LogOut, Settings, Boxes } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { getToken, getUser, setToken, setUser, getApiBase, setApiBase } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


const ALL_NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin"] },
  { to: "/products", label: "Products", icon: Package, roles: ["admin"] },
  { to: "/billing", label: "Billing", icon: Receipt, roles: ["admin", "staff"] },
  { to: "/scan", label: "Scan", icon: ScanLine, roles: ["admin", "staff"] },
  { to: "/purchases", label: "Purchases", icon: ShoppingCart, roles: ["admin"] },
  { to: "/suppliers", label: "Suppliers", icon: Truck, roles: ["admin"] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [user, setU] = useState<{ name?: string; role?: string } | null>(null);

  useEffect(() => {
    const u = getUser();
    setU(u);
    if (!getToken()) navigate({ to: "/login" });
  }, [navigate]);

  const role = user?.role ?? "staff"; 
  const nav = ALL_NAV.filter((n) => n.roles.includes(role));



  function logout() {
    setToken(null);
    setUser(null);
    navigate({ to: "/login" });
  }

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground flex">
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-card">
        <div className="px-6 py-5 flex items-center gap-2 border-b border-border">
          <div className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Boxes className="size-4" />
          </div>
          <div>
            <div className="font-semibold tracking-tight">Inventory</div>
            <div className="text-xs text-muted-foreground -mt-0.5">Management Suite</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((n) => {
            const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
              >
                <n.icon className="size-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border space-y-1">
          <ApiSettings />
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="size-4" />
            Logout
          </button>
          <div className="px-3 pt-2 text-xs text-muted-foreground">
            {user?.name && <div className="truncate">{user.name}</div>}
            {user?.role && <div className="capitalize">{user.role}</div>}
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0 h-screen overflow-y-auto">
        <header className="md:hidden flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
              <Boxes className="size-4" />
            </div>
            <span className="font-semibold">Inventory</span>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="size-4" />
          </Button>
        </header>
        <div className="md:hidden flex overflow-x-auto gap-1 px-3 py-2 border-b border-border bg-card">
          {nav.map((n) => {
            const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`shrink-0 rounded-md px-3 py-1.5 text-xs ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
              >
                {n.label}
              </Link>
            );
          })}
        </div>
        <div className="p-6 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

function ApiSettings() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  useEffect(() => { if (open) setUrl(getApiBase()); }, [open]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <Settings className="size-4" />
          API Settings
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>API Endpoint</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Backend URL</Label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://localhost:5000" />
          <p className="text-xs text-muted-foreground">Points to your Express server. Do not include trailing slash.</p>
        </div>
        <DialogFooter>
          <Button onClick={() => { setApiBase(url); setOpen(false); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}