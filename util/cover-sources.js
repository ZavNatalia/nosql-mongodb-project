const { getDb } = require('./database');

// Все ссылки на обложки, какие есть в базе. Заказ хранит снимок книги на момент
// покупки, поэтому его картинка живёт отдельно от каталога: книгу могли удалить,
// а старый заказ её всё равно показывает.
// Берём find с проекцией, а не distinct: соединение открыто со strict-режимом
// Stable API, а distinct в неё не входит.
async function coverSources() {
  const db = getDb();

  const [books, orders] = await Promise.all([
    db.collection('products').find({}, { projection: { imageUrl: 1 } }).toArray(),
    db.collection('orders').find({}, { projection: { 'items.product.imageUrl': 1 } }).toArray()
  ]);

  const urls = [
    ...books.map(book => book.imageUrl),
    ...orders.flatMap(order => (order.items || []).map(item => item.product && item.product.imageUrl))
  ];

  return [...new Set(urls)].filter(url => typeof url === 'string' && url !== '');
}

module.exports = coverSources;
