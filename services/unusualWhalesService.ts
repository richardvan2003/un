
import { AnalysisPacket, GexDataPoint, PriceLevelVolume, MarketTidePoint } from '../types';

interface UWSpotExposureResponsePoint {
  time: string;
  exposure?: any;
  price?: any;
  exposure_1dte?: any;
  exposure_1dte_oi?: any;
  wall_1dte?: any;
  block_1dte?: any;
  drive_1dte?: any;
  oi?: any;
}

const parseSafeNumber = (val: any, fallback: number = 0): number => {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'number') return Number.isFinite(val) ? val : fallback;
  const parsed = parseFloat(String(val).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
};

export class APIError extends Error {
  constructor(public message: string, public status?: number, public code?: string) {
    super(message);
    this.name = 'APIError';
  }
}

const calculateVolatilityTrigger = (
  currentPrice: number,
  currentGex: number,
  gexChange: number,
  priceLevels: PriceLevelVolume[]
): number => {
  if (!priceLevels || priceLevels.length === 0) return Math.round(currentPrice);
  const hvn = [...priceLevels].sort((a, b) => b.total_volume - a.total_volume)[0].price;
  let vt = hvn;
  if (currentGex >= 0) vt = Math.min(currentPrice, hvn) - 5;
  else vt = Math.max(currentPrice, hvn) + 5;
  return Math.round(vt);
};

export const fetchUWMarketData = async (ticker: string, apiKey: string): Promise<AnalysisPacket | null> => {
  if (!apiKey) return null;
  const authHeader = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`;
  
  try {
    const [exposureRes, tideRes, levelsRes] = await Promise.all([
      fetch(`https://api.unusualwhales.com/api/stock/${ticker}/spot-exposures`, { headers: { 'Authorization': authHeader } }),
      fetch(`https://api.unusualwhales.com/api/market/market-tide`, { headers: { 'Authorization': authHeader } }),
      fetch(`https://api.unusualwhales.com/api/stock/${ticker}/option/stock-price-levels`, { headers: { 'Authorization': authHeader } })
    ]);

    if (!exposureRes.ok) throw new APIError("Exposure Fetch Fail");

    const exposureJson = await exposureRes.json();
    const tideJson = await tideRes.json();
    const levelsJson = await levelsRes.json();

    const dataPoints = Array.isArray(exposureJson) ? exposureJson : (exposureJson.data || []);
    const sorted = dataPoints.sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());
    const latest = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2] || latest;
    const currentPrice = parseSafeNumber(latest.price);

    const levels: PriceLevelVolume[] = (levelsJson.data || []).map((item: any) => {
      const cv = parseSafeNumber(item.call_volume);
      const pv = parseSafeNumber(item.put_volume);
      return {
        price: parseSafeNumber(item.price),
        call_volume: cv,
        put_volume: pv,
        total_volume: cv + pv,
        net_gex: (cv - pv) * ( (cv+pv) / 1000 )
      };
    }).filter((l: any) => Math.abs(l.price - currentPrice) / currentPrice < 0.05);

    // Identify King Strike
    const kingStrike = levels.length > 0 
      ? [...levels].sort((a, b) => Math.abs(b.net_gex) - Math.abs(a.net_gex))[0].price 
      : undefined;

    // Identify Zero Gamma (Flip Point) - Level where net_gex is closest to zero
    const zeroGamma = levels.length > 0
      ? [...levels].sort((a, b) => Math.abs(a.net_gex) - Math.abs(b.net_gex))[0].price
      : undefined;

    const currentGex = parseSafeNumber(latest.exposure);
    const tideLatest = tideJson.data ? tideJson.data[tideJson.data.length - 1] : null;

    return {
      ticker: ticker.toUpperCase(),
      timestamp: latest.time,
      current_price: Number(currentPrice.toFixed(2)),
      current_gex_vol: Math.round(currentGex),
      current_gex_oi: Math.round(parseSafeNumber(latest.oi)),
      gex_vol_change_rate: Math.round(currentGex - parseSafeNumber(prev.exposure)),
      current_1dte_vol: Math.round(parseSafeNumber(latest.exposure_1dte)),
      current_1dte_oi: Math.round(parseSafeNumber(latest.exposure_1dte_oi)),
      gex_1dte_wall: Math.round(parseSafeNumber(latest.wall_1dte)),
      gex_1dte_block: Math.round(parseSafeNumber(latest.block_1dte)),
      gex_1dte_drive: parseSafeNumber(latest.drive_1dte),
      volatility_trigger: calculateVolatilityTrigger(currentPrice, currentGex, 0, levels),
      hvn_price: levels.length > 0 ? [...levels].sort((a, b) => b.total_volume - a.total_volume)[0].price : undefined,
      king_strike: kingStrike,
      zero_gamma: zeroGamma,
      trend_data: sorted.slice(-50).map((p: any) => ({
        time: p.time,
        price: parseSafeNumber(p.price),
        gamma_per_one_percent_move_vol: parseSafeNumber(p.exposure),
        gamma_per_one_percent_move_oi: parseSafeNumber(p.oi)
      })),
      market_tide: tideLatest ? {
        timestamp: tideLatest.timestamp,
        net_call_premium: parseSafeNumber(tideLatest.net_call_premium),
        net_put_premium: parseSafeNumber(tideLatest.net_put_premium),
        net_volume: tideLatest.net_volume
      } : undefined,
      price_levels: levels
    };
  } catch (error) { throw error; }
};