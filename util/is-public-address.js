const net = require('net');

// Судим не по имени, а по адресу, к которому оно привело: и «localhost», и чужой
// домен, у которого в DNS стоит 127.0.0.1, ведут в ту же внутреннюю сеть. Сервер
// ходит по ссылке на обложку сам, поэтому пускать его туда нельзя: за такими
// адресами живут соседние сервисы и метаданные облака.
function isPublicAddress(address) {
  const version = net.isIP(address);

  if (version === 4) {
    return isPublicV4(address);
  }

  if (version === 6) {
    return isPublicV6(address);
  }

  return false;
}

function isPublicV4(address) {
  const [a, b] = address.split('.').map(Number);

  return !(
    a === 0 ||                               // «эта сеть»
    a === 10 ||                              // частная
    a === 127 ||                             // петля
    (a === 100 && b >= 64 && b <= 127) ||    // общий адрес провайдера
    (a === 169 && b === 254) ||              // link-local, там же метаданные облаков
    (a === 172 && b >= 16 && b <= 31) ||     // частная
    (a === 192 && b === 0) ||                // служебная
    (a === 192 && b === 168) ||              // частная
    (a === 198 && (b === 18 || b === 19)) || // для замеров
    a >= 224                                 // multicast и зарезервированное
  );
}

function isPublicV6(address) {
  const value = address.toLowerCase();

  // IPv4 внутри IPv6 (::ffff:127.0.0.1) — судим по вложенному адресу
  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);

  if (mapped) {
    return isPublicV4(mapped[1]);
  }

  // Всё остальное из ::/8 — петля, «неопределённый» и прочее нероутируемое
  if (value.startsWith('::')) {
    return false;
  }

  const head = parseInt(value.split(':')[0], 16);

  return !(
    (head & 0xfe00) === 0xfc00 || // fc00::/7 — локальные
    (head & 0xffc0) === 0xfe80 || // fe80::/10 — link-local
    (head & 0xff00) === 0xff00    // ff00::/8 — multicast
  );
}

module.exports = isPublicAddress;
