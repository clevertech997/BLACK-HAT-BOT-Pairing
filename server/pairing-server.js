// pairing-server.js
const express = require('express');
const cors = require('cors');
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const pino = require("pino");
const NodeCache = require("node-cache");

const app = express();
const port = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

let sock; // WhatsApp socket
let authState;

// Initialize WhatsApp connection
async function startWhatsApp() {
    try {
        const { version } = await fetchLatestBaileysVersion();
        authState = await useMultiFileAuthState("./session");

        sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            auth: {
                creds: authState.state.creds,
                keys: makeCacheableSignalKeyStore(authState.state.keys, pino({ level: 'fatal' }).child({ level: 'fatal' }))
            },
            keepAliveIntervalMs: 10000
        });

        sock.ev.on('creds.update', authState.saveCreds);
        console.log("🟢 WhatsApp socket connected!");
    } catch (err) {
        console.error("Failed to start WhatsApp:", err);
        setTimeout(startWhatsApp, 5000); // Retry after 5s
    }
}

// Start WhatsApp
startWhatsApp();

// NodeCache to prevent spamming
const msgRetryCounterCache = new NodeCache();

// Route: Generate Pair Code
app.get('/code', async (req, res) => {
    const number = req.query.number;
    if(!number) return res.json({ error: "Number required" });

    try {
        if(!sock) return res.json({ error: "WhatsApp socket not ready yet" });

        // Clean number
        const cleanNumber = number.replace(/\D/g, '');

        // Request pairing code from WhatsApp
        const pairingCode = await sock.requestPairingCode(cleanNumber);

        // Format code nicely
        const formatted = pairingCode?.match(/.{1,4}/g)?.join("-") || pairingCode;
        res.json({ code: formatted });
    } catch (err) {
        console.error(err);
        res.json({ error: "Failed to generate code" });
    }
});

// Health check
app.get('/', (req,res) => {
    res.send("🟢 BLACK HAT BOT Pairing Server Running!");
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
