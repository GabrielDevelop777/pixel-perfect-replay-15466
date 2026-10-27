import { createFileRoute } from "@tanstack/react-router";
import { PublicFooter, PublicHeader } from "@/components/brand";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — GB Motion AI" },
      { name: "description", content: "Como a GB Motion AI trata seus dados pessoais (LGPD)." },
      { property: "og:title", content: "Política de Privacidade — GB Motion AI" },
      { property: "og:description", content: "Tratamento de dados conforme a LGPD." },
    ],
  }),
  component: () => (
    <div className="min-h-screen">
      <PublicHeader />
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-16 text-muted-foreground [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground">
        <h1 className="text-4xl font-bold text-foreground">Política de Privacidade</h1>
        <p>Esta política explica como a GB Motion AI coleta, usa e protege seus dados, conforme a Lei Geral de Proteção de Dados (LGPD).</p>
        <h2>Dados coletados</h2>
        <p>E-mail, nome (opcional), imagens enviadas, vídeos gerados, histórico de créditos e registros técnicos de uso.</p>
        <h2>Finalidade</h2>
        <p>Prestar o serviço de geração de vídeos, gerenciar sua conta, créditos e plano, prevenir abusos e cumprir obrigações legais.</p>
        <h2>Compartilhamento</h2>
        <p>As imagens e instruções são enviadas aos provedores de inteligência artificial estritamente para gerar o vídeo solicitado.</p>
        <h2>Armazenamento e segurança</h2>
        <p>Arquivos ficam em armazenamento privado, acessível apenas pelo titular por meio de links temporários. Nenhum sistema é 100% seguro, mas adotamos medidas técnicas para proteger seus dados.</p>
        <h2>Retenção</h2>
        <p>Imagens e vídeos podem ser removidos após o período de retenção definido pela plataforma. Você pode pedir a exclusão a qualquer momento.</p>
        <h2>Seus direitos</h2>
        <p>Você pode solicitar acesso, correção, portabilidade ou exclusão dos seus dados pelo WhatsApp de atendimento.</p>
      </main>
      <PublicFooter />
    </div>
  ),
});
