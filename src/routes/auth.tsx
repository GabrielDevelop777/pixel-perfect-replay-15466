import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ mode: z.enum(["login", "signup"]).optional() }),
  head: () => ({
    meta: [
      { title: "Entrar — GB Motion AI" },
      { name: "description", content: "Entre ou crie sua conta na GB Motion AI." },
      { property: "og:title", content: "Entrar — GB Motion AI" },
      { property: "og:description", content: "Acesse sua conta na GB Motion AI." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres").max(72),
  name: z.string().trim().max(100).optional(),
});

function AuthPage() {
  const { mode: initial } = Route.useSearch();
  const [mode, setMode] = useState<"login" | "signup">(initial ?? "login");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({ email: fd.get("email"), password: fd.get("password"), name: fd.get("name") || undefined });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos"); return; }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { full_name: parsed.data.name } },
        });
        // Mensagem neutra: não revela se o e-mail já existe
        if (error && !/registered|exists/i.test(error.message)) throw error;
        setSent(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw new Error("E-mail ou senha incorretos, ou e-mail ainda não confirmado.");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function google(): Promise<void> {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) { toast.error("Não foi possível entrar com Google."); return; }
    if (r.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="relative grid min-h-screen place-items-center px-4">
      <div className="pointer-events-none absolute inset-0 bg-glow" />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card/80 p-8 backdrop-blur">
        <Logo />
        {sent ? (
          <div className="mt-8 space-y-3">
            <h1 className="text-2xl font-bold">Confira seu e-mail</h1>
            <p className="text-muted-foreground">Se o endereço for válido, enviamos um link de confirmação. Clique nele para ativar sua conta.</p>
            <Button variant="glass" onClick={() => { setSent(false); setMode("login"); }}>Voltar para o login</Button>
          </div>
        ) : (
          <>
            <h1 className="mt-8 text-2xl font-bold">{mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "login" ? "Entre para continuar criando." : "Ganhe 2 créditos grátis para começar."}
            </p>
            <Button variant="glass" className="mt-6 w-full" onClick={google}>Continuar com Google</Button>
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5"><Label htmlFor="name">Nome</Label><Input id="name" name="name" maxLength={100} /></div>
              )}
              <div className="space-y-1.5"><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" required autoComplete="email" /></div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <Label htmlFor="password">Senha</Label>
                  {mode === "login" && <Link to="/esqueci-senha" className="text-xs text-neon hover:underline">Esqueci a senha</Link>}
                </div>
                <Input id="password" name="password" type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} />
              </div>
              <Button variant="hero" className="w-full" size="lg" disabled={loading}>
                {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "login" ? "Não tem conta? " : "Já tem conta? "}
              <button className="text-neon hover:underline" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
                {mode === "login" ? "Cadastre-se" : "Entrar"}
              </button>
            </p>
            {mode === "signup" && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Ao criar a conta você aceita os <Link to="/termos" className="underline">Termos</Link> e a <Link to="/privacidade" className="underline">Política de Privacidade</Link>.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
