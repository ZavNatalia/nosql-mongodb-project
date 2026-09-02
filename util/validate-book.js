const IMAGE_URL_PATTERN = /^https?:\/\/\S+$/i;

const MAX_YEAR = new Date().getFullYear() + 1;

// Значение попадёт и в базу, и обратно в форму — чистим один раз, на входе
function clean(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

// Невыставленный чекбокс браузер не отправляет вовсе, поэтому флаг доступности
// читается как «пришло ровно 'true'», а не как длина строки

// Описание — это абзацы, переносы строк в нём осмысленны
function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateBook(body = {}) {
  const values = {
    title: clean(body.title),
    author: clean(body.author),
    price: clean(body.price),
    imageUrl: clean(body.imageUrl),
    description: cleanText(body.description),
    publisher: clean(body.publisher),
    year: clean(body.year),
    pages: clean(body.pages),
    available: body.available === 'true'
  };

  const errors = {};

  if (values.title.length < 1 || values.title.length > 200) {
    errors.title = 'Enter the book title (1–200 characters).';
  }

  if (values.author.length < 2 || values.author.length > 120) {
    errors.author = 'Enter the author name (2–120 characters).';
  }

  const price = Number(values.price);

  if (values.price === '' || !Number.isFinite(price) || price < 0 || price >= 100000) {
    errors.price = 'Enter a price between 0 and 100000.';
  }

  if (!IMAGE_URL_PATTERN.test(values.imageUrl) || values.imageUrl.length > 2048) {
    errors.imageUrl = 'Enter a cover URL starting with http:// or https://.';
  }

  if (values.description.length < 1 || values.description.length > 2000) {
    errors.description = 'Enter a description (1–2000 characters).';
  }

  if (values.publisher.length > 120) {
    errors.publisher = 'Keep the publisher under 120 characters.';
  }

  const year = Number(values.year);

  if (values.year !== '' && (!Number.isInteger(year) || year < 1450 || year > MAX_YEAR)) {
    errors.year = `Enter a year between 1450 and ${MAX_YEAR}.`;
  }

  const pages = Number(values.pages);

  if (values.pages !== '' && (!Number.isInteger(pages) || pages < 1 || pages > 10000)) {
    errors.pages = 'Enter a page count between 1 and 10000.';
  }

  const book = {
    title: values.title,
    author: values.author,
    price: price,
    imageUrl: values.imageUrl,
    description: values.description,
    publisher: values.publisher === '' ? null : values.publisher,
    year: values.year === '' ? null : year,
    pages: values.pages === '' ? null : pages,
    available: values.available
  };

  return { values: values, errors: errors, book: book };
}

module.exports = validateBook;
