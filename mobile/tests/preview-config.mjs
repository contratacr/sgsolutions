import assert from 'node:assert/strict';
import {previewConfig} from '../scripts/preview-config.mjs';

assert.deepEqual(previewConfig(undefined), {});
assert.deepEqual(previewConfig(''), {});
for (const host of ['localhost', '127.0.0.1']) {
  const config = previewConfig(`http://${host}:3140`);
  assert.equal(config.server.url, `http://${host}:3140`);
  assert.equal(config.server.cleartext, true);
  assert.equal(config.server.allowNavigation, undefined);
}
for (const invalid of ['http://10.0.2.2:3140', 'https://sgsolutionscr.com', 'http://sgsolutionscr.com:3140', 'http://127.0.0.1', 'http://localhost:3140/pagar', 'http://localhost:3140/?url=x', 'http://localhost:3140/#x', 'http://user:pass@localhost:3140', 'file:///index.html', 'http://localhost.evil.test:3140', 'not a URL']) {
  assert.throws(() => previewConfig(invalid), invalid);
}
console.log('Preview configuration: local origins only, packaged default preserved.');
