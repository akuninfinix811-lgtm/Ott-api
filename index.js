const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'kunci_rahasia_bebas_diubah';

module.exports = async (req, res) => {
  const { type, url, token } = req.query;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  // Mode 1: Mengambil Segmen TS
  if (type === 'segment') {
    if (!url || !token) return res.status(400).send('Parameter tidak lengkap');
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.ip && decoded.ip !== clientIp) return res.status(403).send('IP Tidak Sesuai');
    } catch (err) {
      return res.status(403).send('Token Kadaluwarsa/Salah');
    }

    try {
      const segmentResponse = await fetch(decodeURIComponent(url));
      const arrayBuffer = await segmentResponse.arrayBuffer();
      res.setHeader('Content-Type', segmentResponse.headers.get('content-type') || 'video/mp2t');
      return res.status(200).send(Buffer.from(arrayBuffer));
    } catch (error) {
      return res.status(500).send('Gagal mengambil segmen');
    }
  }

  // Mode 2: Mengambil Playlist M3U (Default Route)
  const ORIGINAL_M3U_URL = 'https://sabutv.com/server/event.m3u8?ch=2&proxy=1'; // GANTI LINK M3U ASLI DI SINI
  
  try {
    const response = await fetch(ORIGINAL_M3U_URL);
    const m3uText = await response.text();

    const lines = m3uText.split('\n');
    const rewrittenLines = lines.map((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const tsToken = jwt.sign({ ip: clientIp }, JWT_SECRET, { expiresIn: '2m' });
        const segmentName = encodeURIComponent(trimmed);
        return `https://${req.headers.host}/?type=segment&url=${segmentName}&token=${tsToken}`;
      }
      return line;
    });

    res.setHeader('Content-Type', 'audio/x-mpegurl');
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(200).send(rewrittenLines.join('\n'));
  } catch (error) {
    return res.status(500).send('Gagal mengambil playlist M3U');
  }
};
