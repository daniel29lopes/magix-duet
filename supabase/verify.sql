begin;
insert into auth.users(id,instance_id,aud,role,email)
values
('a0000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','magix-test-1@example.invalid'),
('a0000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','magix-test-2@example.invalid'),
('a0000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','magix-test-3@example.invalid');
select set_config('request.jwt.claims','{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select public.magix_create_team('{"version":1,"id":"b0000000-0000-4000-8000-000000000001","name":"Verification team","creator":"test","events":[]}'::jsonb,'Alpha');
select set_config('magix.testcode',public.magix_dashboard()->>'code',true);
select public.magix_sync_team('{"version":1,"id":"b0000000-0000-4000-8000-000000000001","name":"Verification team","creator":"test","events":[{"id":"run-1","type":"run","order":1,"device":"alpha","duration":60,"kills":50,"coins":62,"won":false,"coop":true,"unlocks":[]}]}'::jsonb);
reset role;
select set_config('request.jwt.claims','{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
do $$
begin
 if (select count(*) from public.magix_teams)<>0 then raise exception 'RLS leaked another team';end if;
 if public.magix_dashboard() is not null then raise exception 'Unjoined account could read a dashboard';end if;
 if not(public.magix_join_team(current_setting('magix.testcode'),'Beta') ? 'team') then raise exception 'Join failed';end if;
 if (select count(*) from public.magix_members)<>2 then raise exception 'Team membership did not synchronize';end if;
 perform public.magix_sync_team('{"version":1,"id":"b0000000-0000-4000-8000-000000000001","name":"Verification team","creator":"test","events":[{"id":"run-1","type":"run","order":2,"device":"beta","duration":60,"kills":50,"coins":62,"won":false,"coop":true,"unlocks":[]},{"id":"run-2","type":"run","order":3,"device":"beta","duration":100,"kills":100,"coins":97,"won":false,"coop":true,"unlocks":[]}]}'::jsonb);
 if jsonb_array_length(public.magix_dashboard()->'team'->'events')<>2 then raise exception 'Duplicate rewards or lost event';end if;
 begin update public.magix_teams set name='Illegal direct update';raise exception 'Direct update unexpectedly allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
set local role authenticated;
do $$begin
 if not(public.magix_join_team(current_setting('magix.testcode'),'Third') ? 'error') then raise exception 'Third account bypassed team size';end if;
 if (select count(*) from public.magix_teams)<>0 then raise exception 'Third account could read team';end if;
end $$;
reset role;
set local role anon;
do $$begin
 begin perform public.magix_dashboard();raise exception 'Anonymous RPC was allowed';exception when insufficient_privilege then null;end;
 begin perform * from public.magix_teams;raise exception 'Anonymous table read was allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'PASS: team creation, join, two-member limit, atomic merge, deduplication, RLS isolation, mutation restrictions and anonymous denial; test fixtures rolled back.' as verification;
