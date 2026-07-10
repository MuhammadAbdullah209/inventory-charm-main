import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, type Bill } from "@/lib/api";
import { Plus, Trash2, Receipt, History, Download, FileDown } from "lucide-react";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/billing")({
  head: () => ({ meta: [{ title: "Billing — Inventory" }] }),
  component: BillingPage,
});

interface Row { barcode: string; quantity: number; preview?: { name: string; price: number; size?: string; color?: string } }

// Download a single bill as Excel
function downloadSingleBill(b: Bill) {
  const rows = b.items.map((it) => ({
    "Product": it.productName,
    "Size": it.size ?? "",
    "Color": it.color ?? "",
    "Quantity": it.quantity,
    "Price (Rs)": it.price,
    "Total (Rs)": it.total,
  }));
  rows.push({ "Product": "TOTAL", "Size": "", "Color": "", "Quantity": "", "Price (Rs)": "", "Total (Rs)": b.totalAmount } as never);

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 25 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Bill");
  const date = b.createdAt ? new Date(b.createdAt).toISOString().slice(0, 10) : "bill";
  XLSX.writeFile(wb, `Bill-${b._id.slice(-6)}-${date}.xlsx`);
}

// Download all bills in one Excel file (one sheet per bill)
function downloadAllBills(bills: Bill[]) {
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summary = bills.map((b, i) => ({
    "#": i + 1,
    "Bill ID": b._id,
    "Date": b.createdAt ? new Date(b.createdAt).toLocaleString() : "",
    "Items": b.items.length,
    "Total (Rs)": b.totalAmount,
  }));
  const summaryWs = XLSX.utils.json_to_sheet(summary);
  summaryWs["!cols"] = [{ wch: 4 }, { wch: 26 }, { wch: 22 }, { wch: 8 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, "All Bills");

  // One sheet per bill
  bills.forEach((b, i) => {
    const rows = b.items.map((it) => ({
      "Product": it.productName,
      "Size": it.size ?? "",
      "Color": it.color ?? "",
      "Quantity": it.quantity,
      "Price (Rs)": it.price,
      "Total (Rs)": it.total,
    }));
    rows.push({ "Product": "TOTAL", "Size": "", "Color": "", "Quantity": "", "Price (Rs)": "", "Total (Rs)": b.totalAmount } as never);
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 25 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, `Bill-${i + 1}`);
  });

  XLSX.writeFile(wb, `All-Bills-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function BillingPage() {
  const [items, setItems] = useState<Row[]>([{ barcode: "", quantity: 1 }]);
  const [bill, setBill] = useState<Bill | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // History state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyErr, setHistoryErr] = useState<string | null>(null);

  async function preview(i: number, code: string) {
    setItems((rows) => rows.map((r, j) => j === i ? { ...r, barcode: code, preview: undefined } : r));
    if (!code) return;
    try {
      const data = await api<{ product: string; variant: { size: string; color: string; stock: number } }>(
        "/Api/scan", { method: "POST", body: JSON.stringify({ barcode: code }) }
      );
      setItems((rows) => rows.map((r, j) => j === i
        ? { ...r, preview: { name: data.product, price: 0, size: data.variant.size, color: data.variant.color } }
        : r));
    } catch { /* ignore preview errors */ }
  }

  async function submit() {
    setErr(null); setBill(null); setLoading(true);
    try {
      const res = await api<{ bill: Bill }>("/Api/bill", {
        method: "POST",
        body: JSON.stringify({ items: items.filter((i) => i.barcode).map((i) => ({ barcode: i.barcode, quantity: i.quantity })) }),
      });
      setBill(res.bill);
      setItems([{ barcode: "", quantity: 1 }]);
    } catch (e) { setErr((e as Error).message); }
    finally { setLoading(false); }
  }

  async function openHistory() {
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryErr(null);
    try {
      const data = await api<Bill[]>("/Api/bills");
      setBills(data);
    } catch (e) {
      setHistoryErr((e as Error).message);
    } finally {
      setHistoryLoading(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Billing"
        description="Create a sale and update stock."
        action={
          <Button variant="outline" onClick={openHistory}>
            <History className="size-4 mr-1" /> Bill History
          </Button>
        }
      />

      {/* Bill History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle>Bill History</DialogTitle>
              {bills.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => downloadAllBills(bills)}>
                  <FileDown className="size-4 mr-1" /> Download All
                </Button>
              )}
            </div>
          </DialogHeader>
          {historyLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {historyErr && <p className="text-sm text-destructive">{historyErr}</p>}
          {!historyLoading && !historyErr && bills.length === 0 && (
            <p className="text-sm text-muted-foreground">No bills found.</p>
          )}
          <div className="space-y-3">
            {bills.map((b) => (
              <Card key={b._id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-mono text-xs text-muted-foreground truncate">{b._id}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {b.createdAt ? new Date(b.createdAt).toLocaleString() : ""}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => downloadSingleBill(b)}>
                      <Download className="size-3 mr-1" /> Excel
                    </Button>
                  </div>
                  <ul className="space-y-1 text-sm">
                    {b.items.map((it, i) => (
                      <li key={i} className="flex justify-between">
                        <span className="truncate">
                          {it.productName}
                          {it.size ? ` · ${it.size}` : ""}
                          {it.color ? ` · ${it.color}` : ""}
                          {" "}× {it.quantity}
                        </span>
                        <span className="ml-4 shrink-0">Rs{it.total}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-between font-semibold border-t border-border pt-2 mt-2">
                    <span>Total</span>
                    <span>Rs{b.totalAmount}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardContent className="p-5 space-y-3">
            {items.map((row, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-7">
                  <Input
                    placeholder="Scan or enter barcode"
                    value={row.barcode}
                    onChange={(e) => preview(i, e.target.value)}
                    className="font-mono"
                  />
                  {row.preview && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {row.preview.name} · {row.preview.size} · {row.preview.color}
                    </div>
                  )}
                </div>
                <Input
                  className="col-span-3"
                  type="number" min="1"
                  value={row.quantity}
                  onChange={(e) => setItems(items.map((r, j) => j === i ? { ...r, quantity: Number(e.target.value) } : r))}
                />
                <Button variant="ghost" size="icon" className="col-span-2" onClick={() => setItems(items.filter((_, j) => j !== i))}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setItems([...items, { barcode: "", quantity: 1 }])}>
              <Plus className="size-3 mr-1" /> Add item
            </Button>
            {err && <p className="text-sm text-destructive">{err}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Receipt className="size-4" />
              <h3 className="font-medium">Summary</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {items.filter((i) => i.barcode).length} item(s) ready
            </p>
            <Button className="w-full mt-4" disabled={loading} onClick={submit}>
              {loading ? "Processing…" : "Create bill"}
            </Button>
            {bill && (
              <div className="mt-5 border-t border-border pt-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Last bill</div>
                <ul className="mt-2 space-y-1 text-sm">
                  {bill.items.map((it, i) => (
                    <li key={i} className="flex justify-between">
                      <span className="truncate">{it.productName} × {it.quantity}</span>
                      <span>Rs{it.total}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between mt-3 font-semibold border-t border-border pt-2">
                  <span>Total</span><span>Rs{bill.totalAmount}</span>
                </div>
                <Button size="sm" variant="outline" className="w-full mt-3" onClick={() => downloadSingleBill(bill)}>
                  <Download className="size-3 mr-1" /> Download Excel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}