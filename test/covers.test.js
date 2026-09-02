const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const fsp = require('fs/promises');
const http = require('http');
const os = require('os');
const path = require('path');

const express = require('express');

const createCovers = require('../util/covers');
const coverRoutes = require('../routes/covers');

// Настоящий PNG 2x3: у него читаются размеры, как у настоящей обложки
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAADCAYAAABS3WWCAAAAEklEQVR4nGP8//8/AzJgYkAD' +
    'AB0DAgQ2NmxSAAAAAElFTkSuQmCC',
  'base64'
);

// Сервер-источник обложек: считает запросы, чтобы было видно, ходили в сеть или нет
function startOrigin() {
  let requests = 0;

  const server = http.createServer((req, res) => {
    requests += 1;

    if (req.url === '/cover.png' || req.url === '/moved-here.png') {
      res.writeHead(200, { 'content-type': 'image/png', 'content-length': PNG.length });
      res.end(PNG);
    } else if (req.url === '/huge.png') {
      const size = 20 * 1024 * 1024;
      res.writeHead(200, { 'content-type': 'image/png', 'content-length': String(size) });
      res.end(Buffer.alloc(size));
    } else if (req.url === '/not-image') {
      res.writeHead(200, { 'content-type': 'text/html' }).end('<h1>ошибка</h1>');
    } else if (req.url === '/redirect') {
      res.writeHead(302, { location: '/moved-here.png' }).end();
    } else {
      res.writeHead(500).end();
    }
  });

  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () =>
      resolve({
        server: server,
        base: `http://127.0.0.1:${server.address().port}`,
        count: () => requests,
        reset: () => (requests = 0)
      })
    );
  });
}

// Обложки раздаёт тот же роутер, что и приложение
async function startApp(covers) {
  const app = express();
  app.use(coverRoutes(covers));

  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));

  return { server: server, base: `http://127.0.0.1:${server.address().port}` };
}

async function setup(t, urls) {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'covers-test-'));
  const origin = await startOrigin();

  let sources = urls(origin.base);

  const covers = createCovers({
    dir: dir,
    sources: async () => sources,
    // Тестовый сервер поднят на 127.0.0.1 — без этого защита от хождения
    // во внутреннюю сеть его же и отсечёт
    allowPrivateAddresses: true
  });

  const app = await startApp(covers);

  t.after(async () => {
    origin.server.close();
    app.server.close();
    await fsp.rm(dir, { recursive: true, force: true });
  });

  return {
    dir: dir,
    origin: origin,
    covers: covers,
    get: hash => fetch(`${app.base}/covers/${hash}`),
    hashOf: url => covers.cover(url).src.split('/').pop(),
    setSources: value => (sources = value)
  };
}

test('скачивает обложку один раз, дальше отдаёт из кэша', async t => {
  const it = await setup(t, base => [`${base}/cover.png`]);
  const hash = it.hashOf(`${it.origin.base}/cover.png`);

  const first = await it.get(hash);

  assert.equal(first.status, 200);
  assert.equal(first.headers.get('content-type'), 'image/png');
  assert.equal(first.headers.get('cache-control'), 'public, max-age=31536000, immutable');
  assert.deepEqual(Buffer.from(await first.arrayBuffer()), PNG);
  assert.equal(it.origin.count(), 1);

  const second = await it.get(hash);

  assert.equal(second.status, 200);
  assert.equal(it.origin.count(), 1, 'второй раз в сеть ходить незачем');
  assert.ok(fs.existsSync(path.join(it.dir, hash)));
});

test('после загрузки шаблон получает размеры для width и height', async t => {
  const it = await setup(t, base => [`${base}/cover.png`]);
  const url = `${it.origin.base}/cover.png`;

  assert.deepEqual(it.covers.cover(url), {
    src: `/covers/${it.hashOf(url)}`,
    width: undefined,
    height: undefined
  });

  await it.get(it.hashOf(url));

  assert.deepEqual(it.covers.cover(url), {
    src: `/covers/${it.hashOf(url)}`,
    width: 2,
    height: 3
  });
});

test('ссылку не из базы не качает', async t => {
  const it = await setup(t, () => []);

  const response = await it.get(it.hashOf('http://example.com/чужое.png'));

  assert.equal(response.status, 404);
  assert.equal(it.origin.count(), 0);
});

test('перенаправление ведёт к картинке', async t => {
  const it = await setup(t, base => [`${base}/redirect`]);

  const response = await it.get(it.hashOf(`${it.origin.base}/redirect`));

  assert.equal(response.status, 200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), PNG);
});

test('слишком большой файл не читает целиком', async t => {
  const it = await setup(t, base => [`${base}/huge.png`]);

  const response = await it.get(it.hashOf(`${it.origin.base}/huge.png`));

  assert.equal(response.status, 502);
  assert.equal(fs.existsSync(path.join(it.dir, it.hashOf(`${it.origin.base}/huge.png`))), false);
});

test('не картинку не кэширует', async t => {
  const it = await setup(t, base => [`${base}/not-image`]);

  assert.equal((await it.get(it.hashOf(`${it.origin.base}/not-image`))).status, 502);
});

test('после неудачи выжидает, а не ходит в сеть на каждый запрос', async t => {
  const it = await setup(t, base => [`${base}/broken.png`]);
  const hash = it.hashOf(`${it.origin.base}/broken.png`);

  assert.equal((await it.get(hash)).status, 502);
  assert.equal(it.origin.count(), 1);

  assert.equal((await it.get(hash)).status, 502);
  assert.equal((await it.get(hash)).status, 502);
  assert.equal(it.origin.count(), 1, 'повторы не должны доходить до чужого сервера');
});

test('не пускает сервер на внутренний адрес', async t => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'covers-test-'));
  const origin = await startOrigin();
  // Тот же кэш, но уже с настоящей проверкой адреса
  const covers = createCovers({ dir: dir, sources: async () => [`${origin.base}/cover.png`] });
  const app = await startApp(covers);

  t.after(async () => {
    origin.server.close();
    app.server.close();
    await fsp.rm(dir, { recursive: true, force: true });
  });

  const hash = covers.cover(`${origin.base}/cover.png`).src.split('/').pop();
  const response = await fetch(`${app.base}/covers/${hash}`);

  assert.equal(response.status, 502);
  assert.equal(origin.count(), 0, 'до внутреннего адреса дело дойти не должно');
});

test('уборка оставляет только то, на что есть ссылка в базе', async t => {
  const it = await setup(t, base => [`${base}/cover.png`, `${base}/moved-here.png`]);
  const kept = it.hashOf(`${it.origin.base}/cover.png`);
  const dropped = it.hashOf(`${it.origin.base}/moved-here.png`);

  await it.get(kept);
  await it.get(dropped);

  it.setSources([`${it.origin.base}/cover.png`]);

  assert.equal(await it.covers.sweep(), 1);
  assert.equal(fs.existsSync(path.join(it.dir, kept)), true);
  assert.equal(fs.existsSync(path.join(it.dir, dropped)), false);
  assert.equal(it.covers.cover(`${it.origin.base}/moved-here.png`).width, undefined);
});
