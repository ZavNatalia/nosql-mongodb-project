const test = require('node:test');
const assert = require('node:assert/strict');

const validateBook = require('../util/validate-book');

const VALID_BODY = {
  title: '  The   Long Field ',
  author: ' Pamela  Petro ',
  price: '24.00',
  imageUrl: 'https://example.com/cover.jpg',
  description: '  A meditation on longing.\n\nAnd on returning.  ',
  publisher: ' Little Toller ',
  year: '2021',
  pages: '288',
  available: 'true'
};

test('очищает значения и не находит ошибок в корректном вводе', () => {
  const { values, errors, book } = validateBook(VALID_BODY);

  assert.deepEqual(errors, {});
  assert.equal(values.title, 'The Long Field');
  assert.equal(values.author, 'Pamela Petro');
  assert.equal(book.price, 24);
  assert.equal(book.year, 2021);
  assert.equal(book.pages, 288);
  assert.equal(book.available, true);
});

test('сохраняет абзацы в описании, схлопывая пробелы только по краям', () => {
  const { values } = validateBook(VALID_BODY);

  assert.equal(values.description, 'A meditation on longing.\n\nAnd on returning.');
});

test('сообщает об ошибке по каждому обязательному полю пустого тела', () => {
  const { errors } = validateBook({});

  assert.deepEqual(Object.keys(errors).sort(), [
    'author',
    'description',
    'imageUrl',
    'price',
    'title'
  ]);
});

test('пустые необязательные поля ошибкой не считаются', () => {
  const { errors, book } = validateBook({
    ...VALID_BODY,
    publisher: '',
    year: '',
    pages: '',
    available: undefined
  });

  assert.deepEqual(errors, {});
  assert.equal(book.publisher, null);
  assert.equal(book.year, null);
  assert.equal(book.pages, null);
  assert.equal(book.available, false);
});

test('отклоняет ссылку на обложку не по http', () => {
  const { errors } = validateBook({ ...VALID_BODY, imageUrl: 'javascript:alert(1)' });

  assert.ok(errors.imageUrl);
});

test('отклоняет отрицательную и нечисловую цену', () => {
  assert.ok(validateBook({ ...VALID_BODY, price: '-5' }).errors.price);
  assert.ok(validateBook({ ...VALID_BODY, price: 'free' }).errors.price);
});

test('отклоняет год и число страниц вне допустимых границ', () => {
  assert.ok(validateBook({ ...VALID_BODY, year: '1200' }).errors.year);
  assert.ok(validateBook({ ...VALID_BODY, year: '2100' }).errors.year);
  assert.ok(validateBook({ ...VALID_BODY, pages: '0' }).errors.pages);
  assert.ok(validateBook({ ...VALID_BODY, pages: '12.5' }).errors.pages);
});

test('отклоняет превышение длины у каждого строкового поля', () => {
  const { errors } = validateBook({
    ...VALID_BODY,
    title: 'a'.repeat(201),
    author: 'a'.repeat(121),
    imageUrl: 'https://example.com/' + 'a'.repeat(2048),
    description: 'a'.repeat(2001),
    publisher: 'a'.repeat(121)
  });

  assert.deepEqual(Object.keys(errors).sort(), [
    'author',
    'description',
    'imageUrl',
    'publisher',
    'title'
  ]);
});

test('проверяет границы числовых полей', () => {
  // Границу года считаем от текущего года — иначе тест протухнет в январе
  const MAX_YEAR = new Date().getFullYear() + 1;

  assert.ok(validateBook({ ...VALID_BODY, price: '100000' }).errors.price);
  assert.equal(validateBook({ ...VALID_BODY, price: '99999.99' }).errors.price, undefined);
  assert.equal(validateBook({ ...VALID_BODY, price: '0' }).errors.price, undefined);

  assert.equal(validateBook({ ...VALID_BODY, pages: '1' }).errors.pages, undefined);
  assert.equal(validateBook({ ...VALID_BODY, pages: '10000' }).errors.pages, undefined);
  assert.ok(validateBook({ ...VALID_BODY, pages: '10001' }).errors.pages);

  assert.equal(validateBook({ ...VALID_BODY, year: '1450' }).errors.year, undefined);
  assert.equal(validateBook({ ...VALID_BODY, year: String(MAX_YEAR) }).errors.year, undefined);
  assert.ok(validateBook({ ...VALID_BODY, year: String(MAX_YEAR + 1) }).errors.year);
});

test('снятый флажок доступности приходит как отсутствующее поле', () => {
  const off = validateBook({ ...VALID_BODY, available: undefined });
  const on = validateBook({ ...VALID_BODY, available: 'true' });

  assert.equal(off.book.available, false);
  assert.equal(off.values.available, false);
  assert.equal(on.book.available, true);
  assert.equal(on.values.available, true);
  assert.equal(off.errors.available, undefined);
});

test('на месте флажка не принимает произвольное значение', () => {
  assert.equal(validateBook({ ...VALID_BODY, available: 'yes' }).book.available, false);
  assert.equal(validateBook({ ...VALID_BODY, available: '1' }).book.available, false);
  assert.equal(validateBook({ ...VALID_BODY, available: true }).book.available, false);
});
