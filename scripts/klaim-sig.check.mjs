// Cek cepat verifikasi tanda tangan link klaim: node scripts/klaim-sig.check.mjs
import { createHmac } from 'crypto';
const { validOrderSig } = await import('../api/c2l41mpr0.js');
const s = createHmac('sha256','k').update('ord-1').digest('hex');
console.assert(validOrderSig('ord-1', s, 'k') === true, 'valid');
console.assert(validOrderSig('ord-2', s, 'k') === false, 'other order');
console.assert(validOrderSig('ord-1', s, 'z') === false, 'other secret');
console.assert(validOrderSig('ord-1', 'xx', 'k') === false, 'bad sig');
console.assert(validOrderSig('ord-1', s, '') === false, 'no secret');
// sig2 mengikat token paket ke pesanan.
const { validClaim } = await import('../api/c2l41mpr0.js');
const s2 = (t, o) => createHmac('sha256','k').update(`v2:${t}:${o}`).digest('hex');
console.assert(validClaim({ t: 'PROTOK', order: 'ord-1', sig2: s2('PROTOK','ord-1') }, 'PRO', 'k') === true, 'v2 pro');
console.assert(validClaim({ t: 'PROTOK', order: 'ord-1', sig2: s2('PLUSTOK','ord-1') }, 'PRO', 'k') === false, 'swap t');
console.assert(validClaim({ t: 'PROTOK', order: 'ord-1', sig: s }, 'PRO', 'k') === false, 'legacy pro ditolak');
console.assert(validClaim({ t: 'PLUSTOK', order: 'ord-1', sig: s }, 'PLUS', 'k') === true, 'legacy plus');
// Bonus pembeli: setengah komisi, dibulatkan ke bawah ke Rp100.
const { buyerShare } = await import('../api/license.js');
console.assert(buyerShare(2500) === 1200 && buyerShare(1000) === 500 && buyerShare(1500) === 700 && buyerShare(0) === 0, 'buyerShare');
console.log('ok');
