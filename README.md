# Security X V2

An all-in-one security and moderation bot for Discord, built to protect servers from nukes, raids, insider abuse, and scams — with full anti-nuke, anti-raid, automod, verification, logging, and general moderation in one package.

Built by **[r3novadcl](https://github.com/r3novadcl)** under **FX Development**.

---

## Features

### Anti-Nuke
Real-time protection against malicious admins, compromised accounts, and mass-destructive actions, with per-module limits and punishments (`ban`, `kick`, `timeout`, `strip`, `jail`).

Monitored actions include:
- Channel create / delete / update
- Role create / delete / update
- Webhook create / update / delete
- Emoji & sticker create / delete / update
- Bot additions, bans, kicks
- Member role updates, server updates, vanity URL changes
- @everyone mentions, mass prune
- Automatic channel/role restore from snapshot after a delete

Includes extra-owner and whitelist management so trusted staff bypass checks.

### Anti-Raid / Gate
- Join-rate limiting (X joins per Y seconds)
- New-account age filter
- Alt-account detection
- One-command **Raid Mode** lockdown

### Betrayal Guard
Detects staff/admins abusing permissions and automatically jails, bans, or strips their roles — with DM alerts to the owner/co-owners and a dedicated log channel.

### Honeypot / Trap Channels
Hidden trap channels that instantly ban, kick, or jail anyone who interacts with them.

### Permission Scanner
Scans all server roles for dangerous permissions (Administrator, Manage Roles, Ban Members, etc.) and flags anything that shouldn't be there.

### AutoMod
Configurable rule set: anti-spam, anti-invite, anti-link, anti-mention, anti-caps, anti-bad-words, anti-emoji.

### Verification
Gate new members behind **button**, **image captcha**, or **math** verification before they get server access.

### Scammer Database
Report and look up known scammers by ID, shared server-wide.

### Moderation
`ban`, `kick`, `softban`, `unban` / `unbanall`, `mute` / `unmute`, `warn` / `unwarn` / `warnings`, `jail` / `unjail`, `lock` / `unlock` / `lockall` / `unlockall`, `hide` / `unhide` / `hideall` / `unhideall`, `purge`, `slowmode`, `snipe` / `editsnipe`.

### Logging
Category-based logging (moderation, messages, members, channels, roles, etc.) to configurable channels, with a `log all` shortcut.

### Welcome System
Custom join/leave messages and autorole (for humans, bots, or all members).

### Backup
Full server backup and restore (channels, roles, settings).

### Staff Management
Internal bot-staff tiers (`admin`, `mod`) separate from Discord server permissions.

### Utility
`help`, `invite`, `ping`, `stats`, `uptime`, `support`, custom prefix per server.

All features are available as **both prefix commands and slash commands.**

---

## Tech Stack

- [Node.js](https://nodejs.org/) (18+ recommended)
- [discord.js](https://discord.js.org/) v14
- [MongoDB](https://www.mongodb.com/) via Mongoose
- [@napi-rs/canvas](https://github.com/Brooooooklyn/canvas) — image rendering (e.g. captchas)
- dotenv, chalk

---

## Setup

### Prerequisites
- Node.js 18 or newer
- A MongoDB database (local or [Atlas](https://www.mongodb.com/atlas))
- A Discord bot application ([Discord Developer Portal](https://discord.com/developers/applications))

### 1. Clone & install
```bash
git clone https://github.com/r3novadcl/security-x-v2.git
cd security-x-v2
npm install
```

### 2. Configure environment
Copy `.env.example` to `.env` and fill in the values:

```env
DISCORD_TOKEN=
MONGO_URI=
SUPPORT_URL=https://discord.gg/epKhYP6Y74
BOT_NAME=Security X V2
DEFAULT_PREFIX=?
DEVELOPER_IDS=your_user_id_here
GUILD_LOGS_CHANNEL_ID=
```

| Variable | Required | Description |
|---|---|---|
| `DISCORD_TOKEN` | Yes | Your bot's token from the Developer Portal |
| `MONGO_URI` | Yes | MongoDB connection string (data won't persist without it) |
| `DEVELOPER_IDS` | Recommended | Comma-separated user IDs with dev-level access (e.g. `noprefix`) |
| `DEFAULT_PREFIX` | No | Fallback prefix, defaults to `?` |
| `BOT_NAME` | No | Defaults to `Security X V2` |
| `SUPPORT_URL` | No | Shown in `support`/`invite` commands |
| `GUILD_LOGS_CHANNEL_ID` | No | Channel for guild join/leave logs |

### 3. Enable Privileged Gateway Intents
In the [Developer Portal](https://discord.com/developers/applications) → your app → **Bot**, enable:
- Server Members Intent
- Message Content Intent

### 4. Invite the bot
Use the OAuth2 URL generator with the `bot` and `applications.commands` scopes, and grant `Administrator` (or at minimum: Manage Roles, Manage Channels, Ban Members, Kick Members, Manage Webhooks, Moderate Members).

### 5. Run it
```bash
node index.js
```

---

## Project Structure
```
├── index.js                 # Entry point — client, intents, DB connection
├── config.js                 # Loads env-based config
├── src/
│   ├── commands/
│   │   ├── prefix/           # Text-prefix commands, grouped by category
│   │   └── slash/             # Slash commands, grouped by category
│   ├── events/                # Discord.js event listeners
│   ├── handlers/              # Command/event/error loaders
│   ├── models/                 # Mongoose schemas
│   └── utils/                  # Feature logic (antinuke, automod, gate, etc.)
```

---

## Credits

- **Developer:** [r3novadcl](https://github.com/r3novadcl) — FX Development
- Built with [discord.js](https://discord.js.org/)

## License

No license has been set for this project yet — all rights reserved by default.