import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, type Purchase, type Supplier } from "@/lib/api";
import { Plus, Download, FileDown, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/purchases")({
  head: () => ({ meta: [{ title: "Purchases — Inventory" }] }),
  component: PurchasesPage,
});

function downloadSinglePurchase(p: Purchase) {
  const rows = [{
    "Date": p.createdAt ? new Date(p.createdAt).toLocaleString() : "—",
    "Supplier": typeof p.supplier === "object" ? p.supplier?.name : "—",
    "Product": typeof p.productId === "object" ? p.productId?.name : "—",
    "Barcode": p.barcode,
    "Quantity": p.quantity,
  }];
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 22 }, { wch: 20 }, { wch: 25 }, { wch: 22 }, { wch: 10 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Purchase");
  const date = p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : "purchase";
  XLSX.writeFile(wb, `Purchase-${p._id.slice(-6)}-${date}.xlsx`);
}

function downloadAllPurchases(list: Purchase[]) {
  const rows = list.map((p, i) => ({
    "#": i + 1,
    "Date": p.createdAt ? new Date(p.createdAt).toLocaleString() : "—",
    "Supplier": typeof p.supplier === "object" ? p.supplier?.name : "—",
    "Product": typeof p.productId === "object" ? p.productId?.name : "—",
    "Barcode": p.barcode,
    "Quantity": p.quantity,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 4 }, { wch: 22 }, { wch: 20 }, { wch: 25 }, { wch: 22 }, { wch: 10 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "All Purchases");
  XLSX.writeFile(wb, `All-Purchases-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function PurchasesPage() {
  const [list, setList] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [open, setOpen] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [barcode, setBarcode] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    api<Purchase[]>("/Api/purchases").then(setList).catch(() => { }).finally(() => setLoading(false));
    api<Supplier[]>("/Api/suppliers").then(setSuppliers).catch(() => { });
  }
  useEffect(load, []);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setSubmitting(true);
    try {
      await api("/Api/purchases", {
        method: "POST",
        body: JSON.stringify({ supplier, barcode, quantity: Number(quantity) }),
      });
      setOpen(false); setBarcode(""); setQuantity("1"); load();
    } catch (e) { setErr((e as Error).message); }
    finally { setSubmitting(false); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this purchase? Stock will be reversed.")) return;
    try {
      await api(`/Api/purchases/${id}`, { method: "DELETE" });
      load();
    } catch (e) { alert((e as Error).message); }
  }

  return (
    <AppShell>
      <PageHeader
        title="Purchases"
        description="Stock-in events that grow inventory."
        action={
          <div className="flex items-center gap-2">
            {list.length > 0 && (
              <Button variant="outline" onClick={() => downloadAllPurchases(list)}>
                <FileDown className="size-4 mr-1" /> Download All
              </Button>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button><Plus className="size-4" /> Record purchase</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Record purchase</DialogTitle></DialogHeader>
                <form onSubmit={create} className="space-y-3">
                  <div className="space-y-2">
                    <Label>Supplier</Label>
                    <Select value={supplier} onValueChange={setSupplier}>
                      <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                      <SelectContent>
                        {suppliers.map((s) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Variant barcode</Label><Input required value={barcode} onChange={(e) => setBarcode(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Quantity</Label><Input required type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
                  {err && <p className="text-sm text-destructive">{err}</p>}
                  <DialogFooter><Button type="submit" disabled={submitting}>{submitting ? <LoadingSpinner label="Saving..." className="justify-center" /> : "Save"}</Button></DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner label="Loading purchases..." />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="p-4">Date</th>
                  <th className="p-4">Supplier</th>
                  <th className="p-4">Product</th>
                  <th className="p-4">Barcode</th>
                  <th className="p-4 text-right">Qty</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p._id} className="border-b border-border last:border-0">
                    <td className="p-4 text-muted-foreground">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}</td>
                    <td className="p-4">{typeof p.supplier === "object" ? p.supplier?.name : "—"}</td>
                    <td className="p-4">{typeof p.productId === "object" ? p.productId?.name : "—"}</td>
                    <td className="p-4 font-mono text-xs">{p.barcode}</td>
                    <td className="p-4 text-right font-medium">{p.quantity}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => downloadSinglePurchase(p)}>
                          <Download className="size-3 mr-1" /> Excel
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => remove(p._id)}>
                          <Trash2 className="size-3 mr-1 text-destructive" /> Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No purchases yet.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}