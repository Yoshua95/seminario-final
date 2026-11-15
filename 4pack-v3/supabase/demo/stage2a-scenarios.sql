-- Explicit fictional commercial fixtures; never infer public content from legal records.
insert into public.operator_commercial_profiles(operator_id,public_id,trade_name,description,city,province,country,modes,specialties,coverage,categories,experience_years,published)
values
('a0000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000001','Rivera Logistics','Servicios logísticos de demostración.','Buenos Aires','Buenos Aires','Argentina',array['sea','air'],array['Electrónica'],array['China','Argentina'],array['Tecnología'],12,true),
('a0000000-0000-0000-0000-000000000004','e2000000-0000-0000-0000-000000000004','Horizonte Cargo','Operador nuevo de demostración.','Córdoba','Córdoba','Argentina',array['air'],array['Repuestos'],array['Brasil'],array['Industria'],null,true),
('a0000000-0000-0000-0000-000000000005','e2000000-0000-0000-0000-000000000005','Perfil pendiente demo','Preparación privada del perfil.',null,null,null,'{}','{}','{}','{}',null,true),
('a0000000-0000-0000-0000-000000000006','e2000000-0000-0000-0000-000000000006','Perfil suspendido demo','Referencia comercial de prueba.',null,null,null,'{}','{}','{}','{}',null,true)
on conflict(operator_id) do nothing;
