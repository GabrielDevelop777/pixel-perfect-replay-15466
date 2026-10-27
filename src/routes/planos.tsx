import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PublicFooter, PublicHeader } from "@/components/brand";
import { PlansGrid } from "@/components/plans-grid";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos — GB Motion AI" },
      { name: "description", content: "Compare o plano Grátis e o VIP da GB Motion AI." },
      { property: "og:title", content: "Planos — GB Motion AI" },
      { property: "og:description", content: "Grátis para começar, VIP para criar mais." },
    ],
  }),
  component: Page,
});

function Page() {
  const [email, setEmail] = useState<string>();
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? undefined)); }, []);
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main className="mx-auto max-w-4xl px-4 py-20">
        <h1 className="text-center text-4xl font-bold">Escolha seu plano</h1>
        <p className="mt-3 text-center text-muted-foreground">O VIP é liberado manualmente após a confirmação do pagamento pelo WhatsApp.</p>
        <div className="mt-12"><PlansGrid email={email} /></div>
      </main>
      <PublicFooter />
    </div>
  );
}
