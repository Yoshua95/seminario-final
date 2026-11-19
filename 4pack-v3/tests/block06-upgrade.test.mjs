import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {asUser} from '../scripts/local-database.mjs';
const files=(await readdir('supabase/migrations')).filter(x=>x.endsWith('.sql')).sort();
const sql=async f=>(await readFile('supabase/migrations/'+f,'utf8')).replace(/create extension if not exists "pgcrypto";/i,'');
const importer='10000000-0000-4000-8000-000000000001', operator='10000000-0000-4000-8000-000000000002',admin='10000000-0000-4000-8000-000000000003';
for(const [status,phase] of [['awarded','created'],['in_transit','in_progress'],['customs','in_progress'],['delivered','completed'],['cancelled','cancelled']]){
test(`adopcion 0008: historica ${status} conserva identidades/datos y HAZMAT vuelve a borrador`,async()=>{
 const db=new PGlite();await db.waitReady;
 try{
  await db.exec(await readFile('supabase/demo/bootstrap.sql','utf8'));
  await db.exec(`do $$ begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if; end $$; alter default privileges in schema public grant truncate,references,trigger,maintain on tables to anon,authenticated;`);
  for(const f of files.filter(f=>f<'0009'))await db.exec(await sql(f));
  if(status==='awarded') await db.exec(await readFile('docs/informes/bloque-06-supabase-integracion/03-dudas-y-preflight-solo-lectura.sql','utf8'));
  for(const [id,role] of [[importer,'importer'],[operator,'operator'],[admin,'admin']])await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",[id,role+'@example.test',JSON.stringify({role,full_name:role})]);
  await db.query("update profiles set role='operator' where id=$1",[operator]);
  await db.query("update profiles set role='admin' where id=$1",[admin]);
  await db.query("insert into operator_profiles(user_id,company_name,tax_id,verification_status) values($1,'Operador ficticio','FICTICIO','approved')",[operator]);
  const cargo=(await db.query("insert into cargo_requests(importer_id,title,description,origin,destination,category,weight_kg,volume_m3,fob_usd,status) values($1,'Ropa','Textiles','Origen','Destino','Textiles',10,1,100,'open') returning id",[importer])).rows[0].id;
  const hazmat=(await db.query("insert into cargo_requests(importer_id,title,description,origin,destination,category,weight_kg,volume_m3,fob_usd,status,msds_required) values($1,'Baterias de litio','Litio','Origen','Destino','Baterias',10,1,100,'open',true) returning id",[importer])).rows[0].id;
  const offer=(await db.query("insert into offers(cargo_id,operator_id,mode,freight_usd,estimated_days,terms,valid_until) values($1,$2,'sea',100,20,'Condiciones',now()+interval '10 days') returning id",[cargo,operator])).rows[0].id;
  const op=(await asUser(db,importer,'select award_offer($1) id',[offer])).rows[0].id;
  await db.query('update operations set status=$2::cargo_status where id=$1',[op,status]);
  if(status==='in_transit') await db.query("update payment_guarantees set status='held_simulated' where operation_id=$1",[op]);
  const before=(await db.query('select id,operation_id,amount_usd,commission_usd,status from payment_guarantees')).rows;
  // Baseline is adopted, not replayed. Enum 0009 commits independently.
  await db.exec(await sql(files.find(f=>f.startsWith('0009'))));
  for(const f of files.filter(f=>f>='0010'))await db.exec(await sql(f));
  assert.equal((await db.query('select count(*)::int n from auth.users')).rows[0].n,3);
  assert.deepEqual((await db.query('select id,operation_id,amount_usd,commission_usd,status from payment_guarantees')).rows,before);
  assert.equal((await db.query('select phase from operations where id=$1',[op])).rows[0].phase,phase);
  assert.equal((await db.query('select status from cargo_requests where id=$1',[hazmat])).rows[0].status,'draft');
  assert.deepEqual((await db.query('select state from operation_capacity_reservations where operation_id=$1',[op])).rows.map(x=>x.state),['completed','cancelled'].includes(phase)?[]:['requires_review']);
  for(const [table,count] of [['profiles',3],['cargo_requests',2],['offers',1],['operations',1],['payment_guarantees',1],['documents',0],['document_objects',0],['wallet_movements',0]])assert.equal((await db.query(`select count(*)::int n from ${table}`)).rows[0].n,count,table);
  assert.equal((await db.query("select count(*)::int n from pg_policies where policyname='importers manage own cargo'")).rows[0].n,0);
  for(const role of ['anon','authenticated']){
   assert.equal((await db.query("select count(*)::int n from pg_tables where schemaname='public' and (has_table_privilege($1,quote_ident(schemaname)||'.'||quote_ident(tablename),'TRUNCATE') or has_table_privilege($1,quote_ident(schemaname)||'.'||quote_ident(tablename),'TRIGGER') or has_table_privilege($1,quote_ident(schemaname)||'.'||quote_ident(tablename),'REFERENCES'))",[role])).rows[0].n,0);
   await assert.rejects(db.transaction(async tx=>{await tx.exec(`set local role ${role}`);await tx.exec('truncate cargo_requests cascade');}),/permission denied/);
  }
  await db.exec('create table public.acl_future_probe(id int)');
  assert.equal((await db.query("select has_table_privilege('authenticated','acl_future_probe','TRUNCATE') p")).rows[0].p,false);
  await db.exec('create schema future_other_schema; create table future_other_schema.probe(id int)');
  for(const role of ['anon','authenticated']) for(const privilege of ['TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'])
   assert.equal((await db.query('select has_table_privilege($1,$2,$3) p',[role,'future_other_schema.probe',privilege])).rows[0].p,false);
  assert.equal((await db.query("select count(*)::int n from profiles where (id=$1 and role='importer') or (id=$2 and role='operator') or (id=$3 and role='admin')",[importer,operator,admin])).rows[0].n,3);
  assert.equal((await asUser(db,importer,'select id from cargo_requests where id=$1',[cargo])).rows.length,1);
  assert.equal((await asUser(db,operator,'select id from cargo_requests where id=$1',[hazmat])).rows.length,0);
  const draft=(await asUser(db,importer,"select prepare_cargo_publication(gen_random_uuid(),$1::jsonb) id",[JSON.stringify({title:'Ropa',description:'Textiles',origin:'Origen',destination:'Destino',category:'Textiles',weight_kg:10,volume_m3:1,fob_usd:100,preferred_mode:'sea'})])).rows[0].id;
  assert.equal((await asUser(db,importer,"update cargo_requests set title='Ropa actualizada' where id=$1 returning id",[draft])).rows.length,1);
  await asUser(db,importer,'select publish_cargo($1)',[draft]);
  assert.equal((await asUser(db,importer,"update cargo_requests set status='cancelled' where id=$1 returning id",[cargo])).rows.length,0);
  assert.equal((await asUser(db,importer,'delete from cargo_requests where id=$1 returning id',[cargo])).rows.length,0);
  await assert.rejects(asUser(db,importer,"update operations set phase='completed' where id=$1",[op]));
  await assert.rejects(asUser(db,importer,"update profiles set role='admin' where id=$1",[importer]));
  await assert.rejects(asUser(db,importer,"insert into documents(cargo_id,uploaded_by,kind,storage_path,original_name,mime_type) values($1,$2,'msds','fake.pdf','fake.pdf','application/pdf')",[hazmat,importer]));
 }finally{await db.close();}
});}

test('hardening refuses inherited dangerous grants and rolls back policy removal',async()=>{
 const db=new PGlite();await db.waitReady;
 try{
  await db.exec(await readFile('supabase/demo/bootstrap.sql','utf8'));
  await db.exec("do $$ begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if; end $$; create role unsafe_parent nologin; grant unsafe_parent to authenticated;");
  for(const f of files.filter(f=>f.startsWith('00')))await db.exec(await sql(f));
  await db.exec('grant truncate on cargo_requests to unsafe_parent');
  await assert.rejects(db.exec(await sql("20261117172922_client_privileges_and_cargo_policy.sql")),/Unsafe effective/);
  await db.exec('rollback');
  assert.equal((await db.query("select count(*)::int n from pg_policies where policyname='importers manage own cargo'")).rows[0].n,1);
  await db.exec('revoke truncate on cargo_requests from unsafe_parent; alter default privileges grant truncate on tables to unsafe_parent');
  await assert.rejects(db.exec(await sql("20261117172922_client_privileges_and_cargo_policy.sql")),/Unsafe inherited\/global default/);
  await db.exec('rollback');
 }finally{await db.close();}
});

test('postgres without superuser or authority over supabase_admin hardens only its public defaults',async()=>{
 const db=new PGlite();await db.waitReady;
 try{
  assert.equal((await db.query('select current_user u')).rows[0].u,'postgres');
  await db.exec(`create role local_harness superuser nologin;
   set session authorization local_harness;
   alter role postgres rename to bootstrap_superuser;
   create role postgres nologin;
   grant usage,create on schema public to postgres;
   create role anon nologin; create role authenticated nologin;
   create role service_role nologin bypassrls; create role supabase_admin nologin;
   create table public.cargo_requests(id int); alter table public.cargo_requests enable row level security;
   create policy "importers manage own cargo" on public.cargo_requests for all using(true);
   alter table public.cargo_requests owner to postgres;
   grant all on cargo_requests to authenticated,service_role;
   grant truncate,references,trigger,maintain on cargo_requests to anon;
   alter default privileges for role postgres in schema public grant all on tables to authenticated,service_role;
   alter default privileges for role postgres in schema public grant truncate,references,trigger,maintain on tables to anon;
   alter default privileges for role supabase_admin in schema public grant truncate,references,trigger,maintain on tables to anon,authenticated;
   alter default privileges for role postgres grant select on tables to service_role;
   set session authorization postgres;`);
  assert.equal((await db.query('select rolsuper from pg_roles where rolname=current_user')).rows[0].rolsuper,false);
  for(const mode of ['MEMBER','USAGE','SET']) assert.equal((await db.query("select pg_has_role(current_user,'supabase_admin',$1) p",[mode])).rows[0].p,false);
  const defaults=()=>db.query("select defaclrole::regrole::text creator,defaclnamespace,defaclacl::text acl from pg_default_acl where defaclrole='supabase_admin'::regrole or defaclnamespace=0 order by 1,2");
  const unchanged=(await defaults()).rows;
  const service=(await db.query("select privilege_type from information_schema.table_privileges where table_schema='public' and table_name='cargo_requests' and grantee='service_role' order by privilege_type")).rows;
  await db.exec(await sql("20261117172922_client_privileges_and_cargo_policy.sql"));
  assert.deepEqual((await defaults()).rows,unchanged,'managed and global defaults untouched');
  assert.deepEqual((await db.query("select privilege_type from information_schema.table_privileges where table_schema='public' and table_name='cargo_requests' and grantee='service_role' order by privilege_type")).rows,service);
  for(const privilege of ['SELECT','INSERT','UPDATE','DELETE'])assert.equal((await db.query('select has_table_privilege($1,$2,$3) p',['authenticated','cargo_requests',privilege])).rows[0].p,true);
  for(const role of ['anon','authenticated'])for(const privilege of ['TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'])assert.equal((await db.query('select has_table_privilege($1,$2,$3) p',[role,'cargo_requests',privilege])).rows[0].p,false);
  assert.equal((await db.query("select count(*)::int n from pg_policies where policyname='importers manage own cargo'")).rows[0].n,0);
  await db.exec('create table public.future_postgres_table(id int)');
  for(const role of ['anon','authenticated'])for(const privilege of ['TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'])assert.equal((await db.query('select has_table_privilege($1,$2,$3) p',[role,'future_postgres_table',privilege])).rows[0].p,false);
  // Restricted creator is inspected, never assumed via SET ROLE or modified.
  assert.equal((await db.query("select count(*)::int n from pg_default_acl d cross join lateral aclexplode(d.defaclacl) a where d.defaclrole='supabase_admin'::regrole and a.privilege_type='TRUNCATE'")).rows[0].n,2);
 }finally{await db.close();}
});
