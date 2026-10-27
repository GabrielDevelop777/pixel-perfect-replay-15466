import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand";
import { PlansGrid } from "@/components/plans-grid";
import { accountQuery } from "@/lib/account";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Painel — GB Motion AI" }, { name: "description", content: "Seu painel na GB Motion AI." }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: acc } = useQuery(accountQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <Button variant="ghost" onClick={signOut}>Sair</Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-10">
        <h1 className="text-3xl font-bold">Olá{acc?.fullName ? `, ${acc.fullName}` : ""}!</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <Coins className="size-5 text-neon" />
            <p className="mt-3 text-sm text-muted-foreground">Créditos disponíveis</p>
            <p className="text-4xl font-bold">{acc?.balance ?? "—"}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <Crown className="size-5 text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Plano atual</p>
            <p className="text-4xl font-bold">{acc?.planName ?? "—"}</p>
          </div>
        </div>
        <p className="text-muted-foreground">O gerador de vídeos chega na próxima etapa. <Link to="/planos" className="text-neon underline">Ver planos</Link></p>
        <PlansGrid email={acc?.email} currentPlan={acc?.plan} />
      </main>
    </div>
  );
}
