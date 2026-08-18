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
  let currentKey = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#EXTINF:')) {
      const nameMatch = line.match(/,(.+)$/);
      if (nameMatch) currentName = nameMatch[1].trim();
    } else if (line.includes('KODEX') || line.includes('clearkey')) {
      try {
        const keyMatch = line.match(/([a-f0-9]{32}):([a-f0-9]{32})/i);
        if (keyMatch) {
          currentKey = {};
          currentKey[keyMatch[1]] = keyMatch[2];
        }
      } catch (e) {}
    } else if (line.startsWith('http://') || line.startsWith('https://')) {
      if (currentName) {
        channels.push({
          id: String(channels.length + 1),
          name: currentName,
          streamUrl: line,
          clearkey: currentKey
        });
        currentName = '';
        currentKey = null;
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

// Halaman khusus Player MPD/HLS
app.get('/player', (req, res) => {
  const url = req.query.url;
  const key = req.query.key; // Format JSON Key jika ada

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body, html { margin:0; padding:0; width:100%; height:100%; background:#000; overflow:hidden; }
        video { width:100%; height:100%; object-fit:contain; }
      </style>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/shaka-player/4.3.5/shaka-player.compiled.js"></script>
    </head>
    <body>
      <video id="video" controls autoplay></video>
      <script>
        async function init() {
          shaka.polyfill.installAll();
          const video = document.getElementById('video');
          const player = new shaka.Player(video);

          ${key ? `player.configure({ drm: { clearKeys: ${key} } });` : ''}

          try {
            await player.load('${url}');
          } catch(e) {
            console.error('Error load stream', e);
          }
        }
        document.addEventListener('DOMContentLoaded', init);
      </script>
    </body>
    </html>
  `);
});

module.exports = app;
