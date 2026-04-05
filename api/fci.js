const PLATFORM_MAP = [
  { platform: 'Mercado Pago',  keywords: ['mercado fondo', 'mercadofondo'],           color: '#009ee3', icon: 'MP' },
  { platform: 'Ualá',          keywords: ['ualintec', 'uala'],                         color: '#f7c000', icon: 'UAL'},
  { platform: 'Naranja X',     keywords: ['naranja'],                                  color: '#ff6200', icon: 'NAX'},
  { platform: 'Personal Pay',  keywords: ['delta pesos', 'personal pay'],              color: '#00bcd4', icon: 'PP' },
  { platform: 'Claro Pay',     keywords: ['sbs ahorro', 'claro pay'],                  color: '#e53935', icon: 'CLA'},
  { platform: 'Brubank',       keywords: ['brubank', 'bru '],                          color: '#6c2bd9', icon: 'BRU'},
  { platform: 'FIMA (Galicia)',keywords: ['fima premium', 'fima ahorro', 'galicia'],   color: '#007d3c', icon: 'FIM'},
  { platform: 'Santander',     keywords: ['super ahorro'],                             color: '#e31837', icon: 'SAN'},
  { platform: 'BBVA',          keywords: ['frances', 'bbva'],                          color: '#004c97', icon: 'BBV'},
  { platform: 'Macro',         keywords: ['max money market', 'macro ahorro'],         color: '#f5a623', icon: 'MAC'},
  { platform: 'Prex',          keywords: ['allaria ahorro', 'prex'],                   color: '#00c9a7', icon: 'PRX'},
  { platform: 'IEB+',          keywords: ['ieb ahorro', 'adcap ahorro'],               color: '#1565c0', icon: 'IEB'},
  { platform: 'Cocos',         keywords: ['cocos'],                                    color: '#8e44ad', icon: 'COC'},
  { platform: 'Lemon',         keywords: ['lemon'],                                    color: '#f9ca24', icon: 'LEM'},
  { platform: 'Balanz',        keywords: ['balanz money market'],                      color: '#1a1a2e', icon: 'BAL'},
];

const API_BASE = 'https://api.argentinadatos.com/v1/finanzas/fci/mercadoDinero';

async function fetchJSON(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
  });
  if (!res.ok) throw new Error('API returned ' + res.status);
  return res.json();
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=1800');

  try {
    const [ultimo, penultimo] = await Promise.all([
      fetchJSON(API_BASE + '/ultimo'),
      fetchJSON(API_BASE + '/penultimo'),
    ]);

    if (!Array.isArray(ultimo) || !Array.isArray(penultimo)) {
      return res.status(200).json({ rates: [], error: 'Invalid API response' });
    }

    const prevMap = {};
    penultimo.forEach(fund => {
      if (fund.fondo && fund.vcp != null) {
        prevMap[fund.fondo] = { vcp: fund.vcp, fecha: fund.fecha };
      }
    });

    const matched = [];
    const usedPlatforms = new Set();

    ultimo.forEach(fund => {
      if (fund.vcp == null || !fund.fondo || !fund.fecha) return;

      const nameLower = fund.fondo.toLowerCase();

      const platform = PLATFORM_MAP.find(p =>
        p.keywords.some(k => nameLower.includes(k))
      );
      if (!platform || usedPlatforms.has(platform.platform)) return;

      const vcpHoy = parseFloat(fund.vcp);
      const prev = prevMap[fund.fondo];
      if (!prev) return;
      const vcpAnt = parseFloat(prev.vcp);

      if (!vcpHoy || !vcpAnt || vcpAnt <= 0) return;

      const fechaUlt = new Date(fund.fecha);
      const fechaPen = new Date(prev.fecha);
      const diffDays = Math.max(1, Math.round((fechaUlt - fechaPen) / 86400000));

      const dailyReturn = (vcpHoy - vcpAnt) / vcpAnt;
      const tna = (dailyReturn / diffDays) * 365 * 100;

      if (tna > 0 && tna < 500) {
        usedPlatforms.add(platform.platform);
        matched.push({
          platform: platform.platform,
          icon:     platform.icon,
          color:    platform.color,
          tna:      Math.round(tna * 100) / 100,
          tea:      Math.round((Math.pow(1 + tna / 100 / 365, 365) - 1) * 10000) / 100,
          fondo:    fund.fondo,
          fecha:    fund.fecha,
        });
      }
    });

    matched.sort((a, b) => b.tna - a.tna);

    res.status(200).json({ rates: matched, updatedAt: new Date().toISOString() });

  } catch (err) {
    res.status(200).json({ rates: [], error: err.message });
  }
};
