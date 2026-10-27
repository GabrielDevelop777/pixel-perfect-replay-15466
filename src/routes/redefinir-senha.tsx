import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand";

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({
    meta: [
      { title: "Nova senha — GB Motion AI" },
      { name: "description", content: "Defina uma nova senha para sua conta." },
      { property: "og:title", content: "Nova senha — GB Motion AI" },
      { property: "og:description", content: "Defina uma nova senha." },
    ],
  }),
  component: Page,
});

function Page() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const p = String(fd.get("password") ?? "");
    if (p.length < 8) return toast.error("A senha precisa ter ao menos 8 caracteres");
    if (p !== fd.get("confirm")) return toast.error("As senhas não conferem");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: p });
    setLoading(false);
    if (error) return toast.error("Link inválido ou expirado. Solicite um novo.");
    toast.success("Senha atualizada!");
    navigate({ to: "/dashboard" });
  }
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8">
        <Logo />
        <h1 className="mt-8 text-2xl font-bold">Defina sua nova senha</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5"><Label htmlFor="password">Nova senha</Label><Input id="password" name="password" type="password" minLength={8} required /></div>
          <div className="space-y-1.5"><Label htmlFor="confirm">Confirmar senha</Label><Input id="confirm" name="confirm" type="password" minLength={8} required /></div>
          <Button variant="hero" className="w-full" disabled={loading}>Salvar senha</Button>
        </form>
      </div>
    </div>
  );
}
