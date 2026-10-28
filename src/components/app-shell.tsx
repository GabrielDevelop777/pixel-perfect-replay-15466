import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, LayoutDashboard, Sparkles, History, Settings, Shield, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { accountQuery } from "@/lib/account";
import { supabase } from "@/integrations/supabase/client";

export function AppShell({ children }: { children: ReactNode }) {
  const { data: acc } = useQuery(accountQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  const links = [
    { to: "/dashboard", label: "Painel", icon: LayoutDashboard },
    { to: "/gerar", label: "Gerar", icon: Sparkles },
    { to: "/historico", label: "Histórico", icon: History },
    { to: "/conta", label: "Conta", icon: Settings },
  ] as const;
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link key={l.to} to={l.to} className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground" activeProps={{ className: "bg-accent text-foreground" }}>
                {l.label}
              </Link>
            ))}
            {acc?.isAdmin && (
              <Link to="/admin" className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground" activeProps={{ className: "bg-accent text-foreground" }}>Admin</Link>
            )}
          </nav>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-sm"><Coins className="size-4 text-neon" />{acc?.balance ?? "—"}</span>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sair"><LogOut className="size-4" /></Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 pb-24 md:pb-8">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-border bg-background/95 py-2 md:hidden">
        {links.map((l) => (
          <Link key={l.to} to={l.to} className="flex flex-col items-center gap-0.5 px-2 text-xs text-muted-foreground" activeProps={{ className: "text-neon" }}>
            <l.icon className="size-5" />{l.label}
          </Link>
        ))}
        {acc?.isAdmin && (
          <Link to="/admin" className="flex flex-col items-center gap-0.5 px-2 text-xs text-muted-foreground" activeProps={{ className: "text-neon" }}><Shield className="size-5" />Admin</Link>
        )}
      </nav>
    </div>
  );
}
