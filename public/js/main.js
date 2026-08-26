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
