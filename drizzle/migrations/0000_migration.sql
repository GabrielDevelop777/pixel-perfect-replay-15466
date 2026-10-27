
create type public.app_role as enum ('admin','user');
create type public.generation_status as enum ('queued','processing','completed','failed');
create type public.generation_mode as enum ('image_to_video','product_ad');

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  is_blocked boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- plans
create table public.plans (
  id text primary key,
  name text not null,
  initial_credits int not null default 0 check (initial_credits >= 0),
  monthly_credits int not null default 0 check (monthly_credits >= 0),
  max_duration int not null default 5,
  allowed_modes generation_mode[] not null default '{image_to_video}',
  benefits text[] not null default '{}',
  updated_at timestamptz not null default now()
);
grant select on public.plans to anon, authenticated;
grant all on public.plans to service_role;
alter table public.plans enable row level security;
create policy "plans public read" on public.plans for select to anon, authenticated using (true);

insert into public.plans (id,name,initial_credits,monthly_credits,max_duration,allowed_modes,benefits) values
('free','Grátis',2,0,5,'{image_to_video}','{"2 créditos iniciais","Imagem para vídeo","Histórico de vídeos"}'),
('vip','VIP',0,50,10,'{image_to_video,product_ad}','{"50 créditos por mês","Vídeos publicitários com IA","Vídeos de até 10 segundos","Prioridade no suporte"}');

-- subscriptions
create table public.subscriptions (
  user_id uuid primary key,
  plan_id text not null references public.plans(id) default 'free',
  expires_at timestamptz,
  updated_by uuid,
  updated_at timestamptz not null default now()
);
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;
create policy "own sub" on public.subscriptions for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- wallets
create table public.credit_wallets (
  user_id uuid primary key,
  balance int not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);
grant select on public.credit_wallets to authenticated;
grant all on public.credit_wallets to service_role;
alter table public.credit_wallets enable row level security;
create policy "own wallet" on public.credit_wallets for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- generations
create table public.video_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  mode generation_mode not null,
  status generation_status not null default 'queued',
  prompt text not null,
  params jsonb not null default '{}',
  cost int not null check (cost >= 0),
  provider text,
  provider_job_id text,
  video_path text,
  error text,
  refunded boolean not null default false,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index on public.video_generations (user_id, created_at desc);
create index on public.video_generations (status);
grant select on public.video_generations to authenticated;
grant all on public.video_generations to service_role;
alter table public.video_generations enable row level security;
create policy "own gens" on public.video_generations for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- transactions
create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount int not null,
  kind text not null check (kind in ('initial','generation','refund','admin_adjust','vip_grant')),
  generation_id uuid references public.video_generations(id) on delete set null,
  note text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index on public.credit_transactions (user_id, created_at desc);
grant select on public.credit_transactions to authenticated;
grant all on public.credit_transactions to service_role;
alter table public.credit_transactions enable row level security;
create policy "own tx" on public.credit_transactions for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- assets
create table public.generation_assets (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.video_generations(id) on delete cascade,
  user_id uuid not null,
  kind text not null check (kind in ('input_image','output_video')),
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);
grant select on public.generation_assets to authenticated;
grant all on public.generation_assets to service_role;
alter table public.generation_assets enable row level security;
create policy "own assets" on public.generation_assets for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- settings
create table public.system_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
grant select on public.system_settings to authenticated;
grant all on public.system_settings to service_role;
alter table public.system_settings enable row level security;
create policy "admin settings read" on public.system_settings for select to authenticated using (public.has_role(auth.uid(),'admin'));
insert into public.system_settings (key,value) values
('whatsapp_number','"5521969720690"'),
('cost_image_to_video','1'),
('cost_product_ad','2'),
('cost_per_extra_5s','1'),
('global_monthly_spend_limit_credits','1000');

-- audit
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  target_user uuid,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.audit_logs (created_at desc);
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy "admin audit read" on public.audit_logs for select to authenticated using (public.has_role(auth.uid(),'admin'));

-- effective plan (VIP expires automatically)
create or replace function public.effective_plan(_uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select case when s.plan_id <> 'free' and (s.expires_at is null or s.expires_at > now()) then s.plan_id else 'free' end
    from public.subscriptions s where s.user_id = _uid), 'free')
$$;

create or replace function public.get_public_settings()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'whatsapp_number', (select value from system_settings where key='whatsapp_number'),
    'cost_image_to_video', (select value from system_settings where key='cost_image_to_video'),
    'cost_product_ad', (select value from system_settings where key='cost_product_ad'),
    'cost_per_extra_5s', (select value from system_settings where key='cost_per_extra_5s'))
$$;
grant execute on function public.get_public_settings() to anon, authenticated;

-- signup trigger
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare init int;
begin
  select initial_credits into init from public.plans where id='free';
  insert into public.profiles (id,email,full_name) values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'));
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  insert into public.subscriptions (user_id, plan_id) values (new.id, 'free');
  insert into public.credit_wallets (user_id, balance) values (new.id, coalesce(init,0));
  if coalesce(init,0) > 0 then
    insert into public.credit_transactions (user_id, amount, kind, note) values (new.id, init, 'initial', 'Créditos iniciais do plano grátis');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- cost calc
create or replace function public.generation_cost(_mode generation_mode, _duration int)
returns int language sql stable security definer set search_path = public as $$
  select (case when _mode='product_ad' then (select value::int from system_settings where key='cost_product_ad')
               else (select value::int from system_settings where key='cost_image_to_video') end)
       + greatest(0, ceil((_duration - 5)::numeric / 5)::int) * (select value::int from system_settings where key='cost_per_extra_5s')
$$;

-- atomic reservation
create or replace function public.reserve_generation(_mode generation_mode, _prompt text, _params jsonb, _duration int, _idem text)
returns uuid language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); c int; bal int; gid uuid; plan record; spent int; lim int;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from profiles where id=uid and is_blocked) then raise exception 'account_blocked'; end if;
  if length(coalesce(_prompt,'')) < 3 or length(_prompt) > 2000 then raise exception 'invalid_prompt'; end if;
  select * into plan from plans where id = public.effective_plan(uid);
  if not (_mode = any(plan.allowed_modes)) then raise exception 'mode_not_allowed'; end if;
  if _duration < 1 or _duration > plan.max_duration then raise exception 'duration_not_allowed'; end if;

  select id into gid from video_generations where user_id=uid and idempotency_key=_idem;
  if gid is not null then return gid; end if;

  select coalesce(sum(cost),0) into spent from video_generations where not refunded and created_at > date_trunc('month', now());
  select value::int into lim from system_settings where key='global_monthly_spend_limit_credits';
  c := public.generation_cost(_mode, _duration);
  if spent + c > lim then raise exception 'global_limit_reached'; end if;

  select balance into bal from credit_wallets where user_id=uid for update;
  if bal is null or bal < c then raise exception 'insufficient_credits'; end if;
  update credit_wallets set balance = balance - c, updated_at=now() where user_id=uid;
  insert into video_generations (user_id, mode, prompt, params, cost, idempotency_key)
    values (uid, _mode, _prompt, coalesce(_params,'{}'), c, _idem) returning id into gid;
  insert into credit_transactions (user_id, amount, kind, generation_id, note) values (uid, -c, 'generation', gid, 'Reserva para geração');
  return gid;
end $$;
revoke execute on function public.reserve_generation from public, anon;
grant execute on function public.reserve_generation to authenticated;

-- refund (server only)
create or replace function public.fail_and_refund(_gid uuid, _error text)
returns void language plpgsql security definer set search_path = public as $$
declare g record;
begin
  select * into g from video_generations where id=_gid for update;
  if g is null or g.refunded or g.status = 'completed' then return; end if;
  update video_generations set status='failed', error=left(_error,500), refunded=true, updated_at=now() where id=_gid;
  update credit_wallets set balance = balance + g.cost, updated_at=now() where user_id=g.user_id;
  insert into credit_transactions (user_id, amount, kind, generation_id, note) values (g.user_id, g.cost, 'refund', _gid, 'Reembolso automático por falha');
end $$;
revoke execute on function public.fail_and_refund from public, anon, authenticated;
grant execute on function public.fail_and_refund to service_role;

-- admin ops
create or replace function public.admin_adjust_credits(_uid uuid, _amount int, _note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if;
  if _amount = 0 or abs(_amount) > 100000 then raise exception 'invalid_amount'; end if;
  update credit_wallets set balance = balance + _amount, updated_at=now() where user_id=_uid;
  if not found then raise exception 'user_not_found'; end if;
  insert into credit_transactions (user_id, amount, kind, note, created_by) values (_uid, _amount, 'admin_adjust', left(_note,300), auth.uid());
  insert into audit_logs (actor_id, action, target_user, details) values (auth.uid(), 'adjust_credits', _uid, jsonb_build_object('amount',_amount,'note',_note));
end $$;

create or replace function public.admin_set_plan(_uid uuid, _plan text, _expires timestamptz, _grant_credits int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if;
  if not exists (select 1 from plans where id=_plan) then raise exception 'invalid_plan'; end if;
  insert into subscriptions (user_id, plan_id, expires_at, updated_by, updated_at) values (_uid,_plan,_expires,auth.uid(),now())
    on conflict (user_id) do update set plan_id=excluded.plan_id, expires_at=excluded.expires_at, updated_by=excluded.updated_by, updated_at=now();
  if coalesce(_grant_credits,0) > 0 then
    update credit_wallets set balance = balance + _grant_credits, updated_at=now() where user_id=_uid;
    insert into credit_transactions (user_id, amount, kind, note, created_by) values (_uid, _grant_credits, 'vip_grant', 'Créditos do plano '||_plan, auth.uid());
  end if;
  insert into audit_logs (actor_id, action, target_user, details) values (auth.uid(), 'set_plan', _uid, jsonb_build_object('plan',_plan,'expires_at',_expires,'credits',_grant_credits));
end $$;

create or replace function public.admin_set_blocked(_uid uuid, _blocked boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if;
  if _uid = auth.uid() then raise exception 'cannot_block_self'; end if;
  update profiles set is_blocked=_blocked where id=_uid;
  insert into audit_logs (actor_id, action, target_user, details) values (auth.uid(), case when _blocked then 'block' else 'unblock' end, _uid, '{}');
end $$;

create or replace function public.admin_update_plan(_id text, _initial int, _monthly int, _max_duration int, _modes generation_mode[], _benefits text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if;
  if _initial < 0 or _monthly < 0 or _max_duration not in (5,10) then raise exception 'invalid_values'; end if;
  update plans set initial_credits=_initial, monthly_credits=_monthly, max_duration=_max_duration, allowed_modes=_modes, benefits=_benefits, updated_at=now() where id=_id;
  insert into audit_logs (actor_id, action, details) values (auth.uid(), 'update_plan', jsonb_build_object('plan',_id));
end $$;

create or replace function public.admin_set_setting(_key text, _value jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if;
  if _key not in ('whatsapp_number','cost_image_to_video','cost_product_ad','cost_per_extra_5s','global_monthly_spend_limit_credits') then raise exception 'invalid_key'; end if;
  update system_settings set value=_value, updated_at=now() where key=_key;
  insert into audit_logs (actor_id, action, details) values (auth.uid(), 'set_setting', jsonb_build_object('key',_key,'value',_value));
end $$;

revoke execute on function public.admin_adjust_credits, public.admin_set_plan, public.admin_set_blocked, public.admin_update_plan, public.admin_set_setting from public, anon;
grant execute on function public.admin_adjust_credits, public.admin_set_plan, public.admin_set_blocked, public.admin_update_plan, public.admin_set_setting to authenticated;
