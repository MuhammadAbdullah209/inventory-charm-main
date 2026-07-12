import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { api, type Supplier } from "@/lib/api";
import { Plus, Trash2, Mail, Phone, MapPin } from "lucide-react";

export const Route = createFileRoute("/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers — Inventory" }] }),
  component: SuppliersPage,
});

function SuppliersPage() {
  const [list, setList] = useState<Supplier[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "" });
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  function load() { setLoading(true); api<Supplier[]>("/Api/suppliers").then(setList).catch((e) => setErr(e.message)).finally(() => setLoading(false)); }
  useEffect(load, []);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setSubmitting(true);
    try {
      await api("/Api/suppliers", { method: "POST", body: JSON.stringify(form) });
      setOpen(false); setForm({ name: "", phone: "", email: "", address: "" }); load();
    } catch (e) { setErr((e as Error).message); }
    finally { setSubmitting(false); }
  }
  async function remove(id: string) {
    if (!confirm("Delete supplier?")) return;
    await api(`/Api/suppliers/${id}`, { method: "DELETE" }); load();
  }

  return (
    <AppShell>
      <PageHeader
        title="Suppliers"
        description="People and businesses you purchase from."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="size-4" /> New supplier</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New supplier</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-3">
                {(["name", "phone", "email", "address"] as const).map((k) => (
                  <div key={k} className="space-y-2">
                    <Label className="capitalize">{k}</Label>
                    <Input
                      required={k === "name"}
                      value={form[k]}
                      onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    />
                  </div>
                ))}
                {err && <p className="text-sm text-destructive">{err}</p>}
                <DialogFooter><Button type="submit" disabled={submitting}>{submitting ? <LoadingSpinner label="Saving..." className="justify-center" /> : "Save"}</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner label="Loading suppliers..." />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((s) => (
            <Card key={s._id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <h3 className="font-medium">{s.name}</h3>
                  <Button size="icon" variant="ghost" onClick={() => remove(s._id)}><Trash2 className="size-4" /></Button>
                </div>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {s.phone && <div className="flex items-center gap-2"><Phone className="size-3" />{s.phone}</div>}
                  {s.email && <div className="flex items-center gap-2"><Mail className="size-3" />{s.email}</div>}
                  {s.address && <div className="flex items-center gap-2"><MapPin className="size-3" />{s.address}</div>}
                </div>
              </CardContent>
            </Card>
          ))}
          {list.length === 0 && <p className="text-sm text-muted-foreground">No suppliers.</p>}
        </div>
      )}
    </AppShell>
  );
}