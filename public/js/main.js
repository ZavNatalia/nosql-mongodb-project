const backdrop = document.querySelector('.backdrop');
const sideDrawer = document.querySelector('.mobile-nav');
const menuToggle = document.querySelector('#side-menu-toggle');

function backdropClickHandler() {
  backdrop.style.display = 'none';
  sideDrawer.classList.remove('open');
}

function menuToggleClickHandler() {
  backdrop.style.display = 'block';
  sideDrawer.classList.add('open');
}

backdrop.addEventListener('click', backdropClickHandler);
menuToggle.addEventListener('click', menuToggleClickHandler);

// Пока корзина пересобирается на сервере, заказывать нечего — гасим кнопку до перезагрузки
const orderButton = document.querySelector('.cart__order-btn');

if (orderButton) {
  const cartForms = document.querySelectorAll('.cart__item form');

  cartForms.forEach(form =>
    form.addEventListener('submit', () => {
      orderButton.disabled = true;
    })
  );

  // Возврат кнопкой «Назад» отдаёт страницу из кэша вместе с disabled-состоянием
  window.addEventListener('pageshow', () => {
    orderButton.disabled = false;
  });
}

// Тема: атрибут на <html> плюс память в localStorage. Без выбора идём за системой.
const themeToggle = document.querySelector('#theme-toggle');

if (themeToggle) {
  const root = document.documentElement;

  const isDark = () =>
    root.dataset.theme
      ? root.dataset.theme === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;

  const syncToggle = () => themeToggle.setAttribute('aria-pressed', String(isDark()));

  syncToggle();

  themeToggle.addEventListener('click', () => {
    root.dataset.theme = isDark() ? 'light' : 'dark';

    try {
      localStorage.setItem('theme', root.dataset.theme);
    } catch (e) {}

    syncToggle();
  });
}

// Обложки грузятся по чужим ссылкам и регулярно отваливаются. Событие error не
// всплывает, поэтому слушаем на фазе перехвата.
document.addEventListener(
  'error',
  event => {
    const image = event.target;

    if (!(image instanceof HTMLImageElement)) {
      return;
    }

    const stage = image.closest('[data-cover]');

    if (stage) {
      stage.classList.add('is-missing');
    }
  },
  true
);

// Превью обложки в форме книги — чтобы опечатку в ссылке было видно сразу
const coverInput = document.querySelector('#imageUrl');
const coverPreview = document.querySelector('#cover-preview');

if (coverInput && coverPreview) {
  coverInput.addEventListener('change', () => {
    const url = coverInput.value.trim();

    coverPreview.closest('[data-cover]').classList.remove('is-missing');
    coverPreview.hidden = url === '';
    coverPreview.src = url;
  });
}
