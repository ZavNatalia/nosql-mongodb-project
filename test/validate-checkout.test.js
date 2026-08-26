const test = require('node:test');
const assert = require('node:assert/strict');

const validateCheckout = require('../util/validate-checkout');

const VALID_BODY = {
  name: '  Natalia   Ivanova ',
  email: '  Test@Example.COM ',
  phone: '+7 999 123-45-67',
  street: 'Lenina street, 1',
  city: 'Kazan',
  postalCode: '420000',
  note: '  Call before delivery  '
};

test('очищает значения и не находит ошибок в корректном вводе', () => {
  const { values, errors } = validateCheckout(VALID_BODY);

  assert.deepEqual(errors, {});
  assert.equal(values.name, 'Natalia Ivanova');
  assert.equal(values.email, 'test@example.com');
  assert.equal(values.phone, '+7 999 123-45-67');
  assert.equal(values.note, 'Call before delivery');
});

test('сообщает об ошибке по каждому обязательному полю пустого тела', () => {
  const { values, errors } = validateCheckout({});

  assert.deepEqual(Object.keys(errors).sort(), [
    'city',
    'email',
    'name',
    'phone',
    'postalCode',
    'street'
  ]);
  assert.equal(values.name, '');
  assert.equal(values.note, '');
});

test('не падает, когда тело запроса не передано', () => {
  const { errors } = validateCheckout();

  assert.equal(typeof errors.name, 'string');
});

test('отвергает email без домена', () => {
  const { errors } = validateCheckout({ ...VALID_BODY, email: 'natalia@localhost' });

  assert.equal(errors.email, 'Enter a valid email address.');
});

test('отвергает телефон с буквами', () => {
  const { errors } = validateCheckout({ ...VALID_BODY, phone: 'call me maybe' });

  assert.equal(errors.phone, 'Enter a valid phone number.');
});

test('отвергает слишком короткий телефон', () => {
  const { errors } = validateCheckout({ ...VALID_BODY, phone: '123' });

  assert.equal(errors.phone, 'Enter a valid phone number.');
});

test('отвергает слишком длинные имя и улицу', () => {
  const { errors } = validateCheckout({
    ...VALID_BODY,
    name: 'a'.repeat(61),
    street: 'b'.repeat(121)
  });

  assert.equal(errors.name, 'Enter your full name (2–60 characters).');
  assert.equal(
    errors.street,
    'Enter the street and building number (3–120 characters).'
  );
});

test('отвергает индекс со спецсимволами', () => {
  const { errors } = validateCheckout({ ...VALID_BODY, postalCode: '42/00' });

  assert.equal(errors.postalCode, 'Enter a valid postal code.');
});

test('считает комментарий необязательным, но ограничивает его длину', () => {
  const withoutNote = validateCheckout({ ...VALID_BODY, note: '' });
  const withLongNote = validateCheckout({ ...VALID_BODY, note: 'c'.repeat(501) });

  assert.deepEqual(withoutNote.errors, {});
  assert.equal(withLongNote.errors.note, 'Keep the note under 500 characters.');
});

test('игнорирует посторонние поля тела запроса', () => {
  const { values } = validateCheckout({ ...VALID_BODY, price: '0.01', isAdmin: 'true' });

  assert.deepEqual(Object.keys(values).sort(), [
    'city',
    'email',
    'name',
    'note',
    'phone',
    'postalCode',
    'street'
  ]);
});

test('отвергает телефон без единой цифры', () => {
  const { errors } = validateCheckout({ ...VALID_BODY, phone: '--- ---' });

  assert.equal(errors.phone, 'Enter a valid phone number.');
});

test('отвергает индекс без единой цифры', () => {
  const { errors } = validateCheckout({ ...VALID_BODY, postalCode: 'A---' });

  assert.equal(errors.postalCode, 'Enter a valid postal code.');
});
