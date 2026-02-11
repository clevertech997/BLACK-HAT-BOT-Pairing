const express = require("express")
const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys")

const app = express()
const PORT = process.env.PORT || 10000

app.get("/", (req, res) => {
    res.send("🟢 BLACK HAT BOT Pairing Server Running!")
})

app.get("/code", async (req, res) => {
    const number = req.query.number

    if (!number) {
        return res.json({ error: "Number is required" })
    }

    try {
        const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${number}`)

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
