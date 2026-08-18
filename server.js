const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());

const PLAYLIST_URL = 'https://bit.ly/4hxA9xQ';

function parseM3U(m3uContent) {
  const lines = m3uContent.split('\n');
  const channels = [];
  let currentName = '';
  let currentKeys = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 1. Ambil Nama Channel
    if (line.startsWith('#EXTINF:')) {
      const nameMatch = line.match(/,(.+)$/);
      if (nameMatch) currentName = nameMatch[1].trim();
    } 

    // 2. Ambil ClearKey (Hanya mencari pasangan 32-hex : 32-hex)
    if (line.includes(':') && !line.startsWith('http')) {
      const keyMatch = line.match(/([a-f0-9]{32}):([a-f0-9]{32})/i);
      if (keyMatch) {
        currentKeys = {};
        // keyMatch[1] = Key ID murni, keyMatch[2] = Key murni
        currentKeys[keyMatch[1].toLowerCase()] = keyMatch[2].toLowerCase();
      }
    }

    // 3. Ambil URL Stream MPD / M3U8
    if (line.startsWith('http://') || line.startsWith('https://')) {
      if (currentName) {
        channels.push({
          id: String(channels.length + 1),
          name: currentName,
          streamUrl: line,
          clearkey: currentKeys
        });
        currentName = '';
        currentKeys = null;
      }
    }
  }
  return channels;
}

app.get('/api/channels', async (req, res) => {
  try {
    const response = await axios.get(PLAYLIST_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000
    });
    const channels = parseM3U(response.data);
    res.json({ status: 'success', total: channels.length, data: channels });
  } catch (error) {
    res.status(500).json({ status: 'error' });
  }
});

app.get('/api/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('URL required');

  try {
    const response = await axios.get(targetUrl, {
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': targetUrl
      },
      timeout: 10000
    });
    res.set(response.headers);
    response.data.pipe(res);
  } catch (error) {
    res.status(500).send('Error proxy');
  }
});

module.exports = app;
