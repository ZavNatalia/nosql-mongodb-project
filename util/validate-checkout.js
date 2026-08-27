const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^(?=.*[0-9])[0-9+\-() ]+$/;
const POSTAL_CODE_PATTERN = /^(?=.*[0-9])[A-Za-z0-9][A-Za-z0-9 -]*$/;

// Значение попадёт и в базу, и обратно в форму — чистим один раз, на входе
function clean(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function validateCheckout(body = {}) {
  const values = {
    name: clean(body.name),
    email: clean(body.email).toLowerCase(),
    phone: clean(body.phone),
    street: clean(body.street),
    city: clean(body.city),
    postalCode: clean(body.postalCode),
    note: clean(body.note)
  };

  const errors = {};

  if (values.name.length < 2 || values.name.length > 60) {
    errors.name = 'Enter your full name (2–60 characters).';
  }

  if (!EMAIL_PATTERN.test(values.email) || values.email.length > 254) {
    errors.email = 'Enter a valid email address.';
  }

  if (
    !PHONE_PATTERN.test(values.phone) ||
    values.phone.length < 5 ||
    values.phone.length > 20
  ) {
    errors.phone = 'Enter a valid phone number.';
  }

  if (values.street.length < 3 || values.street.length > 120) {
    errors.street = 'Enter the street and building number (3–120 characters).';
  }

  if (values.city.length < 2 || values.city.length > 60) {
    errors.city = 'Enter your city (2–60 characters).';
  }

  if (
    !POSTAL_CODE_PATTERN.test(values.postalCode) ||
    values.postalCode.length < 3 ||
    values.postalCode.length > 12
  ) {
    errors.postalCode = 'Enter a valid postal code.';
  }

  if (values.note.length > 500) {
    errors.note = 'Keep the note under 500 characters.';
  }

  return { values: values, errors: errors };
}

module.exports = validateCheckout;
