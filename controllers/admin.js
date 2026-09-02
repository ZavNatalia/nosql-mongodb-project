const Product = require('../models/product');
const validateBook = require('../util/validate-book');
const isAvailable = require('../util/is-available');

const EMPTY_BOOK_VALUES = {
  title: '',
  author: '',
  price: '',
  imageUrl: '',
  description: '',
  publisher: '',
  year: '',
  pages: '',
  available: true
};

exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Book',
    path: '/admin/add-product',
    editing: false,
    values: EMPTY_BOOK_VALUES,
    errors: {}
  });
};

exports.postAddProduct = (req, res, next) => {
  const { values, errors, book } = validateBook(req.body);

  if (Object.keys(errors).length > 0) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Book',
      path: '/admin/add-product',
      editing: false,
      values: values,
      errors: errors
    });
  }

  new Product({ ...book, userId: req.user._id })
    .save()
    .then(() => {
      res.redirect('/admin/products');
    })
    .catch(next);
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;

  if (!editMode) {
    return res.redirect('/');
  }

  Product.findById(req.params.productId)
    .then(product => {
      if (!product) {
        return res.redirect('/');
      }

      // Форма работает со строками — в базе часть полей числа или отсутствует
      res.render('admin/edit-product', {
        pageTitle: 'Edit Book',
        path: '/admin/edit-product',
        editing: editMode,
        product: product,
        values: {
          title: product.title || '',
          author: product.author || '',
          price: product.price === undefined ? '' : String(product.price),
          imageUrl: product.imageUrl || '',
          description: product.description || '',
          publisher: product.publisher || '',
          year: product.year === undefined || product.year === null ? '' : String(product.year),
          pages: product.pages === undefined || product.pages === null ? '' : String(product.pages),
          available: isAvailable(product)
        },
        errors: {}
      });
    })
    .catch(next);
};

exports.postEditProduct = (req, res, next) => {
  const { values, errors, book } = validateBook(req.body);

  if (Object.keys(errors).length > 0) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Edit Book',
      path: '/admin/edit-product',
      editing: true,
      product: { _id: req.body.productId },
      values: values,
      errors: errors
    });
  }

  new Product({ ...book, id: req.body.productId, userId: req.user._id })
    .save()
    .then(() => {
      res.redirect('/admin/products');
    })
    .catch(next);
};

exports.getProducts = (req, res, next) => {
  Product.fetchAll()
    .then(products => {
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products'
      });
    })
    .catch(err => console.log(err));
};

exports.postDeleteProduct = (req, res, next) => {
  Product.deleteById(req.body.productId)
    .then(() => {
      res.redirect('/admin/products');
    })
    .catch(err => console.log(err));
};
