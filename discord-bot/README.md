# 🤖 Majoris Technology Discord Bot
Bot Discord untuk memantau stok produk di **itemku.com** dan melaporkan penjualan secara otomatis.

---

## 📋 Fitur
- ✅ Monitoring stok produk itemku setiap 1 menit
- ✅ Laporan otomatis ke channel Discord saat ada produk terjual
- ✅ Embed laporan lengkap (status, harga, nama produk, jumlah)
- ✅ Slash commands yang mudah digunakan
- ✅ Config tersimpan otomatis

---

## 🚀 Cara Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Buat Discord Bot
1. Buka [Discord Developer Portal](https://discord.com/developers/applications)
2. Klik **New Application** → beri nama (misal: Majoris Bot)
3. Pergi ke menu **Bot** → klik **Add Bot**
4. Di bagian **Token**, klik **Reset Token** lalu **Copy** token-nya
5. Di bagian **Privileged Gateway Intents**, aktifkan:
   - ✅ Server Members Intent
   - ✅ Message Content Intent
6. Pergi ke menu **OAuth2 → URL Generator**:
   - Centang: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Embed Links`, `Read Message History`
7. Copy link yang dihasilkan dan buka di browser untuk invite bot ke server

### 3. Isi config.json
Edit file `config.json`:
```json
{
  "token": "TOKEN_BOT_MU_DISINI",
  "clientId": "CLIENT_ID_MU_DISINI",
  "channelId": "CHANNEL_ID_DISCORD_MU",
  "productUrl": "",
  "productName": "",
  "checkInterval": 60000
}
```

> **Cara dapat Client ID:** Discord Developer Portal → Application → General Information → Application ID

> **Cara dapat Channel ID:** Di Discord, aktifkan Developer Mode (Settings → Advanced → Developer Mode), lalu klik kanan channel → Copy Channel ID

### 4. Jalankan Bot
```bash
npm start
```

---

## 💬 Slash Commands

| Command | Deskripsi |
|---------|-----------|
| `/setlink [url]` | Set link produk itemku yang ingin dipantau |
| `/editname [nama]` | Ubah nama produk yang ditampilkan di laporan |
| `/setchannel [channel]` | Set channel untuk laporan penjualan |
| `/status` | Lihat status tracking & stok saat ini |
| `/stoptrack` | Hentikan tracking produk |

---

## 📊 Contoh Laporan

```
🔔 MAJORIS TECHNOLOGY REPORT
📌 Status: ✅ PAID ✅
💰 Harga: Rp. 6,000
🎁 Produk: Sailor Piece - AKUN SAILOR PIECE [LEVEL MAX]
📦 Jumlah: x1 Item
Created with ❤️ by Neko • Today at 22:48
```

---

## ⚠️ Catatan
- Bot menggunakan web scraping untuk membaca stok itemku
- Jika stok tidak terdeteksi otomatis, pastikan URL produk benar
- Disarankan menjalankan bot di server/VPS agar berjalan 24/7
- Gunakan [PM2](https://pm2.keymetrics.io/) untuk menjaga bot tetap berjalan: `pm2 start index.js --name majoris-bot`
