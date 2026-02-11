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
