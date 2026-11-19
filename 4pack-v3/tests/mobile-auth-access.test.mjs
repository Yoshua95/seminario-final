import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../apps/mobile/lib/auth-access.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { resolveImporterAccess, createImporterAccessGuard, boundedAuthStorage } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pending = () => new Promise(() => {});
function fake({ session = { user: { id: 'importer' } }, role = 'importer', sessionError = null, userError = null, profileError = null } = {}) {
  const calls = []; let listener;
  const client = {
    auth: {
      getSession: async () => { calls.push('session'); return { data: { session }, error: sessionError }; },
      getUser: async () => { calls.push('user'); return { data: { user: session?.user }, error: userError }; },
      onAuthStateChange: callback => { listener = callback; return { data: { subscription: { unsubscribe() { listener = undefined; } } } }; },
      signOut: async () => { listener?.('SIGNED_OUT', null); return { error: null }; },
    },
    from: table => { assert.equal(table, 'profiles'); return { select: () => ({ eq: (_key, id) => { assert.equal(id, 'importer'); return { single: async () => { calls.push('profile'); return { data: role ? { role } : null, error: profileError }; } }; } }) }; },
  };
  return { client, calls, emit: (event, value) => listener?.(event, value) };
}
test('instalación sin sesión llega al login sin consultar usuario ni perfil', async () => {
  const f = fake({ session: null }); assert.deepEqual(await resolveImporterAccess(f.client), { status: 'signedOut' }); assert.deepEqual(f.calls, ['session']);
});
test('sesión persistida exige usuario remoto y perfil importador', async () => {
  const f = fake(); assert.deepEqual(await resolveImporterAccess(f.client), { status: 'allowed' }); assert.deepEqual(f.calls, ['session', 'user', 'profile']);
});
for (const role of ['operator', 'admin']) test(`rol ${role} conserva el bloqueo móvil`, async () => {
  assert.deepEqual(await resolveImporterAccess(fake({ role }).client), { status: 'blocked' });
});
test('fallo de storage no se interpreta como sesión ausente', async () => {
  assert.deepEqual(await resolveImporterAccess(fake({ session: null, sessionError: new Error('storage') }).client), { status: 'error', stage: 'session' });
});
test('red caída al validar usuario impide acceso y permite reintento', async () => {
  const f = fake({ userError: { status: 0 } }); assert.deepEqual(await resolveImporterAccess(f.client), { status: 'error', stage: 'user' });
  f.client.auth.getUser = async () => ({ data: { user: { id: 'importer' } }, error: null });
  assert.equal((await resolveImporterAccess(f.client)).status, 'allowed');
});
test('sesión rechazada por Auth vuelve al login', async () => {
  assert.equal((await resolveImporterAccess(fake({ userError: { status: 401 } }).client)).status, 'signedOut');
});
for (const options of [{ role: null }, { profileError: { code: '42501' } }]) test('perfil ausente o consulta fallida nunca concede acceso', async () => {
  assert.deepEqual(await resolveImporterAccess(fake(options).client), { status: 'error', stage: 'profile' });
});
for (const stage of ['session', 'user', 'profile']) test(`espera indefinida de ${stage} termina con error recuperable`, async () => {
  const f = fake();
  if (stage === 'session') f.client.auth.getSession = pending;
  if (stage === 'user') f.client.auth.getUser = pending;
  if (stage === 'profile') f.client.from = () => ({ select: () => ({ eq: () => ({ single: pending }) }) });
  assert.deepEqual(await resolveImporterAccess(f.client, 10), { status: 'error', stage });
});
test('INITIAL_SESSION nula no dispara getUser y cancela resultado anterior', async () => {
  const f = fake(); let resolve; f.client.auth.getSession = () => new Promise(r => { resolve = r; });
  const states = []; const guard = createImporterAccessGuard(f.client, s => states.push(s), 100);
  f.client.auth.getSession = async () => ({ data: { session: null }, error: null });
  f.emit('INITIAL_SESSION', null);
  resolve({ data: { session: { user: { id: 'importer' } } }, error: null }); await sleep(10);
  assert.equal(states.at(-1).status, 'signedOut'); guard.stop();
});
test('callback Auth se difiere y cierre de sesión invalida validación pendiente', async () => {
  const f = fake(); const states = []; const guard = createImporterAccessGuard(f.client, s => states.push(s), 100);
  await sleep(5); f.calls.length = 0;
  f.emit('SIGNED_IN', { user: { id: 'importer' } }); assert.deepEqual(f.calls, []);
  f.emit('SIGNED_OUT', null); await sleep(5); assert.equal(states.at(-1).status, 'signedOut'); assert.deepEqual(f.calls, []);
  await guard.signOut(); assert.equal(states.at(-1).status, 'signedOut'); guard.stop();
});
test('storage acotado conserva valores y rechaza lecturas/escrituras colgadas', async () => {
  const values = new Map(); const storage = boundedAuthStorage({ getItem: async k => values.get(k) ?? null, setItem: async (k,v) => {values.set(k,v);}, removeItem: async k => {values.delete(k);} });
  await storage.setItem('session', 'fixture'); assert.equal(await storage.getItem('session'), 'fixture'); await storage.removeItem('session'); assert.equal(await storage.getItem('session'), null);
  const stuck = boundedAuthStorage({ getItem: pending, setItem: pending, removeItem: pending }, 10);
  await assert.rejects(stuck.getItem('session'), /storage/); await assert.rejects(stuck.setItem('session', 'fixture'), /storage/); await assert.rejects(stuck.removeItem('session'), /storage/);
});
test('INITIAL_SESSION nula con error de storage mantiene error recuperable', async () => {
  const f = fake({session:null, sessionError:{code:'STORAGE_ERROR'}}); const states=[];
  const guard=createImporterAccessGuard(f.client,s=>states.push(s),100);
  f.emit('INITIAL_SESSION',null);await sleep(10);
  assert.deepEqual(states.at(-1),{status:'error',stage:'session'});guard.stop();
});
test('usuario remoto distinto de la sesión nunca carga perfil ni obtiene acceso', async () => {
  const f=fake();f.client.auth.getUser=async()=>({data:{user:{id:'another-user'}},error:null});
  assert.deepEqual(await resolveImporterAccess(f.client),{status:'error',stage:'user'});assert.ok(!f.calls.includes('profile'));
});
test('fallo transitorio de perfil se recupera con la misma sesión', async () => {
  const f=fake({profileError:{code:'NETWORK_ERROR'}});const states=[];const guard=createImporterAccessGuard(f.client,s=>states.push(s),100);
  await sleep(5);assert.equal(states.at(-1).status,'error');
  f.client.from=fake().client.from;await guard.retry();assert.equal(states.at(-1).status,'allowed');guard.stop();
});
test('un guard desmontado descarta respuestas tardías', async () => {
  const f=fake();let finish;f.client.auth.getUser=()=>new Promise(r=>{finish=r;});
  const states=[];const guard=createImporterAccessGuard(f.client,s=>states.push(s),100);await sleep(5);guard.stop();const count=states.length;
  finish({data:{user:{id:'importer'}},error:null});await sleep(5);assert.equal(states.length,count);
});
