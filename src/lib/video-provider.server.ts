// Camada desacoplada de provedores de vídeo. Para trocar de provedor,
// implemente VideoProvider e altere getVideoProvider().
export type Ratio = "16:9" | "9:16" | "1:1";
export type SubmitInput = { imageUrl: string; prompt: string; ratio: Ratio; duration: number };
export type JobStatus =
  | { state: "processing" }
  | { state: "completed"; videoUrl: string }
  | { state: "failed"; error: string };

export interface VideoProvider {
  name: string;
  supportedDurations: number[];
  submit(input: SubmitInput): Promise<string>;
  status(jobId: string): Promise<JobStatus>;
}

const RUNWAY_RATIO: Record<Ratio, string> = { "16:9": "1280:720", "9:16": "720:1280", "1:1": "960:960" };

function runway(apiKey: string): VideoProvider {
  const base = "https://api.dev.runwayml.com/v1";
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "X-Runway-Version": "2024-11-06",
    "Content-Type": "application/json",
  };
  return {
    name: "runway",
    supportedDurations: [5, 10],
    async submit({ imageUrl, prompt, ratio, duration }) {
      const r = await fetch(`${base}/image_to_video`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: "gen4_turbo",
          promptImage: imageUrl,
          promptText: prompt.slice(0, 1000),
          ratio: RUNWAY_RATIO[ratio],
          duration,
        }),
      });
      const j = (await r.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!r.ok || !j.id) throw new Error(`provider_error: ${j.error ?? r.status}`);
      return j.id;
    },
    async status(jobId) {
      const r = await fetch(`${base}/tasks/${encodeURIComponent(jobId)}`, { headers });
      const j = (await r.json().catch(() => ({}))) as { status?: string; output?: string[]; failure?: string };
      if (!r.ok) return { state: "processing" };
      if (j.status === "SUCCEEDED" && j.output?.[0]) return { state: "completed", videoUrl: j.output[0] };
      if (j.status === "FAILED" || j.status === "CANCELLED")
        return { state: "failed", error: j.failure ?? "Falha no provedor" };
      return { state: "processing" };
    },
  };
}

export function getVideoProvider(): VideoProvider | null {
  const key = process.env['RUNWAY_API_KEY'];
  if (key) return runway(key);
  return null;
}
