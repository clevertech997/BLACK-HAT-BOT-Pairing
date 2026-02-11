const express = require("express")
const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys")
const path = require("path")
const fs = require("fs")

const app = express()
const PORT = process.env.PORT || 10000

app.get("/", (req, res) => {
    res.send("🟢 BLACK HAT BOT Multi-Session Pairing Server Running!")
})

app.get("/code", async (req, res) => {
    const number = req.query.number

    if (!number) {
        return res.json({ error: "Number is required" })
    }

    try {
        const sessionPath = path.join(__dirname, `../sessions/${number}`)

        if (!fs.existsSync(sessionPath)) {
            fs.mkdirSync(sessionPath, { recursive: true })
        }

        const { state, saveCreds } = await useMultiFileAuthState(sessionPath)

        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false
        })

        sock.ev.on("creds.update", saveCreds)

        const code = await sock.requestPairingCode(number)

        res.json({ code })

    } catch (err) {
        console.log(err)
        res.json({ error: "Failed to generate code" })
    }
})

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})
