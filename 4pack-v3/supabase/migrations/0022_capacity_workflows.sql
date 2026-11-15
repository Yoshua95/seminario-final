create function public.reserve_operation_capacity(target_operation uuid,source text default 'tender') returns uuid language plpgsql security definer set search_path=public as $$
declare op public.operations; c public.cargo_requests; f public.offers; l public.operator_capacity_limits; m public.operator_capacity_currency_limits; u jsonb; capital numeric; r public.operation_capacity_reservations;
 message constant text:='El operador no dispone actualmente de capacidad suficiente para asumir esta operación.';
begin
 select * into op from public.operations where id=target_operation;
 if not found then raise exception 'Operación no disponible'; end if;
 perform public.lock_operator_capacity(op.operator_id);
 select * into r from public.operation_capacity_reservations where operation_id=target_operation;
 if found then return r.operation_id; end if;
 if source not in ('tender','direct','rehire') then raise exception 'Origen de reserva inválido'; end if;
 if not exists(select 1 from public.operator_profiles o join public.profiles p on p.id=o.user_id where o.user_id=op.operator_id and o.verification_status='approved' and p.role='operator') then raise exception '%',message; end if;
 select * into l from public.operator_capacity_limits where operator_id=op.operator_id;
 if not found or l.status<>'active' or l.valid_from>now() or l.valid_until<=now() then raise exception '%',message; end if;
 select * into m from public.operator_capacity_currency_limits where operator_id=op.operator_id and currency=op.contract_currency;
 if not found or m.status<>'active' or m.valid_from>now() or m.valid_until<=now() then raise exception '%',message; end if;
 select * into f from public.offers where id=op.accepted_offer_id;
 perform public.validate_normalized_quote(f.normalized_quote);
 capital:=(f.normalized_quote->>'working_capital_amount')::numeric;
 select * into c from public.cargo_requests where id=op.cargo_id;
 u:=public.capacity_usage(op.operator_id);
 if (u->>'requires_review')::int>0 or f.total_usd>m.max_per_operation
 or coalesce((u->'currencies'->op.contract_currency->>'exposure')::numeric,0)+f.total_usd>m.max_exposure
 or coalesce((u->'currencies'->op.contract_currency->>'working_capital')::numeric,0)+capital>m.approved_working_capital
 or (u->>'operations')::int+1>l.max_operations
 or (l.max_weight_kg is not null and (u->>'weight_kg')::numeric+c.weight_kg>l.max_weight_kg)
 or (l.max_volume_m3 is not null and (u->>'volume_m3')::numeric+c.volume_m3>l.max_volume_m3) then raise exception '%',message; end if;
 insert into public.operation_capacity_reservations(operation_id,operator_id,contracting_source,currency,contract_exposure,working_capital_required,weight_kg,volume_m3,state,idempotency_key)
 values(op.id,op.operator_id,source,op.contract_currency,f.total_usd,capital,c.weight_kg,c.volume_m3,'reserved','reserve:'||op.id);
 insert into public.capacity_events(operator_id,operation_id,action,actor_id,reason,payload,event_key)
 values(op.operator_id,op.id,'reserved',auth.uid(),'Adjudicación transaccional',jsonb_build_object('currency',op.contract_currency,'exposure',f.total_usd,'working_capital',capital),'reserve:'||op.id);
 return op.id;
end $$;
create function public.release_operation_capacity(target_operation uuid,reason text) returns uuid language plpgsql security definer set search_path=public as $$
declare op public.operations; r public.operation_capacity_reservations; begin
 select * into op from public.operations where id=target_operation;
 if not found then raise exception 'Operación no disponible'; end if;
 perform public.lock_operator_capacity(op.operator_id);
 select * into r from public.operation_capacity_reservations where operation_id=target_operation for update;
 if not found then return null; end if;
 if r.state='released' then return r.operation_id; end if;
 if op.phase not in ('completed','cancelled','failed') then raise exception 'La operación continúa ocupando capacidad'; end if;
 if op.phase in ('cancelled','failed') and not exists(select 1 from public.capacity_terminal_decisions where operation_id=op.id and terminal_phase=op.phase) then raise exception 'Registrá las consecuencias contractuales antes de liberar'; end if;
 if coalesce(length(trim(reason)),0)<5 then raise exception 'Motivo de liberación requerido'; end if;
 update public.operation_capacity_reservations set state='released',released_at=now(),release_reason=reason where operation_id=op.id;
 insert into public.capacity_events(operator_id,operation_id,action,actor_id,reason,event_key) values(op.operator_id,op.id,'released',auth.uid(),reason,'release:'||op.id) on conflict(event_key) do nothing;
 return op.id;
end $$;
create function public.capacity_on_operation_insert() returns trigger language plpgsql security definer set search_path=public as $$ begin
 perform public.reserve_operation_capacity(new.id,'tender'); return new;
end $$;
create trigger capacity_reserve after insert on public.operations for each row execute function public.capacity_on_operation_insert();
create function public.capacity_on_operation_phase() returns trigger language plpgsql security definer set search_path=public as $$ begin
 if new.phase in ('completed','cancelled','failed') then perform public.release_operation_capacity(new.id,'Cierre autorizado: '||new.phase);
 elsif new.phase not in ('created','cancelled','failed') then
  update public.operation_capacity_reservations set state='active',activated_at=coalesce(activated_at,now()) where operation_id=new.id and state='reserved';
  if found then insert into public.capacity_events(operator_id,operation_id,action,actor_id,reason,event_key) values(new.operator_id,new.id,'activated',auth.uid(),'Operación confirmada','activate:'||new.id) on conflict(event_key) do nothing; end if;
 end if;
 return new;
end $$;
create trigger capacity_phase after update of phase on public.operations for each row when(old.phase is distinct from new.phase) execute function public.capacity_on_operation_phase();

alter function public.award_offer(uuid) rename to award_offer_before_capacity;
revoke all on function public.award_offer_before_capacity(uuid) from public,authenticated;
create function public.award_offer(target_offer_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare target_operator uuid; begin
 if auth.uid() is null or public.current_user_role()<>'importer' then raise exception 'Carga no autorizada'; end if;
 select f.operator_id into target_operator from public.offers f join public.cargo_requests c on c.id=f.cargo_id where f.id=target_offer_id and c.importer_id=auth.uid();
 if not found then raise exception 'Oferta no disponible o carga no autorizada'; end if;
 perform public.lock_operator_capacity(target_operator);
 return public.award_offer_before_capacity(target_offer_id);
end $$;

alter function public.transition_operation(uuid,text,text,text) rename to transition_operation_before_capacity;
revoke all on function public.transition_operation_before_capacity(uuid,text,text,text) from public,authenticated;
create function public.transition_operation(target uuid,next_phase text,description text default '',location text default '') returns void language plpgsql security definer set search_path=public as $$
declare op public.operations; begin
 select * into op from public.operations where id=target;
 if not found or auth.uid() is null or not public.is_operation_participant(target) then raise exception 'Operación no autorizada'; end if;
 perform public.lock_operator_capacity(op.operator_id);
 if next_phase in ('cancelled','failed') and not exists(select 1 from public.capacity_terminal_decisions where operation_id=target and terminal_phase=next_phase) then raise exception 'El cierre requiere registro administrativo de consecuencias contractuales'; end if;
 perform public.transition_operation_before_capacity(target,next_phase,description,location);
end $$;
alter function public.simulate_guarantee(uuid) rename to simulate_guarantee_before_capacity;
revoke all on function public.simulate_guarantee_before_capacity(uuid) from public,authenticated;
create function public.simulate_guarantee(target_operation_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare op public.operations; begin
 select * into op from public.operations where id=target_operation_id and importer_id=auth.uid();
 if not found or auth.uid() is null then raise exception 'La operación no pertenece al importador'; end if;
 perform public.lock_operator_capacity(op.operator_id);
 perform public.simulate_guarantee_before_capacity(target_operation_id);
end $$;

create function public.admin_release_capacity(target_operation uuid,reason text) returns uuid language plpgsql security definer set search_path=public as $$ begin
 if auth.uid() is null or public.current_user_role()<>'admin' then raise exception 'Acceso administrativo requerido'; end if;
 return public.release_operation_capacity(target_operation,reason);
end $$;
create function public.admin_capacity_terminal_transition(target_operation uuid,next_phase text,reason text,consequences text) returns uuid language plpgsql security definer set search_path=public as $$
declare op public.operations; guarantee public.payment_guarantees; begin
 if auth.uid() is null or public.current_user_role()<>'admin' then raise exception 'Acceso administrativo requerido'; end if;
 select * into op from public.operations where id=target_operation;
 if not found or next_phase not in ('cancelled','failed') or coalesce(length(trim(reason)),0)<5 or coalesce(length(trim(consequences)),0)<10 then raise exception 'Completá el cierre, motivo y consecuencias'; end if;
 perform public.lock_operator_capacity(op.operator_id);
 select * into op from public.operations where id=target_operation for update;
 if op.phase=next_phase and exists(select 1 from public.capacity_terminal_decisions where operation_id=op.id and terminal_phase=next_phase) then return op.id; end if;
 select * into guarantee from public.payment_guarantees where operation_id=op.id;
 insert into public.capacity_terminal_decisions(operation_id,operator_id,terminal_phase,reason,consequences,recorded_by)
 values(op.id,op.operator_id,next_phase,reason,jsonb_build_object('description',consequences,'guarantee_status',guarantee.status,'disposition',case when guarantee.status='held_simulated' then 'simulated_hold_pending_admin_review' else 'no_release_or_refund_executed' end),auth.uid());
 insert into public.capacity_events(operator_id,operation_id,action,actor_id,reason,payload,event_key) values(op.operator_id,op.id,'terminal.decision',auth.uid(),reason,jsonb_build_object('phase',next_phase,'consequences',consequences),'terminal:'||op.id);
 perform public.transition_operation(op.id,next_phase,'Consecuencias contractuales registradas por administración','');
 return op.id;
end $$;
revoke all on function public.reserve_operation_capacity(uuid,text),public.release_operation_capacity(uuid,text),public.capacity_on_operation_insert(),public.capacity_on_operation_phase(),public.award_offer(uuid),public.transition_operation(uuid,text,text,text),public.simulate_guarantee(uuid),public.admin_release_capacity(uuid,text),public.admin_capacity_terminal_transition(uuid,text,text,text) from public;
grant execute on function public.award_offer(uuid),public.transition_operation(uuid,text,text,text),public.simulate_guarantee(uuid),public.admin_release_capacity(uuid,text),public.admin_capacity_terminal_transition(uuid,text,text,text) to authenticated;
