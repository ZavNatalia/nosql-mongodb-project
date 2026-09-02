const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const imageSize = require('./image-size');

// Обложки заведены ссылками на чужие сайты: отдаются медленно и с коротким
// cache-control, поэтому браузер тянет их заново чуть ли не на каждой странице.
// Скачиваем каждую один раз к себе и раздаём с бессрочным кэшем. Адрес считается
// от самой ссылки: поменяли обложку в админке — получился другой адрес, и старая
// картинка из кэша браузера не подменит новую.
const CACHE_DIR = path.join(__dirname, '..', 'data', 'covers');
const INDEX_FILE = path.join(CACHE_DIR, 'index.json');
const FETCH_TIMEOUT_MS = 10000;
const RETRY_AFTER_MS = 5 * 60 * 1000;
const MAX_BYTES = 8 * 1024 * 1024;
const ROUTE = '/covers';

fs.mkdirSync(CACHE_DIR, { recursive: true });

// hash -> { url, type, width, height }; всё, кроме url, появляется после загрузки
const entries = readIndex();
// Одну и ту же обложку страница просит сразу в нескольких местах — качаем один раз
const inFlight = new Map();
// hash -> когда последний раз не получилось. Ссылка отвалилась насовсем — без этого
// каждый показ страницы снова лез бы в сеть и ждал таймаут
const failures = new Map();

function readIndex() {
  try {
    return new Map(Object.entries(JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'))));
  } catch (err) {
    // Индекса ещё нет или он испорчен — начинаем с пустого, файлы перекачаются
    return new Map();
  }
}

// Через временный файл, как и сама картинка: падение посреди записи не должно
// оставлять на месте индекса половину JSON
function saveIndex() {
  const temp = `${INDEX_FILE}.part`;
  fs.writeFileSync(temp, JSON.stringify(Object.fromEntries(entries), null, 2));
  fs.renameSync(temp, INDEX_FILE);
}

const hashOf = url => crypto.createHash('sha1').update(url).digest('hex').slice(0, 16);

const fileOf = hash => path.join(CACHE_DIR, hash);

// Шаблонам: адрес обложки у нас и её размеры, если она уже скачана. На самой
// первой отрисовке размеров ещё нет — атрибуты появятся со следующей.
function cover(imageUrl) {
  if (!/^https?:\/\//i.test(imageUrl || '')) {
    return { src: imageUrl || '' };
  }

  const hash = hashOf(imageUrl);
  let entry = entries.get(hash);

  if (!entry) {
    entry = { url: imageUrl };
    entries.set(hash, entry);
    saveIndex();
  }

  return { src: `${ROUTE}/${hash}`, width: entry.width, height: entry.height };
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

async function download(hash, entry) {
  const response = await fetch(entry.url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { Accept: 'image/*' }
  });

  if (!response.ok) {
    throw new Error(`${entry.url} ответил ${response.status}`);
  }

  const type = (response.headers.get('content-type') || '').split(';')[0].trim();

  if (!type.startsWith('image/')) {
    throw new Error(`${entry.url} отдал не картинку, а ${type || 'ничего'}`);
  }

  const body = await readBody(response, entry.url);

  // Сначала во временный файл: иначе оборванная загрузка оставит в кэше огрызок
  const temp = `${fileOf(hash)}.part`;
  await fsp.writeFile(temp, body);
  await fsp.rename(temp, fileOf(hash));

  const size = imageSize(body);

  entry.type = type;
  entry.width = size ? size.width : undefined;
  entry.height = size ? size.height : undefined;
  saveIndex();
}

function ensure(hash, entry) {
  if (!inFlight.has(hash)) {
    inFlight.set(
      hash,
      download(hash, entry).finally(() => inFlight.delete(hash))
    );
  }

  return inFlight.get(hash);
}

async function sendCover(req, res) {
  const hash = req.params.hash;
  const entry = entries.get(hash);

  if (!entry) {
    return res.status(404).end();
  }

  const cached = entry.type && fs.existsSync(fileOf(hash));

  if (!cached && failures.has(hash) && Date.now() - failures.get(hash) < RETRY_AFTER_MS) {
    return res.status(502).end();
  }

  try {
    if (!cached) {
      await ensure(hash, entry);
      failures.delete(hash);
    }

    res.type(entry.type);
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

module.exports = { cover, sendCover, ROUTE };
