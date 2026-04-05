export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300');

  const ticker = (req.query.ticker || '').toUpperCase().trim();
  const isAccion = req.query.type === 'accion';

  if (!ticker) {
    return res.status(400).json({ error: 'No ticker' });
  }

  const symbol = isAccion ? ticker + '.BA' : ticker;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(200).json({ price: null, symbol: symbol });
    }

    const json = await response.json();
    const price = json.chart &&
                  json.chart.result &&
                  json.chart.result[0] &&
                  json.chart.result[0].meta &&
                  json.chart.result[0].meta.regularMarketPrice;

    res.status(200).json({ price: price || null, symbol: symbol });

  } catch (err) {
    res.status(200).json({ price: null, symbol: symbol });
  }
}
