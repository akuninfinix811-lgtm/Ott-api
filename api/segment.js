const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'kunci_rahasia_bebas_diubah';

module.exports = async (req, res) => {
  const { url, token } = req.query;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (!url || !token) {
    return res.status(400).send('Parameter tidak lengkap');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.ip && decoded.ip !== clientIp) {
      return res.status(403).send('Akses Ditolak: IP Tidak Sesuai');
    }
  } catch (err) {
    return res.status(403).send('Akses Ditolak: Token Kadaluwarsa');
  }

  try {
    const segmentResponse = await fetch(decodeURIComponent(url));
    const arrayBuffer = await segmentResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', segmentResponse.headers.get('content-type') || 'video/mp2t');
    return res.status(200).send(buffer);
  } catch (error) {
    return res.status(500).send('Gagal mengambil segmen video');
  }
};
