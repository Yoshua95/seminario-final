// Disposable loopback PostgreSQL only. Never accepts a remote connection URL.
import{spawn}from'node:child_process';import{readFile,mkdir,writeFile}from'node:fs/promises';import{randomUUID}from'node:crypto';import path from'node:path';import assert from'node:assert/strict';
const bin=process.env.FOURPACK_TEST_PG_BIN;if(!bin)throw Error('FOURPACK_TEST_PG_BIN required');
const port='55415',database='fourpack_capital_'+Date.now();
function sql(text,db=database){return new Promise(resolve=>{const p=spawn(path.join(bin,'psql.exe'),['-X','-q','-t','-A','-h','127.0.0.1','-p',port,'-U','postgres','-d',db,'-v','ON_ERROR_STOP=1'],{windowsHide:true,stdio:['pipe','pipe','pipe']});let stdout='',stderr='';p.stdout.on('data',v=>stdout+=v);p.stderr.on('data',v=>stderr+=v);p.on('close',code=>resolve({code,stdout,stderr}));p.stdin.end(text);});}
async function run(text,db){const r=await sql(text,db);if(r.code!==0)throw Error(r.stderr);return r.stdout;}
await run('create database '+database,'postgres');
const assets=JSON.parse(await readFile(new URL('../apps/web/src/features/operator/demo-sql.json',import.meta.url),'utf8'));
await run(assets.bootstrap.replace(/create role (authenticated|anon) nologin;/g,(_,r)=>`do $$ begin if not exists(select 1 from pg_roles where rolname='${r}') then create role ${r} nologin;end if;end $$;`));
for(const[name,source]of Object.entries(assets.migrations))if(name<'0020')await run(source);
await run(assets.seed);for(const[name,source]of Object.entries(assets.migrations))if(name>='0020')await run(source);
for(const name of ['20261119024020_ars_only_new_contracts.sql','20261119180708_offer_capital_reservations.sql'])await run(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
const admin='a0000000-0000-0000-0000-000000000003',importer='a0000000-0000-0000-0000-000000000002';
const{quoteFixture}=await import('../tests/quote-fixture.mjs');
async function trial(isolation){const o=randomUUID(),c1=randomUUID(),c2=randomUUID();const cfg={currency:'ARS',max_operations:'0',max_weight_kg:'',max_volume_m3:'',max_per_operation:'999999',max_exposure:'999999',declared_working_capital:'100',approved_working_capital:'100',status:'active',valid_from:'2020-01-01',reason:'Prueba local de concurrencia'};
await run(`insert into auth.users(id,email)values('${o}','${o}@capital.test');update public.profiles set role='operator' where id='${o}';insert into public.operator_profiles(user_id,company_name,tax_id,verification_status)values('${o}','Concurrente','${o}','approved');select set_config('request.jwt.claim.sub','${admin}',false);select public.configure_operator_capacity('${o}','${JSON.stringify(cfg)}');`);
for(const c of[c1,c2])await run(`insert into public.cargo_requests(id,importer_id,title,description,origin,destination,category,weight_kg,volume_m3,fob_usd,status,bidding_deadline)values('${c}','${importer}','Concurrente','Ensayo','A','B','Otro',1,1,1100,'open',now()+interval '1 day');`);
const query=(c,delay)=>`begin isolation level ${isolation};set local role authenticated;select set_config('request.jwt.claim.sub','${o}',true);select revision from public.capital_market_mutex;select pg_sleep(${delay});select public.quote_command('submit','${JSON.stringify({cargo_id:c,quote:quoteFixture({currency:'ARS',amount:'250000',working_capital_amount:'60'})})}');select pg_sleep(0.5);commit;`;
// No read grant for the private mutex: establish the RR snapshot on own profile.
const first=sql(query(c1,0).replace('select revision from public.capital_market_mutex',"select id from public.profiles where id=auth.uid()"));await new Promise(r=>setTimeout(r,100));const second=sql(query(c2,0.15).replace('select revision from public.capital_market_mutex',"select id from public.profiles where id=auth.uid()"));const results=await Promise.all([first,second]);
assert.equal(results.filter(r=>r.code===0).length,1);const failed=results.find(r=>r.code!==0);assert.match(failed.stderr,/Capital insuficiente|could not serialize access/);
const committed=JSON.parse((await run(`select public.capital_commitment('${o}')`)).trim());assert.equal(committed.committed,60);return{isolation,connections:2,successful:1,rejected:1,error:failed.stderr.trim(),committed:committed.committed};}
const trials=[];for(const level of['READ COMMITTED','REPEATABLE READ'])trials.push(await trial(level));
await mkdir('.4pack-demo/capital-admin',{recursive:true});const result={database,host:'127.0.0.1',port:Number(port),postgres:(await run('select version()')).trim(),trials};await writeFile('.4pack-demo/capital-admin/postgres-concurrency.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
