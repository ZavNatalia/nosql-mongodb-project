const { ObjectId } = require('mongodb');

const { getDb } = require('../util/database');

class User {
  constructor(name, email, cart, id) {
    this.name = name;
    this.email = email;
    this.cart = cart && Array.isArray(cart.items) ? cart : { items: [] };
    this._id = id ? new ObjectId(id) : null;
  }

  save() {
    const users = getDb().collection('users');

    if (this._id) {
      return users.updateOne(
        { _id: this._id },
        { $set: { name: this.name, email: this.email, cart: this.cart } }
      );
    }

    return users
      .insertOne({ name: this.name, email: this.email, cart: this.cart })
      .then(result => {
        this._id = result.insertedId;
        return result;
      });
  }

  addToCart(product) {
    const productId = new ObjectId(product._id);
    const items = this.cart.items.map(item => ({ ...item }));
    const existing = items.find(item => item.productId.toString() === productId.toString());

    if (existing) {
      existing.quantity += 1;
    } else {
      items.push({ productId: productId, quantity: 1 });
    }

    this.cart = { items: items };
    return this._persistCart();
  }

  async getCart() {
    const productIds = this.cart.items.map(item => item.productId);

    if (productIds.length === 0) {
      return [];
    }

    const products = await getDb()
      .collection('products')
      .find({ _id: { $in: productIds } })
      .toArray();

    // Товар мог быть удалён из каталога — тогда позиция просто выпадает из корзины
    return products.map(product => {
      const item = this.cart.items.find(
        i => i.productId.toString() === product._id.toString()
      );
      return { ...product, quantity: item.quantity };
    });
  }

  changeCartItemQuantity(productId, delta) {
    const items = this.cart.items.map(item => ({ ...item }));
    const target = items.find(
      item => item.productId.toString() === productId.toString()
    );

    if (!target) {
      return Promise.resolve();
    }

    target.quantity = Math.max(1, target.quantity + delta);

    this.cart = { items: items };
    return this._persistCart();
  }

  deleteItemFromCart(productId) {
    const items = this.cart.items.filter(
      item => item.productId.toString() !== productId.toString()
    );

    this.cart = { items: items };
    return this._persistCart();
  }

  async addOrder() {
    const cartProducts = await this.getCart();

    const order = {
      user: { _id: this._id, name: this.name },
      items: cartProducts.map(({ quantity, ...product }) => ({
        product: product,
        quantity: quantity
      }))
    };

    await getDb().collection('orders').insertOne(order);

    this.cart = { items: [] };
    return this._persistCart();
  }

  getOrders() {
    return getDb().collection('orders').find({ 'user._id': this._id }).toArray();
  }

  _persistCart() {
    return getDb()
      .collection('users')
      .updateOne({ _id: this._id }, { $set: { cart: this.cart } });
  }

  static async findById(userId) {
    const doc = await getDb().collection('users').findOne({ _id: new ObjectId(userId) });
    return doc ? new User(doc.name, doc.email, doc.cart, doc._id) : null;
  }

  static async firstOrCreate(name, email) {
    const doc = await getDb().collection('users').findOne({});

    if (doc) {
      return new User(doc.name, doc.email, doc.cart, doc._id);
    }

    const user = new User(name, email, { items: [] }, null);
    await user.save();
    return user;
  }
}

module.exports = User;
