// Дерево страниц описано один раз: у каждой известен родитель и подпись.
// Тропа собирается снизу вверх, поэтому новую страницу достаточно добавить
// сюда — шаблоны об иерархии ничего не знают.
// Подпись null значит, что своего имени у страницы нет: его приносит книга.
const NODES = {
  '/': { parent: null, label: 'Home' },
  '/products': { parent: '/', label: 'Books' },
  '/cart': { parent: '/', label: 'Cart' },
  '/checkout': { parent: '/cart', label: 'Checkout' },
  '/orders': { parent: '/', label: 'Orders' },
  '/admin/products': { parent: '/', label: 'Admin' },
  '/admin/add-product': { parent: '/admin/products', label: 'Add book' },
  '/admin/edit-product': { parent: '/admin/products', label: null }
};

// leaf — название текущей книги. Каталог и страница книги приходят с одним и
// тем же path, так что различает их именно он.
function breadcrumbs(path, leaf) {
  // На главной крошки не нужны: показывать одну ступень «Home» не о чем
  if (path === '/' || !NODES[path]) {
    return [];
  }

  const trail = [];

  for (let at = path; at; at = NODES[at].parent) {
    if (NODES[at].label) {
      trail.unshift({ href: at, label: NODES[at].label });
    }
  }

  const title = typeof leaf === 'string' ? leaf.trim() : '';

  if (title) {
    trail.push({ href: null, label: title });
  }

  // Последняя крошка — сама страница: ссылаться ей некуда
  trail[trail.length - 1].href = null;

  return trail;
}

module.exports = breadcrumbs;
