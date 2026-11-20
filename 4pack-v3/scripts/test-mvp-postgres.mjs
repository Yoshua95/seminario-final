// Isolated local PostgreSQL only; never accepts a Supabase URL or credentials.
import {spawn}from'node:child_process';import{readFile,mkdir,writeFile}from'node:fs/promises';import{randomUUID}from'node:crypto';import path from'node:path';import assert from'node:assert/strict';
const bin=process.env.FOURPACK_TEST_PG_BIN;if(!bin)throw Error('FOURPACK_TEST_PG_BIN required');
const database='fourpack_mvp_'+Date.now(),port='55415';
function sql(text,db=database){return new Promise(resolve=>{const p=spawn(path.join(bin,'psql.exe'),['-X','-q','-t','-A','-h','127.0.0.1','-p',port,'-U','postgres','-d',db,'-v','ON_ERROR_STOP=1'],{windowsHide:true,stdio:['pipe','pipe','pipe']});let stdout='',stderr='';p.stdout.on('data',v=>stdout+=v);p.stderr.on('data',v=>stderr+=v);p.on('close',code=>resolve({code,stdout,stderr}));p.stdin.end('set statement_timeout=15000;\n'+text);});}
async function run(text,db){const r=await sql(text,db);if(r.code!==0)throw Error(r.stderr);return r.stdout.trim();}
await run('create database '+database,'postgres');
const assets=JSON.parse(await readFile(new URL('../apps/web/src/features/operator/demo-sql.json',import.meta.url),'utf8'));
await run(assets.bootstrap.replace(/create role (authenticated|anon|service_role) nologin;/g,(_,r)=>`do $$ begin if not exists(select 1 from pg_roles where rolname='${r}') then create role ${r} nologin;end if;end $$;`));
for(const[name,source]of Object.entries(assets.migrations))if(name<'0020')await run(source);
await run(assets.seed);for(const[name,source]of Object.entries(assets.migrations))if(name>='0020')await run(source);
const additions=['20261118203109_mp_test_argentina_sandbox_url.sql','20261119051337_mp_linked_test_payment_evidence.sql','20261119140102_mp_registered_test_preference_evidence.sql','20261119024020_ars_only_new_contracts.sql','20261119180708_offer_capital_reservations.sql','20261119181203_capital_requests_admin_workbench.sql','20261119221524_capital_profile_consistency.sql','20261119225500_accept_offer_test_checkout.sql','20261120135235_support_message_participant_guard.sql','20261120135605_mvp_nonfinancial_marketplace.sql','20261120142007_mvp_test_delivery_protection.sql','20261120143457_mvp_registered_provider_binding.sql'];
for(const name of additions)await run(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
await run('alter table auth.users add column if not exists email_confirmed_at timestamptz default now()');
const operator='a0000000-0000-0000-0000-000000000001',competitor='a0000000-0000-0000-0000-000000000004',importer='a0000000-0000-0000-0000-000000000002',admin='a0000000-0000-0000-0000-000000000003';
const actor=(id,text)=>`begin;set local role authenticated;select set_config('request.jwt.claim.sub','${id}',true);${text};commit;`;
for(const[id,tax]of[[operator,'30712345671'],[competitor,'20123456786']]){
 await run(`update public.operator_profiles set verification_status='pending' where user_id='${id}';`);
 const payload={company_name:'Empresa concurrente ficticia',tax_id:tax,origin:'China',destination:'Argentina',services:['international_transport'],modes:['air'],document_ids:[]};
 await run(actor(id,`select public.submit_company_application('${randomUUID()}','${JSON.stringify(payload)}')`));
 await run(actor(admin,`select public.admin_review_company('${id}','approved','Verificacion ficticia para concurrencia','{"identity":true,"company":true,"documents":true}','${randomUUID()}')`));
}
async function offer(cargo,id){const quote={mode:'air',services:['international_transport'],scope:'Transporte de prueba',amount:'250000',currency:'ARS',included:['Transporte'],excluded:['Almacenamiento'],insurance:'No incluido',estimated_days:'8',valid_until:new Date(Date.now()+3600000).toISOString(),payment_terms:'Pago de prueba',required_documents:['Packing list'],responsibilities:'Operador transporta; importador documenta',observations:'Sin excepciones'};
const raw=await run(actor(id,`select 'OFFER:'||(public.quote_command('submit','${JSON.stringify({cargo_id:cargo,quote,submission_key:randomUUID()})}') ->> 'id')`));return raw.match(/OFFER:([a-f0-9-]+)/)[1];}
async function cargo(){const id=randomUUID();await run(`insert into public.cargo_requests(id,importer_id,title,description,origin,destination,category,weight_kg,volume_m3,fob_usd,status,bidding_deadline,preferred_mode)values('${id}','${importer}','Concurrencia MVP','Carga ficticia','China','Argentina','Otro',10,1,1100,'open',now()+interval '2 days','air')`);return id;}
async function trial(isolation,competing){
 const c=await cargo(),f=await offer(c,operator),f2=competing?await offer(c,competitor):f;
 const query=(offer,delay)=>`begin isolation level ${isolation};set local role authenticated;select set_config('request.jwt.claim.sub','${importer}',true);select id from public.profiles where id=auth.uid();select pg_sleep(${delay});select 'OP:'||public.award_offer('${offer}');select pg_sleep(0.3);commit;`;
 const first=sql(query(f,0));await new Promise(r=>setTimeout(r,40));const second=sql(query(f2,0.1));let rows=await Promise.all([first,second]);let retried=false;
 if(!competing&&rows.some(r=>r.code!==0&&/could not serialize access/.test(r.stderr))){retried=true;rows=await Promise.all(rows.map(r=>r.code===0?r:sql(query(f2,0))));}
 const successes=rows.filter(r=>r.code===0),failures=rows.filter(r=>r.code!==0);
 assert.equal(successes.length,competing?1:2);if(competing)assert.match(failures[0].stderr,/ya fue adjudicada/);
 const ids=successes.map(r=>r.stdout.match(/OP:([a-f0-9-]+)/)[1]);assert.equal(new Set(ids).size,1);
 const counts=JSON.parse(await run(`select json_build_object('operations',(select count(*) from public.operations where cargo_id='${c}'),'snapshots',(select count(*) from public.operation_contract_snapshots where operation_id='${ids[0]}'),'new_reservations',(select count(*) from public.operation_capacity_reservations where operation_id='${ids[0]}'))`));assert.deepEqual(counts,{operations:1,snapshots:1,new_reservations:0});
 return{isolation,competingOffers:competing,connections:2,successful:successes.length,rejected:failures.length,retriedSerialization:retried,operationId:ids[0],counts,rejection:failures[0]?.stderr.trim()??null};
}
const trials=[];trials.push(await trial('READ COMMITTED',false));trials.push(await trial('REPEATABLE READ',false));trials.push(await trial('READ COMMITTED',true));
await mkdir('.4pack-demo/mvp-concurrency',{recursive:true});const result={database,host:'127.0.0.1',port:Number(port),postgres:await run('select version()'),trials};await writeFile('.4pack-demo/mvp-concurrency/native.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
