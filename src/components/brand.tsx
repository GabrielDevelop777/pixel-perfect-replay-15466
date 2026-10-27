import { Link } from "@tanstack/react-router";
import { Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
      <span className="grid size-8 place-items-center rounded-lg bg-brand shadow-glow">
        <Clapperboard className="size-4 text-primary-foreground" />
      </span>
      GB Motion <span className="text-gradient">AI</span>
    </Link>
  );
}

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link to="/planos">Planos</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/auth">Entrar</Link>
          </Button>
          <Button variant="hero" asChild>
            <Link to="/auth" search={{ mode: "signup" }}>Começar grátis</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-border py-10 text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
        <p>© {new Date().getFullYear()} GB Motion AI</p>
        <div className="flex gap-6">
          <Link to="/planos" className="hover:text-foreground">Planos</Link>
          <Link to="/privacidade" className="hover:text-foreground">Privacidade</Link>
          <Link to="/termos" className="hover:text-foreground">Termos de Uso</Link>
        </div>
      </div>
    </footer>
  );
}
