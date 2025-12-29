
import React, { useMemo } from 'react';
import { AnalysisPacket, PriceLevelVolume } from '../types';

interface MarketStatsProps {
  data: AnalysisPacket | null;
}

const MarketStats: React.FC<MarketStatsProps> = ({ data }) => {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  
  const formatGex = (val: number) => {
    const absVal = Math.abs(val);
    if (absVal >= 1e9) return `${(val / 1e9).toFixed(2)}B`;
    if (absVal >= 1e6) return `${(val / 1e6).toFixed(2)}M`;
    if (absVal >= 1e3) return `${(val / 1e3).toFixed(1)}K`;
    return val.toString();
  };

  const { major0dtePos, major0dteNeg, major1dtePos, major1dteNeg } = useMemo(() => ({
    major0dtePos: data?.major_0dte_pos || null,
    major0dteNeg: data?.major_0dte_neg || null,
    major1dtePos: data?.major_1dte_pos || null,
    major1dteNeg: data?.major_1dte_neg ||