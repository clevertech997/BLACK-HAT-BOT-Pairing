require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const pino = require('pino');
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Store connected clients
let clients = {};

// Socket.IO events
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('register', (userId) => {
        clients[userId] = socket.id;
        console.log(`User registered: ${userId}`);
    });

    socket.on('sendMessage', ({ to, message }) => {
        const clientSocket = clients[to];
        if (clientSocket) io.to(clientSocket).emit('message', { from: 'bot', message });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        for (let key in clients) if (clients[key] === socket.id) delete clients[key];
    });
});

// Basic pairing code API
app.get('/code', async (req, res) => {
    const number = req.query.number;
    if (!number) return res.status(400).json({ error: "Number is required" });

    try {
        let cleanNumber = number.replace(/[^0-9]/g, '');
        const { version } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState('./session-temp');

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            auth: state
        });

        // Request pairing code
        let code = await sock.requestPairingCode(cleanNumber);
        code = code?.match(/.{1,4}/g)?.join("-") || code;

        // Emit QR to connected clients
        if (clients[cleanNumber]) {
            io.to(clients[cleanNumber]).emit('qr', { qr: code });
        }

        res.json({ code });

        sock.ev.removeAllListeners();
        sock.ws.close();
        saveCreds();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to generate code" });
    }
});

app.get('/', (req, res) => res.send('🟢 BLACK HAT BOT Pairing Server Running!'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
