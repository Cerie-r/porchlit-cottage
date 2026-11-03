import test from 'node:test';import assert from 'node:assert/strict';import {createServer} from '../server/index.mjs';
test('production service serves house, wardrobe, models and transfer; denies source and missing assets',async()=>{const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;try{for(const route of ['/','/body/','/transfer/','/models/resident-body.glb','/models/outfits-fit.json','/health']){const r=await fetch(base+route);assert.equal(r.status,200,route);}for(const route of ['/package.json','/.env','/assets/missing.js','/server/index.mjs'])assert.equal((await fetch(base+route)).status,404,route);assert.equal((await fetch(base+'/',{method:'POST'})).status,405);assert.equal((await fetch(base+'/',{method:'HEAD'})).headers.get('content-type'),'text/html; charset=utf-8');}finally{await new Promise(r=>server.close(r));}});

test('files outside /assets/ come back as not modified when the browser already has them', async () => {
  const server = createServer();
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const first = await fetch(base + '/models/outfits-fit.json');
    assert.equal(first.status, 200);
    assert.equal(first.headers.get('cache-control'), 'no-cache');
    const tag = first.headers.get('etag');
    assert.match(tag, /^W\/"/);
    await first.arrayBuffer();
    const again = await fetch(base + '/models/outfits-fit.json', {headers: {'If-None-Match': tag}});
    assert.equal(again.status, 304);
    assert.equal((await again.arrayBuffer()).byteLength, 0);
    const other = await fetch(base + '/models/outfits-fit.json', {headers: {'If-None-Match': 'W/"nope"'}});
    assert.equal(other.status, 200);
    await other.arrayBuffer();
  } finally {
    server.close();
    server.closeAllConnections?.();
  }
});

test('a page asked for over plain http goes over to https; behind Cloudflare, by the visitor\'s own scheme; never locally, nor the doors', async () => {
  const server = createServer();
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const {request} = await import('node:http');
  // fetch() won't send a Host of our own, so these go the old way.
  const ask = (route, headers) => new Promise((done, fail) => {
    const req = request({host: '127.0.0.1', port: server.address().port, path: route, headers}, res => { res.resume(); res.on('end', () => done({status: res.statusCode, location: res.headers.location})); });
    req.on('error', fail); req.end();
  });
  try {
    const moved = await ask('/?explore=woods', {Host: 'porchlit.party', 'X-Forwarded-Proto': 'http'});
    assert.equal(moved.status, 301);
    assert.equal(moved.location, 'https://porchlit.party/?explore=woods');
    assert.equal((await ask('/body/', {Host: 'porchlit.party', 'CF-Visitor': '{"scheme":"http"}', 'X-Forwarded-Proto': 'https'})).status, 301, 'the visitor came by http, whatever the hop after');
    assert.equal((await ask('/', {Host: 'porchlit.party', 'CF-Visitor': '{"scheme":"https"}', 'X-Forwarded-Proto': 'http'})).status, 200, 'Cloudflare reaching the server by http for someone on https: no loop');
    for (const headers of [{'X-Forwarded-Proto': 'https', Host: 'porchlit.party'}, {Host: 'localhost:3000', 'X-Forwarded-Proto': 'http'}, {Host: 'porchlit.party'}]) {
      assert.equal((await ask('/', headers)).status, 200, JSON.stringify(headers));
    }
    assert.notEqual((await ask('/health', {Host: 'porchlit.party', 'X-Forwarded-Proto': 'http'})).status, 301);
    assert.notEqual((await ask('/api/session', {Host: 'porchlit.party', 'X-Forwarded-Proto': 'http'})).status, 301, 'the people\'s door answers as it is');
    assert.notEqual((await ask('/', {Host: 'evil.example/x', 'X-Forwarded-Proto': 'http'})).status, 301, 'only a plain host name is sent on');
  } finally {
    server.close();
    server.closeAllConnections?.();
  }
});

test('the outing pages\' and the wardrobe\'s pictures are kept a day; models and the fit are asked about each time', async () => {
  const {readdir} = await import('node:fs/promises');
  const server = createServer();
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const woods = (await readdir(new URL('../dist/explore/woods/', import.meta.url))).find(f => f.endsWith('.webp'));
    const picture = await fetch(`${base}/explore/woods/${woods}`);
    assert.equal(picture.status, 200);
    assert.equal(picture.headers.get('cache-control'), 'public, max-age=86400');
    await picture.arrayBuffer();
    const card = await fetch(`${base}/wardrobe/outfit-dress.webp`);
    assert.equal(card.headers.get('cache-control'), 'public, max-age=86400');
    await card.arrayBuffer();
    for (const route of ['/models/outfits-fit.json', '/models/resident-body.glb', '/']) {
      const r = await fetch(base + route);
      assert.equal(r.headers.get('cache-control'), 'no-cache', route);
      await r.arrayBuffer();
    }
  } finally {
    server.close();
    server.closeAllConnections?.();
  }
});
