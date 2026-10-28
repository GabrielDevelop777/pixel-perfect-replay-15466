import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Coins, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { accountQuery, publicSettingsQuery, vipWhatsappLink } from "@/lib/account";
import { myGenerationsQuery, MODE_LABEL } from "@/lib/generations";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Painel — GB Motion AI" }, { name: "description", content: "Seu painel na GB Motion AI." }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: acc } = useQuery(accountQuery);
  const settings = useQuery(publicSettingsQuery);
  const gens = useQuery(myGenerationsQuery);
  const recent = (gens.data ?? []).slice(0, 5);
  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-3xl font-bold">Olá{acc?.fullName ? `, ${acc.fullName}` : ""}!</h1>
          <Button variant="hero" size="lg" asChild><Link to="/gerar"><Sparkles />Gerar vídeo</Link></Button>
        </div>
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
            {acc?.vipExpiresAt && <p className="mt-1 text-xs text-muted-foreground">Válido até {new Date(acc.vipExpiresAt).toLocaleDateString("pt-BR")}</p>}
            {acc && acc.plan !== "vip" && settings.data && (
              <Button variant="glass" size="sm" className="mt-4" asChild>
                <a href={vipWhatsappLink(String(settings.data.whatsapp_number), acc.email)} target="_blank" rel="noopener noreferrer">QUERO SER VIP</a>
              </Button>
            )}
          </div>
        </div>
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Gerações recentes</h2>
            <Link to="/historico" className="text-sm text-neon hover:underline">Ver tudo</Link>
          </div>
          {recent.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">Você ainda não gerou nenhum vídeo.</p>
          ) : (
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {recent.map((g) => (
                <li key={g.id}>
                  <Link to="/videos/$id" params={{ id: g.id }} className="flex items-center justify-between gap-4 p-4 hover:bg-accent/40">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{MODE_LABEL[g.mode]}</p>
                      <p className="truncate text-xs text-muted-foreground">{g.prompt}</p>
                    </div>
                    <StatusBadge status={g.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
