import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { getGeneration } from "@/lib/generation.functions";
import { MODE_LABEL } from "@/lib/generations";

export const Route = createFileRoute("/_authenticated/videos/$id")({
  head: () => ({ meta: [{ title: "Seu vídeo — GB Motion AI" }, { name: "description", content: "Acompanhe a geração do seu vídeo." }] }),
  component: VideoPage,
});

function VideoPage() {
  const { id } = Route.useParams();
  const q = useQuery({
    queryKey: ["generation", id],
    queryFn: () => getGeneration({ data: { id } }),
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === "queued" || s === "processing" ? 6000 : false;
    },
  });
  const g = q.data;
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <Link to="/dashboard" className="text-sm text-neon hover:underline">← Voltar ao painel</Link>
        {q.isError && <p className="text-destructive">Não foi possível carregar este vídeo.</p>}
        {g && (
          <>
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-2xl font-bold">{MODE_LABEL[g.mode]}</h1>
              <StatusBadge status={g.status} />
            </div>
            <div className="grid min-h-64 place-items-center overflow-hidden rounded-2xl border border-border bg-card">
              {g.status === "completed" && g.videoUrl ? (
                <video src={g.videoUrl} controls className="w-full" />
              ) : g.status === "failed" ? (
                <div className="p-8 text-center">
                  <p className="font-semibold text-destructive">A geração falhou</p>
                  <p className="mt-1 text-sm text-muted-foreground">{g.error}</p>
                  {g.refunded && <p className="mt-2 text-sm text-success">Seus créditos foram devolvidos.</p>}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Loader2 className="mx-auto size-10 animate-spin text-neon" />
                  <p className="mt-4 font-medium">Criando seu vídeo...</p>
                  <p className="text-sm text-muted-foreground">Isso costuma levar de 1 a 3 minutos. Esta página se atualiza sozinha.</p>
                </div>
              )}
            </div>
            {g.status === "completed" && g.videoUrl && (
              <Button variant="hero" asChild><a href={g.videoUrl} download><Download />Baixar vídeo</a></Button>
            )}
            <p className="text-sm text-muted-foreground"><b>Prompt:</b> {g.prompt}</p>
          </>
        )}
      </div>
    </AppShell>
  );
}
