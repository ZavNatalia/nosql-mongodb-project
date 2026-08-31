const path = require('path');

const express = require('express');

const errorController = require('./controllers/error');
const { mongoConnect } = require('./util/database');
const User = require('./models/user');

const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

// Доступность книги решает и сервер, и шаблоны — отдаём им одну и ту же функцию,
// чтобы правило не пришлось повторять в разметке
app.locals.isAvailable = require('./util/is-available');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Аутентификации нет: приложение работает от имени единственного пользователя,
// созданного при старте. Его идентификатор запоминается здесь.
let currentUserId;

app.use((req, res, next) => {
  User.findById(currentUserId)
    .then(user => {
      req.user = user;
      next();
    })
    .catch(err => console.log(err));
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);

app.use(errorController.get404);

mongoConnect()
  .then(() => User.firstOrCreate('Natalia', 'test@test.com'))
  .then(user => {
    currentUserId = user._id;
    app.listen(3000);
    console.log('Сервер запущен: http://localhost:3000');
  })
  .catch(err => console.log(err));
