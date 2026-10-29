CREATE OR REPLACE FUNCTION public.reserve_generation(_mode generation_mode, _prompt text, _params jsonb, _duration integer, _idem text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare uid uuid := auth.uid(); c int; bal int; gid uuid; plan record; spent int; lim int; adm boolean;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from profiles where id=uid and is_blocked) then raise exception 'account_blocked'; end if;
  if length(coalesce(_prompt,'')) < 3 or length(_prompt) > 2000 then raise exception 'invalid_prompt'; end if;
  adm := public.has_role(uid,'admin');
  select * into plan from plans where id = public.effective_plan(uid);
  if not adm and not (_mode = any(plan.allowed_modes)) then raise exception 'mode_not_allowed'; end if;
  if _duration < 1 or (not adm and _duration > plan.max_duration) or _duration > 10 then raise exception 'duration_not_allowed'; end if;

  select id into gid from video_generations where user_id=uid and idempotency_key=_idem;
  if gid is not null then return gid; end if;

  select coalesce(sum(cost),0) into spent from video_generations where not refunded and created_at > date_trunc('month', now());
  select value::int into lim from system_settings where key='global_monthly_spend_limit_credits';
  c := public.generation_cost(_mode, _duration);
  if spent + c > lim then raise exception 'global_limit_reached'; end if;

  if adm then
    insert into video_generations (user_id, mode, prompt, params, cost, idempotency_key, refunded)
      values (uid, _mode, _prompt, coalesce(_params,'{}'), c, _idem, false) returning id into gid;
    insert into credit_transactions (user_id, amount, kind, generation_id, note) values (uid, 0, 'generation', gid, 'Administrador (créditos ilimitados)');
    return gid;
  end if;

  select balance into bal from credit_wallets where user_id=uid for update;
  if bal is null or bal < c then raise exception 'insufficient_credits'; end if;
  update credit_wallets set balance = balance - c, updated_at=now() where user_id=uid;
  insert into video_generations (user_id, mode, prompt, params, cost, idempotency_key)
    values (uid, _mode, _prompt, coalesce(_params,'{}'), c, _idem) returning id into gid;
  insert into credit_transactions (user_id, amount, kind, generation_id, note) values (uid, -c, 'generation', gid, 'Reserva para geração');
  return gid;
end $function$;