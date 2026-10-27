import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Account = {
  userId: string;
  email: string;
  fullName: string | null;
  isBlocked: boolean;
  isAdmin: boolean;
  balance: number;
  plan: "free" | "vip" | string;
  planName: string;
  vipExpiresAt: string | null;
};

export const accountQuery = queryOptions({
  queryKey: ["account"],
  queryFn: async (): Promise<Account> => {
    const { data: u, error } = await supabase.auth.getUser();
    if (error || !u.user) throw new Error("Sessão expirada");
    const id = u.user.id;
    const [profile, wallet, sub, roles, plan] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
      supabase.from("credit_wallets").select("balance").eq("user_id", id).maybeSingle(),
      supabase.from("subscriptions").select("*").eq("user_id", id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", id),
      supabase.rpc("effective_plan", { _uid: id }),
    ]);
    const planId = (plan.data as string) ?? "free";
    return {
      userId: id,
      email: profile.data?.email ?? u.user.email ?? "",
      fullName: profile.data?.full_name ?? null,
      isBlocked: profile.data?.is_blocked ?? false,
      isAdmin: (roles.data ?? []).some((r) => r.role === "admin"),
      balance: wallet.data?.balance ?? 0,
      plan: planId,
      planName: planId === "vip" ? "VIP" : "Grátis",
      vipExpiresAt: planId === "vip" ? (sub.data?.expires_at ?? null) : null,
    };
  },
});

export const plansQuery = queryOptions({
  queryKey: ["plans"],
  queryFn: async () => {
    const { data, error } = await supabase.from("plans").select("*").order("id");
    if (error) throw error;
    return data;
  },
});

export const publicSettingsQuery = queryOptions({
  queryKey: ["public-settings"],
  queryFn: async () => {
    const { data, error } = await supabase.rpc("get_public_settings");
    if (error) throw error;
    return data as {
      whatsapp_number: string;
      cost_image_to_video: number;
      cost_product_ad: number;
      cost_per_extra_5s: number;
    };
  },
});

export function vipWhatsappLink(number: string, email: string) {
  const msg = `Olá! Tenho interesse em contratar o plano VIP da GB Motion AI. Meu e-mail cadastrado é: ${email}. Gostaria de conhecer os valores.`;
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

export const STATUS_LABEL: Record<string, string> = {
  queued: "Aguardando",
  processing: "Processando",
  completed: "Concluído",
  failed: "Falhou",
};

export const ERROR_MESSAGES: Record<string, string> = {
  insufficient_credits: "Você não tem créditos suficientes.",
  account_blocked: "Sua conta está bloqueada. Fale com o suporte.",
  mode_not_allowed: "Essa modalidade não está disponível no seu plano.",
  duration_not_allowed: "Essa duração não está disponível no seu plano.",
  invalid_prompt: "Descreva o vídeo com 3 a 2000 caracteres.",
  global_limit_reached: "Limite de uso da plataforma atingido neste mês. Tente mais tarde.",
  forbidden: "Você não tem permissão para isso.",
};

export function friendlyError(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  for (const k of Object.keys(ERROR_MESSAGES)) if (msg.includes(k)) return ERROR_MESSAGES[k];
  return msg;
}
