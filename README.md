# ItemkuSalesReport
The program I created as a report to track the number of product sales on my item website in real time via the Discord Bot.

Discord : himacodex / deltcode#7012


---

## 📋 Features
- ✅ Monitor my item stock every 1 minute
- ✅ Automatic report to the Discord channel when a product is sold
- ✅ Embed complete reports (status, price, product name, quantity)
- ✅ Easy-to-use slash commands
- ✅ Config is automatically saved

---

## 🚀 Setup Method

### 1. Install Dependencies
```bash
npm install
```

### 2. Create a Discord Bot
1. Open the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** → give it a name (e.g., Majoris Bot)
3. Go to the **Bot** menu → click **Add Bot**
4. In the **Token** section, click **Reset Token** then **Copy** the token
5. In the **Bot** section **Privileged Gateway Intents**, enable:
- ✅ Server Members Intent
- ✅ Message Content Intent
6. Go to the **OAuth2 → URL Generator** menu:
- Check: `bot`, `applications.commands`
- Bot Permissions: `Send Messages`, `Embed Links`, `Read Message History`
7. Copy the generated link and open it in a browser to invite the bot to the server

### 3. Fill in config.json
Edit the `config.json` file:
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

> **How ​​to get a Client ID:** Discord Developer Portal → Application → General Information → Application ID

> **How ​​to get a Channel ID:** In Discord, enable Developer Mode (Settings → Advanced → Developer Mode), then right-click the channel → Copy Channel ID

### 4. Run the Bot
```bash
npm start
```

---

## 💬 Slash Commands

| Command | Description |
|---------|-----------|
| `/setlink [url]` | Set the link for the itemku product you want to monitor |
| `/editname [name]` | Change the product name displayed in the report |
| `/setchannel [channel]` | Set the channel for sales reports |
| `/status` | View tracking status & current stock |
| `/stoptrack` | Stop tracking a product |

---

## 📊 Report Example

```
🔔 MAJORIS TECHNOLOGY REPORT
📌 Status: ✅ PAID ✅
💰 Price: Rp. 6,000
🎁 Product: Sailor Piece - SAILOR PIECE ACCOUNT [LEVEL MAX]
📦 Quantity: x1 Item
Created with ❤️ by Neko • Today at 10:48 PM
```

---

## ⚠️ Note
- The bot uses web scraping to read my item inventory.
- If inventory isn't automatically detected, make sure the product URL is correct.
- It's recommended to run the bot on a server/VPS to keep it running 24/7.
- Use [PM2](https://pm2.keymetrics.io/) to keep the bot running: `pm2 start index.js --name majoris-bot`
