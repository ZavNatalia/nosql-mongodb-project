const Product = require('../models/product');
const validateCheckout = require('../util/validate-checkout');
const safeReturnTo = require('../util/safe-return-to');
const isAvailable = require('../util/is-available');

const EMPTY_CHECKOUT_VALUES = {
  name: '',
  email: '',
  phone: '',
  street: '',
  city: '',
  postalCode: '',
  note: ''
};

exports.getIndex = (req, res, next) => {
  const cartProductIds = req.user.cart.items.map(item => item.productId.toString());

  Product.fetchAll()
    .then(products => {
      res.render('shop/index', {
        // Главная — подборка, весь каталог живёт на /products
        prods: products.slice(0, 8),
        pageTitle: 'Shop',
        path: '/',
        cartProductIds: cartProductIds
      });
    })
    .catch(err => console.log(err));
};

exports.getProducts = (req, res, next) => {
  const cartProductIds = req.user.cart.items.map(item => item.productId.toString());

  Product.fetchAll()
    .then(products => {
      res.render('shop/product-list', {
        prods: products,
        pageTitle: 'All Products',
        path: '/products',
        cartProductIds: cartProductIds
      });
    })
    .catch(err => console.log(err));
};

exports.getProduct = (req, res, next) => {
  const cartProductIds = req.user.cart.items.map(item => item.productId.toString());

  Product.findById(req.params.productId)
    .then(product => {
      if (!product) {
        return res.redirect('/');
      }
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/products',
        cartProductIds: cartProductIds
      });
    })
    .catch(err => console.log(err));
};

exports.getCart = (req, res, next) => {
  req.user
    .getCart()
    .then(products => {
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products
      });
    })
    .catch(err => console.log(err));
};

exports.postCart = (req, res, next) => {
  const redirectTo = safeReturnTo(req.body.returnTo);

  Product.findById(req.body.productId)
    .then(product => {
      // Кнопки у снятой с продажи книги нет, но форму можно отправить и вручную
      if (!isAvailable(product)) {
        return null;
      }
      return req.user.addToCart(product);
    })
    .then(() => {
      res.redirect(redirectTo);
    })
    .catch(err => console.log(err));
};

exports.postCartUpdateQuantity = (req, res, next) => {
  // Плюс и минус — единственные допустимые шаги, что бы ни пришло в теле запроса
  const delta = Number(req.body.delta) < 0 ? -1 : 1;

  req.user
    .changeCartItemQuantity(req.body.productId, delta)
    .then(() => {
      res.redirect('/cart');
    })
    .catch(err => console.log(err));
};

exports.postCartDeleteProduct = (req, res, next) => {
  req.user
    .deleteItemFromCart(req.body.productId)
    .then(() => {
      res.redirect('/cart');
    })
    .catch(err => console.log(err));
};

exports.getCheckout = (req, res, next) => {
  req.user
    .getCart()
    .then(products => {
      // Оформлять нечего — возвращаем в корзину, а не показываем пустую форму
      if (products.length === 0) {
        return res.redirect('/cart');
      }

      res.render('shop/checkout', {
        path: '/checkout',
        pageTitle: 'Checkout',
        products: products,
        values: {
          ...EMPTY_CHECKOUT_VALUES,
          name: req.user.name,
          email: req.user.email
        },
        errors: {}
      });
    })
    .catch(next);
};

exports.postCheckout = (req, res, next) => {
  const { values, errors } = validateCheckout(req.body);

  req.user
    .getCart()
    .then(products => {
      // Корзину могли опустошить в другой вкладке, пока заполнялась форма
      if (products.length === 0) {
        return res.redirect('/cart');
      }

      if (Object.keys(errors).length > 0) {
        return res.status(422).render('shop/checkout', {
          path: '/checkout',
          pageTitle: 'Checkout',
          products: products,
          values: values,
          errors: errors
        });
      }

      return req.user
        .addOrder({
          name: values.name,
          email: values.email,
          phone: values.phone,
          address: {
            street: values.street,
            city: values.city,
            postalCode: values.postalCode
          },
          note: values.note
        })
        .then(() => {
          res.redirect('/orders');
        });
    })
    .catch(next);
};

exports.getOrders = (req, res, next) => {
  req.user
    .getOrders()
    .then(orders => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders: orders
      });
    })
    .catch(err => console.log(err));
};
