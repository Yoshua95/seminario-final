-- LOCAL DEMONSTRATION ONLY. Never loaded by the production repository.
insert into auth.users(id,email,raw_user_meta_data) values
 ('a0000000-0000-0000-0000-000000000001','operador@4pack.demo','{"full_name":"Martín Rivera"}'),
 ('a0000000-0000-0000-0000-000000000002','importador@4pack.demo','{"full_name":"Importaciones del Sur"}'),
 ('a0000000-0000-0000-0000-000000000003','admin@4pack.demo','{"full_name":"Mesa de Control 4PACK"}'),
 ('a0000000-0000-0000-0000-000000000004','competidor@4pack.demo','{"full_name":"Otro operador"}'),
 ('a0000000-0000-0000-0000-000000000005','pendiente@4pack.demo','{"full_name":"Operador pendiente"}'),
 ('a0000000-0000-0000-0000-000000000006','suspendido@4pack.demo','{"full_name":"Operador suspendido"}') on conflict(id) do nothing;
update public.profiles set role=case when id='a0000000-0000-0000-0000-000000000002' then 'importer'::public.user_role when id='a0000000-0000-0000-0000-000000000003' then 'admin'::public.user_role else 'operator'::public.user_role end;
insert into public.operator_profiles(user_id,company_name,tax_id,verification_status,trade_name,address,modes,routes,certifications,description) values
 ('a0000000-0000-0000-0000-000000000001','Marítima Rivera S.A.','30-71234567-8','approved','Rivera Logistics','Av. del Puerto 1240, Buenos Aires',array['sea','air'],'China → Argentina','IATA • Agente de transporte aduanero','Operador especializado en comercio internacional y consolidación de cargas.'),
 ('a0000000-0000-0000-0000-000000000004','Logística competidora','30-72345678-9','approved','','',array['air'],'China → Argentina','',''),
 ('a0000000-0000-0000-0000-000000000005','Empresa pendiente','30-73456789-0','pending','','','{}','','',''),
 ('a0000000-0000-0000-0000-000000000006','Empresa suspendida','30-74567890-1','suspended','','','{}','','','') on conflict(user_id) do nothing;
insert into public.cargo_requests(id,importer_id,public_code,title,description,origin,destination,category,weight_kg,volume_m3,fob_usd,preferred_mode,status,hazmat_review_required,msds_required,packages,units_description,required_documents,bidding_deadline) values
 ('b0000000-0000-0000-0000-000000009477','a0000000-0000-0000-0000-000000000002','LC-9477','Electrónica y Tecnología','Lote de 120 dispositivos móviles con baterías de iones de litio integradas de fábrica. Carga paletizada y retractilada.','Depósito CSSBuy (Shenzhen, China)','Buenos Aires, AR (Ezeiza)','Electrónica y Tecnología',96,2.18,14400,'air','open',true,true,12,'12 cajas (Smartphones)',array['MSDS','UN38.3'],now()+interval '10 days'),
 ('b0000000-0000-0000-0000-000000008211','a0000000-0000-0000-0000-000000000002','LC-8211','Indumentaria y Textil','Prendas de abrigo y camperas deportivas de poliéster. Sin requerimientos especiales de temperatura.','Depósito Hangzhou Hub (China)','Puerto de Buenos Aires (Terminal 4)','Indumentaria y Textil',240,4.5,8000,'sea','open',false,false,20,'20 bultos prensados',array['Packing list'],now()+interval '14 days'),
 ('b0000000-0000-0000-0000-000000003104','a0000000-0000-0000-0000-000000000002','LC-3104','Maquinaria e Insumos Industriales','Módulos de corte láser con celdas auxiliares de litio para respaldo de memoria.','Ningbo Free Trade Zone (China)','Puerto de Buenos Aires','Maquinaria e Insumos Industriales',1150,6.8,24000,'sea','open',true,true,1,'1 caja de madera',array['MSDS','Factura comercial'],now()+interval '7 days'),
 ('b0000000-0000-0000-0000-000000005512','a0000000-0000-0000-0000-000000000002','LC-5512','Accesorios y Repuestos','Repuestos mecánicos de precisión y rulemanes para instrumental de automatización.','Guangzhou Baiyun Cargo Hub (China)','Córdoba, Argentina','Accesorios y Repuestos',45,0.85,4200,'air','open',false,false,4,'4 cajas reforzadas',array['Packing list'],now()+interval '6 days'),
 ('b0000000-0000-0000-0000-000000006291','a0000000-0000-0000-0000-000000000002','LC-6291','Electrónica de Consumo','Equipos informáticos consolidados.','Shenzhen, China','Buenos Aires, Argentina','Electrónica',96,2.18,12000,'air','open',false,false,12,'12 cajas',array['Factura comercial'],now()+interval '10 days'),
 ('b0000000-0000-0000-0000-000000005521','a0000000-0000-0000-0000-000000000002','LC-5521','Indumentaria deportiva','Lote de prendas deportivas.','Hangzhou, China','Buenos Aires, Argentina','Indumentaria',240,4.5,5000,'sea','open',false,false,20,'20 bultos',array['Packing list'],now()+interval '10 days'),
 ('b0000000-0000-0000-0000-000000004912','a0000000-0000-0000-0000-000000000002','LC-4912','Repuestos Industriales','Repuestos para maquinaria.','Ningbo, China','Buenos Aires, Argentina','Repuestos',1150,6.8,18000,'sea','open',false,false,1,'1 caja de madera',array['Packing list'],now()+interval '10 days') on conflict(id) do nothing;
insert into public.offers(id,cargo_id,operator_id,mode,freight_usd,estimated_days,terms,documentation_terms,valid_until) values
 ('c0000000-0000-0000-0000-000000006291','b0000000-0000-0000-0000-000000006291','a0000000-0000-0000-0000-000000000001','air',1200,8,'Servicio puerta a puerta.','Factura comercial',now()+interval '10 days'),
 ('c0000000-0000-0000-0000-000000005521','b0000000-0000-0000-0000-000000005521','a0000000-0000-0000-0000-000000000001','sea',640,30,'Marítimo consolidado.','Packing list',now()+interval '10 days'),
 ('c0000000-0000-0000-0000-000000004912','b0000000-0000-0000-0000-000000004912','a0000000-0000-0000-0000-000000000001','sea',2400,35,'Marítimo FCL.','Packing list',now()+interval '10 days'),
 ('c0000000-0000-0000-0000-000000009477','b0000000-0000-0000-0000-000000009477','a0000000-0000-0000-0000-000000000004','air',1500,7,'Oferta privada de competidor.','MSDS',now()+interval '10 days') on conflict(id) do nothing;
update public.offers set status='accepted' where id in ('c0000000-0000-0000-0000-000000006291','c0000000-0000-0000-0000-000000005521','c0000000-0000-0000-0000-000000004912');
insert into public.operations(id,cargo_id,accepted_offer_id,importer_id,operator_id,status,phase,awarded_at) values
 ('d0000000-0000-0000-0000-000000006291','b0000000-0000-0000-0000-000000006291','c0000000-0000-0000-0000-000000006291','a0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001','customs','in_progress',now()-interval '8 days'),
 ('d0000000-0000-0000-0000-000000005521','b0000000-0000-0000-0000-000000005521','c0000000-0000-0000-0000-000000005521','a0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001','delivered','completed',now()-interval '35 days'),
 ('d0000000-0000-0000-0000-000000004912','b0000000-0000-0000-0000-000000004912','c0000000-0000-0000-0000-000000004912','a0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001','delivered','completed',now()-interval '50 days') on conflict(id) do nothing;
update public.cargo_requests c set status=o.status from public.operations o where o.cargo_id=c.id;
insert into public.payment_guarantees(operation_id,amount_usd,commission_usd,status) values
 ('d0000000-0000-0000-0000-000000006291',1200,30,'held_simulated'),
 ('d0000000-0000-0000-0000-000000005521',640,16,'released_simulated'),
 ('d0000000-0000-0000-0000-000000004912',2400,60,'released_simulated') on conflict(operation_id) do nothing;
insert into public.tracking_events(operation_id,status,title,event_type,description,location,created_by,occurred_at) values
 ('d0000000-0000-0000-0000-000000006291','awarded','Oferta adjudicada','Adjudicación','Contrato académico confirmado.','Buenos Aires','a0000000-0000-0000-0000-000000000002',now()-interval '8 days'),
 ('d0000000-0000-0000-0000-000000006291','in_transit','Despacho en origen','Despacho en origen','Carga consolidada y embarcada.','Shenzhen','a0000000-0000-0000-0000-000000000001',now()-interval '5 days'),
 ('d0000000-0000-0000-0000-000000006291','customs','Arribo a zona primaria aduanera','Aduana','Documentación en revisión.','Ezeiza','a0000000-0000-0000-0000-000000000001',now()-interval '1 day');
insert into public.messages(operation_id,sender_id,body) values
 ('d0000000-0000-0000-0000-000000006291','a0000000-0000-0000-0000-000000000002','Hola, ¿ya recibieron la documentación comercial?'),
 ('d0000000-0000-0000-0000-000000006291','a0000000-0000-0000-0000-000000000001','Sí, la factura y el packing list ya están validados. Estamos coordinando la liberación.');
insert into public.ratings(operation_id,author_id,recipient_id,score,comment) values
 ('d0000000-0000-0000-0000-000000005521','a0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001',5,'Excelente transit time y comunicación.'),
 ('d0000000-0000-0000-0000-000000004912','a0000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001',5,'Liberación sin demoras.');
update public.operator_profiles set completed_operations=2 where user_id='a0000000-0000-0000-0000-000000000001';
insert into public.ratings(operation_id,author_id,recipient_id,score,comment) values
 ('d0000000-0000-0000-0000-000000005521','a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',5,'Documentación completa y coordinación clara.'),
 ('d0000000-0000-0000-0000-000000004912','a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000002',5,'Entrega coordinada sin incidencias.');
insert into public.support_tickets(id,operator_id,operation_id,subject,category,status) values
 ('e0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000006291','Documentación MSDS para la carga','Documentación','in_progress');
insert into public.support_messages(ticket_id,sender_id,body) values
 ('e0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000003','Hola Marítima Rivera S.A., ¿en qué podemos asistirte con la documentación aduanera?'),
 ('e0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','¿La declaración MSDS debe adjuntarse antes de la firma del contrato?');
