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

    // 2. PARSER CLEARKEY JOS (Hanya ambil jika ada kata clearkey / key / kodex / drm)
    if (line.toLowerCase().includes('clearkey') || line.toLowerCase().includes('kodex') || line.toLowerCase().includes('key')) {
      const hexMatches = line.match(/[a-f0-9]{32}/gi);
      if (hexMatches && hexMatches.length >= 2) {
        currentKeys = {};
        // hexMatches[0] = KID murni, hexMatches[1] = Key murni
        currentKeys[hexMatches[0].toLowerCase()] = hexMatches[1].toLowerCase();
      }
    }

    // 3. Ambil Stream URL
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
