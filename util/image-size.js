// Размеры картинки из её заголовка — их ставим в атрибуты width и height у <img>.
// Без них браузер не знает, сколько места займёт обложка, и она выскакивает
// рывком, когда догрузится. Разбираем форматы, которыми бывают обложки.
function imageSize(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    return null;
  }

  return png(buffer) || gif(buffer) || webp(buffer) || jpeg(buffer);
}

// \x89PNG\r\n\x1a\n, сразу за ним блок IHDR: ширина и высота лежат подряд
function png(b) {
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) {
    return null;
  }

  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

function gif(b) {
  if (b.length < 10 || b.toString('latin1', 0, 3) !== 'GIF') {
    return null;
  }

  return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
}

// У WebP размеры лежат в первом блоке, и в каждом из трёх видов блока по-своему
function webp(b) {
  if (b.length < 30 || b.toString('latin1', 0, 4) !== 'RIFF' || b.toString('latin1', 8, 12) !== 'WEBP') {
    return null;
  }

  const chunk = b.toString('latin1', 12, 16);

  if (chunk === 'VP8X') {
    return { width: b.readUIntLE(24, 3) + 1, height: b.readUIntLE(27, 3) + 1 };
  }

  if (chunk === 'VP8 ') {
    return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  }

  if (chunk === 'VP8L') {
    // 14 бит на ширину и 14 на высоту, обе записаны на единицу меньше настоящей
    const bits = b.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }

  return null;
}

// JPEG — цепочка сегментов; размеры несёт SOF, его и ищем
function jpeg(b) {
  if (b.length < 4 || b.readUInt16BE(0) !== 0xffd8) {
    return null;
  }

  let i = 2;

  while (i + 9 < b.length) {
    if (b[i] !== 0xff) {
      return null;
    }

    const marker = b[i + 1];

    // Между сегментами попадается набивка из 0xff — она не маркер
    if (marker === 0xff) {
      i += 1;
      continue;
    }

    // SOF0..SOF15 несут размеры, кроме 0xc4, 0xc8 и 0xcc: под этими номерами
    // сидят таблицы Хаффмана и арифметического кодирования
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5) };
    }

    i += 2 + b.readUInt16BE(i + 2);
  }

  return null;
}

module.exports = imageSize;
