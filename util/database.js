const { MongoClient, ServerApiVersion } = require('mongodb');

let _db;

const mongoConnect = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      'MONGODB_URI не задана — скопируйте .env.example в .env и заполните строку подключения'
    );
  }

  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true
    }
  });

  await client.connect();
  _db = client.db('shop');
  return _db;
};

const getDb = () => {
  if (!_db) {
    throw new Error('База данных не инициализирована — сначала вызовите mongoConnect()');
  }
  return _db;
};

module.exports = { mongoConnect, getDb };
