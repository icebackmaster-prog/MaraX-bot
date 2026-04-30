const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const PORT = process.env.PORT || 8000;

const { router, startBot, loadCommands, watchCommands } = require('./pair');
const fs = require('fs-extra');
const path = require('path');

// Serve the static HTML pages
app.use('/pair', (req, res) => res.sendFile(path.join(__dirname, 'pair.html')));
app.use('/', (req, res) => res.sendFile(path.join(__dirname, 'main.html')));

// Pairing code endpoint
app.use('/code', router);

// Manual start bot via POST (optional)
app.post('/start', bodyParser.json(), async (req, res) => {
    const { number } = req.body;
    if (!number) return res.status(400).json({ error: 'Number required' });
    try {
        await startBot(number);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`MaraX-Md server running on http://0.0.0.0:${PORT}`);
});

// Load commands and start file watcher
loadCommands().then(() => watchCommands());

// Auto-start any numbers saved in numbers.json
async function autoStartBots() {
    if (await fs.pathExists('./numbers.json')) {
        const numbers = await fs.readJson('./numbers.json');
        for (const num of numbers) {
            await startBot(num.replace(/[^0-9]/g, ''));
        }
    }
}
autoStartBots();
