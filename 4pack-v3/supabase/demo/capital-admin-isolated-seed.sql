-- FICTIONAL LOCAL-ONLY fixtures. Never apply to a hosted project.
insert into auth.users(id,email,raw_user_meta_data) values('a0000000-0000-0000-0000-000000000008','importador.nuevo@4pack.demo','{"full_name":"Importador nuevo de ensayo"}') on conflict(id) do nothing;
insert into public.documents(id,operator_id,uploaded_by,kind,document_type,storage_path,original_name,mime_type,validation_status)
values('f2000000-0000-0000-0000-000000000007','a0000000-0000-0000-0000-000000000007','a0000000-0000-0000-0000-000000000007','other','Credencial del operador','a0000000-0000-0000-0000-000000000007/credencial-ensayo.pdf','Credencial ficticia del ensayo.pdf','application/pdf','approved') on conflict(id) do nothing;
