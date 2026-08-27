const Product = require('../models/product');

exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false
  });
};

exports.postAddProduct = (req, res, next) => {
  const product = new Product({
    title: req.body.title,
    author: req.body.author,
    price: req.body.price,
    imageUrl: req.body.imageUrl,
    description: req.body.description,
    publisher: req.body.publisher,
    year: req.body.year,
    pages: req.body.pages,
    genre: req.body.genre,
    userId: req.user._id
  });

  product
    .save()
    .then(() => {
      res.redirect('/admin/products');
    })
    .catch(err => console.log(err));
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
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        product: product
      });
    })
    .catch(err => console.log(err));
};

exports.postEditProduct = (req, res, next) => {
  const product = new Product({
    title: req.body.title,
    author: req.body.author,
    price: req.body.price,
    imageUrl: req.body.imageUrl,
    description: req.body.description,
    publisher: req.body.publisher,
    year: req.body.year,
    pages: req.body.pages,
    genre: req.body.genre,
    id: req.body.productId,
    userId: req.user._id
  });

  product
    .save()
    .then(() => {
      res.redirect('/admin/products');
    })
    .catch(err => console.log(err));
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
