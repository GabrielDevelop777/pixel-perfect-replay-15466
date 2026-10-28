import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { accountQuery } from "@/lib/account";

export const Route = createFileRoute("/_authenticated/conta")({
  head: () => ({ meta: [{ title: "Minha conta — GB Motion AI" }, { name: "description", content: "Configurações da sua conta." }] }),
  component: Account,
});

function Account() {
  const { data: acc } = useQuery(accountQuery);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [pwd, setPwd] = useState("");
  useEffect(() => setName(acc?.fullName ?? ""), [acc?.fullName]);
  const tx = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => (await supabase.from("credit_transactions").select("*").eq("user_id", acc!.userId).order("created_at", { ascending: false }).limit(50)).data ?? [],
    enabled: !!acc,
  });

  async function saveName() {
    const { error } = await supabase.from("profiles").update({ full_name: name.trim().slice(0, 100) }).eq("id", acc!.userId);
    if (error) return toast.error("Não foi possível salvar.");
    toast.success("Nome atualizado.");
    qc.invalidateQueries({ queryKey: ["account"] });
  }
  async function savePwd() {
    if (pwd.length < 8) return toast.error("A senha precisa ter ao menos 8 caracteres.");
    const { error } = await supabase.auth.updateUser({ password: pwd });
    if (error) return toast.error("Não foi possível alterar a senha.");
    setPwd("");
    toast.success("Senha alterada.");
  }
  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-8">
        <h1 className="text-3xl font-bold">Minha conta</h1>
        <section className="space-y-3 rounded-2xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">E-mail: {acc?.email}</p>
          <Label htmlFor="n">Nome</Label>
          <div className="flex gap-2"><Input id="n" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} /><Button onClick={saveName}>Salvar</Button></div>
          <Label htmlFor="p">Nova senha</Label>
          <div className="flex gap-2"><Input id="p" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} autoComplete="new-password" /><Button onClick={savePwd}>Alterar</Button></div>
        </section>
        <section>
          <h2 className="mb-3 text-xl font-semibold">Movimentações de créditos</h2>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card text-sm">
            {tx.data?.map((t) => (
              <li key={t.id} className="flex justify-between p-3">
                <span>{t.note ?? t.kind} <span className="text-xs text-muted-foreground">· {new Date(t.created_at).toLocaleString("pt-BR")}</span></span>
                <b className={t.amount < 0 ? "text-destructive" : "text-success"}>{t.amount > 0 ? "+" : ""}{t.amount}</b>
              </li>
            ))}
            {tx.data?.length === 0 && <li className="p-3 text-muted-foreground">Nenhuma movimentação.</li>}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
