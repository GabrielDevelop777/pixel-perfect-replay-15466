import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ImageIcon, Megaphone, Upload } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { accountQuery, friendlyError, plansQuery, publicSettingsQuery } from "@/lib/account";
import { startGeneration } from "@/lib/generation.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/gerar")({
  head: () => ({ meta: [{ title: "Gerar vídeo — GB Motion AI" }, { name: "description", content: "Crie vídeos com IA a partir de imagens." }] }),
  component: Generator,
});

type Mode = "image_to_video" | "product_ad";
const STYLES = [
  ["cinematic", "Comercial cinematográfico"],
  ["demo", "Demonstração de produto"],
  ["shopee", "Vídeo para Shopee"],
  ["tiktok", "Vídeo para TikTok/Reels"],
  ["premium", "Publicidade premium"],
  ["minimal", "Comercial minimalista"],
] as const;

function Choice<T extends string>({ value, options, onChange }: { value: T; options: readonly (readonly [T, string])[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([v, l]) => (
        <button type="button" key={v} onClick={() => onChange(v)} className={cn("rounded-lg border px-3 py-1.5 text-sm", value === v ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:text-foreground")}>{l}</button>
      ))}
    </div>
  );
}

function Generator() {
  const acc = useQuery(accountQuery);
  const plans = useQuery(plansQuery);
  const settings = useQuery(publicSettingsQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("image_to_video");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [ratio, setRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [duration, setDuration] = useState<5 | 10>(5);
  const [prompt, setPrompt] = useState("");
  const [p, setP] = useState({ name: "", description: "", audience: "", style: "cinematic" as (typeof STYLES)[number][0], extra: "", narration: false });
  const [busy, setBusy] = useState(false);

  const plan = plans.data?.find((x) => x.id === acc.data?.plan);
  const allowed = plan?.allowed_modes ?? ["image_to_video"];
  const maxDur = plan?.max_duration ?? 5;
  const s = settings.data;
  const cost = s ? (mode === "product_ad" ? s.cost_product_ad : s.cost_image_to_video) + (duration > 5 ? s.cost_per_extra_5s : 0) : null;

  function pick(f: File | undefined) {
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) { toast.error("Use JPG, PNG ou WEBP."); return; }
    if (f.size > 10 * 1024 * 1024) { toast.error("A imagem deve ter no máximo 10MB."); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !acc.data) { toast.error("Envie uma imagem."); return; }
    if (mode === "image_to_video" && prompt.trim().length < 3) { toast.error("Descreva o movimento desejado."); return; }
    if (mode === "product_ad" && p.name.trim().length < 2) { toast.error("Informe o nome do produto."); return; }
    setBusy(true);
    try {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${acc.data.userId}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("uploads").upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      const r = await startGeneration({
        data: { mode, imagePath: path, prompt, ratio, duration, idem: crypto.randomUUID(), product: mode === "product_ad" ? p : undefined },
      });
      qc.invalidateQueries();
      navigate({ to: "/videos/$id", params: { id: r.id } });
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <form onSubmit={submit} className="mx-auto max-w-3xl space-y-8">
        <h1 className="text-3xl font-bold">Gerar vídeo</h1>
        <div role="radiogroup" className="grid gap-4 sm:grid-cols-2">
          {([
            ["image_to_video", "Imagem para vídeo", "Dê vida a qualquer imagem com movimento realista.", ImageIcon],
            ["product_ad", "Vídeo publicitário", "Transforme a foto do produto num comercial.", Megaphone],
          ] as const).map(([m, title, desc, Icon]) => {
            const locked = !allowed.includes(m);
            return (
              <button key={m} type="button" role="radio" aria-checked={mode === m} disabled={locked} onClick={() => setMode(m)}
                className={cn("rounded-2xl border p-5 text-left transition", mode === m ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-card hover:border-primary/40", locked && "cursor-not-allowed opacity-50")}>
                <Icon className="size-6 text-neon" />
                <p className="mt-3 font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground">{locked ? "Disponível no plano VIP." : desc}</p>
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          <Label>{mode === "product_ad" ? "Imagem do produto" : "Imagem"}</Label>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground hover:border-primary/50">
            {preview ? <img src={preview} alt="Pré-visualização" className="max-h-72 rounded-lg object-contain" /> : (<><Upload className="size-6" />Clique para enviar (JPG, PNG ou WEBP, até 10MB)</>)}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          </label>
        </div>

        {mode === "image_to_video" ? (
          <div className="space-y-2">
            <Label htmlFor="prompt">Descreva o movimento</Label>
            <Textarea id="prompt" maxLength={2000} rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ex.: a câmera se aproxima lentamente enquanto o cabelo balança ao vento" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Nome do produto</Label><Input maxLength={120} value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Público-alvo</Label><Input maxLength={200} value={p.audience} onChange={(e) => setP({ ...p, audience: e.target.value })} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Descrição (opcional)</Label><Textarea maxLength={600} value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Estilo da propaganda</Label><Choice value={p.style} options={STYLES} onChange={(v) => setP({ ...p, style: v })} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Instruções adicionais</Label><Textarea maxLength={600} value={p.extra} onChange={(e) => setP({ ...p, extra: e.target.value })} /></div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <Switch checked={p.narration} onCheckedChange={(v) => setP({ ...p, narration: v })} id="narr" />
              <Label htmlFor="narr">Narração em português</Label>
            </div>
            {p.narration && <p className="text-xs text-warning sm:col-span-2">A narração ainda não é suportada pelo provedor de vídeo atual; o vídeo será gerado sem áudio.</p>}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Proporção</Label><Choice value={ratio} options={[["16:9", "16:9 Horizontal"], ["9:16", "9:16 Vertical"], ["1:1", "1:1 Quadrado"]] as const} onChange={setRatio} /></div>
          <div className="space-y-1.5">
            <Label>Duração</Label>
            <Choice value={String(duration) as "5" | "10"} options={(maxDur >= 10 ? [["5", "5 segundos"], ["10", "10 segundos"]] : [["5", "5 segundos"]]) as readonly (readonly ["5" | "10", string])[]} onChange={(v) => setDuration(Number(v) as 5 | 10)} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
          <p className="text-sm">Custo: <b>{cost ?? "—"} crédito(s)</b> · Saldo: <b>{acc.data?.balance ?? "—"}</b></p>
          <Button variant="hero" size="lg" disabled={busy || (cost != null && (acc.data?.balance ?? 0) < cost)}>{busy ? "Enviando..." : "Gerar vídeo"}</Button>
        </div>
      </form>
    </AppShell>
  );
}
