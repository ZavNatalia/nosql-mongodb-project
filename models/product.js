const { ObjectId } = require('mongodb');

const { getDb } = require('../util/database');

class Product {
  constructor(title, price, imageUrl, description, id, userId) {
    this.title = title;
    this.price = price;
    this.imageUrl = imageUrl;
    this.description = description;
    this._id = id ? new ObjectId(id) : null;
    this.userId = userId;
  }

  save() {
    const products = getDb().collection('products');

    if (this._id) {
      // _id в $set не передаём: MongoDB запрещает менять это поле
      return products.updateOne(
        { _id: this._id },
        {
          $set: {
            title: this.title,
            price: this.price,
            imageUrl: this.imageUrl,
            description: this.description,
            userId: this.userId
          }
        }
      );
    }

    return products.insertOne({
      title: this.title,
      price: this.price,
      imageUrl: this.imageUrl,
      description: this.description,
      userId: this.userId
    });
  }

  static fetchAll() {
    return getDb().collection('products').find().toArray();
  }

  static findById(prodId) {
    return getDb().collection('products').findOne({ _id: new ObjectId(prodId) });
  }

  static deleteById(prodId) {
    return getDb().collection('products').deleteOne({ _id: new ObjectId(prodId) });
  }
}

module.exports = Product;
