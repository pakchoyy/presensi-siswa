import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/c2l41mpr0",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const email = url.searchParams.get("email") || "";

    let kode = "";
    let error = "";

    try {
      const result: any = await ctx.runMutation(internal.licenses.claimCode, {});
      if (result.success) {
        kode = result.kode;
      } else {
        error = result.message || "Stok kode habis. Hubungi admin via WhatsApp.";
      }
    } catch (e) {
      error = "Gagal menghubungi server. Coba lagi nanti.";
    }

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Klaim Kode PRO — Bantu Guru Yuk</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,sans-serif;background:linear-gradient(135deg,#0ea5a0,#0d7a8a,#2d6a7f);min-height:100vh;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px}
.card{background:rgba(255,255,255,.1);border:1.5px solid rgba(255,255,255,.2);border-radius:16px;padding:32px 24px;text-align:center;max-width:400px;width:100%;backdrop-filter:blur(10px)}
.card h1{font-size:1.4rem;margin-bottom:8px}
.card .emoji{font-size:3rem;margin-bottom:16px}
.card p{font-size:.85rem;opacity:.8;line-height:1.6;margin-bottom:16px}
.code-box{background:rgba(255,255,255,.15);border:2px dashed rgba(255,255,255,.3);border-radius:12px;padding:16px;margin-bottom:16px}
.code-box .kode{font-size:1.6rem;font-weight:800;letter-spacing:3px;font-family:'Courier New',monospace;margin-bottom:10px;color:#fde68a}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:12px 24px;border-radius:10px;font-weight:700;font-size:.85rem;cursor:pointer;width:100%;border:none;font-family:inherit;transition:all .2s}
.btn-copy{background:#f59e0b;color:#1e293b;margin-bottom:8px}
.btn-copy:hover{background:#fbbf24}
.btn-app{background:rgba(255,255,255,.15);color:#fff;border:1.5px solid rgba(255,255,255,.25);margin-bottom:8px}
.btn-app:hover{background:rgba(255,255,255,.25)}
.steps{text-align:left;font-size:.78rem;opacity:.85;line-height:1.8;margin-top:16px;padding:12px 16px;background:rgba(0,0,0,.1);border-radius:10px}
.steps b{color:#fde68a}
.error-box{background:rgba(220,38,38,.2);border:1px solid rgba(220,38,38,.3);border-radius:12px;padding:20px;margin-bottom:16px}
.error-box .err{font-size:.9rem;font-weight:600;margin-bottom:8px}
.footer{margin-top:24px;font-size:.72rem;opacity:.6;text-align:center}
.footer a{color:#fde68a;text-decoration:none}
@media(max-width:400px){.card{padding:24px 16px}.code-box .kode{font-size:1.3rem}}
</style>
</head>
<body>
<div class="card">
  ${kode ? `
  <div class="emoji">🎉</div>
  <h1>Pembayaran Berhasil!</h1>
  <p>Lisensi PRO Presensi Siswa siap diaktivasi.</p>
  <div class="code-box">
    <div class="kode" id="kodeTeks">${kode}</div>
    <button class="btn btn-copy" onclick="copyKode()">📋 Salin Kode</button>
  </div>
  <button class="btn btn-app" onclick="window.location.href='https://ps.bantuguruyuk.web.id'">📲 Buka Presensi Siswa</button>
  <div class="steps">
    <b>Cara aktivasi:</b><br/>
    1. 📋 Copy kode di atas<br/>
    2. 📲 Buka aplikasi <b>Presensi Siswa</b><br/>
    3. ⚙️ Buka <b>Pengaturan</b> → <b>Upgrade PRO</b><br/>
    4. 📧 Masukkan <b>email</b> &amp; <b>kode</b><br/>
    5. ✅ <b>Aktivasi!</b> Lisensi aktif 1 tahun
  </div>
  ` : `
  <div class="emoji">😔</div>
  <h1>Oops!</h1>
  <div class="error-box">
    <div class="err">${error}</div>
  </div>
  <button class="btn btn-copy" onclick="window.open('https://wa.me/6289530713597?text=Halo%20Pak%20Choyy%2C%20stok%20kode%20PRO%20habis.%20Tolong%20diisi%20ulang.','_blank')">💬 Hubungi Admin</button>
  `}
</div>
<div class="footer">
  <a href="https://bantuguruyuk.web.id" target="_blank">Bantu Guru Yuk</a>
  &bull; <a href="https://ps.bantuguruyuk.web.id" target="_blank">Presensi Siswa</a>
</div>
<script>
function copyKode() {
  const kode = document.getElementById('kodeTeks').textContent;
  navigator.clipboard.writeText(kode).then(() => {
    const btn = event.target;
    btn.textContent = '✅ Tersalin!';
    setTimeout(() => btn.textContent = '📋 Salin Kode', 2000);
  });
}
</script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }),
});

export default http;
