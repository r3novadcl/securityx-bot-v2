require("dotenv").config();

const developers = (process.env.DEVELOPER_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

module.exports = {
  botName: process.env.BOT_NAME || "Security X V2",
  defaultPrefix: process.env.DEFAULT_PREFIX || "?",
  developers,
  dev: developers, // Backward-compatible alias for existing commands
  guildLogsChannelId: process.env.GUILD_LOGS_CHANNEL_ID || null, // ID of the channel to send guild join/leave logs (optional)
  supportUrl: process.env.SUPPORT_URL || "https://discord.gg/epKhYP6Y74",
  colors: {
    success: 0x00ff00,
    error: 0xff0000,
    info: 0x3498db,
    warning: 0xf1c40f
  }
};
