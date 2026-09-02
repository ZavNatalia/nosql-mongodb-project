const test = require('node:test');
const assert = require('node:assert/strict');

const safeReturnTo = require('../util/safe-return-to');

test('пропускает корень сайта', () => {
  assert.equal(safeReturnTo('/'), '/');
});

test('пропускает путь каталога', () => {
  assert.equal(safeReturnTo('/products'), '/products');
});

test('пропускает путь карточки товара', () => {
  assert.equal(safeReturnTo('/products/abc123'), '/products/abc123');
});

test('отвергает протокол-относительный путь на чужой хост', () => {
  assert.equal(safeReturnTo('//evil.com'), '/cart');
});

test('отвергает путь с обратным слэшем, который браузер поймёт как хост', () => {
  assert.equal(safeReturnTo('/\\evil.com'), '/cart');
});

test('отвергает полный URL на чужой хост', () => {
  assert.equal(safeReturnTo('https://evil.com'), '/cart');
});

test('отвергает javascript-схему', () => {
  assert.equal(safeReturnTo('javascript:alert(1)'), '/cart');
});

test('отвергает пустую строку', () => {
  assert.equal(safeReturnTo(''), '/cart');
});

test('отвергает отсутствующее значение', () => {
  assert.equal(safeReturnTo(undefined), '/cart');
});

test('отвергает значения не строкового типа', () => {
  assert.equal(safeReturnTo(42), '/cart');
  assert.equal(safeReturnTo(null), '/cart');
  assert.equal(safeReturnTo({}), '/cart');
});
