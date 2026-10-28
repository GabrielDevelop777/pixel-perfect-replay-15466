import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const STYLES: Record<string, string> = {
  cinematic: "comercial cinematográfico, iluminação dramática, movimentos de câmera suaves",
  demo: "demonstração de produto, close-ups mostrando detalhes e uso",
  shopee: "vídeo para marketplace Shopee, fundo limpo, produto girando, foco em benefícios",
  tiktok: "vídeo dinâmico para TikTok/Reels, cortes rápidos, energia alta",
  premium: "publicidade premium de luxo, reflexos elegantes, câmera lenta",
  minimal: "comercial minimalista, fundo neutro, composição simples e elegante",
};

const input = z.object({
  mode: z.enum(["image_to_video", "product_ad"]),
  imagePath: z.string().min(5).max(300),
  prompt: z.string().trim().max(2000).optional().default(""),
  ratio: z.enum(["16:9", "9:16", "1:1"]),
  duration: z.union([z.literal(5), z.literal(10)]),
  idem: z.string().uuid(),
  product: z
    .object({
      name: z.string().trim().min(2).max(120),
      description: z.string().trim().max(600).optional().default(""),
      audience: z.string().trim().max(200).optional().default(""),
      style: z.enum(["cinematic", "demo", "shopee", "tiktok", "premium", "minimal"]),
      extra: z.string().trim().max(600).optional().default(""),
      narration: z.boolean().default(false),
    })
    .optional(),
});

function buildAdPrompt(p: NonNullable<z.infer<typeof input>["product"]>) {
  return [
    `Vídeo publicitário do produto "${p.name}". Estilo: ${STYLES[p.style]}.`,
    p.description && `Sobre o produto: ${p.description}.`,
    p.audience && `Público-alvo: ${p.audience}.`,
    "Preserve fielmente a forma, cores, rótulo e detalhes do produto da imagem de referência.",
    p.extra && `Instruções: ${p.extra}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

function isImage(b: Uint8Array) {
  const jpg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const png = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  const webp = b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57 && b[9] === 0x45;
  return jpg || png || webp;
}

export const startGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!data.imagePath.startsWith(`${userId}/`) || data.imagePath.includes("..")) throw new Error("forbidden");
    if (data.mode === "product_ad" && !data.product) throw new Error("invalid_prompt");

    // Verifica assinatura real do arquivo (lido com a permissão do próprio usuário)
    const file = await supabase.storage.from("uploads").download(data.imagePath);
    if (file.error || !file.data) throw new Error("Imagem não encontrada.");
    if (file.data.size > 10 * 1024 * 1024) throw new Error("Imagem maior que 10MB.");
    const head = new Uint8Array(await file.data.slice(0, 12).arrayBuffer());
    if (!isImage(head)) throw new Error("Arquivo não é uma imagem válida (JPG, PNG ou WEBP).");

    const prompt = data.mode === "product_ad" ? buildAdPrompt(data.product!) : data.prompt;
    const { data: gid, error } = await supabase.rpc("reserve_generation", {
      _mode: data.mode,
      _prompt: prompt,
      _params: {
        ratio: data.ratio,
        duration: data.duration,
        image_path: data.imagePath,
        product: data.product ?? null,
      },
      _duration: data.duration,
      _idem: data.idem,
    });
    if (error || !gid) throw new Error(error?.message ?? "Falha ao reservar créditos");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getVideoProvider } = await import("./video-provider.server");
    const { data: existing } = await supabaseAdmin.from("video_generations").select("status,provider_job_id").eq("id", gid).single();
    if (existing?.provider_job_id || existing?.status !== "queued") return { id: gid as string };

    await supabaseAdmin.from("generation_assets").insert({
      generation_id: gid, user_id: userId, kind: "source_image", storage_path: data.imagePath,
      mime_type: file.data.type || null, size_bytes: file.data.size,
    });

    const provider = getVideoProvider();
    if (!provider) {
      await supabaseAdmin.rpc("fail_and_refund", { _gid: gid, _error: "Provedor de vídeo ainda não configurado pelo administrador. Créditos devolvidos." });
      return { id: gid as string };
    }
    try {
      const signed = await supabaseAdmin.storage.from("uploads").createSignedUrl(data.imagePath, 3600);
      if (!signed.data) throw new Error("signed_url_failed");
      const jobId = await provider.submit({ imageUrl: signed.data.signedUrl, prompt, ratio: data.ratio, duration: data.duration });
      await supabaseAdmin.from("video_generations").update({ status: "processing", provider: provider.name, provider_job_id: jobId, updated_at: new Date().toISOString() }).eq("id", gid);
    } catch (e) {
      console.error("submit failed", e instanceof Error ? e.message : e);
      await supabaseAdmin.rpc("fail_and_refund", { _gid: gid, _error: "O provedor recusou a solicitação. Créditos devolvidos." });
    }
    return { id: gid as string };
  });

export const getGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // RLS garante que só o dono (ou admin) lê
    const { data: g } = await context.supabase.from("video_generations").select("*").eq("id", data.id).maybeSingle();
    if (!g) throw new Error("Geração não encontrada");
    let row = g;
    if (g.status === "processing" && g.provider_job_id) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { getVideoProvider } = await import("./video-provider.server");
      const provider = getVideoProvider();
      if (provider) {
        const s = await provider.status(g.provider_job_id);
        if (s.state === "failed") {
          await supabaseAdmin.rpc("fail_and_refund", { _gid: g.id, _error: s.error.slice(0, 300) });
        } else if (s.state === "completed") {
          const res = await fetch(s.videoUrl);
          if (res.ok) {
            const buf = await res.arrayBuffer();
            const path = `${g.user_id}/${g.id}.mp4`;
            const up = await supabaseAdmin.storage.from("videos").upload(path, buf, { contentType: "video/mp4", upsert: true });
            if (!up.error) {
              await supabaseAdmin.from("video_generations").update({ status: "completed", video_path: path, updated_at: new Date().toISOString() }).eq("id", g.id).eq("status", "processing");
              await supabaseAdmin.from("generation_assets").insert({ generation_id: g.id, user_id: g.user_id, kind: "video", storage_path: path, mime_type: "video/mp4", size_bytes: buf.byteLength });
            }
          }
        }
        const { data: fresh } = await context.supabase.from("video_generations").select("*").eq("id", data.id).single();
        if (fresh) row = fresh;
      }
    }
    let videoUrl: string | null = null;
    if (row.status === "completed" && row.video_path) {
      const s = await context.supabase.storage.from("videos").createSignedUrl(row.video_path, 3600, { download: false });
      videoUrl = s.data?.signedUrl ?? null;
    }
    return { ...row, videoUrl };
  });
