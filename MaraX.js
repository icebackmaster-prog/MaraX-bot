// MaraX.js – Command plugins for MaraX-Md (zero prefix, no owner restrictions)
const commands = [
    {
        name: 'alive',
        description: 'Check if bot is alive',
        async execute(socket, m, args, ctx) {
            const startTime = global.socketCreationTime.get(ctx.number) || Date.now();
            const uptime = Math.floor((Date.now() - startTime) / 1000);
            const h = Math.floor(uptime / 3600);
            const min = Math.floor((uptime % 3600) / 60);
            const sec = Math.floor(uptime % 60);
            const mem = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

            const cap = `> ᴀᴍ ᴀʟɪᴠᴇ ɴ ᴋɪᴄᴋɪɴɢ 🥳\n\n` +
                `╭═════════════╮\n` +
                `╽⏰ ᴜᴘᴛɪᴍᴇ: ${h}h ${min}m ${sec}s\n` +
                `┃🤖 ᴀᴄᴛɪᴠᴇ ʙᴏᴛs: ${global.activeSockets.size}\n` +
                `┃📱 ʏᴏᴜʀ ɴᴜᴍʙᴇʀ: ${ctx.number}\n` +
                `┃🕹️ ᴠᴇʀsɪᴏɴ: 2.0.0\n` +
                `┃💾 ᴍᴇᴍᴏʀʏ: ${mem}MB\n` +
                `╰═════════════╯\n\n` +
                `> 👑 *Owner: Iceback Master Tech*\n` +
                `> 🌐 https://velcronis-tech.vercel.app/`;

            await socket.sendMessage(m.chat, {
                image: { url: 'https://files.catbox.moe/9gn6lm.jpg' },
                caption: cap
            }, { quoted: m });
        }
    },
    {
        name: 'menu',
        description: 'Show interactive menu',
        async execute(socket, m, args, ctx) {
            const startTime = global.socketCreationTime.get(ctx.number) || Date.now();
            const uptime = Math.floor((Date.now() - startTime) / 1000);
            const h = Math.floor(uptime / 3600);
            const min = Math.floor((uptime % 3600) / 60);
            const sec = Math.floor(uptime % 60);
            const mem = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

            const menuText = `
╭֎═『 🤖 ʙᴏᴛ ɪɴғᴏ 』═֎╮    
║ 👤 ᴜsᴇʀ: Iceback Master Tech
║ ✒️ ᴘʀᴇғɪx: ${ctx.config.prefix || 'none'}
║ 🔮 ᴍᴏᴅᴇ: ${ctx.config.mode || 'public'}
║ ⏰ ᴜᴘᴛɪᴍᴇ: ${h}h ${min}m ${sec}s
║ 💾 ᴍᴇᴍᴏʀʏ: ${mem} MB
║ 🔥 ᴄᴍᴅs: ${commands.length}
║ 🇿🇼 ᴏᴡɴᴇʀ: Iceback Master Tech
╰֎═════════════֎╯
> 🌐 https://velcronis-tech.vercel.app/

> 📢 Channel: https://whatsapp.com/channel/0029Vb5VrjIBKfhupmYwBb1h

> 🤖 ᴠɪᴇᴡ ᴄᴍᴅs ʙᴇʟᴏᴡ
            `;

            await socket.sendMessage(m.chat, {
                image: { url: 'https://files.catbox.moe/9gn6lm.jpg' },
                caption: `> 🔮 *MaraX-Md Menu* 🔮\n${menuText}`,
                buttons: [
                    { buttonId: 'menu', buttonText: { displayText: 'Refresh' }, type: 1 },
                    { buttonId: 'alive', buttonText: { displayText: 'Alive' }, type: 1 }
                ],
                headerType: 1
            }, { quoted: m });
        }
    },
    {
        name: 'ping',
        description: 'Check bot response time',
        async execute(socket, m) {
            const start = Date.now();
            await socket.sendMessage(m.chat, { text: 'Pong!' }, { quoted: m });
            const end = Date.now();
            await socket.sendMessage(m.chat, {
                text: `🏓 Latency: ${end - start}ms`
            }, { quoted: m });
        }
    },
    {
        name: 'repo',
        aliases: ['sc', 'script'],
        description: 'Get the bot repository',
        async execute(socket, m) {
            await socket.sendMessage(m.chat, {
                image: { url: 'https://files.catbox.moe/9gn6lm.jpg' },
                caption: `
╭──〔 🚀 *MaraX-Md ʀᴇᴘᴏ* 〕──
│
├─ 𖥸 *ɴᴀᴍᴇ*   : MaraX-Md
├─ ⭐ *sᴛᴀʀs*    : ★
├─ 🍴 *ғᴏʀᴋs*    : ★
├─ 👑 *ᴏᴡɴᴇʀ*   : Iceback Master Tech
├─ 📜 *ᴅᴇsᴄ* : Open-source WhatsApp bot
│
╰──〔 *ᴅᴇᴠ Iceback Master Tech* 〕──
`
            }, { quoted: m });
        }
    }
    // ➕ Add all your other commands here (exactly the same format)
];

module.exports = { commands };
