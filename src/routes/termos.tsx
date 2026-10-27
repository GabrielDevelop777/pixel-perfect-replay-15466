import { createFileRoute } from "@tanstack/react-router";
import { PublicFooter, PublicHeader } from "@/components/brand";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — GB Motion AI" },
      { name: "description", content: "Regras de uso da plataforma GB Motion AI." },
      { property: "og:title", content: "Termos de Uso — GB Motion AI" },
      { property: "og:description", content: "Regras de uso da plataforma." },
    ],
  }),
  component: () => (
    <div className="min-h-screen">
      <PublicHeader />
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-16 text-muted-foreground [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground">
        <h1 className="text-4xl font-bold text-foreground">Termos de Uso</h1>
        <h2>1. O serviço</h2>
        <p>A GB Motion AI gera vídeos a partir de imagens usando provedores de inteligência artificial. Os resultados podem variar.</p>
        <h2>2. Créditos</h2>
        <p>Cada geração consome créditos. Créditos de gerações que falham por erro do provedor são devolvidos automaticamente. Créditos não são reembolsáveis em dinheiro.</p>
        <h2>3. Plano VIP</h2>
        <p>O VIP é contratado pelo WhatsApp e liberado manualmente. Ao expirar, a conta volta ao plano Grátis, mantendo o histórico.</p>
        <h2>4. Conteúdo</h2>
        <p>Você declara ter direitos sobre as imagens enviadas. É proibido enviar conteúdo ilegal, ofensivo, com nudez, ou que viole direitos de terceiros.</p>
        <h2>5. Suspensão</h2>
        <p>Contas que violarem estes termos ou tentarem abusar do sistema podem ser bloqueadas.</p>
      </main>
      <PublicFooter />
    </div>
  ),
});
