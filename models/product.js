const {ObjectId} = require('mongodb');

const {getDb} = require('../util/database');

class Product {
    constructor({
        title,
        author,
        price,
        imageUrl,
        description,
        publisher,
        year,
        pages,
        available,
        id,
        userId
    }) {
        this.title = title;
        this.author = author;
        this.price = price;
        this.imageUrl = imageUrl;
        this.description = description;
        this.publisher = publisher;
        this.year = year;
        this.pages = pages;
        this.available = available;
        this._id = id ? new ObjectId(id) : null;
        this.userId = userId;
    }

    // Один список полей на вставку и на обновление — чтобы новое поле нельзя
    // было добавить в одно место и забыть про второе
    toDocument() {
        return {
            title: this.title,
            author: this.author,
            price: this.price,
            imageUrl: this.imageUrl,
            description: this.description,
            publisher: this.publisher,
            year: this.year,
            pages: this.pages,
            available: this.available,
            userId: this.userId
        };
    }

    save() {
        const products = getDb().collection('products');

        if (this._id) {
            // _id в $set не передаём: MongoDB запрещает менять это поле
            return products.updateOne({_id: this._id}, {$set: this.toDocument()});
        }

        return products.insertOne(this.toDocument());
    }

    static fetchAll() {
        return getDb().collection('products').find().toArray();
    }

    static findById(prodId) {
        if (!ObjectId.isValid(prodId)) {
            return Promise.resolve(null);   // отдаём «не найдено» вместо исключения
        }
        return getDb().collection('products').findOne({_id: new ObjectId(prodId)});
    }

    static deleteById(prodId) {
        return getDb().collection('products').deleteOne({_id: new ObjectId(prodId)});
    }
}

module.exports = Product;
