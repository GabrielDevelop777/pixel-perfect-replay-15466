import { useQuery } from "@tanstack/react-query";
import { Check, Crown } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { plansQuery, publicSettingsQuery, vipWhatsappLink } from "@/lib/account";

export function PlansGrid({ email, currentPlan }: { email?: string; currentPlan?: string }) {
  const plans = useQuery(plansQuery);
  const settings = useQuery(publicSettingsQuery);
  const list = plans.data ?? [];
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {list.map((p) => {
        const vip = p.id === "vip";
        return (
          <div key={p.id} className={`relative rounded-2xl border p-8 ${vip ? "border-primary/60 bg-card shadow-glow" : "border-border bg-card"}`}>
            {vip && <Crown className="absolute right-6 top-6 size-6 text-primary" />}
            <h3 className="text-2xl font-bold">{p.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {vip ? "Para quem cria com frequência." : "Para experimentar a plataforma."}
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {p.benefits.map((b) => (
                <li key={b} className="flex gap-2"><Check className="size-4 shrink-0 text-neon" />{b}</li>
              ))}
              <li className="flex gap-2"><Check className="size-4 shrink-0 text-neon" />Vídeos de até {p.max_duration}s</li>
            </ul>
            <div className="mt-8">
              {currentPlan === p.id ? (
                <Button variant="glass" disabled className="w-full">Seu plano atual</Button>
              ) : vip ? (
                email && settings.data ? (
                  <Button variant="hero" size="lg" className="w-full" asChild>
                    <a href={vipWhatsappLink(String(settings.data.whatsapp_number), email)} target="_blank" rel="noopener noreferrer">QUERO SER VIP</a>
                  </Button>
                ) : (
                  <Button variant="hero" size="lg" className="w-full" asChild>
                    <Link to="/auth" search={{ mode: "signup" }}>QUERO SER VIP</Link>
                  </Button>
                )
              ) : (
                <Button variant="glass" size="lg" className="w-full" asChild>
                  <Link to="/auth" search={{ mode: "signup" }}>Começar grátis</Link>
                </Button>
              )}
            </div>
          </div>
        );
      })}
      {plans.isLoading && <p className="text-muted-foreground">Carregando planos...</p>}
    </div>
  );
}
