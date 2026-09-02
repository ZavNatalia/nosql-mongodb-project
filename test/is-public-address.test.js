const test = require('node:test');
const assert = require('node:assert/strict');

const isPublicAddress = require('../util/is-public-address');

test('пропускает обычные адреса из интернета', () => {
  for (const address of ['8.8.8.8', '93.184.216.34', '1.1.1.1', '2606:4700::1111']) {
    assert.equal(isPublicAddress(address), true, address);
  }
});

test('не пускает в петлю и частные сети', () => {
  const blocked = [
    '127.0.0.1',
    '127.13.4.9',
    '10.0.0.1',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '100.64.0.1',
    '0.0.0.0',
    '255.255.255.255'
  ];

  for (const address of blocked) {
    assert.equal(isPublicAddress(address), false, address);
  }
});

test('не пускает на link-local, где живут метаданные облаков', () => {
  assert.equal(isPublicAddress('169.254.169.254'), false);
  assert.equal(isPublicAddress('fe80::1'), false);
});

test('не пускает по IPv6 в петлю, локальные и multicast', () => {
  for (const address of ['::1', '::', 'fc00::1', 'fd12:3456::1', 'ff02::1']) {
    assert.equal(isPublicAddress(address), false, address);
  }
});

test('IPv4 внутри IPv6 судит по вложенному адресу', () => {
  assert.equal(isPublicAddress('::ffff:127.0.0.1'), false);
  assert.equal(isPublicAddress('::ffff:8.8.8.8'), true);
});

test('на не-адресах отвечает отказом, а не исключением', () => {
  for (const value of ['localhost', 'example.com', '', '999.1.1.1', undefined]) {
    assert.equal(isPublicAddress(value), false, String(value));
  }
});
