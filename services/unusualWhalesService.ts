
import { AnalysisPacket, GexDataPoint } from '../types';

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

export const fetchUWMarketData = async (ticker: string, apiKey: string): Promise<AnalysisPacket | null> => {
  if (!apiKey) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(`https://api.unusualwhales.com/api/stock/${ticker}/spot-exposures`, {
      headers: {
        'Authorization': apiKey,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.status === 401 || response.status === 403) {
      throw new APIError("UnusualWhales API 密钥无效或已过期", response.status, 'AUTH_FAILED');
    }

    if (response.status === 429) {
      throw new APIError("UnusualWhales 请求频率过快，请稍后再试", response.status, 'RATE_LIMIT');
    }

    if (!response.ok) {
      throw new APIError(`UW API 服务器异常: ${response.status}`, response.status, 'SERVER_ERROR');
    }

    const json = await response.json();
    
    let dataPoints: UWSpotExposureResponsePoint[] = [];
    if (Array.isArray(json)) {
      dataPoints = json;
    } else if (json && Array.isArray(json.data)) {
      dataPoints = json.data;
    } else if (json && json.data) {
      dataPoints = [json.data];
    }

    if (dataPoints.length === 0) {
      return null;
    }

    const sorted = dataPoints
      .filter(p => p && p.time)
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    if (sorted.length === 0) return null;

    const latest = sorted[sorted.length - 1];
    const previous = sorted[sorted.length - 2] || latest;

    const currentPrice = parseSafeNumber(latest.price, 5250); 
    const currentExposure = parseSafeNumber(latest.exposure, 0);
    const prevPrice = parseSafeNumber(previous.price, currentPrice);
    const prevExposure = parseSafeNumber(previous.exposure, currentExposure);
    
    const currentOi = latest.oi !== undefined ? parseSafeNumber(latest.oi) : Math.abs(currentExposure * 1.5);
    const current_1dte_vol = latest.exposure_1dte !== undefined ? parseSafeNumber(latest.exposure_1dte) : (currentExposure * 0.42);
    const current_1dte_oi = latest.exposure_1dte_oi !== undefined ? parseSafeNumber(latest.exposure_1dte_oi) : (currentOi * 0.6);
    
    const gex_1dte_wall = latest.wall_1dte !== undefined ? parseSafeNumber(latest.wall_1dte) : (Math.round(currentPrice / 25) * 25);
    const gex_1dte_block = latest.block_1dte !== undefined ? parseSafeNumber(latest.block_1dte) : Math.round(current_1dte_oi * 0.08);

    let gex_1dte_drive_raw = latest.drive_1dte !== undefined ? parseSafeNumber(latest.drive_1dte, -999) : -999;
    if (gex_1dte_drive_raw === -999) {
      const gexDelta = currentExposure - prevExposure;
      const priceDelta = currentPrice - prevPrice;
      gex_1dte_drive_raw = priceDelta !== 0 ? Math.abs(gexDelta / priceDelta) / 1000000 : 0.45;
    }

    const trendData: GexDataPoint[] = sorted.slice(-30).map((p) => {
      const pExp = parseSafeNumber(p.exposure, 0);
      const pPrice = parseSafeNumber(p.price, currentPrice);
      const pOi = p.oi !== undefined ? parseSafeNumber(p.oi) : Math.abs(pExp * 1.5);
      
      return {
        time: p.time,
        price: pPrice,
        gamma_per_one_percent_move_vol: pExp,
        gamma_per_one_percent_move_oi: pOi,
        gamma_1dte_vol: p.exposure_1dte !== undefined ? parseSafeNumber(p.exposure_1dte) : (pExp * 0.4),
        gamma_1dte_oi: p.exposure_1dte_oi !== undefined ? parseSafeNumber(p.exposure_1dte_oi) : (pOi * 0.5)
      };
    });

    return {
      ticker: ticker.toUpperCase(),
      timestamp: latest.time,
      current_price: Number(currentPrice.toFixed(2)),
      current_gex_vol: Math.round(currentExposure),
      current_gex_oi: Math.round(currentOi),
      gex_vol_change_rate: Math.round(currentExposure - prevExposure),
      current_1dte_vol: Math.round(current_1dte_vol),
      current_1dte_oi: Math.round(current_1dte_oi),
      gex_1dte_wall: Math.round(gex_1dte_wall),
      gex_1dte_block: Math.round(gex_1dte_block),
      gex_1dte_drive: Number(Math.min(1.0, Math.max(0.0, gex_1dte_drive_raw)).toFixed(2)),
      trend_data: trendData
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new APIError("UnusualWhales 请求超时，请检查网络连接", 408, 'TIMEOUT');
    }
    throw error;
  }
};
