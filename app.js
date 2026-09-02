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

// Дерево страниц тоже общее: шаблоны получают готовую тропу по своему path
app.locals.breadcrumbs = require('./util/breadcrumbs');

// Обложки шаблоны просят не по чужой ссылке, а через свой кэш
const covers = require('./util/covers')({
  dir: path.join(__dirname, 'data', 'covers'),
  sources: require('./util/cover-sources')
});

app.locals.cover = covers.cover;

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const coverRoutes = require('./routes/covers')(covers);

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Обложки — до общей middleware: пользователь для их выдачи не нужен
app.use(coverRoutes);

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

    // Уборка кэша обложек — обслуживание, старту сервера она не мешает
    return covers.sweep().catch(err => console.log(err));
  })
  .catch(err => console.log(err));
