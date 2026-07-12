import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { api, getUser, type DashboardStats, type Product } from "@/lib/api";
import { Package, Truck, Receipt, TrendingUp, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    const user = getUser();
    if (user?.role?.toLowerCase() === "staff") {
      throw redirect({ to: "/billing" });
    }
  },
  head: () => ({
    meta: [
      { title: "Dashboard — Inventory" },
      { name: "description", content: "Overview of products, suppliers, revenue and stock." },
    ],
  }),
  component: Dashboard,
});

interface LowStock { product: string; barcode: string; stock: number }

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [low, setLow] = useState<LowStock[]>([]);
  const [recent, setRecent] = useState<Product[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErr(null);

    Promise.all([
      api<DashboardStats>("/Api/dashboard")
        .then((data) => { if (active) setStats(data); })
        .catch((e) => { if (active) setErr(e.message); }),
      api<LowStock[]>("/Api/low-stock")
        .then((data) => { if (active) setLow(data); })
        .catch(() => { }),
      api<Product[]>("/Api/")
        .then((p) => { if (active) setRecent(p.slice(-5).reverse()); })
        .catch(() => { }),
    ]).finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, []);

  const cards = [
    { label: "Products", value: stats?.totalProducts ?? "—", icon: Package },
    { label: "Suppliers", value: stats?.totalSuppliers ?? "—", icon: Truck },
    { label: "Bills", value: stats?.totalBills ?? "—", icon: Receipt },
    { label: "Revenue", value: stats ? `Rs${stats.revenue.toLocaleString()}` : "—", icon: TrendingUp },
  ];

  return (
    <AppShell>
      <PageHeader title="Dashboard" description="A quiet overview of your inventory." />
      {err && <div className="mb-4 text-sm text-destructive">{err}</div>}
      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner label="Loading dashboard data..." />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((c) => (
          <Card key={c.label} className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</span>
                <c.icon className="size-4 text-muted-foreground" />
              </div>
              <div className="mt-3 text-2xl font-semibold tracking-tight">{c.value}</div>
            </CardContent>
          </Card>
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" /> Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            {low.length === 0 ? (
              <p className="text-sm text-muted-foreground">All variants healthy.</p>
            ) : (
              <ul className="divide-y divide-border">
                {low.map((l, i) => (
                  <li key={i} className="py-2 flex justify-between text-sm">
                    <div>
                      <div className="font-medium">{l.product}</div>
                      <div className="text-xs text-muted-foreground font-mono">{l.barcode}</div>
                    </div>
                    <span className="text-destructive font-medium">{l.stock} left</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Products</CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No products yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((p) => (
                  <li key={p._id} className="py-2 flex justify-between text-sm">
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.category} · {p.variants.length} variants</div>
                    </div>
                    <span className="font-medium">Rs{p.price}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
          </div>
        </>
      )}
    </AppShell>
  );
}
