// returnTo приходит из формы — доверять ему нельзя, иначе получаем open redirect.
// Годится только локальный путь: начинается с одного "/" и не превращается
// браузером в переход на чужой хост (протокол-относительный "//", обратный слэш,
// полный URL или произвольная схема вроде javascript:).
function safeReturnTo(value) {
  return typeof value === 'string' && /^\/(?![/\\])/.test(value) ? value : '/cart';
}

module.exports = safeReturnTo;
