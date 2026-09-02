const test = require('node:test');
const assert = require('node:assert/strict');

const imageSize = require('../util/image-size');

function png(width, height) {
  const buffer = Buffer.alloc(24);
  buffer.write('\x89PNG\r\n\x1a\n', 0, 'latin1');
  buffer.write('IHDR', 12, 'latin1');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

function gif(width, height) {
  const buffer = Buffer.alloc(10);
  buffer.write('GIF89a', 0, 'latin1');
  buffer.writeUInt16LE(width, 6);
  buffer.writeUInt16LE(height, 8);
  return buffer;
}

function webp(width, height) {
  const buffer = Buffer.alloc(30);
  buffer.write('RIFF', 0, 'latin1');
  buffer.write('WEBP', 8, 'latin1');
  buffer.write('VP8X', 12, 'latin1');
  buffer.writeUIntLE(width - 1, 24, 3);
  buffer.writeUIntLE(height - 1, 27, 3);
  return buffer;
}

// Перед SOF идёт сегмент, который надо перешагнуть по его длине
function jpeg(width, height) {
  const app0 = Buffer.alloc(20);
  app0.writeUInt16BE(0xffd8, 0);
  app0.writeUInt16BE(0xffe0, 2);
  app0.writeUInt16BE(16, 4);
  const sof = Buffer.alloc(11);
  sof.writeUInt16BE(0xffc0, 0);
  sof.writeUInt16BE(8, 2);
  sof.writeUInt16BE(height, 5);
  sof.writeUInt16BE(width, 7);
  return Buffer.concat([app0, sof]);
}

test('читает размеры PNG', () => {
  assert.deepEqual(imageSize(png(636, 852)), { width: 636, height: 852 });
});

test('читает размеры GIF', () => {
  assert.deepEqual(imageSize(gif(120, 90)), { width: 120, height: 90 });
});

test('читает размеры WebP', () => {
  assert.deepEqual(imageSize(webp(1200, 630)), { width: 1200, height: 630 });
});

test('находит размеры JPEG за первым сегментом', () => {
  assert.deepEqual(imageSize(jpeg(640, 480)), { width: 640, height: 480 });
});

test('на чужих данных отвечает null, а не выдумывает размеры', () => {
  assert.equal(imageSize(Buffer.from('не картинка')), null);
  assert.equal(imageSize(Buffer.alloc(0)), null);
  assert.equal(imageSize('строка'), null);
  assert.equal(imageSize(undefined), null);
});
