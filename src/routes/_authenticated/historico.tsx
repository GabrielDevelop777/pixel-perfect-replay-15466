import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { myGenerationsQuery, MODE_LABEL, signedVideoUrl } from "@/lib/generations";

export const Route = createFileRoute("/_authenticated/historico")({
  head: () => ({ meta: [{ title: "Histórico — GB Motion AI" }, { name: "description", content: "Seus vídeos gerados e downloads." }] }),
  component: History,
});

function History() {
  const { data, isLoading } = useQuery(myGenerationsQuery);
  async function download(path: string) {
    const url = await signedVideoUrl(path, true);
    if (url) window.location.href = url;
  }
  return (
    <AppShell>
      <h1 className="mb-6 text-3xl font-bold">Histórico e downloads</h1>
      {isLoading && <p className="text-muted-foreground">Carregando...</p>}
      {data?.length === 0 && <p className="text-muted-foreground">Nenhuma geração ainda.</p>}
      <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
        {data?.map((g) => (
          <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <Link to="/videos/$id" params={{ id: g.id }} className="min-w-0 flex-1">
              <p className="text-sm font-medium">{MODE_LABEL[g.mode]} · {new Date(g.created_at).toLocaleString("pt-BR")}</p>
              <p className="truncate text-xs text-muted-foreground">{g.prompt}</p>
            </Link>
            <span className="text-xs text-muted-foreground">{g.cost} créd.{g.refunded ? " (devolvido)" : ""}</span>
            <StatusBadge status={g.status} />
            {g.video_path && <Button size="sm" variant="glass" onClick={() => download(g.video_path!)}><Download />Baixar</Button>}
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
