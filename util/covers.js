const crypto = require('crypto');
const dns = require('dns/promises');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const imageSize = require('./image-size');
const isPublicAddress = require('./is-public-address');

// Обложки заведены ссылками на чужие сайты: отдаются медленно и с коротким
// cache-control, поэтому браузер тянет их заново чуть ли не на каждой странице.
// Скачиваем каждую один раз к себе и раздаём с бессрочным кэшем. Адрес считается
// от самой ссылки: поменяли обложку в админке — получился другой адрес, и старая
// картинка из кэша браузера не подменит новую.
const ROUTE = '/covers';
const FETCH_TIMEOUT_MS = 10000;
const RETRY_AFTER_MS = 5 * 60 * 1000;
const SOURCES_TTL_MS = 1000;
const MAX_REDIRECTS = 3;
const MAX_BYTES = 8 * 1024 * 1024;

const hashOf = url => crypto.createHash('sha1').update(url).digest('hex').slice(0, 16);

// sources() отдаёт все ссылки на обложки, какие есть в базе. Это и список
// разрешённого (по чужой ссылке сервер не пойдёт), и мерка для уборки кэша.
// allowPrivateAddresses открывает дорогу в локальную сеть — нужно только тестам.
function createCovers({ dir, sources, allowPrivateAddresses = false }) {
  fs.mkdirSync(dir, { recursive: true });

  const indexFile = path.join(dir, 'index.json');
  const fileOf = hash => path.join(dir, hash);

  // hash -> { url, type, width, height }; сюда попадает только скачанное
  const entries = readIndex();
  // Одну и ту же обложку страница просит сразу в нескольких местах — качаем один раз
  const inFlight = new Map();
  // hash -> когда последний раз не получилось. Ссылка отвалилась насовсем — без этого
  // каждый показ страницы снова лез бы в сеть и ждал таймаут
  const failures = new Map();
  // Список из базы держим недолго: за ним ходят на промах, а промахом может быть
  // и выдумка из адресной строки
  let known = { at: 0, urls: new Map() };
  let writing = Promise.resolve();

  function readIndex() {
    try {
      return new Map(Object.entries(JSON.parse(fs.readFileSync(indexFile, 'utf8'))));
    } catch (err) {
      // Индекса ещё нет или он испорчен — начинаем с пустого, файлы перекачаются
      return new Map();
    }
  }

  // Через временный файл, как и сама картинка: падение посреди записи не должно
  // оставлять на месте индекса половину JSON. Записи выстроены в очередь, чтобы
  // две одновременные не смешались.
  function saveIndex() {
    writing = writing.then(async () => {
      const temp = `${indexFile}.part`;
      await fsp.writeFile(temp, JSON.stringify(Object.fromEntries(entries), null, 2));
      await fsp.rename(temp, indexFile);
    });

    return writing;
  }

  const exists = file => fsp.access(file).then(() => true, () => false);

  // Шаблонам: адрес обложки у нас и её размеры, если она уже скачана. Только чтение —
  // отрисовка страницы ничего не записывает и никуда не ходит.
  function cover(imageUrl) {
    if (!/^https?:\/\//i.test(imageUrl || '')) {
      return { src: imageUrl || '' };
    }

    const entry = entries.get(hashOf(imageUrl));

    return {
      src: `${ROUTE}/${hashOf(imageUrl)}`,
      width: entry && entry.width,
      height: entry && entry.height
    };
  }

  async function urlFor(hash) {
    const entry = entries.get(hash);

    if (entry) {
      return entry.url;
    }

    // Свежую книгу надо отдать сразу, поэтому на незнакомый хэш идём в базу —
    // но не чаще раза в секунду, иначе перебор адресов превратится в перебор запросов
    if (!known.urls.has(hash) && Date.now() - known.at > SOURCES_TTL_MS) {
      const urls = await sources();
      known = { at: Date.now(), urls: new Map(urls.map(url => [hashOf(url), url])) };
    }

    return known.urls.get(hash) || null;
  }

  // Ссылку заводят через админку, а ходит по ней сервер — так через неё можно
  // дотянуться до того, что снаружи не видно. Проверяем адрес, к которому привело
  // имя, и делаем это на каждом шаге перенаправления: публичная ссылка легко
  // уводит на внутреннюю. (Остаётся щель между проверкой и подключением: адрес в
  // DNS может смениться между ними. Закрыть её можно только соединением по уже
  // проверенному адресу — это отдельная работа с диспетчером соединений.)
  async function assertAllowed(url) {
    const target = new URL(url);

    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
      throw new Error(`${url} — не http(s)`);
    }

    if (allowPrivateAddresses) {
      return;
    }

    const hostname = target.hostname.replace(/^\[|\]$/g, '');
    const addresses = await dns.lookup(hostname, { all: true });
    const blocked = addresses.find(item => !isPublicAddress(item.address));

    if (blocked) {
      throw new Error(`${url} ведёт на непубличный адрес ${blocked.address}`);
    }
  }

  async function fetchImage(url) {
    let current = url;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      await assertAllowed(current);

      const response = await fetch(current, {
        redirect: 'manual',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { Accept: 'image/*' }
      });

      const location = response.headers.get('location');

      if (response.status >= 300 && response.status < 400 && location) {
        await response.body?.cancel();
        current = new URL(location, current).toString();
        continue;
      }

      return response;
    }

    throw new Error(`${url} — слишком много перенаправлений`);
  }

  // Размер проверяем до чтения тела и потом по ходу: дождаться конца загрузки и
  // только тогда посмотреть на длину — значит уже держать в памяти сколько дали
  async function readBody(response, url) {
    const declared = Number(response.headers.get('content-length'));

    if (declared > MAX_BYTES) {
      throw new Error(`${url} обещает ${declared} байт — больше допустимого`);
    }

    const chunks = [];
    let received = 0;

    for await (const chunk of response.body) {
      received += chunk.length;

      if (received > MAX_BYTES) {
        // Выход из цикла обрывает и саму загрузку
        throw new Error(`${url} прислал больше ${MAX_BYTES} байт`);
      }

      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  async function download(hash, url) {
    const response = await fetchImage(url);

    if (!response.ok) {
      throw new Error(`${url} ответил ${response.status}`);
    }

    const type = (response.headers.get('content-type') || '').split(';')[0].trim();

    if (!type.startsWith('image/')) {
      throw new Error(`${url} отдал не картинку, а ${type || 'ничего'}`);
    }

    const body = await readBody(response, url);

    // Сначала во временный файл: иначе оборванная загрузка оставит в кэше огрызок
    const temp = `${fileOf(hash)}.part`;
    await fsp.writeFile(temp, body);
    await fsp.rename(temp, fileOf(hash));

    const size = imageSize(body);

    entries.set(hash, {
      url: url,
      type: type,
      width: size ? size.width : undefined,
      height: size ? size.height : undefined
    });

    await saveIndex();
  }

  function ensure(hash, url) {
    if (!inFlight.has(hash)) {
      inFlight.set(
        hash,
        download(hash, url).finally(() => inFlight.delete(hash))
      );
    }

    return inFlight.get(hash);
  }

  async function sendCover(req, res) {
    const hash = req.params.hash;
    const entry = entries.get(hash);
    const cached = Boolean(entry && entry.type) && (await exists(fileOf(hash)));

    if (!cached && failures.has(hash) && Date.now() - failures.get(hash) < RETRY_AFTER_MS) {
      return res.status(502).end();
    }

    try {
      if (!cached) {
        const url = await urlFor(hash);

        if (!url) {
          return res.status(404).end();
        }

        await ensure(hash, url);
        failures.delete(hash);
      }

      res.type(entries.get(hash).type);
      // Адрес зависит от ссылки на обложку, поэтому содержимое по нему не меняется
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.sendFile(fileOf(hash));
    } catch (err) {
      console.log(err);
      failures.set(hash, Date.now());
      // Пустой ответ подхватит обработчик в main.js и поставит заглушку с названием
      res.status(502).end();
    }
  }

  // Обложку сменили или книгу удалили — файл иначе остался бы в кэше навсегда.
  // Прибираем на старте: держим только то, на что в базе есть ссылка.
  async function sweep() {
    const keep = new Set((await sources()).map(hashOf));
    let removed = 0;

    for (const hash of entries.keys()) {
      if (!keep.has(hash)) {
        entries.delete(hash);
        removed += 1;
      }
    }

    const files = await fsp.readdir(dir);
    const stale = files.filter(name => name !== 'index.json' && !keep.has(name));

    await Promise.all(stale.map(name => fsp.rm(path.join(dir, name), { force: true })));

    if (removed) {
      await saveIndex();
    }

    return stale.length;
  }

  return { route: ROUTE, cover, sendCover, sweep };
}

module.exports = createCovers;
