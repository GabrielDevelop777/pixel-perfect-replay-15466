import { createFileRoute, Link } from "@tanstack/react-router";
import { ImagePlay, Megaphone, ShieldCheck, Sparkles, Zap, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicFooter, PublicHeader } from "@/components/brand";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GB Motion AI — Transforme imagens em vídeos com IA" },
      { name: "description", content: "Crie vídeos realistas e comerciais para seus produtos a partir de uma única imagem, com inteligência artificial." },
      { property: "og:title", content: "GB Motion AI — Transforme imagens em vídeos com IA" },
      { property: "og:description", content: "Vídeos e comerciais com IA a partir de uma imagem." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: ImagePlay, title: "Imagem para vídeo", text: "Envie uma foto, descreva o movimento e receba um vídeo realista." },
  { icon: Megaphone, title: "Comercial com IA", text: "Envie seu produto e gere um comercial pronto para TikTok, Reels ou Shopee." },
  { icon: Zap, title: "Créditos simples", text: "Cada vídeo consome créditos. Você vê seu saldo antes de gerar." },
  { icon: ShieldCheck, title: "Arquivos privados", text: "Suas imagens e vídeos ficam protegidos e só você acessa." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-glow" />
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 text-neon" /> Vídeos gerados por inteligência artificial
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-6xl">
              Sua imagem ganha <span className="text-gradient">movimento</span>.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Transforme fotos em vídeos realistas e crie comerciais para seus produtos em minutos.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="hero" size="xl" asChild>
                <Link to="/auth" search={{ mode: "signup" }}>Criar meu primeiro vídeo</Link>
              </Button>
              <Button variant="glass" size="xl" asChild>
                <Link to="/planos">Ver planos</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Ganhe 2 créditos grátis ao criar sua conta.</p>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 rounded-3xl bg-brand opacity-20 blur-3xl" />
            <img src={hero} alt="Produto se transformando em quadros de vídeo" width={1600} height={912}
              className="relative animate-float rounded-2xl border border-border shadow-glow" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-3xl font-bold sm:text-4xl">Dois jeitos de criar</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:shadow-glow">
              <f.icon className="size-6 text-neon" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-10 text-center">
          <div className="pointer-events-none absolute inset-0 bg-glow" />
          <Crown className="relative mx-auto size-8 text-primary" />
          <h2 className="relative mt-4 text-3xl font-bold">Quer criar mais?</h2>
          <p className="relative mx-auto mt-3 max-w-md text-muted-foreground">
            O plano VIP libera mais créditos, vídeos mais longos e comerciais com IA.
          </p>
          <Button variant="hero" size="xl" className="relative mt-6" asChild>
            <Link to="/planos">Conhecer o VIP</Link>
          </Button>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
