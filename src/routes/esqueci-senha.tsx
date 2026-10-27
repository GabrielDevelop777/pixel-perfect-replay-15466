import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand";

export const Route = createFileRoute("/esqueci-senha")({
  head: () => ({
    meta: [
      { title: "Recuperar senha — GB Motion AI" },
      { name: "description", content: "Receba um link para redefinir sua senha." },
      { property: "og:title", content: "Recuperar senha — GB Motion AI" },
      { property: "og:description", content: "Redefina sua senha da GB Motion AI." },
    ],
  }),
  component: Page,
});

function Page() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>): Promise<unknown> {
    e.preventDefault();
    const email = z.string().trim().email().safeParse(new FormData(e.currentTarget).get("email"));
    if (!email.success) return toast.error("E-mail inválido");
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${window.location.origin}/redefinir-senha` });
    setLoading(false);
    setSent(true); // resposta neutra
  }
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8">
        <Logo />
        <h1 className="mt-8 text-2xl font-bold">Recuperar senha</h1>
        {sent ? (
          <p className="mt-3 text-muted-foreground">Se houver uma conta com esse e-mail, você receberá um link em instantes.</p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5"><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" required /></div>
            <Button variant="hero" className="w-full" disabled={loading}>Enviar link</Button>
          </form>
        )}
        <Link to="/auth" className="mt-6 inline-block text-sm text-neon hover:underline">Voltar para o login</Link>
      </div>
    </div>
  );
}
