// Cek cepat verifikasi tanda tangan link klaim: node scripts/klaim-sig.check.mjs
import { createHmac } from 'crypto';
const { validOrderSig } = await import('../api/c2l41mpr0.js');
const s = createHmac('sha256','k').update('ord-1').digest('hex');
console.assert(validOrderSig('ord-1', s, 'k') === true, 'valid');
console.assert(validOrderSig('ord-2', s, 'k') === false, 'other order');
console.assert(validOrderSig('ord-1', s, 'z') === false, 'other secret');
console.assert(validOrderSig('ord-1', 'xx', 'k') === false, 'bad sig');
console.assert(validOrderSig('ord-1', s, '') === false, 'no secret');
console.log('ok');
