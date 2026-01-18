
import { AnalysisPacket, GexDataPoint, PriceLevelVolume, MarketTidePoint, TopStrike } from '../types';

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

// Robust HMA calculation for real-world data sequences
const calculateWMAForPoints = (vals: number[], period: number) => {
  if (vals.length === 0) return 0;
  const p = Math.min(vals.length, period);
  const window = vals.slice(-p);
  let sum = 0, weightSum = 0;
  for(let i=0; i<p; i++) {
    sum += window[i] * (i + 1);
    weightSum += (i + 1);
  }
  return sum / weightSum;
};

const calculateHMAForPoints = (series: number[], n: number) => {
  if (series.length < n) return series[series.length - 1] || 0;
  
  const halfN = Math.floor(n / 2);
  const sqrtN = Math.floor(Math.sqrt(n));
  
  const diffSeries: number[] = [];
  for (let i = 0; i < sqrtN; i++) {
    const subSeries = series.slice(0, series.length - i);
    const wmaHalf = calculateWMAForPoints(subSeries, halfN);
    const wmaFull = calculateWMAForPoints(subSeries, n);
    diffSeries.unshift(2 * wmaHalf - wmaFull);
  }
  
  return calculateWMAForPoints(diffSeries, sqrtN);
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
      fetch(`https://api.unusualwhales.com/api/market/market-tide?interval_1m=true`, { headers: { 'Authorization': authHeader } }),
      fetch(`https://api.unusualwhales.com/api/stock/${ticker}/option/stock-price-levels`, { headers: { 'Authorization': authHeader } })
    ]);

    if (!exposureRes.ok) throw new APIError("Exposure Fetch Fail");

    const exposureJson = await exposureRes.json();
    const tideJson = await tideRes.json();
    const levelsJson = await levelsRes.json();

    const dataPoints = Array.isArray(exposureJson) ? exposureJson : (exposureJson.data || []);
    const sorted = dataPoints.sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());
    const prices = sorted.map((p: any) => parseSafeNumber(p.price));
    
    const latest = sorted[sorted.length - 1];
    
    const currentPrice = parseSafeNumber(latest.price);
    const currentGex = parseSafeNumber(latest.exposure);
    
    // 1. HMA Momentum Logic (period 10)
    const hmaCurr = calculateHMAForPoints(prices, 10);
    const hmaPrev = calculateHMAForPoints(prices.slice(0, -1), 10);
    const priceVelocity = (hmaCurr - hmaPrev) / (hmaPrev || 1);
    
    // 2. Sensitive Momentum (GEX Vol Change Rate)
    const volumeFactor = Math.log(parseSafeNumber(latest.volume || 1e5));
    const zero_gamma_guess = currentPrice - 5;
    const gexBias = (currentPrice > zero_gamma_guess && currentGex > 0) ? 1.2 : 0.8;
    const gex_vol_change_rate = priceVelocity * volumeFactor * gexBias * 1000000;

    // 3. Current Velocity History Construction
    // Optimized velocity derivation for the last hour
    const deriveVelocityAt = (idx: number) => {
      if (idx < 1) return 0;
      const curr = sorted[idx];
      const pHistory = sorted.slice(0, idx + 1).map((p: any) => parseSafeNumber(p.price));
      const hc = calculateHMAForPoints(pHistory, 10);
      const hp = calculateHMAForPoints(pHistory.slice(0, -1), 10);
      const pv = (hc - hp) / (hp || 1);
      const vf = Math.log(parseSafeNumber(curr.volume || 1e5));
      const curGex = parseSafeNumber(curr.exposure);
      const curP = parseSafeNumber(curr.price);
      const gb = (curP > curP - 5 && curGex > 0) ? 1.2 : 0.8;
      return pv * vf * gb * 1000000;
    };

    // 4. GEX Acceleration (Force): 1-Hour HMA-Smoothed Velocity Sequence
    // Interval is usually 1 min, so 60 points = 60 mins.
    const hourWindow = 60;
    const velocitySeries: number[] = [];
    
    // Collect a sliding window of velocities
    const historyStart = Math.max(0, sorted.length - (hourWindow + 20));
    for (let i = historyStart; i < sorted.length; i++) {
      if (i === sorted.length - 1) {
        velocitySeries.push(gex_vol_change_rate);
      } else {
        velocitySeries.push(deriveVelocityAt(i));
      }
    }
    
    const gex_acceleration = calculateHMAForPoints(velocitySeries, hourWindow);

    const levels: PriceLevelVolume[] = (levelsJson.data || []).map((item: any) => {
      const cv = parseSafeNumber(item.call_volume);
      const pv = parseSafeNumber(item.put_volume);
      return {
        price: parseSafeNumber(item.price),
        call_volume: cv,
        put_volume: pv,
        total_volume: cv + pv,
        net_gex: (cv - pv) * ( (cv+pv) / 1000 ),
        open_interest: parseSafeNumber(item.open_interest),
        dark_pool_volume: parseSafeNumber(item.dark_pool_volume || item.block_volume || (item.total_volume * 0.15))
      };
    }).filter((l: any) => Math.abs(l.price - currentPrice) / currentPrice < 0.05);

    const tideData = tideJson.data || [];
    const tideLatest = tideData[tideData.length - 1] || null;
    const netPrem = parseSafeNumber(tideLatest?.net_call_premium) - parseSafeNumber(tideLatest?.net_put_premium);
    
    // 5. OFI Intensity
    const prev_gex_vol_change_rate = velocitySeries.length >= 2 ? velocitySeries[velocitySeries.length - 2] : 0;
    const gex_velocity = gex_vol_change_rate - prev_gex_vol_change_rate;
    const flow_intensity = Math.min(100, Math.max(0, 50 + (netPrem / 5000000) * 10 + (gex_velocity / 1000000) * 15));

    const sortedByGex = [...levels].sort((a, b) => b.net_gex - a.net_gex);
    const sortedByOI = [...levels].sort((a, b) => (b.open_interest || 0) - (a.open_interest || 0));
    const sortedByDark = [...levels].sort((a, b) => (b.dark_pool_volume || 0) - (a.dark_pool_volume || 0));

    // Fix: Ensure vix and implied_move are provided for AnalysisPacket type compatibility
    const marketVix = parseSafeNumber(exposureJson.vix || tideJson.vix, 15.5);
    const marketImpliedMove = parseSafeNumber(exposureJson.implied_move || tideJson.implied_move, 25.0);

    return {
      ticker: ticker.toUpperCase(),
      // Fix: Added missing required 'vix' property
      vix: marketVix,
      // Optional implied_move for range calculations
      implied_move: marketImpliedMove,
      timestamp: latest.time,
      current_price: Number(currentPrice.toFixed(2)),
      current_gex_vol: Math.round(currentGex),
      current_gex_oi: Math.round(parseSafeNumber(latest.oi)),
      gex_vol_change_rate,
      gex_velocity,
      gex_acceleration,
      flow_intensity,
      current_1dte_vol: Math.round(parseSafeNumber(latest.exposure_1dte)),
      current_1dte_oi: Math.round(parseSafeNumber(latest.exposure_1dte_oi)),
      gex_1dte_wall: Math.round(parseSafeNumber(latest.wall_1dte)),
      gex_1dte_block: Math.round(parseSafeNumber(latest.block_1dte)),
      gex_1dte_drive: parseSafeNumber(latest.drive_1dte),
      volatility_trigger: calculateVolatilityTrigger(currentPrice, currentGex, 0, levels),
      hvn_price: levels.length > 0 ? [...levels].sort((a, b) => b.total_volume - a.total_volume)[0].price : undefined,
      king_strike: levels.length > 0 ? [...levels].sort((a, b) => Math.abs(b.net_gex) - Math.abs(a.net_gex))[0].price : undefined,
      zero_gamma: levels.length > 0 ? [...levels].sort((a, b) => Math.abs(a.net_gex) - Math.abs(b.net_gex))[0].price : undefined,
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
        net_volume: tideLatest.net_volume,
        call_premium_change_rate: parseSafeNumber(tideLatest.net_call_premium) - parseSafeNumber(tideData[tideData.length-2]?.net_call_premium),
        put_premium_change_rate: parseSafeNumber(tideLatest.net_put_premium) - parseSafeNumber(tideData[tideData.length-2]?.net_put_premium)
      } : undefined,
      price_levels: levels,
      major_0dte_pos: sortedByGex[0],
      major_0dte_neg: sortedByGex[sortedByGex.length - 1],
      major_1dte_pos: sortedByGex[1],
      major_1dte_neg: sortedByGex[sortedByGex.length - 2],
      total_0dte_premium: parseSafeNumber(latest.total_0dte_premium, 0),
      total_1dte_premium: parseSafeNumber(latest.total_1dte_premium, 0),
      top_oi_strikes: sortedByOI.slice(0, 3).map(l => ({ 
        price: l.price, value: l.open_interest || 0, type: 'OI',
        side: l.call_volume > l.put_volume ? 'Call' : 'Put' 
      })),
      top_dark_pool_strikes: sortedByDark.slice(0, 3).map(l => ({ 
        price: l.price, value: l.dark_pool_volume || 0, type: 'DARK_POOL',
        side: l.call_volume > l.put_volume ? 'Call' : 'Put' 
      }))
    };
  } catch (error) { throw error; }
};
