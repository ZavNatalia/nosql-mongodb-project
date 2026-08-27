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
  genre: ' Fiction '
};

test('очищает значения и не находит ошибок в корректном вводе', () => {
  const { values, errors, book } = validateBook(VALID_BODY);

  assert.deepEqual(errors, {});
  assert.equal(values.title, 'The Long Field');
  assert.equal(values.author, 'Pamela Petro');
  assert.equal(book.price, 24);
  assert.equal(book.year, 2021);
  assert.equal(book.pages, 288);
  assert.equal(book.genre, 'Fiction');
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

test('пустые необязательные поля ошибкой не считаются и дают null', () => {
  const { errors, book } = validateBook({
    ...VALID_BODY,
    publisher: '',
    year: '',
    pages: '',
    genre: ''
  });

  assert.deepEqual(errors, {});
  assert.equal(book.publisher, null);
  assert.equal(book.year, null);
  assert.equal(book.pages, null);
  assert.equal(book.genre, null);
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
