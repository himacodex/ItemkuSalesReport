const {
  Client, GatewayIntentBits, EmbedBuilder, REST, Routes,
  SlashCommandBuilder, ActivityType, StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder, ActionRowBuilder,
} = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
 
// ─── CONFIG ───────────────────────────────────────────────────────────────────
const CONFIG_FILE = path.join(__dirname, 'config.json');
 
function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    const def = {
      token: 'YOUR_BOT_TOKEN_HERE',
      clientId: 'YOUR_CLIENT_ID_HERE',
      channelId: 'YOUR_CHANNEL_ID_HERE',
      checkInterval: 60000,
      products: {},
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(def, null, 2));
    return def;
  }
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}
 
function saveConfig() {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}
 
// products: { [id]: { url, name, lastStock, price } }
let config = loadConfig();
if (!config.products) config.products = {};
 
let checkTimer = null;
 
// ─── CLIENT ───────────────────────────────────────────────────────────────────
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
 
// ─── COMMANDS ─────────────────────────────────────────────────────────────────
const commands = [
  new SlashCommandBuilder()
    .setName('addproduct')
    .setDescription('Tambah produk itemku yang ingin di-tracking')
    .addStringOption(o =>
      o.setName('url').setDescription('Link produk itemku').setRequired(true)
    )
    .addStringOption(o =>
      o.setName('nama').setDescription('Nama produk (opsional)').setRequired(false)
    ),
 
  new SlashCommandBuilder()
    .setName('removeproduct')
    .setDescription('Hapus produk dari daftar tracking'),
 
  new SlashCommandBuilder()
    .setName('listproducts')
    .setDescription('Lihat semua produk yang sedang di-tracking'),
 
  new SlashCommandBuilder()
    .setName('editname')
    .setDescription('Edit nama produk')
    .addStringOption(o =>
      o.setName('id').setDescription('ID produk (lihat /listproducts)').setRequired(true)
    )
    .addStringOption(o =>
      o.setName('nama').setDescription('Nama produk baru').setRequired(true)
    ),
 
  new SlashCommandBuilder()
    .setName('setchannel')
    .setDescription('Set channel untuk laporan penjualan')
    .addChannelOption(o =>
      o.setName('channel').setDescription('Channel tujuan').setRequired(true)
    ),
 
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Cek status tracking semua produk'),
 
  new SlashCommandBuilder()
    .setName('stoptrack')
    .setDescription('Hentikan semua tracking dan hapus semua produk'),
].map(c => c.toJSON());
 
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(config.token);
  try {
    console.log('🔄 Mendaftarkan slash commands...');
    await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
    console.log('✅ Commands berhasil didaftarkan!');
  } catch (e) {
    console.error('❌ Gagal daftarkan commands:', e.message);
  }
}
 
// ─── SCRAPER ─────────────────────────────────────────────────────────────────
async function scrapeItemku(url) {
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
        'Cache-Control': 'no-cache',
      },
      timeout: 15000,
    });
 
    const $ = cheerio.load(res.data);
    let stock = null;
    let price = null;
 
    // Cari stok
    const stockSelectors = ['[data-testid="stock-count"]', '.stock-count', '[class*="stock"]', '[class*="Stock"]'];
    for (const sel of stockSelectors) {
      const el = $(sel);
      if (el.length > 0) {
        const num = el.text().trim().replace(/[^0-9]/g, '');
        if (num) { stock = parseInt(num); break; }
      }
    }
    if (stock === null) {
      $('*').each((i, el) => {
        const text = $(el).text().toLowerCase();
        if ((text.includes('stok') || text.includes('stock')) && text.length < 60) {
          const num = text.replace(/[^0-9]/g, '');
          if (num && parseInt(num) < 9999) { stock = parseInt(num); return false; }
        }
      });
    }
 
    // Cari harga
    const priceSelectors = ['[data-testid="product-price"]', '.product-price', '[class*="price"]', '[class*="Price"]'];
    for (const sel of priceSelectors) {
      const el = $(sel).first();
      if (el.length > 0) {
        const num = el.text().replace(/[^0-9]/g, '');
        if (num && parseInt(num) > 0) { price = parseInt(num); break; }
      }
    }
    if (!price) {
      $('*').each((i, el) => {
        const text = $(el).text();
        if (text.includes('Rp') && text.length < 30) {
          const num = text.replace(/[^0-9]/g, '');
          if (num && parseInt(num) > 0) { price = parseInt(num); return false; }
        }
      });
    }
 
    const pageTitle = $('title').text().trim().split('|')[0].trim() || $('h1').first().text().trim();
    return { stock, price, pageTitle };
  } catch (e) {
    console.error(`❌ Error scraping ${url}:`, e.message);
    return null;
  }
}
 
// ─── HELPERS ─────────────────────────────────────────────────────────────────
function genId() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}
 
function formatPrice(price) {
  if (!price) return 'Tidak diketahui';
  return `Rp. ${price.toLocaleString('id-ID')}`;
}
 
function formatDiscordTime(date) {
  const now = new Date();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' });
  if (date.toDateString() === now.toDateString()) return `Today at ${timeStr}`;
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday at ${timeStr}`;
  return `${date.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })} at ${timeStr}`;
}
 
function formatTime(date) {
  return date.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
 
// ─── KIRIM LAPORAN ────────────────────────────────────────────────────────────
async function sendSaleReport(product, productId, qty) {
  try {
    const channel = await client.channels.fetch(config.channelId);
    if (!channel) return;
 
    const now = new Date();
    const embed = new EmbedBuilder()
      .setTitle('🔔 MAJORIS TECHNOLOGY REPORT')
      .setColor(0x00FF88)
      .addFields(
        { name: '📌 Status', value: '✅ **PAID** ✅', inline: false },
        { name: '💰 Harga', value: formatPrice(product.price), inline: true },
        { name: '🎁 Produk', value: product.name || 'Tidak diketahui', inline: true },
        { name: '📦 Jumlah', value: `x${qty} Item`, inline: true },
        { name: '🔗 Link', value: `[Lihat Produk](${product.url})`, inline: false },
      )
      .setFooter({ text: `ID: ${productId} • Created with ❤️ by Neko • ${formatDiscordTime(now)}` })
      .setTimestamp(now);
 
    await channel.send({ embeds: [embed] });
    console.log(`✅ [${productId}] Laporan terkirim! Terjual ${qty} item`);
  } catch (e) {
    console.error('❌ Gagal kirim laporan:', e.message);
  }
}
 
// ─── CHECK SEMUA PRODUK ───────────────────────────────────────────────────────
async function checkAllProducts() {
  const ids = Object.keys(config.products);
  if (ids.length === 0) return;
 
  console.log(`🔍 Mengecek ${ids.length} produk...`);
 
  // Cek semua produk secara paralel
  await Promise.all(ids.map(async (id) => {
    const product = config.products[id];
    const data = await scrapeItemku(product.url);
 
    if (!data || data.stock === null) {
      console.warn(`⚠️ [${id}] Gagal ambil data stok`);
      return;
    }
 
    // Update harga jika berhasil diambil
    if (data.price) {
      config.products[id].price = data.price;
    }
 
    // Update nama dari web jika belum ada nama manual
    if (!product.name && data.pageTitle) {
      config.products[id].name = data.pageTitle;
    }
 
    const prevStock = product.lastStock;
    console.log(`📊 [${id}] ${product.name || product.url} | Stok: ${data.stock} | Sebelumnya: ${prevStock}`);
 
    if (prevStock !== null && prevStock !== undefined && data.stock < prevStock) {
      const sold = prevStock - data.stock;
      console.log(`🛒 [${id}] Terjual ${sold} item!`);
      await sendSaleReport(config.products[id], id, sold);
    }
 
    config.products[id].lastStock = data.stock;
  }));
 
  saveConfig();
}
 
function startTracking() {
  if (checkTimer) clearInterval(checkTimer);
  checkAllProducts();
  checkTimer = setInterval(checkAllProducts, config.checkInterval);
  console.log(`✅ Tracking dimulai untuk ${Object.keys(config.products).length} produk`);
}
 
// ─── EVENT: READY ─────────────────────────────────────────────────────────────
client.once('ready', async () => {
  console.log(`\n✅ Bot online: ${client.user.tag}`);
  const count = Object.keys(config.products).length;
  client.user.setActivity(`${count} produk | /addproduct`, { type: ActivityType.Watching });
 
  await registerCommands();
 
  if (count > 0 && config.channelId) {
    console.log(`🔄 Auto-start tracking ${count} produk...`);
    startTracking();
  }
});
 
// ─── INTERACTIONS ─────────────────────────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
 
  // ── SELECT MENU (untuk removeproduct) ──────────────────────────────────────
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'select_remove') {
      const id = interaction.values[0];
      const product = config.products[id];
      if (!product) return interaction.update({ content: '❌ Produk tidak ditemukan.', components: [] });
 
      delete config.products[id];
      saveConfig();
 
      const remaining = Object.keys(config.products).length;
      client.user.setActivity(`${remaining} produk | /addproduct`, { type: ActivityType.Watching });
 
      const embed = new EmbedBuilder()
        .setTitle('🗑️ Produk Dihapus')
        .setColor(0xFF4444)
        .addFields(
          { name: 'ID', value: id, inline: true },
          { name: '🎁 Nama', value: product.name || 'Tidak diketahui', inline: true },
          { name: '📊 Sisa Produk Tracking', value: `${remaining} produk`, inline: false },
        )
        .setTimestamp();
 
      return interaction.update({ embeds: [embed], components: [] });
    }
    return;
  }
 
  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;
 
  // ── /addproduct ────────────────────────────────────────────────────────────
  if (commandName === 'addproduct') {
    await interaction.deferReply({ ephemeral: true });
 
    const url = interaction.options.getString('url');
    const namaInput = interaction.options.getString('nama');
 
    if (!url.includes('itemku.com')) {
      return interaction.editReply('❌ URL tidak valid! Gunakan link dari **itemku.com**.');
    }
 
    // Cek duplikat
    const existing = Object.values(config.products).find(p => p.url === url);
    if (existing) {
      return interaction.editReply('⚠️ Produk dengan URL tersebut sudah ada di daftar tracking!');
    }
 
    const data = await scrapeItemku(url);
    if (!data) {
      return interaction.editReply('❌ Gagal mengakses produk. Pastikan URL benar dan produk masih aktif.');
    }
 
    const id = genId();
    config.products[id] = {
      url,
      name: namaInput || data.pageTitle || 'Produk Baru',
      lastStock: data.stock,
      price: data.price || null,
    };
    saveConfig();
 
    const count = Object.keys(config.products).length;
    client.user.setActivity(`${count} produk | /addproduct`, { type: ActivityType.Watching });
 
    const embed = new EmbedBuilder()
      .setTitle('✅ Produk Berhasil Ditambahkan!')
      .setColor(0x00FF88)
      .addFields(
        { name: '🆔 ID Produk', value: `\`${id}\``, inline: true },
        { name: '🎁 Nama', value: config.products[id].name, inline: true },
        { name: '📦 Stok Saat Ini', value: `${data.stock !== null ? data.stock : 'Tidak terdeteksi'} item`, inline: true },
        { name: '💰 Harga', value: formatPrice(data.price), inline: true },
        { name: '📊 Total Produk Tracking', value: `${count} produk`, inline: false },
        { name: '🔗 URL', value: url, inline: false },
      )
      .setFooter({ text: 'Bot akan mengecek stok setiap 1 menit' })
      .setTimestamp();
 
    await interaction.editReply({ embeds: [embed] });
 
    // Restart tracking agar produk baru langsung ikut dicek
    if (config.channelId) startTracking();
  }
 
  // ── /removeproduct ─────────────────────────────────────────────────────────
  else if (commandName === 'removeproduct') {
    const ids = Object.keys(config.products);
    if (ids.length === 0) {
      return interaction.reply({ content: '⚠️ Belum ada produk yang di-tracking.', ephemeral: true });
    }
 
    const options = ids.map(id => {
      const p = config.products[id];
      return new StringSelectMenuOptionBuilder()
        .setLabel(`[${id}] ${(p.name || 'Tanpa Nama').substring(0, 80)}`)
        .setDescription(`Stok: ${p.lastStock ?? '?'} | ${p.url.substring(0, 80)}`)
        .setValue(id);
    });
 
    const select = new StringSelectMenuBuilder()
      .setCustomId('select_remove')
      .setPlaceholder('Pilih produk yang ingin dihapus...')
      .addOptions(options);
 
    const row = new ActionRowBuilder().addComponents(select);
 
    await interaction.reply({
      content: '🗑️ Pilih produk yang ingin dihapus dari daftar tracking:',
      components: [row],
      ephemeral: true,
    });
  }
 
  // ── /listproducts ──────────────────────────────────────────────────────────
  else if (commandName === 'listproducts') {
    await interaction.deferReply({ ephemeral: true });
 
    const ids = Object.keys(config.products);
    if (ids.length === 0) {
      return interaction.editReply('⚠️ Belum ada produk yang di-tracking. Gunakan `/addproduct` untuk menambahkan.');
    }
 
    const embed = new EmbedBuilder()
      .setTitle(`📋 Daftar Produk Tracking (${ids.length} produk)`)
      .setColor(0x5865F2)
      .setTimestamp();
 
    for (const id of ids) {
      const p = config.products[id];
      embed.addFields({
        name: `\`${id}\` • ${(p.name || 'Tanpa Nama').substring(0, 50)}`,
        value: `📦 Stok: **${p.lastStock ?? 'Belum dicek'}** | 💰 ${formatPrice(p.price)}\n🔗 ${p.url.substring(0, 60)}...`,
        inline: false,
      });
    }
 
    embed.setFooter({ text: `Channel laporan: ${config.channelId ? '#' + config.channelId : 'Belum diset'} • Cek setiap 1 menit` });
 
    await interaction.editReply({ embeds: [embed] });
  }
 
  // ── /editname ──────────────────────────────────────────────────────────────
  else if (commandName === 'editname') {
    const id = interaction.options.getString('id').toUpperCase();
    const nama = interaction.options.getString('nama');
 
    if (!config.products[id]) {
      return interaction.reply({ content: `❌ Produk dengan ID \`${id}\` tidak ditemukan. Cek /listproducts.`, ephemeral: true });
    }
 
    const oldName = config.products[id].name;
    config.products[id].name = nama;
    saveConfig();
 
    const embed = new EmbedBuilder()
      .setTitle('✅ Nama Produk Diperbarui')
      .setColor(0x5865F2)
      .addFields(
        { name: '🆔 ID', value: id, inline: true },
        { name: '📝 Nama Lama', value: oldName || 'Tidak ada', inline: true },
        { name: '🎁 Nama Baru', value: nama, inline: true },
      )
      .setTimestamp();
 
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
 
  // ── /setchannel ────────────────────────────────────────────────────────────
  else if (commandName === 'setchannel') {
    const channel = interaction.options.getChannel('channel');
    config.channelId = channel.id;
    saveConfig();
 
    const embed = new EmbedBuilder()
      .setTitle('✅ Channel Laporan Diperbarui')
      .setColor(0x5865F2)
      .addFields({ name: '📢 Channel', value: `<#${channel.id}>`, inline: false })
      .setTimestamp();
 
    await interaction.reply({ embeds: [embed], ephemeral: true });
 
    // Restart tracking dengan channel baru
    if (Object.keys(config.products).length > 0) startTracking();
  }
 
  // ── /status ────────────────────────────────────────────────────────────────
  else if (commandName === 'status') {
    await interaction.deferReply({ ephemeral: true });
 
    const ids = Object.keys(config.products);
    const isTracking = checkTimer !== null;
 
    const embed = new EmbedBuilder()
      .setTitle('📊 Status Bot Tracking')
      .setColor(isTracking ? 0x00FF88 : 0xFF4444)
      .addFields(
        { name: '🔄 Status', value: isTracking ? `✅ Aktif — mengecek ${ids.length} produk setiap 1 menit` : '🛑 Tidak Aktif', inline: false },
        { name: '📢 Channel Laporan', value: config.channelId ? `<#${config.channelId}>` : 'Belum diset', inline: true },
        { name: '📦 Total Produk', value: `${ids.length} produk`, inline: true },
        { name: '🕐 Waktu Sekarang', value: formatTime(new Date()), inline: false },
      )
      .setTimestamp();
 
    if (ids.length > 0) {
      const preview = ids.slice(0, 5).map(id => {
        const p = config.products[id];
        return `\`${id}\` ${(p.name || 'Tanpa Nama').substring(0, 30)} — Stok: **${p.lastStock ?? '?'}**`;
      }).join('\n');
      embed.addFields({ name: '🎁 Produk (maks 5)', value: preview + (ids.length > 5 ? `\n...dan ${ids.length - 5} lainnya` : ''), inline: false });
    }
 
    await interaction.editReply({ embeds: [embed] });
  }
 
  // ── /stoptrack ─────────────────────────────────────────────────────────────
  else if (commandName === 'stoptrack') {
    if (checkTimer) { clearInterval(checkTimer); checkTimer = null; }
    const count = Object.keys(config.products).length;
    config.products = {};
    saveConfig();
    client.user.setActivity('0 produk | /addproduct', { type: ActivityType.Watching });
 
    const embed = new EmbedBuilder()
      .setTitle('🛑 Tracking Dihentikan')
      .setColor(0xFF4444)
      .setDescription(`Semua **${count} produk** telah dihapus dari daftar tracking.\nGunakan \`/addproduct\` untuk memulai kembali.`)
      .setTimestamp();
 
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
});
 
// ─── LOGIN ────────────────────────────────────────────────────────────────────
if (config.token === 'YOUR_BOT_TOKEN_HERE') {
  console.log('\n⚠️  Isi TOKEN, CLIENT ID, dan CHANNEL ID di config.json terlebih dahulu!\n');
} else {
  client.login(config.token).catch(err => console.error('❌ Gagal login:', err.message));
}