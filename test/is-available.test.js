const test = require('node:test');
const assert = require('node:assert/strict');

const isAvailable = require('../util/is-available');

test('книга доступна, когда флаг выставлен', () => {
  assert.equal(isAvailable({ available: true }), true);
});

test('книга недоступна только при явном false', () => {
  assert.equal(isAvailable({ available: false }), false);
});

// Книги, заведённые до появления поля, продавались — снимать их с продажи
// молча нельзя, поэтому отсутствие флага считаем доступностью
test('книга без поля available считается доступной', () => {
  assert.equal(isAvailable({ title: 'Старая книга' }), true);
  assert.equal(isAvailable({ available: undefined }), true);
  assert.equal(isAvailable({ available: null }), true);
});

test('не падает на отсутствующей книге', () => {
  assert.equal(isAvailable(null), false);
  assert.equal(isAvailable(undefined), false);
});
