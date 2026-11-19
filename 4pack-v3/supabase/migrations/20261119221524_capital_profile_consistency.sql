begin;
alter function public.capital_commitment(uuid) rename to capital_commitment_before_consistency;
revoke all on function public.capital_commitment_before_consistency(uuid) from public,anon,authenticated;
create function public.capital_commitment(target_operator uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare c jsonb;contract_value numeric;begin
 c:=public.capital_commitment_before_consistency(target_operator);
 select coalesce(sum(contract_exposure),0) into contract_value from public.operation_capacity_reservations where operator_id=target_operator and currency='ARS' and state<>'released';
 return c||jsonb_build_object('inconsistent',(c->>'committed')::numeric>(c->>'approved')::numeric,'contract_value',contract_value,
 'review_reason',case when (c->>'requires_review')::int>0 then 'Capital historico pendiente de revision' when (c->>'committed')::numeric>(c->>'approved')::numeric then 'Compromisos superiores al capital aprobado: revisar limites y reservas' else null end);
end $$;
revoke all on function public.capital_commitment(uuid) from public,anon,authenticated;
-- A suspended registered company is not an application and cannot be reactivated
-- by replaying the admission RPC. Its commitments remain untouched.
alter function public.admin_review_operator(uuid,text,numeric,text,jsonb,uuid) rename to review_operator_before_suspension_guard;
revoke all on function public.review_operator_before_suspension_guard(uuid,text,numeric,text,jsonb,uuid) from public,anon,authenticated;
create function public.admin_review_operator(target_operator uuid,decision text,initial_capital numeric,reason text,checklist jsonb,request_key uuid) returns uuid language plpgsql security definer set search_path=public as $$ begin
 if auth.uid() is null or public.current_user_role()<>'admin' then raise exception 'Acceso administrativo requerido';end if;
 perform public.lock_capital_market();
 if exists(select 1 from public.operator_profiles where user_id=target_operator and verification_status='suspended') then raise exception 'Empresa suspendida: requiere revision de suspension, no una nueva postulacion';end if;
 return public.review_operator_before_suspension_guard(target_operator,decision,initial_capital,reason,checklist,request_key);
end $$;
-- Renamed PL/pgSQL body qualifies its argument with its original function name.
do $$ declare definition text;begin select pg_get_functiondef('public.review_operator_before_suspension_guard(uuid,text,numeric,text,jsonb,uuid)'::regprocedure) into definition;execute replace(definition,'admin_review_operator.request_key','review_operator_before_suspension_guard.request_key');end $$;
revoke all on function public.admin_review_operator(uuid,text,numeric,text,jsonb,uuid) from public,anon;
grant execute on function public.admin_review_operator(uuid,text,numeric,text,jsonb,uuid) to authenticated;
alter function public.admin_workbench() rename to admin_workbench_before_context;
revoke all on function public.admin_workbench_before_context() from public,anon,authenticated;
create function public.admin_workbench() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare data jsonb;begin data:=public.admin_workbench_before_context();
 return data||jsonb_build_object('contracts',coalesce((select jsonb_agg(to_jsonb(c)) from public.operation_contract_snapshots c),'[]'),'guarantees',coalesce((select jsonb_agg(to_jsonb(g)) from public.payment_guarantees g),'[]'));
end $$;
revoke all on function public.admin_workbench() from public,anon;
grant execute on function public.admin_workbench() to authenticated;
commit;
