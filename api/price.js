const https = require('https');

export default function handler(req, res) {
  const ticker = ((req.query.ticker) || '').toUpperCase().trim();
  const isAccion = req.query.type === 'accion';

  if (!ticker) {
    return res.status(400).json({ error: 'No ticker' });
  }

  const symbol = isAccion ? ticker + '.BA' : ticker;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;

  const request = https.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
    }
  }, (response) => {
    let data = '';
    response.on('data', chunk => { data += chunk; });
    response.on('end', () => {
      try {
        const json = JSON.parse(data);
        const price = json.chart?.result?.[0]?.meta?.regularMarketPrice || null;
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.status(200).json({ price, symbol });
      } catch (e) {
        res.status(200).json({ price: null });
      }
    });
  });

  request.on('error', () => res.status(200).json({ price: null }));
  request.setTimeout(8000, () => { request.destroy(); res.status(200).json({ price: null }); });
}
