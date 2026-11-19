-- FICTIONAL local/Preview evaluation only. Never deploy these limits to real accounts.
do $$ declare actor uuid:='a0000000-0000-0000-0000-000000000003'; target uuid; cur text; begin
 perform set_config('request.jwt.claim.sub',actor::text,true);
 if exists(select 1 from public.operation_capacity_reservations where operation_id='d0000000-0000-0000-0000-000000006291' and state='requires_review') then
  perform public.review_historical_capacity('d0000000-0000-0000-0000-000000006291',300,'Evaluación ficticia de capital para demostración');
 end if;
 foreach target in array array['a0000000-0000-0000-0000-000000000001'::uuid,'a0000000-0000-0000-0000-000000000004'::uuid] loop
  foreach cur in array array['USD','ARS'] loop
   if not exists(select 1 from public.operator_capacity_currency_limits where operator_id=target and currency=cur) then
    perform public.configure_operator_capacity(target,jsonb_build_object('currency',cur,'max_operations','100','max_weight_kg','100000','max_volume_m3','10000',
    'max_per_operation','100000','max_exposure','1000000','declared_working_capital','100000','approved_working_capital','100000','status','active','valid_from',now()-interval '1 day','reason','Límites exclusivamente ficticios de demostración'));
   end if;
  end loop;
 end loop;
end $$;
