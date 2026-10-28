import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const myGenerationsQuery = queryOptions({
  queryKey: ["generations"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("video_generations")
      .select("id,mode,prompt,status,cost,refunded,error,created_at,video_path,params")
      .eq("user_id", u.user?.id ?? "")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data;
  },
});

export const MODE_LABEL: Record<string, string> = {
  image_to_video: "Imagem para vídeo",
  product_ad: "Vídeo publicitário",
};

export async function signedVideoUrl(path: string, download = false) {
  const { data } = await supabase.storage.from("videos").createSignedUrl(path, 3600, { download });
  return data?.signedUrl ?? null;
}
