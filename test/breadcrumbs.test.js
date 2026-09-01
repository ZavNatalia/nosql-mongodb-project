const test = require('node:test');
const assert = require('node:assert/strict');

const breadcrumbs = require('../util/breadcrumbs');

test('на главной крошек нет', () => {
  assert.deepEqual(breadcrumbs('/'), []);
});

test('каталог: одна ступень под домом', () => {
  assert.deepEqual(breadcrumbs('/products'), [
    { href: '/', label: 'Home' },
    { href: null, label: 'Books' }
  ]);
});

// Страница книги приходит с тем же path, что и каталог: их различает leaf
test('страница книги дописывает название после каталога', () => {
  assert.deepEqual(breadcrumbs('/products', 'Остров сокровищ'), [
    { href: '/', label: 'Home' },
    { href: '/products', label: 'Books' },
    { href: null, label: 'Остров сокровищ' }
  ]);
});

test('корзина и оформление заказа стоят на одной ветке', () => {
  assert.deepEqual(breadcrumbs('/cart'), [
    { href: '/', label: 'Home' },
    { href: null, label: 'Cart' }
  ]);

  assert.deepEqual(breadcrumbs('/checkout'), [
    { href: '/', label: 'Home' },
    { href: '/cart', label: 'Cart' },
    { href: null, label: 'Checkout' }
  ]);
});

test('заказы: одна ступень под домом', () => {
  assert.deepEqual(breadcrumbs('/orders'), [
    { href: '/', label: 'Home' },
    { href: null, label: 'Orders' }
  ]);
});

test('список книг в админке заканчивает тропу разделом', () => {
  assert.deepEqual(breadcrumbs('/admin/products'), [
    { href: '/', label: 'Home' },
    { href: null, label: 'Admin' }
  ]);
});

test('добавление книги: подпись страницы вместо названия', () => {
  assert.deepEqual(breadcrumbs('/admin/add-product'), [
    { href: '/', label: 'Home' },
    { href: '/admin/products', label: 'Admin' },
    { href: null, label: 'Add book' }
  ]);
});

test('редактирование книги дописывает её название', () => {
  assert.deepEqual(breadcrumbs('/admin/edit-product', 'Остров сокровищ'), [
    { href: '/', label: 'Home' },
    { href: '/admin/products', label: 'Admin' },
    { href: null, label: 'Остров сокровищ' }
  ]);
});

// Книгу могли сохранить без названия только через подделанную форму, но тропа
// не должна из-за этого обрываться на пустой крошке
test('пустое название книги не даёт пустой крошки', () => {
  assert.deepEqual(breadcrumbs('/admin/edit-product', ''), [
    { href: '/', label: 'Home' },
    { href: null, label: 'Admin' }
  ]);

  assert.deepEqual(breadcrumbs('/products', '   '), [
    { href: '/', label: 'Home' },
    { href: null, label: 'Books' }
  ]);
});

test('неизвестный путь остаётся без крошек', () => {
  assert.deepEqual(breadcrumbs('/404'), []);
  assert.deepEqual(breadcrumbs('/nope'), []);
  assert.deepEqual(breadcrumbs(undefined), []);
});

// Последняя крошка — сама страница: ссылаться ей некуда
test('на последней крошке нет адреса, на остальных есть', () => {
  const trail = breadcrumbs('/checkout');
  const last = trail[trail.length - 1];

  assert.equal(last.href, null);
  assert.ok(trail.slice(0, -1).every(crumb => typeof crumb.href === 'string'));
});
