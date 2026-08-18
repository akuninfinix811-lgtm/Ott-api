const express = require('express');
const axios = require('axios');
const iptvParser = require('iptv-playlist-parser');
const cors = require('cors');

const app = express();
app.use(cors());

const PLAYLIST_URL = 'https://bit.ly/4hxA9xQ';

app.get('/api/channels', async (req, res) => {
    try {
        const response = await axios.get(PLAYLIST_URL, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const parsed = iptvParser.parse(response.data);
        const channels = parsed.items.map((item, index) => ({
            id: index + 1,
            name: item.name,
            logo: item.tvg.logo || '',
            streamUrl: item.url
        }));
        res.json({ status: 'success', data: channels });
    } catch (err) {
        res.status(500).json({ status: 'error', message: 'Gagal muat playlist' });
    }
});

app.get('/api/proxy', async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).send('URL dibutuhkan');

    try {
        const stream = await axios({
            method: 'get',
            url: videoUrl,
            responseType: 'stream',
            headers: {
                'User-Agent': 'IPTVSmarters/1.0.0',
                'Referer': videoUrl
            }
        });
        res.set('Content-Type', stream.headers['content-type'] || 'application/x-mpegURL');
        stream.data.pipe(res);
    } catch (err) {
        res.status(500).send('Stream error');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server aktif di port ${PORT}`));
