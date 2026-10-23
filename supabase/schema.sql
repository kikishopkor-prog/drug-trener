-- =====================================================================
--  Твой Друг Тренер — схема базы данных для Supabase
--  Вставь ВЕСЬ этот файл в Supabase → SQL Editor → New query → Run
--  Файл можно запускать повторно: он ничего не ломает.
-- =====================================================================

-- 1. Таблицы ----------------------------------------------------------
-- Основные данные тренера (клиенты, программы, библиотека, памятки, шаблоны, веса).
create table if not exists public.app_state (
  id    int primary key check (id = 1),
  owner uuid   not null,
  data  jsonb  not null default '{}'::jsonb,
  ver   bigint not null default 1
);

-- Данные каждого клиента (привычки, отметки, замеры). Их пишет и клиент, и тренер.
create table if not exists public.client_logs (
  client_id text primary key,
  data      jsonb not null default '{}'::jsonb,
  updated   timestamptz not null default now()
);

-- Прямой доступ к таблицам закрыт полностью: всё идёт только через функции ниже.
alter table public.app_state   enable row level security;
alter table public.client_logs enable row level security;
revoke all on public.app_state   from anon, authenticated;
revoke all on public.client_logs from anon, authenticated;

-- 2. Вспомогательная функция: слияние данных (null = удалить ключ) -----
create or replace function public.jsonb_deep_merge(a jsonb, b jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  k   text;
  v   jsonb;
  res jsonb;
begin
  if jsonb_typeof(a) is distinct from 'object' or jsonb_typeof(b) is distinct from 'object' then
    return jsonb_strip_nulls(b);
  end if;
  res := a;
  for k, v in select key, value from jsonb_each(b) loop
    if jsonb_typeof(v) = 'null' then
      res := res - k;
    elsif jsonb_typeof(res -> k) = 'object' and jsonb_typeof(v) = 'object' then
      res := jsonb_set(res, array[k], public.jsonb_deep_merge(res -> k, v), true);
    else
      res := jsonb_set(res, array[k], jsonb_strip_nulls(v), true);
    end if;
  end loop;
  return res;
end;
$$;

-- 3. Функции ТРЕНЕРА (только после входа по e-mail и паролю) -----------
create or replace function public.trainer_poll(p_ver bigint default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s    public.app_state%rowtype;
  lg   jsonb;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  select * into s from public.app_state where id = 1;
  if not found then return jsonb_build_object('empty', true); end if;
  if s.owner <> auth.uid() then raise exception 'forbidden' using errcode = '42501'; end if;
  select coalesce(jsonb_object_agg(client_id, data), '{}'::jsonb) into lg from public.client_logs;
  if p_ver is not null and p_ver = s.ver then
    return jsonb_build_object('ver', s.ver, 'logs', lg);
  end if;
  return jsonb_build_object('ver', s.ver, 'data', s.data, 'logs', lg);
end;
$$;

create or replace function public.trainer_init(p_data jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare v bigint;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  insert into public.app_state (id, owner, data, ver) values (1, auth.uid(), coalesce(p_data, '{}'::jsonb), 1)
  on conflict (id) do nothing;
  select ver into v from public.app_state where id = 1 and owner = auth.uid();
  if v is null then raise exception 'forbidden' using errcode = '42501'; end if;
  return v;
end;
$$;

create or replace function public.trainer_save(p_patch jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare v bigint;
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  update public.app_state
     set data = data || coalesce(p_patch, '{}'::jsonb), ver = ver + 1
   where id = 1 and owner = auth.uid()
  returning ver into v;
  if v is null then raise exception 'forbidden' using errcode = '42501'; end if;
  return v;
end;
$$;

create or replace function public.trainer_logs_patch(p_cid text, p_patch jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from public.app_state where id = 1 and owner = auth.uid()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  insert into public.client_logs (client_id, data, updated)
  values (p_cid, public.jsonb_deep_merge('{}'::jsonb, coalesce(p_patch, '{}'::jsonb)), now())
  on conflict (client_id) do update
    set data = public.jsonb_deep_merge(public.client_logs.data, coalesce(p_patch, '{}'::jsonb)), updated = now();
end;
$$;

-- 4. Функции КЛИЕНТА (доступ по секретной ссылке-токену) ----------------
create or replace function public.client_get(p_token text, p_ver bigint default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s   public.app_state%rowtype;
  c   jsonb;
  cid text;
  lg  jsonb;
  res jsonb;
begin
  if p_token is null or length(p_token) < 6 then return jsonb_build_object('error', 'not_found'); end if;
  select * into s from public.app_state where id = 1;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  select e into c from jsonb_array_elements(coalesce(s.data -> 'clients', '[]'::jsonb)) e
   where coalesce(e ->> 'token', e ->> 'id') = p_token limit 1;
  if c is null then return jsonb_build_object('error', 'not_found'); end if;
  cid := c ->> 'id';
  if coalesce((c ->> 'active')::boolean, true) = false then
    return jsonb_build_object('ver', s.ver, 'client', c, 'blocked', true);
  end if;
  select data into lg from public.client_logs where client_id = cid;
  res := jsonb_build_object('ver', s.ver, 'client', c, 'logs', coalesce(lg, '{}'::jsonb));
  if p_ver is null or p_ver <> s.ver then
    res := res || jsonb_build_object(
      'plans',   coalesce(jsonb_path_query_array(s.data -> 'plans', '$[*] ? (@.clientId == $cid)', jsonb_build_object('cid', cid)), '[]'::jsonb),
      'library', coalesce(s.data -> 'library', '[]'::jsonb),
      'memos',   coalesce(s.data -> 'memos', '[]'::jsonb),
      'weights', coalesce(s.data -> 'weights' -> cid, '{}'::jsonb)
    );
  end if;
  return res;
end;
$$;

create or replace function public.client_patch(p_token text, p_patch jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s   public.app_state%rowtype;
  c   jsonb;
  cid text;
begin
  if p_token is null or length(p_token) < 6 then raise exception 'not found' using errcode = '42501'; end if;
  if length(coalesce(p_patch, '{}'::jsonb)::text) > 300000 then raise exception 'too large' using errcode = '54000'; end if;
  select * into s from public.app_state where id = 1;
  if not found then raise exception 'not found' using errcode = '42501'; end if;
  select e into c from jsonb_array_elements(coalesce(s.data -> 'clients', '[]'::jsonb)) e
   where coalesce(e ->> 'token', e ->> 'id') = p_token limit 1;
  if c is null or coalesce((c ->> 'active')::boolean, true) = false then
    raise exception 'not found' using errcode = '42501';
  end if;
  cid := c ->> 'id';
  insert into public.client_logs (client_id, data, updated)
  values (cid, public.jsonb_deep_merge('{}'::jsonb, coalesce(p_patch, '{}'::jsonb)), now())
  on conflict (client_id) do update
    set data = public.jsonb_deep_merge(public.client_logs.data, coalesce(p_patch, '{}'::jsonb)), updated = now();
end;
$$;

-- 5. Права доступа ---------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.trainer_poll(bigint)          to authenticated;
grant execute on function public.trainer_init(jsonb)           to authenticated;
grant execute on function public.trainer_save(jsonb)           to authenticated;
grant execute on function public.trainer_logs_patch(text, jsonb) to authenticated;
grant execute on function public.client_get(text, bigint)      to anon, authenticated;
grant execute on function public.client_patch(text, jsonb)     to anon, authenticated;
