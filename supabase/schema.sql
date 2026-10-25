-- Magix Duet: private team progress, no gameplay packets or passwords in these tables.
create schema if not exists magix_private;
revoke all on schema magix_private from public, anon;
grant usage on schema magix_private to authenticated;
create table public.magix_teams(
 id uuid primary key,
 name text not null check(length(name) between 1 and 40),
 join_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
 doc jsonb not null check(jsonb_typeof(doc)='object' and doc->>'id'=id::text and doc->>'version'='1'),
 updated_at timestamptz not null default now()
);
create table public.magix_members(
 user_id uuid primary key references auth.users(id) on delete cascade,
 team_id uuid not null references public.magix_teams(id) on delete cascade,
 display_name text not null check(length(display_name) between 1 and 24),
 joined_at timestamptz not null default now()
);
create index magix_members_team_idx on public.magix_members(team_id);
create table magix_private.join_attempts(user_id uuid primary key references auth.users(id) on delete cascade, window_start timestamptz not null default now(), attempts integer not null default 0);
alter table public.magix_teams enable row level security;
alter table public.magix_members enable row level security;
alter table magix_private.join_attempts enable row level security;
revoke all on public.magix_teams,public.magix_members from anon,authenticated;
grant select on public.magix_teams,public.magix_members to authenticated;
create function magix_private.my_team() returns uuid language sql stable security definer set search_path='' as $$
 select team_id from public.magix_members where user_id=(select auth.uid())
$$;
revoke all on function magix_private.my_team() from public,anon;
grant execute on function magix_private.my_team() to authenticated;
create policy magix_team_read on public.magix_teams for select to authenticated using(id=(select magix_private.my_team()));
create policy magix_members_read on public.magix_members for select to authenticated using(team_id=(select magix_private.my_team()));
create function magix_private.valid_event(e jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare kind text;
begin
 if jsonb_typeof(e)<>'object' or coalesce(length(e->>'id'),0) not between 1 and 100 then return false;end if;
 if coalesce((e->>'order')::numeric,-1) not between 0 and 1000000000000 or coalesce(length(e->>'device'),0)>100 then return false;end if;
 kind=e->>'type';
 if kind='run' then
  if coalesce((e->>'duration')::numeric,-1) not between 0 and 540 or coalesce((e->>'kills')::numeric,-1) not between 0 and 10000 or coalesce((e->>'coins')::numeric,-1) not between 0 and 15000 then return false;end if;
  if jsonb_typeof(e->'unlocks') is distinct from 'array' or jsonb_array_length(e->'unlocks')>30 then return false;end if;
  if exists(select 1 from jsonb_array_elements_text(e->'unlocks') x where x !~ '^(enchantix|believix|fusion):[a-z]+$') then return false;end if;
  return true;
 elsif kind='buy' then return coalesce(e->>'upgrade','') in ('power','vigor','haste','recovery','fortune','reach');
 elsif kind='cancel' then return coalesce(length(e->>'target'),0) between 1 and 100;
 end if;
 return false;
exception when others then return false;
end $$;
revoke all on function magix_private.valid_event(jsonb) from public,anon;
grant execute on function magix_private.valid_event(jsonb) to authenticated;
create function magix_private.valid_doc(d jsonb) returns boolean language plpgsql immutable set search_path='' as $$
begin
 if d->>'version' is distinct from '1' or jsonb_typeof(d->'events') is distinct from 'array' or octet_length(d::text)>6000000 then return false;end if;
 if jsonb_array_length(d->'events')>15000 then return false;end if;
 return not exists(select 1 from jsonb_array_elements(d->'events') e where not magix_private.valid_event(e));
exception when others then return false;
end $$;
revoke all on function magix_private.valid_doc(jsonb) from public,anon;
grant execute on function magix_private.valid_doc(jsonb) to authenticated;
create function magix_private.dashboard() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare tid uuid;result jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 tid=magix_private.my_team();if tid is null then return null;end if;
 select jsonb_build_object('team',t.doc,'code',t.join_code,'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'name',m.display_name) order by m.joined_at) from public.magix_members m where m.team_id=t.id),'[]'::jsonb)) into result from public.magix_teams t where t.id=tid;
 return result;
end $$;
revoke all on function magix_private.dashboard() from public,anon;
grant execute on function magix_private.dashboard() to authenticated;
create function magix_private.create_team(p_doc jsonb,p_display_name text) returns jsonb language plpgsql security definer set search_path='' as $$
declare tid uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if magix_private.my_team() is not null then return magix_private.dashboard();end if;
 if not magix_private.valid_doc(p_doc) then raise exception 'Invalid save';end if;
 tid=(p_doc->>'id')::uuid;
 if exists(select 1 from public.magix_teams where id=tid) then return jsonb_build_object('error','Esta equipa já existe na cloud. Pede o código de equipa para entrar.');end if;
 insert into public.magix_teams(id,name,doc) values(tid,left(coalesce(nullif(p_doc->>'name',''),'A nossa equipa'),40),p_doc);
 insert into public.magix_members(user_id,team_id,display_name) values(auth.uid(),tid,left(coalesce(nullif(trim(p_display_name),''),'Fada'),24));
 return magix_private.dashboard();
end $$;
revoke all on function magix_private.create_team(jsonb,text) from public,anon;
grant execute on function magix_private.create_team(jsonb,text) to authenticated;
create function magix_private.join_team(p_code text,p_display_name text) returns jsonb language plpgsql security definer set search_path='' as $$
declare tid uuid;a magix_private.join_attempts%rowtype;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 
 insert into magix_private.join_attempts(user_id) values(auth.uid()) on conflict do nothing;
 select * into a from magix_private.join_attempts where user_id=auth.uid() for update;
 if a.window_start<now()-interval '1 hour' then update magix_private.join_attempts set attempts=0,window_start=now() where user_id=auth.uid();a.attempts=0;end if;
 if a.attempts>=10 then return jsonb_build_object('error','Demasiadas tentativas. Volta a tentar dentro de uma hora.');end if;
 update magix_private.join_attempts set attempts=attempts+1 where user_id=auth.uid();
 select id into tid from public.magix_teams where join_code=upper(trim(p_code)) for update;
 if tid is null then return jsonb_build_object('error','Código de equipa inválido.');end if;
 if tid=magix_private.my_team() then return magix_private.dashboard();end if;
 if (select count(*) from public.magix_members where team_id=tid)>=2 then return jsonb_build_object('error','Esta equipa já tem duas contas.');end if;
 delete from public.magix_members where user_id=auth.uid();
 insert into public.magix_members(user_id,team_id,display_name) values(auth.uid(),tid,left(coalesce(nullif(trim(p_display_name),''),'Fada'),24));
 delete from magix_private.join_attempts where user_id=auth.uid();
 return magix_private.dashboard();
end $$;
revoke all on function magix_private.join_team(text,text) from public,anon;
grant execute on function magix_private.join_team(text,text) to authenticated;
create function magix_private.sync_team(p_doc jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare tid uuid;current_doc jsonb;events jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 tid=magix_private.my_team();if tid is null then return jsonb_build_object('error','Cria ou junta-te a uma equipa cloud primeiro.');end if;
 if p_doc->>'id' is distinct from tid::text or not magix_private.valid_doc(p_doc) then raise exception 'Invalid team save';end if;
 select doc into current_doc from public.magix_teams where id=tid for update;
 select coalesce(jsonb_agg(e order by e->>'id'),'[]'::jsonb) into events from(
  select distinct on(value->>'id') value as e from jsonb_array_elements((current_doc->'events')||(p_doc->'events'))
  order by value->>'id',case when value->>'type'='run' then (value->>'duration')::numeric else 0 end desc,(value->>'order')::numeric desc,coalesce(value->>'device','') collate "C" desc,value::text collate "C" desc
 ) selected;
 if jsonb_array_length(events)>15000 then return jsonb_build_object('error','A equipa atingiu o limite desta versão. Exporta uma cópia de segurança.');end if;
 update public.magix_teams set doc=jsonb_set(current_doc,'{events}',events),updated_at=now() where id=tid;
 return magix_private.dashboard();
end $$;
revoke all on function magix_private.sync_team(jsonb) from public,anon;
grant execute on function magix_private.sync_team(jsonb) to authenticated;
create function public.magix_dashboard() returns jsonb language sql stable security invoker set search_path='' as $$select magix_private.dashboard()$$;
create function public.magix_create_team(p_doc jsonb,p_display_name text) returns jsonb language sql security invoker set search_path='' as $$select magix_private.create_team(p_doc,p_display_name)$$;
create function public.magix_join_team(p_code text,p_display_name text) returns jsonb language sql security invoker set search_path='' as $$select magix_private.join_team(p_code,p_display_name)$$;
create function public.magix_sync_team(p_doc jsonb) returns jsonb language sql security invoker set search_path='' as $$select magix_private.sync_team(p_doc)$$;
revoke all on function public.magix_dashboard(),public.magix_create_team(jsonb,text),public.magix_join_team(text,text),public.magix_sync_team(jsonb) from public,anon;
grant execute on function public.magix_dashboard(),public.magix_create_team(jsonb,text),public.magix_join_team(text,text),public.magix_sync_team(jsonb) to authenticated;
