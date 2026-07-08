import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { api, type Product } from "@/lib/api";
import { Plus, Trash2, Search, Pencil, Printer } from "lucide-react";
import JsBarcode from "jsbarcode";

export const Route = createFileRoute("/products")({
  head: () => ({ meta: [{ title: "Products — Inventory" }] }),
  component: ProductsPage,
});

interface VariantInput { size: string; color: string; stock: number; barcode?: string }

function InlineBarcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (ref.current && value) {
      try {
        JsBarcode(ref.current, value, {
          format: "CODE128",
          width: 1.2,
          height: 36,
          displayValue: false,
          margin: 2,
        });
      } catch { /* invalid value */ }
    }
  }, [value]);
  return <svg ref={ref} className="w-full" />;
}

function PrintBarcodesDialog({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Barcodes - ${product.name}</title>
      <style>
        body { font-family: sans-serif; margin: 20px; }
        .grid { display: flex; flex-wrap: wrap; gap: 12px; }
        .item { border: 1px solid #ddd; border-radius: 6px; padding: 10px; width: 160px; page-break-inside: avoid; }
        .meta { font-size: 11px; font-weight: 600; margin-bottom: 4px; }
        .code { font-size: 9px; color: #888; font-family: monospace; margin-top: 2px; }
        h2 { font-size: 14px; margin-bottom: 12px; }
        svg { width: 100%; }
        @media print { body { margin: 8px; } }
      </style></head>
      <body>${content}</body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Printer className="size-3 mr-1" /> Barcodes
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Print Barcodes — {product.name}</DialogTitle></DialogHeader>
          <div ref={printRef}>
            <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{product.name} · {product.category}</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {product.variants.map((v) => (
                <div key={v.barcode} className="border border-border rounded-md p-2 flex flex-col items-center bg-white">
                  <div className="text-xs font-semibold mb-1">{v.size} · {v.color}</div>
                  {v.barcode && <InlineBarcode value={v.barcode} />}
                  <div className="font-mono text-[9px] text-muted-foreground mt-1 truncate w-full text-center">{v.barcode}</div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            <Button onClick={handlePrint}><Printer className="size-4 mr-1" /> Print</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editErr, setEditErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [variants, setVariants] = useState<VariantInput[]>([{ size: "", color: "", stock: 0 }]);

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editVariants, setEditVariants] = useState<VariantInput[]>([]);

  function load() {
    api<Product[]>("/Api/").then(setProducts).catch((e) => setErr(e.message));
  }
  useEffect(load, []);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    try {
      await api<Product>("/Api/", {
        method: "POST",
        body: JSON.stringify({ name, category, price: Number(price), description, variants }),
      });
      setOpen(false);
      setName(""); setCategory(""); setPrice(""); setDescription("");
      setVariants([{ size: "", color: "", stock: 0 }]);
      load();
    } catch (e) { setErr((e as Error).message); }
  }

  function openEdit(p: Product) {
    setEditId(p._id);
    setEditName(p.name);
    setEditCategory(p.category);
    setEditPrice(String(p.price));
    setEditDescription(p.description ?? "");
    setEditVariants(p.variants.map((v) => ({ size: v.size, color: v.color, stock: v.stock, barcode: v.barcode })));
    setEditErr(null);
    setEditOpen(true);
  }

  async function update(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setEditErr(null);
    try {
      await api(`/Api/${editId}`, {
        method: "PUT",
        body: JSON.stringify({ name: editName, category: editCategory, price: Number(editPrice), description: editDescription, variants: editVariants }),
      });
      setEditOpen(false); setEditId(null); load();
    } catch (e) { setEditErr((e as Error).message); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this product?")) return;
    try { await api(`/Api/${id}`, { method: "DELETE" }); load(); }
    catch (e) { alert((e as Error).message); }
  }

  const filtered = products.filter((p) =>
    [p.name, p.category, p.productCode ?? ""].join(" ").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <AppShell>
      <PageHeader
        title="Products"
        description="Manage products and their variants."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="size-4" /> New product</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Create product</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Category</Label><Input required value={category} onChange={(e) => setCategory(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Price</Label><Input required type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
                </div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Variants</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setVariants([...variants, { size: "", color: "", stock: 0 }])}>
                      <Plus className="size-3" /> Add
                    </Button>
                  </div>
                  {variants.map((v, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2">
                      <Input className="col-span-3" placeholder="Size" value={v.size} onChange={(e) => setVariants(variants.map((x, j) => j === i ? { ...x, size: e.target.value } : x))} />
                      <Input className="col-span-3" placeholder="Color" value={v.color} onChange={(e) => setVariants(variants.map((x, j) => j === i ? { ...x, color: e.target.value } : x))} />
                      <Input className="col-span-2" type="number" placeholder="Stock" value={v.stock} onChange={(e) => setVariants(variants.map((x, j) => j === i ? { ...x, stock: Number(e.target.value) } : x))} />
                      <Input className="col-span-3" placeholder="Barcode (auto)" value={v.barcode ?? ""} onChange={(e) => setVariants(variants.map((x, j) => j === i ? { ...x, barcode: e.target.value } : x))} />
                      <Button type="button" variant="ghost" size="icon" className="col-span-1" onClick={() => setVariants(variants.filter((_, j) => j !== i))}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                {err && <p className="text-sm text-destructive">{err}</p>}
                <DialogFooter><Button type="submit">Create</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit product</DialogTitle></DialogHeader>
          <form onSubmit={update} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Name</Label><Input required value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Category</Label><Input required value={editCategory} onChange={(e) => setEditCategory(e.target.value)} /></div>
              <div className="space-y-2"><Label>Price</Label><Input required type="number" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} /></div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Variants</Label>
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditVariants([...editVariants, { size: "", color: "", stock: 0 }])}>
                  <Plus className="size-3" /> Add
                </Button>
              </div>
              {editVariants.map((v, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <Input className="col-span-3" placeholder="Size" value={v.size} onChange={(e) => setEditVariants(editVariants.map((x, j) => j === i ? { ...x, size: e.target.value } : x))} />
                  <Input className="col-span-3" placeholder="Color" value={v.color} onChange={(e) => setEditVariants(editVariants.map((x, j) => j === i ? { ...x, color: e.target.value } : x))} />
                  <Input className="col-span-2" type="number" placeholder="Stock" value={v.stock} onChange={(e) => setEditVariants(editVariants.map((x, j) => j === i ? { ...x, stock: Number(e.target.value) } : x))} />
                  <Input className="col-span-3" placeholder="Barcode" value={v.barcode ?? ""} onChange={(e) => setEditVariants(editVariants.map((x, j) => j === i ? { ...x, barcode: e.target.value } : x))} />
                  <Button type="button" variant="ghost" size="icon" className="col-span-1" onClick={() => setEditVariants(editVariants.filter((_, j) => j !== i))}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
            {editErr && <p className="text-sm text-destructive">{editErr}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input placeholder="Search products…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {err && !open && <div className="mb-4 text-sm text-destructive">{err}</div>}
      <div className="grid gap-3">
        {filtered.map((p) => {
          const totalStock = p.variants.reduce((s, v) => s + (v.stock || 0), 0);
          return (
            <Card key={p._id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium tracking-tight">{p.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{p.category}</span>
                    </div>
                    {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
                    <div className="text-xs text-muted-foreground mt-1 font-mono">{p.productCode}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">₹{p.price}</div>
                    <div className="text-xs text-muted-foreground">{totalStock} in stock</div>
                  </div>
                </div>

                {/* Variant cards with inline barcode */}
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {p.variants.map((v) => (
                    <div key={v.barcode} className="rounded-md border border-border p-2 text-xs">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">{v.size} · {v.color}</span>
                        <span className={v.stock <= 5 ? "text-destructive" : "text-muted-foreground"}>{v.stock}</span>
                      </div>
                      {/* Inline barcode image */}
                      {v.barcode && <InlineBarcode value={v.barcode} />}
                      <div className="font-mono text-[9px] text-muted-foreground truncate mt-1">{v.barcode}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex justify-end gap-2">
                  <PrintBarcodesDialog product={p} />
                  <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                    <Pencil className="size-3 mr-1" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(p._id)}>
                    <Trash2 className="size-3 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">No products.</p>}
      </div>
    </AppShell>
  );
}