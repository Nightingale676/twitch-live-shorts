import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDashboard } from '../src/dashboard.js';
test('dashboard serves files, guards triggers, and keeps secrets private', async () => {
 const directory = await mkdtemp(join(tmpdir(), 'dashboard-test-'));
 let busy = false;
 const selections = [];
 const app = createDashboard({ changeRecording: async channel => { selections.push(channel); }, outputDirectory: directory, getStatus: () => ({ channel: 'example' }), createClip: () => { if(busy) throw new Error('Busy'); busy=true; } });
 const server = app.listen(0, '127.0.0.1');
 await new Promise(resolve => server.once('listening', resolve));
 const base = `http://127.0.0.1:${server.address().port}`;
 try {
  assert.match(await (await fetch(base)).text(), /Stream clips/);
  assert.equal((await (await fetch(base+'/api/status')).json()).channel, 'example');
  assert.deepEqual(await (await fetch(base+'/api/clips')).json(), []);
  await writeFile(join(directory,'short-abcd.mp4'),'video');
  await writeFile(join(directory,'short-abcd.mp4.json'), JSON.stringify({ title: 'Night race finish' }));
  const clips = await (await fetch(base+'/api/clips')).json();
  assert.equal(clips[0].bytes,5);
  assert.equal(clips[0].title, 'Night race finish');
  assert.equal(await (await fetch(base+clips[0].url)).text(),'video');
  assert.equal((await fetch(base+'/.env')).status,404);
  assert.equal((await fetch(base+'/api/clips',{method:'POST',headers:{Origin:'https://untrusted.example'}})).status,403);
  assert.equal(busy,false);
  const record = (channel, origin) => fetch(base+'/api/recording', {method:'POST', headers:{'Content-Type':'application/json', ...(origin ? {Origin:origin} : {})}, body:JSON.stringify({channel})});
  assert.equal((await record('creator_one')).status,200);
  assert.equal((await record('creator_two')).status,200);
  assert.equal((await record(null)).status,200);
  assert.equal((await record('https://twitch.tv/test')).status,400);
  assert.equal((await record('test','https://untrusted.example')).status,403);
  assert.deepEqual(selections,['creator_one','creator_two',null]);
  assert.equal((await fetch(base+'/api/clips',{method:'POST'})).status,202);
  assert.equal((await fetch(base+'/api/clips',{method:'POST'})).status,409);
 } finally { await new Promise(resolve=>server.close(resolve)); await rm(directory,{recursive:true,force:true}); }
});

