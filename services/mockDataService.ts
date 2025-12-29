
import { GexDataPoint, AnalysisPacket, MarketTidePoint } from '../types';

let currentPrice = 5240;
let history: GexDataPoint[] = [];

const initHistory = () => {
  const now = Date.now();
  for (let i = 100; i >= 0; i--) {
    const time = new Date(now - i * 3 * 60000).toISOString();
    const price = 5200 + Math.random() * 80;
    const gexVol = (Math.random() - 0.45) * 15000000;
    const gexOi = (Math.random() - 0.2) * 60000000;
    
    // 1DTE baseline
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
      gex_1dte_wall: Math.round(price / 25) * 25,
      gex_1dte_block: Math.round(gex1dteOi * 0.15),
      gex_1dte_drive: parseFloat((gex1dteVol / (gex1dteOi || 1) * 100).toFixed(2))
    });
  }
};

initHistory();

export const getLatestMarketData = (): AnalysisPacket => {
  const lastPoint = history[history.length - 1];
  const secondLastPoint = history[history.length - 2];

  const volatility = 1.5;
  const priceChange = (Math.random() - 0.5) * volatility;
  currentPrice = lastPoint.price + priceChange;

  const newGexVol = lastPoint.gamma_per_one_percent_move_vol + (Math.random() - 0.5) * 800000;
  const newGexOi = lastPoint.gamma_per_one_percent_move_oi + (Math.random() - 0.5) * 300000;
  
  const new1dteVol = (lastPoint.gamma_1dte_vol || 0) + (Math.random() - 0.5) * 600000;
  const new1dteOi = (lastPoint.gamma_1dte_oi || 0) + (Math.random() - 0.5) * 500000;
  
  const newTide = (lastPoint.net_tide || 0) + (Math.random() - 0.45) * 1000000;

  const gex_1dte_wall = Math.round(currentPrice / 25) * 25 + (new1dteVol > 0 ? 25 : -25);
  const gex_1dte_block = Math.round(new1dteOi * 0.15);
  const gex_1dte_drive = parseFloat((new1dteVol / (new1dteOi || 1) * 100).toFixed(2));

  const newPoint: GexDataPoint = {
    time: new Date().toISOString(),
    price: currentPrice,
    gamma_per_one_percent_move_vol: newGexVol,
    gamma_per_one_percent_move_oi: newGexOi,
    gamma_1dte_vol: new1dteVol,
    gamma_1dte_oi: new1dteOi,
    net_tide: newTide,
    gex_1dte_wall,
    gex_1dte_block,
    gex_1dte_drive
  };

  history.push(newPoint);
  if (history.length > 500) history.shift();

  const recent = history.slice(-5);
  const flowChange = newGexVol - (secondLastPoint ? secondLastPoint.gamma_per_one_percent_move_vol : newGexVol);

  // Simulate Market Tide Point
  const market_tide: MarketTidePoint = {
    timestamp: newPoint.time,
    net_call_premium: 3000000 + (Math.random() * 2000000),
    net_put_premium: 1000000 + (Math.random() * 1500000),
    net_volume: Math.floor(Math.random() * 50000)
  };

  const volTriggerOffset = newGexVol > 0 ? (flowChange < 0 ? 12 : 25) : (flowChange > 0 ? -8 : -15);
  const volatility_trigger = Math.round(currentPrice - volTriggerOffset);
  const zero_gamma = Math.round(currentPrice + (newGexVol > 0 ? -10 : 10));

  return {
    ticker: "SPX",
    timestamp: newPoint.time,
    current_price: parseFloat(newPoint.price.toFixed(2)),
    
    current_gex_vol: Math.round(newGexVol),
    current_gex_oi: Math.round(newGexOi),
    gex_vol_change_rate: Math.round(flowChange),

    current_1dte_vol: Math.round(new1dteVol),
    current_1dte_oi: Math.round(new1dteOi),
    gex_1dte_wall,
    gex_1dte_block,
    gex_1dte_drive,
    volatility_trigger,
    zero_gamma,

    market_tide,
    trend_data: recent
  };
};

export const getFullHistory = () => [...history];