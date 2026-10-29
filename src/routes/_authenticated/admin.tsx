import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { accountQuery, friendlyError } from "@/lib/account";
import { MODE_LABEL } from "@/lib/generations";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Administração — GB Motion AI" }, { name: "description", content: "Painel administrativo." }] }),
  component: Admin,
});

// Todas as ações abaixo são funções do banco que verificam o papel de administrador no servidor.
async function run(p: PromiseLike<{ error: unknown }>, ok: string) {
  const { error } = await p;
  if (error) toast.error(friendlyError(error instanceof Error ? error : new Error((error as { message?: string }).message)));
  else toast.success(ok);
}

function Admin() {
  const { data: acc } = useQuery(accountQuery);
  if (acc && !acc.isAdmin)
    return <AppShell><p className="text-muted-foreground">Acesso restrito. <Link to="/dashboard" className="text-neon">Voltar</Link></p></AppShell>;
  return (
    <AppShell>
      <h1 className="mb-6 text-3xl font-bold">Administração</h1>
      <Tabs defaultValue="users">
        <TabsList className="flex-wrap">
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="gens">Gerações</TabsTrigger>
          <TabsTrigger value="plans">Planos</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
          <TabsTrigger value="audit">Auditoria</TabsTrigger>
        </TabsList>
        <TabsContent value="users"><Users /></TabsContent>
        <TabsContent value="gens"><Gens /></TabsContent>
        <TabsContent value="plans"><Plans /></TabsContent>
        <TabsContent value="settings"><Settings /></TabsContent>
        <TabsContent value="audit"><Audit /></TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Users() {
  const [q, setQ] = useState("");
  const qc = useQueryClient();
  const users = useQuery({
    queryKey: ["admin-users", q],
    queryFn: async () => {
      let req = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(50);
      if (q.trim()) req = req.ilike("email", `%${q.trim().replace(/[%_]/g, "")}%`);
      const { data: profiles } = await req;
      const ids = (profiles ?? []).map((p) => p.id);
      const [w, s] = await Promise.all([
        supabase.from("credit_wallets").select("*").in("user_id", ids),
        supabase.from("subscriptions").select("*").in("user_id", ids),
      ]);
      return (profiles ?? []).map((p) => ({
        ...p,
        balance: w.data?.find((x) => x.user_id === p.id)?.balance ?? 0,
        sub: s.data?.find((x) => x.user_id === p.id),
      }));
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-users"] });
  return (
    <div className="space-y-4">
      <Input placeholder="Pesquisar por e-mail" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      <div className="space-y-3">
        {users.data?.map((u) => <UserRow key={u.id} u={u} onDone={refresh} />)}
      </div>
    </div>
  );
}

function UserRow({ u, onDone }: { u: { id: string; email: string; full_name: string | null; is_blocked: boolean; balance: number; sub?: { plan_id: string; expires_at: string | null } | undefined }; onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const [days, setDays] = useState("30");
  const vip = u.sub?.plan_id === "vip" && (!u.sub.expires_at || new Date(u.sub.expires_at) > new Date());
  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{u.email} {u.is_blocked && <span className="text-destructive">(bloqueado)</span>}</p>
          <p className="text-xs text-muted-foreground">{u.full_name ?? "—"} · {u.balance} créditos · {vip ? `VIP até ${u.sub?.expires_at ? new Date(u.sub.expires_at).toLocaleDateString("pt-BR") : "sem prazo"}` : "Grátis"}</p>
        </div>
        <Button size="sm" variant={u.is_blocked ? "glass" : "destructive"} onClick={async () => { await run(supabase.rpc("admin_set_blocked", { _uid: u.id, _blocked: !u.is_blocked }), "Atualizado"); onDone(); }}>
          {u.is_blocked ? "Desbloquear" : "Bloquear"}
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Input className="w-28" type="number" placeholder="± créditos" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Button size="sm" variant="glass" onClick={async () => { const n = parseInt(amount, 10); if (!n) return; await run(supabase.rpc("admin_adjust_credits", { _uid: u.id, _amount: n, _note: "Ajuste manual" }), "Créditos ajustados"); setAmount(""); onDone(); }}>Aplicar</Button>
        <Input className="w-24" type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} />
        <Button size="sm" variant="hero" onClick={async () => { const d = Math.max(1, parseInt(days, 10) || 30); await run(supabase.rpc("admin_set_plan", { _uid: u.id, _plan: "vip", _expires: new Date(Date.now() + d * 864e5).toISOString(), _grant_credits: 0 }), "VIP liberado"); onDone(); }}>Liberar VIP (dias)</Button>
        {vip && <Button size="sm" variant="ghost" onClick={async () => { await run(supabase.rpc("admin_set_plan", { _uid: u.id, _plan: "free", _expires: null as unknown as string, _grant_credits: 0 }), "VIP removido"); onDone(); }}>Remover VIP</Button>}
      </div>
    </div>
  );
}

function Gens() {
  const [onlyFailed, setOnlyFailed] = useState(false);
  const g = useQuery({
    queryKey: ["admin-gens", onlyFailed],
    queryFn: async () => {
      let r = supabase.from("video_generations").select("*").order("created_at", { ascending: false }).limit(100);
      if (onlyFailed) r = r.eq("status", "failed");
      return (await r).data ?? [];
    },
  });
  const month = (g.data ?? []).filter((x) => !x.refunded && new Date(x.created_at) > new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <p className="text-sm">Consumo do mês (últimas 100): <b>{month.reduce((a, b) => a + b.cost, 0)} créditos</b></p>
        <Button size="sm" variant="glass" onClick={() => setOnlyFailed(!onlyFailed)}>{onlyFailed ? "Mostrar todas" : "Só falhas"}</Button>
      </div>
      <ul className="divide-y divide-border rounded-2xl border border-border bg-card text-sm">
        {g.data?.map((x) => (
          <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <div className="min-w-0 flex-1">
              <p>{MODE_LABEL[x.mode]} · {new Date(x.created_at).toLocaleString("pt-BR")} · {x.provider ?? "—"}</p>
              <p className="truncate text-xs text-muted-foreground">{x.error ?? x.prompt}</p>
            </div>
            <span className="text-xs">{x.cost} créd.</span>
            <StatusBadge status={x.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Plans() {
  const qc = useQueryClient();
  const plans = useQuery({ queryKey: ["plans"], queryFn: async () => (await supabase.from("plans").select("*").order("id")).data ?? [] });
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {plans.data?.map((p) => (
        <form key={p.id} className="space-y-2 rounded-2xl border border-border bg-card p-4 text-sm" onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const modes = (["image_to_video", "product_ad"] as const).filter((m) => f.get(m));
          await run(supabase.rpc("admin_update_plan", {
            _id: p.id, _initial: Number(f.get("initial")), _monthly: Number(f.get("monthly")), _max_duration: Number(f.get("max")),
            _modes: modes, _benefits: String(f.get("benefits")).split("\n").map((s) => s.trim()).filter(Boolean),
          }), "Plano salvo");
          qc.invalidateQueries({ queryKey: ["plans"] });
        }}>
          <h3 className="text-lg font-semibold">{p.name}</h3>
          <label className="block">Créditos iniciais<Input name="initial" type="number" defaultValue={p.initial_credits} /></label>
          <label className="block">Créditos mensais<Input name="monthly" type="number" defaultValue={p.monthly_credits} /></label>
          <label className="block">Duração máxima (s)<Input name="max" type="number" defaultValue={p.max_duration} /></label>
          <label className="flex gap-2"><input type="checkbox" name="image_to_video" defaultChecked={p.allowed_modes.includes("image_to_video")} />Imagem para vídeo</label>
          <label className="flex gap-2"><input type="checkbox" name="product_ad" defaultChecked={p.allowed_modes.includes("product_ad")} />Vídeo publicitário</label>
          <label className="block">Benefícios (um por linha)<textarea name="benefits" rows={4} defaultValue={p.benefits.join("\n")} className="w-full rounded-md border border-input bg-background p-2" /></label>
          <Button size="sm">Salvar</Button>
        </form>
      ))}
    </div>
  );
}

const SETTING_LABEL: Record<string, string> = {
  whatsapp_number: "WhatsApp do administrador",
  cost_image_to_video: "Custo: imagem para vídeo (5s)",
  cost_product_ad: "Custo: vídeo publicitário (5s)",
  cost_per_extra_5s: "Custo por +5s",
  global_monthly_spend_limit_credits: "Limite global mensal (créditos)",
};

function Settings() {
  const s = useQuery({ queryKey: ["admin-settings"], queryFn: async () => (await supabase.from("system_settings").select("*").order("key")).data ?? [] });
  return (
    <div className="max-w-xl space-y-3">
      {s.data?.map((row) => (
        <form key={row.key} className="flex items-end gap-2" onSubmit={async (e) => {
          e.preventDefault();
          const raw = String(new FormData(e.currentTarget).get("v"));
          const value = typeof row.value === "number" ? Number(raw) : raw;
          await run(supabase.rpc("admin_set_setting", { _key: row.key, _value: value }), "Salvo");
        }}>
          <label className="flex-1 text-sm">{SETTING_LABEL[row.key] ?? row.key}<Input name="v" defaultValue={String(row.value)} /></label>
          <Button size="sm">Salvar</Button>
        </form>
      ))}
    </div>
  );
}

function Audit() {
  const a = useQuery({ queryKey: ["admin-audit"], queryFn: async () => (await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100)).data ?? [] });
  return (
    <ul className="divide-y divide-border rounded-2xl border border-border bg-card text-sm">
      {a.data?.map((l) => (
        <li key={l.id} className="p-3">
          <b>{l.action}</b> <span className="text-xs text-muted-foreground">· {new Date(l.created_at).toLocaleString("pt-BR")}</span>
          <p className="truncate text-xs text-muted-foreground">{JSON.stringify(l.details)}</p>
        </li>
      ))}
      {a.data?.length === 0 && <li className="p-3 text-muted-foreground">Sem registros.</li>}
    </ul>
  );
}
