-- Registered sandbox preference evidence; no checkout creation and no historical data rewrite.
begin;
create or replace function public.record_mp_test_payment(actor uuid,target uuid,payment jsonb) returns void
language plpgsql security definer set search_path=public as $$
declare
 op public.operations; intent public.mp_test_checkouts; state text; updated_time timestamptz;
 linked boolean; evidence jsonb; classification text; key text;
begin
 select * into op from public.operations where id=target;
 if not found or actor is null or op.importer_id<>actor or op.payment_mode<>'mercado_pago_test' or op.contract_currency<>'ARS' then raise exception 'Operacion no autorizada'; end if;
 perform public.lock_operator_capacity(op.operator_id);
 perform 1 from public.operations where id=target for update;
 select * into intent from public.mp_test_checkouts where operation_id=target for update;
 if not found or payment->>'external_reference' is distinct from intent.external_reference::text
 or jsonb_typeof(payment->'live_mode') is distinct from 'boolean'
 or payment->>'currency_id' is distinct from 'ARS'
 or (payment->>'transaction_amount')::numeric is distinct from intent.amount
 or coalesce(payment->>'id','') !~ '^[0-9]+$' then raise exception 'Pago incompatible con el contrato de prueba'; end if;

 linked:=coalesce(payment->>'internal_classification'='test_accounts_linked_preference',false);
 if linked then
  evidence:=payment->'classification_evidence';
  if intent.preference_state<>'ready' or nullif(intent.preference_id,'') is null
  or intent.amount<=0 or intent.currency<>'ARS'
  or not exists(select 1 from public.mp_test_settings where singleton and enabled=false)
  or payment->>'collector_id' is distinct from '3858067934'
  or payment->>'payer_id' is distinct from '3858067936'
  or coalesce(payment->>'order_id','') !~ '^[0-9]+$'
  or jsonb_typeof(evidence) is distinct from 'object'
  or evidence->>'classification' is distinct from 'test_accounts_linked_preference'
  or evidence->>'project_ref' is distinct from 'umiracgmhjglqoftoljn'
  or evidence->>'operation_id' is distinct from target::text
  or evidence->>'payment_id' is distinct from payment->>'id'
  or evidence->>'preference_id' is distinct from intent.preference_id
  or evidence->>'order_id' is distinct from payment->>'order_id'
  or evidence->>'seller_id' is distinct from payment->>'collector_id'
  or evidence->>'buyer_id' is distinct from payment->>'payer_id'
  or evidence->>'external_reference' is distinct from intent.external_reference::text
  or evidence->>'currency' is distinct from 'ARS'
  or (evidence->>'amount')::numeric is distinct from intent.amount
  or evidence->'provider_live_mode' is distinct from payment->'live_mode'
  or evidence->'seller_test_user' is distinct from 'true'::jsonb
  or evidence->>'buyer_identity_source' is distinct from 'owner_supplied_test_account_id_confirmed_by_provider'
  or (evidence->>'checked_at')::timestamptz is null
  or (evidence->>'checked_at')::timestamptz not between now()-interval '5 minutes' and now()+interval '1 minute'
  then raise exception 'Evidencia de vinculo de prueba incompatible'; end if;
  foreach key in array array['registered_operation','registered_preference','registered_reference','registered_amount','payment_id','seller','seller_test_account','expected_buyer','reference','currency','amount','live_mode_boolean','order_id','order_payment','order_seller','order_buyer','order_preference','order_reference','order_amount','preference_id','preference_seller','preference_reference','preference_operation','preference_test_marker','preference_item'] loop
   if evidence->'checks'->key is distinct from 'true'::jsonb then raise exception 'Comprobacion de vinculo de prueba ausente o fallida'; end if;
  end loop;
  foreach key in array array['payment','order','preference','seller','buyer'] loop
   if coalesce(evidence->'provider_response_sha256'->>key,'') !~ '^[0-9a-f]{64}$' then raise exception 'Huella de evidencia del proveedor ausente'; end if;
  end loop;
  classification:='test_accounts_linked_preference';
 else
  if payment->'live_mode' is distinct from 'false'::jsonb then raise exception 'Pago incompatible con el contrato de prueba'; end if;
  classification:='provider_test_mode';
  evidence:=jsonb_build_object('source','provider_live_mode_false','provider_live_mode',false);
 end if;
 state:=payment->>'status'; updated_time:=(payment->>'date_last_updated')::timestamptz;
 if state is null or updated_time is null or state not in ('pending','approved','rejected','cancelled','refunded','charged_back') then raise exception 'Estado de pago no soportado'; end if;
 if exists(select 1 from public.mp_test_payments where provider_payment_id=payment->>'id' and operation_id<>target) then raise exception 'Pago vinculado a otra operacion'; end if;
 insert into public.mp_test_payments(provider_payment_id,operation_id,status,amount,currency,provider_updated_at,provider_live_mode,internal_classification,classification_evidence)
 values(payment->>'id',target,state,intent.amount,'ARS',updated_time,(payment->>'live_mode')::boolean,classification,evidence)
 on conflict(provider_payment_id) do update set status=excluded.status,provider_updated_at=excluded.provider_updated_at,checked_at=now(),provider_live_mode=excluded.provider_live_mode,internal_classification=excluded.internal_classification,classification_evidence=excluded.classification_evidence
 where mp_test_payments.operation_id=excluded.operation_id and mp_test_payments.provider_updated_at<=excluded.provider_updated_at;
 if exists(select 1 from public.mp_test_payments where operation_id=target and status='approved') then state:='approved';
 else select status into state from public.mp_test_payments where operation_id=target order by provider_updated_at desc,provider_payment_id desc limit 1; end if;
 update public.mp_test_checkouts set status=state,checked_at=now() where operation_id=target;
 -- Academic gate only: no Mercado Pago escrow/capture/release is performed.
 if state='approved' and op.phase='created' then
  update public.payment_guarantees set status='held_simulated',verified_by=actor,verified_at=now() where operation_id=target and status='pending';
 end if;
end $$;
revoke all on function public.record_mp_test_payment(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.record_mp_test_payment(uuid,uuid,jsonb) to service_role;
commit;
