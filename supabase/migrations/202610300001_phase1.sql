begin;
create schema if not exists private;
revoke all on schema private from public;
create table private.administrators (user_id uuid primary key references auth.users(id) on delete cascade, singleton boolean not null default true unique check(singleton));
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$ select exists(select 1 from private.administrators where user_id = auth.uid()) $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, display_name text not null default 'Administrador', created_at timestamptz not null default now());
create table public.products (id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade, fingerprint text not null, payload jsonb not null check(jsonb_typeof(payload)='object'), provenance text not null check(provenance in ('manual','import')), verified_at timestamptz check(verified_at is null), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(owner_id,fingerprint));
create table public.mining_searches (id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade, filters jsonb not null, source text not null default 'user-supplied', result_count integer not null check(result_count>=0), error text, created_at timestamptz not null default now());
create table public.mining_results (search_id uuid not null references public.mining_searches(id) on delete cascade, product_id uuid not null references public.products(id) on delete cascade, snapshot jsonb not null, primary key(search_id,product_id));
create table public.favorites (id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,product_id uuid not null references public.products(id) on delete cascade,status text not null default 'Encontrado' check(status in ('Encontrado','Em análise','Interessante','Selecionado para estudo','Descartado')),notes text not null default '' check(length(notes)<=5000),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(owner_id,product_id));
create table public.ai_analyses (id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,product_id uuid references public.products(id) on delete set null,input jsonb not null,report jsonb,error text,provider text not null default 'gemini',model text not null,created_at timestamptz not null default now(),check((report is not null) <> (error is not null)));
create table public.application_settings (owner_id uuid primary key references auth.users(id) on delete cascade,app_name text not null default 'Low Ticket Intelligence' check(length(app_name) between 2 and 80),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.request_buckets (owner_id uuid not null references auth.users(id) on delete cascade,scope text not null,bucket timestamptz not null,hits integer not null,primary key(owner_id,scope,bucket));
create index products_created on public.products(owner_id,created_at desc);
create index searches_created on public.mining_searches(owner_id,created_at desc);
create index analyses_created on public.ai_analyses(owner_id,created_at desc);
create index results_product on public.mining_results(product_id);
create index favorites_product on public.favorites(product_id);
create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now();return new;end $$;
create trigger products_updated before update on public.products for each row execute function public.touch_updated_at();
create trigger favorites_updated before update on public.favorites for each row execute function public.touch_updated_at();
create trigger settings_updated before update on public.application_settings for each row execute function public.touch_updated_at();
do $$ declare t text;begin foreach t in array array['products','mining_searches','favorites','ai_analyses','application_settings','request_buckets'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy admin_owner on public.%I for all to authenticated using (public.is_admin() and owner_id=auth.uid()) with check (public.is_admin() and owner_id=auth.uid())',t);
end loop;end $$;
alter table public.profiles enable row level security;
create policy profile_admin on public.profiles for all to authenticated using(public.is_admin() and id=auth.uid()) with check(public.is_admin() and id=auth.uid());
alter table public.mining_results enable row level security;
create policy result_admin on public.mining_results for all to authenticated using(public.is_admin() and exists(select 1 from public.mining_searches s where s.id=search_id and s.owner_id=auth.uid())) with check(public.is_admin() and exists(select 1 from public.mining_searches s where s.id=search_id and s.owner_id=auth.uid()) and exists(select 1 from public.products p where p.id=product_id and p.owner_id=auth.uid()));
-- Fixed limits enforced in DB, including across serverless instances.
create or replace function public.consume_request(p_scope text) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer; lim integer;begin
 if not public.is_admin() then raise exception 'Forbidden';end if;
 lim=case when p_scope='analysis' then 5 when p_scope='write' then 30 else 0 end;
 if lim=0 then raise exception 'Invalid scope';end if;
 delete from public.request_buckets where bucket < now()-interval '1 day';
 insert into public.request_buckets(owner_id,scope,bucket,hits) values(auth.uid(),p_scope,date_trunc('minute',now()),1) on conflict(owner_id,scope,bucket) do update set hits=public.request_buckets.hits+1 returning hits into n;
 return n<=lim;end $$;
revoke all on function public.consume_request(text) from public;
grant execute on function public.consume_request(text) to authenticated;
-- A search and its immutable snapshots are persisted together.
create or replace function public.save_search(p_filters jsonb,p_results jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare sid uuid;begin
 if not public.is_admin() then raise exception 'Forbidden';end if;
 insert into public.mining_searches(owner_id,filters,result_count) values(auth.uid(),p_filters,jsonb_array_length(p_results)) returning id into sid;
 insert into public.mining_results(search_id,product_id,snapshot) select sid,(item->>'id')::uuid,item from jsonb_array_elements(p_results) item;
 return sid;end $$;
revoke all on function public.save_search(jsonb,jsonb) from public;
grant execute on function public.save_search(jsonb,jsonb) to authenticated;
-- Explicit privileges; no anonymous data access, no direct writes to rate buckets.
revoke all on public.request_buckets from anon,authenticated;
grant select,insert,update,delete on public.profiles,public.products,public.mining_searches,public.mining_results,public.favorites,public.ai_analyses,public.application_settings to authenticated;
revoke all on public.profiles,public.products,public.mining_searches,public.mining_results,public.favorites,public.ai_analyses,public.application_settings from anon;
commit;
