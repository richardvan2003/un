import { GexDataPoint, AnalysisPacket, MarketTidePoint, PriceLevelVolume, TopStrike } from '../types';

let currentPrice = 5240;
let history: GexDataPoint[] = [];

// Hull Moving Average (HMA) Implementation
// HMA = WMA(2*WMA(n/2) - WMA(n), sqrt(n))
const calculateWMA = (series: number[], n: number) => {
  if (series.length === 0) return 0;
  const period = Math.min(series.length, n);
  const window = series.slice(-period);
  let weightSum = 0;
  let weightedSum = 0;
  for (let i = 0; i < period; i++) {
    const weight = i + 1;
    weightedSum += window[i] * weight;
    weightSum += weight;
  }
  return weightedSum / weightSum;
};

const calculateHMA = (series: number[], n: number) => {
  if (series.length < n) return series[series.length - 1] || 0;
  
  const halfN = Math.floor(n / 2);
  const sqrtN = Math.floor(Math.sqrt(n));
  
  // Generate a small series of (2*WMA(n/2) - WMA(n)) to apply the final sqrt(n) WMA smoothing
  const diffSeries: number[] = [];
  for (let i = 0; i < sqrtN; i++) {
    const subSeries = series.slice(0, series.length - i);
    const wmaHalf = calculateWMA(subSeries, halfN);
    const wmaFull = calculateWMA(subSeries, n);
    diffSeries.unshift(2 * wmaHalf - wmaFull);
  }
  
  return calculateWMA(diffSeries, sqrtN);
};

const initHistory = () => {
  const now = Date.now();
  for (let i = 150; i >= 0; i--) {
    const time = new Date(now - i * 3 * 60000).toISOString();
    const price = 5200 + Math.random() * 80;
    const gexVol = (Math.random() - 0.45) * 15000000;
    const gexOi = (Math.random() - 0.2) * 60000000;
    
    const gex1dteVol = (Math.random() - 0.4) * 12000000;
    const gex1dteOi = (Math.random() - 0.1) * 80000000;

    history.push({ 
      time, 
      price, 
      gamma_per_one_percent_move_vol: gexVol, 
      gamma_per_one_percent_move_oi: gexOi,
      gamma_1dte_vol: gex1dteVol,
      gamma_1dte_oi: gex1dteOi,
      net_tide: (Math.random() - 0.5) * 5000000,
      gex_vol_change_rate: 0,
      gex_velocity: (Math.random() - 0.5) * 2000000,
      gex_acceleration: 0,
      flow_intensity: 50,
      gex_1dte_wall: Math.round(price / 25) * 25,
      gex_1dte_block: Math.round(gex1dteOi * 0.15),
      gex_1dte_drive: parseFloat((gex1dteVol / (gex1dteOi || 1) * 100).toFixed(2)),
      net_call_premium: (Math.random() * 10000000) - 5000000,
      net_put_premium: (Math.random() * 10000000) - 5000000
    });
  }
};

initHistory();

export const getLatestMarketData = (): AnalysisPacket => {
  const lastPoint = history[history.length - 1];
  const pricesHistory = history.map(h => h.price);

  const volatility = 1.5;
  const priceChange = (Math.random() - 0.5) * volatility;
  currentPrice = lastPoint.price + priceChange;
  pricesHistory.push(currentPrice);

  const newGexVol = lastPoint.gamma_per_one_percent_move_vol + (Math.random() - 0.5) * 800000;
  const newGexOi = lastPoint.gamma_per_one_percent_move_oi + (Math.random() - 0.5) * 300000;
  
  const sentimentBias = currentPrice > lastPoint.price ? 500000 : -500000;
  const newCallPrem = (lastPoint.net_call_premium || 0) + sentimentBias + (Math.random() - 0.5) * 1000000;
  const newPutPrem = (lastPoint.net_put_premium || 0) - sentimentBias + (Math.random() - 0.5) * 1000000;

  // 1. Ultra-Sensitive Momentum (HMA based)
  const hmaCurr = calculateHMA(pricesHistory, 10);
  const hmaPrev = calculateHMA(pricesHistory.slice(0, -1), 10);
  const priceVelocity = (hmaCurr - hmaPrev) / (hmaPrev || 1);
  
  // 2. GEX Bias Factor
  const zero_gamma_val = Math.round(currentPrice + (newGexVol > 0 ? -10 : 10));
  const gexBias = (currentPrice > zero_gamma_val && newGexVol > 0) ? 1.2 : 0.8;
  
  // 3. Simulated Volume Log Scale
  const simulatedVolume = Math.exp(Math.random() * 5 + 10); 
  const volumeFactor = Math.log(simulatedVolume);
  
  // 4. Combined Sensitive Momentum (GEX Vol Change Rate - MOM)
  const gex_vol_change_rate = priceVelocity * gexBias * volumeFactor * 10000000;

  // 5. GEX Velocity (Change in Momentum)
  const prev_change_rate = lastPoint.gex_vol_change_rate || 0;
  const gex_velocity = gex_vol_change_rate - prev_change_rate;

  // 6. REFINED GEX FORCE (Acceleration): 1-Hour HMA-Smoothed Velocity
  // Mock interval is 3 mins, so 20 points = 60 mins.
  const hourWindow = 20; 
  const historicalVelocities = history.slice(-(hourWindow + 10)).map(h => h.gex_velocity || 0);
  historicalVelocities.push(gex_velocity);
  
  const gex_acceleration = calculateHMA(historicalVelocities, hourWindow);
  
  // 7. Order Flow Imbalance (OFI)
  const callDelta = newCallPrem - (lastPoint.net_call_premium || 0);
  const putDelta = newPutPrem - (lastPoint.net_put_premium || 0);
  const ofi = (callDelta - putDelta) / (Math.abs(callDelta) + Math.abs(putDelta) || 1);
  const flow_intensity = Math.min(100, Math.max(0, 50 + ofi * 50));

  // 8. Price Levels and Institutional Data
  const price_levels: PriceLevelVolume[] = [];
  const basePrice = Math.round(currentPrice / 5) * 5;
  for (let i = -15; i <= 15; i++) {
    const p = basePrice + i * 5;
    const cv = Math.random() * 50000;
    const pv = Math.random() * 50000;
    price_levels.push({
      price: p,
      call_volume: cv,
      put_volume: pv,
      total_volume: cv + pv,
      net_gex: (cv - pv) * 1000000,
      call_premium: cv * (Math.random() * 500),
      put_premium: pv * (Math.random() * 500),
      open_interest: Math.floor(Math.random() * 100000),
      dark_pool_volume: Math.floor(Math.random() * 20000)
    });
  }

  const sortedByGex = [...price_levels].sort((a, b) => b.net_gex - a.net_gex);
  const sortedByOI = [...price_levels].sort((a, b) => (b.open_interest || 0) - (a.open_interest || 0));
  const sortedByDark = [...price_levels].sort((a, b) => (b.dark_pool_volume || 0) - (a.dark_pool_volume || 0));

  const newPoint: GexDataPoint = {
    time: new Date().toISOString(),
    price: currentPrice,
    gamma_per_one_percent_move_vol: newGexVol,
    gamma_per_one_percent_move_oi: newGexOi,
    gamma_1dte_vol: (lastPoint.gamma_1dte_vol || 0) + (Math.random() - 0.5) * 600000,
    gamma_1dte_oi: (lastPoint.gamma_1dte_oi || 0) + (Math.random() - 0.5) * 500000,
    net_tide: newCallPrem - newPutPrem,
    gex_vol_change_rate,
    gex_velocity,
    gex_acceleration,
    flow_intensity,
    gex_1dte_wall: Math.round(currentPrice / 25) * 25,
    gex_1dte_block: Math.round(newGexOi * 0.15),
    gex_1dte_drive: parseFloat((newGexVol / (newGexOi || 1) * 100).toFixed(2)),
    net_call_premium: newCallPrem,
    net_put_premium: newPutPrem
  };

  history.push(newPoint);
  if (history.length > 500) history.shift();

  return {
    ticker: "SPX",
    timestamp: newPoint.time,
    current_price: parseFloat(newPoint.price.toFixed(2)),
    current_gex_vol: Math.round(newGexVol),
    current_gex_oi: Math.round(newGexOi),
    gex_vol_change_rate,
    gex_velocity,
    gex_acceleration,
    flow_intensity,
    current_1dte_vol: Math.round(newPoint.gamma_1dte_vol || 0),
    current_1dte_oi: Math.round(newPoint.gamma_1dte_oi || 0),
    gex_1dte_wall: newPoint.gex_1dte_wall || 0,
    gex_1dte_block: newPoint.gex_1dte_block || 0,
    gex_1dte_drive: newPoint.gex_1dte_drive || 0,
    volatility_trigger: Math.round(currentPrice - (newGexVol > 0 ? 15 : -15)),
    zero_gamma: zero_gamma_val,
    market_tide: {
      timestamp: newPoint.time,
      net_call_premium: newCallPrem,
      net_put_premium: newPutPrem,
      net_volume: Math.floor(simulatedVolume / 1000),
      call_premium_change_rate: callDelta,
      put_premium_change_rate: putDelta
    },
    trend_data: history.slice(-5),
    price_levels,
    top_oi_strikes: sortedByOI.slice(0, 3).map(l => ({ 
      price: l.price, 
      value: l.open_interest || 0, 
      type: 'OI',
      side: l.call_volume > l.put_volume ? 'Call' : 'Put'
    })),
    top_dark_pool_strikes: sortedByDark.slice(0, 3).map(l => ({ 
      price: l.price, 
      value: l.dark_pool_volume || 0, 
      type: 'DARK_POOL',
      side: l.call_volume > l.put_volume ? 'Call' : 'Put'
    })),
    major_0dte_pos: sortedByGex[0],
    major_0dte_neg: sortedByGex[sortedByGex.length - 1],
    major_1dte_pos: sortedByGex[1],
    major_1dte_neg: sortedByGex[sortedByGex.length - 2],
    hvn_price: [...price_levels].sort((a, b) => b.total_volume - a.total_volume)[0].price,
    king_strike: sortedByGex[0].price,
    total_0dte_premium: 15000000,
    total_1dte_premium: 25000000
  };
};

export const getFullHistory = () => [...history];