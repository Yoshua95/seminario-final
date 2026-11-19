-- New commercial writes use ARS. Existing USD contracts/quotes/limits are not converted.
begin;
create function public.guard_new_ars_offer() returns trigger
language plpgsql set search_path=public as $$ begin
 if tg_op='INSERT' then
  if new.payment_currency is distinct from 'ARS' then raise exception 'Las nuevas ofertas deben cotizarse en ARS'; end if;
 elsif old.payment_currency<>'ARS' then
  if row(new.payment_currency,new.freight_usd,new.customs_usd,new.other_costs_usd,new.normalized_quote)
    is distinct from row(old.payment_currency,old.freight_usd,old.customs_usd,old.other_costs_usd,old.normalized_quote)
  then raise exception 'Los importes historicos conservan su moneda; crea una nueva revision en ARS'; end if;
 elsif new.payment_currency is distinct from 'ARS' then raise exception 'Las nuevas ofertas deben cotizarse en ARS'; end if;
 return new;
end $$;
create trigger new_ars_offer before insert or update on public.offers for each row execute function public.guard_new_ars_offer();

create function public.guard_new_ars_operation() returns trigger
language plpgsql set search_path=public as $$ begin
 if tg_op='INSERT' then
  if new.contract_currency is distinct from 'ARS' or not exists(select 1 from public.offers where id=new.accepted_offer_id and payment_currency='ARS')
  then raise exception 'Las nuevas adjudicaciones deben contratarse en ARS'; end if;
 elsif new.contract_currency is distinct from old.contract_currency then raise exception 'La moneda del contrato historico es inmutable'; end if;
 return new;
end $$;
create trigger new_ars_operation before insert or update of contract_currency on public.operations for each row execute function public.guard_new_ars_operation();

alter function public.award_offer(uuid) rename to award_offer_before_ars;
revoke all on function public.award_offer_before_ars(uuid) from public,anon,authenticated;
create function public.award_offer(target_offer_id uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare cur text; begin
 if auth.uid() is null or public.current_user_role()<>'importer' then raise exception 'Acceso de importador requerido'; end if;
 select f.payment_currency into cur from public.offers f join public.cargo_requests c on c.id=f.cargo_id where f.id=target_offer_id and c.importer_id=auth.uid();
 if not found then raise exception 'Oferta no autorizada'; end if;
 if not exists(select 1 from public.operations where accepted_offer_id=target_offer_id and importer_id=auth.uid()) and cur<>'ARS'
 then raise exception 'Las nuevas adjudicaciones deben contratarse en ARS'; end if;
 return public.award_offer_before_ars(target_offer_id);
end $$;
revoke all on function public.award_offer(uuid) from public,anon;
grant execute on function public.award_offer(uuid) to authenticated;

create function public.guard_new_ars_capacity() returns trigger
language plpgsql set search_path=public as $$ begin
 if tg_op='INSERT' and new.currency is distinct from 'ARS' then raise exception 'Los nuevos limites monetarios de Capacity deben estar en ARS'; end if;
 if tg_op='UPDATE' then
  if old.currency<>'ARS' and new is distinct from old then raise exception 'Los limites historicos conservan sus valores originales'; end if;
  if new.currency is distinct from old.currency then raise exception 'La moneda del limite es inmutable'; end if;
 end if;
 return new;
end $$;
create trigger new_ars_capacity before insert or update on public.operator_capacity_currency_limits for each row execute function public.guard_new_ars_capacity();

alter function public.quote_command(text,jsonb) rename to quote_command_before_ars;
revoke all on function public.quote_command_before_ars(text,jsonb) from public,anon,authenticated;
create function public.quote_command(command text,payload jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$ begin
 if command in ('save','submit','revise') and (
   payload#>>'{quote,currency}' is distinct from 'ARS'
   or coalesce(payload#>>'{quote,working_capital_currency}','ARS')<>'ARS'
 ) then raise exception 'Las nuevas ofertas y su capital de trabajo deben estar en ARS'; end if;
 return public.quote_command_before_ars(command,payload);
end $$;
revoke all on function public.quote_command(text,jsonb) from public,anon;
grant execute on function public.quote_command(text,jsonb) to authenticated;

alter function public.configure_operator_capacity(uuid,jsonb) rename to configure_operator_capacity_before_ars;
revoke all on function public.configure_operator_capacity_before_ars(uuid,jsonb) from public,anon,authenticated;
create function public.configure_operator_capacity(target_operator uuid,payload jsonb) returns void
language plpgsql security definer set search_path=public as $$ begin
 if payload->>'currency' is distinct from 'ARS' then raise exception 'Los nuevos limites monetarios de Capacity deben estar en ARS'; end if;
 perform public.configure_operator_capacity_before_ars(target_operator,payload);
end $$;
revoke all on function public.configure_operator_capacity(uuid,jsonb) from public,anon;
grant execute on function public.configure_operator_capacity(uuid,jsonb) to authenticated;
revoke all on function public.guard_new_ars_offer(),public.guard_new_ars_operation(),public.guard_new_ars_capacity() from public,anon,authenticated;
commit;
