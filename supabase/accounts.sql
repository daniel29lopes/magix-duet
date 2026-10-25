-- Username identities avoid external email delivery. Auth passwords remain in Supabase Auth.
create table magix_private.account_names(
 username text primary key check(username ~ '^[a-z0-9_]{3,24}$'),
 user_id uuid unique not null references auth.users(id) on delete cascade,
 recovery_hash text not null check(recovery_hash ~ '^[0-9a-f]{64}$')
);
create table magix_private.account_limits(key text primary key check(length(key)=64),window_start timestamptz not null default now(),attempts integer not null default 0);
alter table magix_private.account_names enable row level security;
alter table magix_private.account_limits enable row level security;
create policy magix_names_private on magix_private.account_names for all to authenticated using(false) with check(false);
create policy magix_limits_private on magix_private.account_limits for all to authenticated using(false) with check(false);
revoke all on magix_private.account_names,magix_private.account_limits from public,anon,authenticated;
grant usage on schema magix_private to service_role;
grant all on magix_private.account_names,magix_private.account_limits to service_role;
create function public.magix_account_gate(p_key text) returns boolean language plpgsql security invoker set search_path='' as $$
declare a magix_private.account_limits%rowtype;
begin
 insert into magix_private.account_limits(key) values(p_key) on conflict do nothing;
 select * into a from magix_private.account_limits where key=p_key for update;
 if a.window_start<now()-interval '1 hour' then update magix_private.account_limits set attempts=0,window_start=now() where key=p_key;a.attempts=0;end if;
 if a.attempts>=20 then return false;end if;
 update magix_private.account_limits set attempts=attempts+1 where key=p_key;
 return true;
end $$;
create function public.magix_account_register(p_username text,p_user_id uuid,p_hash text) returns void language sql security invoker set search_path='' as $$
 insert into magix_private.account_names(username,user_id,recovery_hash) values(p_username,p_user_id,p_hash)
$$;
create function public.magix_account_recover(p_username text,p_hash text,p_new_hash text) returns uuid language sql security invoker set search_path='' as $$
 update magix_private.account_names set recovery_hash=p_new_hash where username=p_username and recovery_hash=p_hash returning user_id
$$;
create function public.magix_account_cleanup(p_team uuid) returns void language sql security invoker set search_path='' as $$
 delete from public.magix_teams t where t.id=p_team and not exists(select 1 from public.magix_members m where m.team_id=t.id)
$$;
revoke all on function public.magix_account_gate(text),public.magix_account_register(text,uuid,text),public.magix_account_recover(text,text,text),public.magix_account_cleanup(uuid) from public,anon,authenticated;
grant execute on function public.magix_account_gate(text),public.magix_account_register(text,uuid,text),public.magix_account_recover(text,text,text),public.magix_account_cleanup(uuid) to service_role;
