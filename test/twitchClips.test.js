import test from 'node:test';
import assert from 'node:assert/strict';
import { TwitchClipsClient } from '../src/twitchClips.js';

test('discovers recent clips across categories and creators, paginating categories', async () => {
 const client = new TwitchClipsClient({});
 const calls = [];
 client.helix = async (path, params) => {
  calls.push({path, params});
  if (path === 'games/top') return {data: [{id: '1'}, {id: '2'}], pagination: {cursor: 'more-categories'}};
  return {data: [{id: params.game_id, url: 'https://clips.twitch.tv/test', broadcaster_name: `Creator ${params.game_id}`, view_count: Number(params.game_id)}]};
 };
 const result = await client.discover('category-page');
 assert.deepEqual(calls[0].params, {first: '5', after: 'category-page'});
 assert.equal(result.cursor, 'more-categories');
 assert.deepEqual(result.clips.map(clip => clip.broadcaster), ['Creator 2', 'Creator 1']);
 assert.ok(calls.slice(1).every(call => call.params.started_at && !call.params.broadcaster_id));
});

test('loads broadcaster clips with an app token and cursor without exposing credentials', async () => {
 const calls=[];
 const fetchImpl=async (url,options) => {
  calls.push({url:String(url),options});
  if(String(url).includes('oauth2/token'))return {ok:true,json:async()=>({access_token:'test-token',expires_in:3600})};
  if(String(url).includes('/users?'))return {ok:true,json:async()=>({data:[{id:'42'}]})};
  return {ok:true,json:async()=>({data:[{id:'Clip123',url:'https://clips.twitch.tv/Clip123',title:'Clutch win',created_at:'2026-11-01T00:00:00Z',thumbnail_url:'https://clips-media-assets.twitch.tv/test.jpg',game_id:'game7',view_count:50,duration:30}],pagination:{cursor:'next-page'}})};
 };
 const client=new TwitchClipsClient({clientId:'client-id',clientSecret:'secret-value',fetchImpl});
 const first=await client.clips('saatsumaa');
 const second=await client.clips('saatsumaa','cursor-one');
 assert.equal(first.clips[0].name,'twitch:Clip123');
 assert.equal(first.clips[0].gameId,'game7');
 assert.equal(first.cursor,'next-page');
 assert.equal(calls.filter(call=>call.url.includes('oauth2/token')).length,1);
 assert.equal(calls.filter(call=>call.url.includes('/users?')).length,1);
 assert.ok(calls.at(-1).url.includes('after=cursor-one'));
 assert.ok(!JSON.stringify(first).includes('secret-value'));
 assert.equal(calls.at(-1).options.headers.Authorization,'Bearer test-token');
});
