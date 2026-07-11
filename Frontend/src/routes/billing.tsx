import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, type Bill } from "@/lib/api";
import { Plus, Trash2, Receipt, History, Download, FileDown, X, FileText } from "lucide-react";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/billing")({
  head: () => ({ meta: [{ title: "Billing — Inventory" }] }),
  component: BillingPage,
});

interface Row { barcode: string; quantity: number; preview?: { name: string; price: number; size?: string; color?: string } }

interface BillTab {
  id: number;
  label: string;
  items: Row[];
  bill: Bill | null;
  err: string | null;
  loading: boolean;
}

function createTab(id: number): BillTab {
  return { id, label: `Customer ${id}`, items: [{ barcode: "", quantity: 1 }], bill: null, err: null, loading: false };
}

// ─── PDF Download ────────────────────────────────────────────────────────────
function downloadBillPDF(b: Bill) {
  const date = b.createdAt ? new Date(b.createdAt).toLocaleString() : new Date().toLocaleString();
  const billNo = b._id.slice(-8).toUpperCase();

  const rows = b.items.map((it, i) => `
    <tr style="background:${i % 2 === 0 ? "#f9fafb" : "#ffffff"}">
      <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;">${it.productName}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;text-align:center;">${it.size ?? "—"}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;text-align:center;">${it.color ?? "—"}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;text-align:center;">${it.quantity}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;text-align:right;">Rs ${it.price ?? 0}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">Rs ${it.total}</td>
    </tr>
  `).join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Bill #${billNo}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #111; padding: 40px; }
        @media print { body { padding: 20px; } .no-print { display: none; } }
      </style>
    </head>
    <body>

      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;padding-bottom:24px;border-bottom:2px solid #111;">
        <div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
            <div style="width:36px;height:36px;background:#111;border-radius:8px;display:flex;align-items:center;justify-content:center;">
              <span style="color:white;font-size:18px;font-weight:bold;">I</span>
            </div>
            <div>
              <div style="font-size:20px;font-weight:700;letter-spacing:-0.5px;">Inventory</div>
              <div style="font-size:11px;color:#6b7280;">Management Suite</div>
            </div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:28px;font-weight:800;letter-spacing:-1px;color:#111;">RECEIPT</div>
          <div style="font-size:13px;color:#6b7280;margin-top:4px;">Bill No: <span style="color:#111;font-weight:600;">#${billNo}</span></div>
          <div style="font-size:13px;color:#6b7280;margin-top:2px;">Date: <span style="color:#111;">${date}</span></div>
        </div>
      </div>

      <!-- Items Table -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead>
          <tr style="background:#111;color:#fff;">
            <th style="padding:12px 14px;text-align:left;font-size:12px;font-weight:600;letter-spacing:0.5px;">PRODUCT</th>
            <th style="padding:12px 14px;text-align:center;font-size:12px;font-weight:600;letter-spacing:0.5px;">SIZE</th>
            <th style="padding:12px 14px;text-align:center;font-size:12px;font-weight:600;letter-spacing:0.5px;">COLOR</th>
            <th style="padding:12px 14px;text-align:center;font-size:12px;font-weight:600;letter-spacing:0.5px;">QTY</th>
            <th style="padding:12px 14px;text-align:right;font-size:12px;font-weight:600;letter-spacing:0.5px;">PRICE</th>
            <th style="padding:12px 14px;text-align:right;font-size:12px;font-weight:600;letter-spacing:0.5px;">TOTAL</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <!-- Totals -->
      <div style="display:flex;justify-content:flex-end;margin-bottom:40px;">
        <div style="min-width:260px;">
          <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:14px;">
            <span style="color:#6b7280;">Subtotal</span>
            <span>Rs ${b.totalAmount}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:14px;">
            <span style="color:#6b7280;">Tax</span>
            <span>Rs 0</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:14px 0;font-size:18px;font-weight:800;">
            <span>TOTAL</span>
            <span>Rs ${b.totalAmount}</span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="border-top:1px solid #e5e7eb;padding-top:20px;text-align:center;">
        <p style="font-size:14px;font-weight:600;margin-bottom:4px;">Thank you for your purchase!</p>
        <p style="font-size:12px;color:#6b7280;">This is a computer-generated receipt and does not require a signature.</p>
      </div>

      <!-- Print Button -->
      <div class="no-print" style="margin-top:30px;text-align:center;">
        <button onclick="window.print()" style="background:#111;color:white;border:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;margin-right:8px;">
          🖨 Print
        </button>
        <button onclick="window.close()" style="background:#f3f4f6;color:#111;border:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">
          Close
        </button>
      </div>

    </body>
    </html>
  `;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

// ─── Excel Downloads ──────────────────────────────────────────────────────────
function downloadSingleBill(b: Bill) {
  const rows = b.items.map((it) => ({
    "Product": it.productName, "Size": it.size ?? "", "Color": it.color ?? "",
    "Quantity": it.quantity, "Price (Rs)": it.price, "Total (Rs)": it.total,
  }));
  rows.push({ "Product": "TOTAL", "Size": "", "Color": "", "Quantity": "", "Price (Rs)": "", "Total (Rs)": b.totalAmount } as never);
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 25 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Bill");
  const date = b.createdAt ? new Date(b.createdAt).toISOString().slice(0, 10) : "bill";
  XLSX.writeFile(wb, `Bill-${b._id.slice(-6)}-${date}.xlsx`);
}

function downloadAllBills(bills: Bill[]) {
  const wb = XLSX.utils.book_new();
  const summary = bills.map((b, i) => ({
    "#": i + 1, "Bill ID": b._id,
    "Date": b.createdAt ? new Date(b.createdAt).toLocaleString() : "",
    "Items": b.items.length, "Total (Rs)": b.totalAmount,
  }));
  const summaryWs = XLSX.utils.json_to_sheet(summary);
  summaryWs["!cols"] = [{ wch: 4 }, { wch: 26 }, { wch: 22 }, { wch: 8 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, "All Bills");
  bills.forEach((b, i) => {
    const rows = b.items.map((it) => ({
      "Product": it.productName, "Size": it.size ?? "", "Color": it.color ?? "",
      "Quantity": it.quantity, "Price (Rs)": it.price, "Total (Rs)": it.total,
    }));
    rows.push({ "Product": "TOTAL", "Size": "", "Color": "", "Quantity": "", "Price (Rs)": "", "Total (Rs)": b.totalAmount } as never);
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 25 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, `Bill-${i + 1}`);
  });
  XLSX.writeFile(wb, `All-Bills-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─── Main Component ───────────────────────────────────────────────────────────
function BillingPage() {
  const [tabs, setTabs] = useState<BillTab[]>([createTab(1)]);
  const [activeTab, setActiveTab] = useState(1);
  const [nextId, setNextId] = useState(2);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyErr, setHistoryErr] = useState<string | null>(null);

  function updateTab(id: number, patch: Partial<BillTab>) {
    setTabs((prev) => prev.map((t) => t.id === id ? { ...t, ...patch } : t));
  }

  function addTab() {
    const newTab = createTab(nextId);
    setTabs((prev) => [...prev, newTab]);
    setActiveTab(nextId);
    setNextId((n) => n + 1);
  }

  function closeTab(id: number) {
    if (tabs.length === 1) return;
    const remaining = tabs.filter((t) => t.id !== id);
    setTabs(remaining);
    if (activeTab === id) setActiveTab(remaining[remaining.length - 1].id);
  }

  const tab = tabs.find((t) => t.id === activeTab)!;

  async function preview(i: number, code: string) {
    updateTab(activeTab, {
      items: tab.items.map((r, j) => j === i ? { ...r, barcode: code, preview: undefined } : r)
    });
    if (!code) return;
    try {
      const data = await api<{ product: string; variant: { size: string; color: string; stock: number } }>(
        "/Api/scan", { method: "POST", body: JSON.stringify({ barcode: code }) }
      );
      updateTab(activeTab, {
        items: tab.items.map((r, j) => j === i
          ? { ...r, barcode: code, preview: { name: data.product, price: 0, size: data.variant.size, color: data.variant.color } }
          : r)
      });
    } catch { /* ignore */ }
  }

  async function submit() {
    updateTab(activeTab, { err: null, bill: null, loading: true });
    try {
      const res = await api<{ bill: Bill }>("/Api/bill", {
        method: "POST",
        body: JSON.stringify({
          items: tab.items.filter((i) => i.barcode).map((i) => ({ barcode: i.barcode, quantity: i.quantity }))
        }),
      });
      updateTab(activeTab, {
        bill: res.bill,
        items: [{ barcode: "", quantity: 1 }],
        loading: false,
        label: `✓ Customer ${activeTab}`,
      });
    } catch (e) {
      updateTab(activeTab, { err: (e as Error).message, loading: false });
    }
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
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => downloadBillPDF(b)}>
                        <FileText className="size-3 mr-1" /> PDF
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => downloadSingleBill(b)}>
                        <Download className="size-3 mr-1" /> Excel
                      </Button>
                    </div>
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
                        <span className="ml-4 shrink-0">Rs {it.total}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-between font-semibold border-t border-border pt-2 mt-2">
                    <span>Total</span>
                    <span>Rs {b.totalAmount}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Tabs */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm cursor-pointer border transition-colors shrink-0 ${activeTab === t.id
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
              }`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
            {tabs.length > 1 && (
              <X
                className="size-3 opacity-60 hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}
              />
            )}
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={addTab} className="shrink-0">
          <Plus className="size-3 mr-1" /> New Customer
        </Button>
      </div>

      {/* Active Tab Content */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardContent className="p-5 space-y-3">
            {tab.items.map((row, i) => (
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
                  onChange={(e) => updateTab(activeTab, {
                    items: tab.items.map((r, j) => j === i ? { ...r, quantity: Number(e.target.value) } : r)
                  })}
                />
                <Button
                  variant="ghost" size="icon" className="col-span-2"
                  onClick={() => updateTab(activeTab, { items: tab.items.filter((_, j) => j !== i) })}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline" size="sm"
              onClick={() => updateTab(activeTab, { items: [...tab.items, { barcode: "", quantity: 1 }] })}
            >
              <Plus className="size-3 mr-1" /> Add item
            </Button>
            {tab.err && <p className="text-sm text-destructive">{tab.err}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Receipt className="size-4" />
              <h3 className="font-medium">{tab.label}</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {tab.items.filter((i) => i.barcode).length} item(s) ready
            </p>
            <Button className="w-full mt-4" disabled={tab.loading} onClick={submit}>
              {tab.loading ? "Processing…" : "Create bill"}
            </Button>
            {tab.bill && (
              <div className="mt-5 border-t border-border pt-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Last bill</div>
                <ul className="mt-2 space-y-1 text-sm">
                  {tab.bill.items.map((it, i) => (
                    <li key={i} className="flex justify-between">
                      <span className="truncate">{it.productName} × {it.quantity}</span>
                      <span>Rs {it.total}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between mt-3 font-semibold border-t border-border pt-2">
                  <span>Total</span><span>Rs {tab.bill.totalAmount}</span>
                </div>
                <Button size="sm" variant="outline" className="w-full mt-3" onClick={() => downloadBillPDF(tab.bill!)}>
                  <FileText className="size-3 mr-1" /> Download PDF
                </Button>
                <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => downloadSingleBill(tab.bill!)}>
                  <Download className="size-3 mr-1" /> Download Excel
                </Button>
                <Button size="sm" variant="ghost" className="w-full mt-2" onClick={() => {
                  if (tabs.length === 1) {

                    updateTab(activeTab, {
                      bill: null,
                      err: null,
                      items: [{ barcode: "", quantity: 1 }],
                      label: `Customer ${nextId - 1}`,
                    });
                  } else {

                    closeTab(activeTab);
                  }
                }}>
                  Close & Next Customer
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}