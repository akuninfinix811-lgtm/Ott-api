const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());

// Daftar Channel TV
const channels = [
  {
    id: '1',
    name: 'SCTV HD',
    streamUrl: 'https://live.video.id/sctv.m3u8'
  },
  {
    id: '2',
    name: 'Indosiar HD',
    streamUrl: 'https://live.video.id/indosiar.m3u8'
  },
  {
    id: '3',
    name: 'Trans TV',
    streamUrl: 'https://live.video.id/transtv.m3u8'
  },
  {
    id: '4',
    name: 'Trans 7',
    streamUrl: 'https://live.video.id/trans7.m3u8'
  }
];

// Endpoint ambil daftar channel
app.get('/api/channels', (req, res) => {
  res.json({
    status: 'success',
    data: channels
  });
});

// Endpoint Proxy Video Stream (Bypass CORS)
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
      timeout: 8000
    });

    res.set(response.headers);
    response.data.pipe(res);
  } catch (error) {
    res.status(500).send('Error streaming media');
  }
});

module.exports = app;
