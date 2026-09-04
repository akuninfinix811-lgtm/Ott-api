const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'kunci_rahasia_bebas_diubah';

export default async function handler(req, res) {
  const { token } = req.query;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (token) {
    try {
      jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(403).send('Akses Ditolak: Token M3U Tidak Valid / Kedaluwarsa');
    }
  }

  // Ganti dengan URL M3U Asli Anda
  const ORIGINAL_M3U_URL = 'https://sabutv.com/server/event.m3u8?ch=960&proxy=1';
  
  try {
    const response = await fetch(ORIGINAL_M3U_URL);
    const m3uText = await response.text();

    const lines = m3uText.split('\n');
    const rewrittenLines = lines.map((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const tsToken = jwt.sign({ ip: clientIp }, JWT_SECRET, { expiresIn: '2m' });
        const segmentName = encodeURIComponent(trimmed);
        return `https://${req.headers.host}/api/segment?url=${segmentName}&token=${tsToken}`;
      }
      return line;
    });

    res.setHeader('Content-Type', 'audio/x-mpegurl');
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(200).send(rewrittenLines.join('\n'));
  } catch (error) {
    return res.status(500).send('Gagal mengambil playlist M3U');
  }
}
