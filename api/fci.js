const PLATFORM_MAP = [
  { platform: 'Mercado Pago',  keywords: ['mercado fondo', 'mercadofondo'],           color: '#009ee3', icon: 'MP' },
  { platform: 'Ualá',          keywords: ['ualintec', 'uala'],                         color: '#f7c000', icon: 'UAL'},
  { platform: 'Naranja X',     keywords: ['naranja'],                                  color: '#ff6200', icon: 'NAX'},
  { platform: 'Personal Pay',  keywords: ['delta pesos', 'personal pay'],              color: '#00bcd4', icon: 'PP' },
  { platform: 'Claro Pay',     keywords: ['sbs ahorro', 'claro pay'],                  color: '#e53935', icon: 'CLA'},
  { platform: 'Brubank',       keywords: ['brubank', 'bru '],                          color: '#6c2bd9', icon: 'BRU'},
  { platform: 'FIMA (Galicia)',keywords: ['fima', 'galicia ahorro', 'galicia pesos'],  color: '#007d3c', icon: 'FIM'},
  { platform: 'Santander',     keywords: ['santander super', 'super ahorro'],          color: '#e31837', icon: 'SAN'},
  { platform: 'BBVA',          keywords: ['frances', 'bbva', 'frances ahorro'],        color: '#004c97', icon: 'BBV'},
  { platform: 'Macro',         keywords: ['macro ahorro', 'fondomax'],                 color: '#f5a623', icon: 'MAC'},
  { platform: 'Prex',          keywords: ['allaria ahorro', 'prex'],                   color: '#00c9a7', icon: 'PRX'},
  { platform: 'IEB+',          keywords: ['ieb ahorro', 'adcap ahorro'],               color: '#1565c0', icon: 'IEB'},
  { platform: 'Cocos',         keywords: ['cocos'],                                    color: '#8e44ad', icon: 'COC'},
  { platform: 'Lemon',         keywords: ['lemon', 'lemon cash'],                      color: '#f9ca24', icon: 'LEM'},
];

function calcTNA(cp1, cp2, days) {
  if (!cp1 || !cp2 || !days || days === 0) return null;
  const dailyReturn = (cp2 - cp1) / cp1;
  return (dailyReturn / days) * 365 * 100;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=1800');

  try {
    const response = await fetch('https://api.argentinadatos.com/v1/finanzas/fci/mercadoDinero/ultimo', {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    });

    if (!response.ok) throw new Error('ArgentinaDatos returned ' + response.status);

    const data = await response.json();

    if (!Array.isArray(data)) {
      return res.status(200).json({ rates: [], error: 'No data' });
    }

    const matched = [];
    const usedPlatforms = new Set();

    data.forEach(fund => {
      const nameLower = (fund.nombre || '').toLowerCase();
      const platform = PLATFORM_MAP.find(p =>
        p.keywords.some(k => nameLower.includes(k))
      );
      if (!platform || usedPlatforms.has(platform.platform)) return;

      const vcp = parseFloat(fund.vcp || fund.valorCuotaparte || 0);
      const vcpAnt = parseFloat(fund.vcpAnterior || fund.valorCuotaparteAnterior || 0);
      const dias = parseInt(fund.diasHabiles || fund.dias || 1);

      let tna = null;
      if (vcp && vcpAnt) {
        tna = calcTNA(vcpAnt, vcp, dias);
      } else if (fund.tna) {
        tna = parseFloat(fund.tna);
      }

      if (tna && tna > 0 && tna < 500) {
        usedPlatforms.add(platform.platform);
        matched.push({
          platform: platform.platform,
          icon:     platform.icon,
          color:    platform.color,
          tna:      Math.round(tna * 100) / 100,
          tea:      Math.round((Math.pow(1 + tna / 100 / 365, 365) - 1) * 10000) / 100,
          fondo:    fund.nombre,
          fecha:    fund.fecha,
        });
      }
    });

    matched.sort((a, b) => b.tna - a.tna);

    res.status(200).json({ rates: matched, updatedAt: new Date().toISOString() });

  } catch (err) {
    res.status(200).json({ rates: [], error: err.message });
  }
}
