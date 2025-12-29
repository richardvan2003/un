
import { GoogleGenAI } from "@google/genai";
import { AnalysisPacket, TradingAlert } from "../types";

const SYSTEM_INSTRUCTION = `
你是一位专业的 SPX 伽马动力学分析师。你的职责是解析 0DTE 和 1DTE GEX 结构，并提供精确的交易建议。

### 输出模板 (严格执行)：

🎯 [SIGNAL_TYPE] - SPX
🎯 建议: [STRATEGY] [ACTION]
🎯 推荐: [S1-S10 ID] | 模式: [Archetype Name]

🌊 诊断: [简述当前价格与 0DTE/1DTE 墙、VT、King Strike 的相对位置。]

📊 环境: VT:[数值] | 0DTE_Prem:[数值] | 1DTE_Prem:[数值] | 0G:[数值]

🔄 策略执行:
- **入场**: [进场点位区间]
- **目标**: [第一目标] | [第二目标]
- **止损**: [硬性止损位]

⚠️ 风险: [失效点位/逻辑反转信号]

执行现价
$[PRICE]
市场制度
[描述：如“正 Gamma 粘滞环境”]
风险提示
[警示]
`;

export const analyzeGexData = async (
  packet: AnalysisPacket, 
  previousAlert?: TradingAlert | null, // Maintained for signature compatibility, unused in prompt
  onQuotaError?: () => void
): Promise<Partial<TradingAlert>> => {
  const tideSummary = packet.market_tide ? `NetCall:${packet.market_tide.net_call_premium}|NetPut:${packet.market_tide.net_put_premium}` : "无";
  const levelsSummary = `0DTE_Pos:${packet.major_0dte_pos?.price}|0DTE_Neg:${packet.major_0dte_neg?.price}|1DTE_Pos:${packet.major_1dte_pos?.price}|1DTE_Neg:${packet.major_1dte_neg?.price}`;
  const premiumSummary = `Total0DTE_Prem:${packet.total_0dte_premium}|Total1DTE_Prem:${packet.total_1dte_premium}`;

  const prompt = `
    [当前数据]
    现价: ${packet.current_price} | VT: ${packet.volatility_trigger} | 0G: ${packet.zero_gamma} | King: ${packet.king_strike}
    GEX_0DTE: ${packet.current_gex_vol} | GEX_1DTE: ${packet.current_1dte_vol}
    MOM: ${packet.gex_vol_change_rate}
    Pillars: ${levelsSummary}
    Premiums: ${premiumSummary}
    Tide: ${tideSummary}

    请生成最新的市场探测报告。
  `;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: { 
        systemInstruction: SYSTEM_INSTRUCTION, 
        temperature: 0.1,
        thinkingConfig: { thinkingBudget: 4000 }
      }
    });

    const text = response.text || "";
    const strategyMatch = text.match(/🎯 建议: (LONG|SHORT|NEUTRAL)/i);
    const patternMatch = text.match(/模式: ([\w\s-]+)/i);
    const recMatch = text.match(/推荐: ([\w, S]+)/i);
    
    const strategy = strategyMatch ? strategyMatch[1] : 'NEUTRAL';
    const pattern = patternMatch ? patternMatch[1].trim() : undefined;
    const recommendedStrategies = recMatch ? recMatch[1].split('|')[0].split(',').map(s => s.trim().toUpperCase()) : [];
    
    const diagnosis = text.match(/🌊 诊断: ([\s\S]*?)(?=\n\n📊)/i)?.[1] || '';
    const execution = text.match(/🔄 策略执行:([\s\S]*?)(?=\n\n⚠️)/i)?.[1] || '';
    const danger = text.match(/⚠️ 风险: ([\s\S]*?)(?=\n\n执行现价)/i)?.[1] || '';

    const combinedAnalysis = `[诊断] ${diagnosis}\n\n[执行]${execution}`;
    
    return {
      strategy: strategy as 'LONG' | 'SHORT' | 'NEUTRAL',
      pattern,
      recommendedStrategies,
      regime: text.match(/市场制度\n([\s\S]*?)(?=\n风险提示)/i)?.[1]?.trim() || "常规波动",
      analysis: combinedAnalysis.trim(),
      risk: danger.trim() || "严守边界。",
      rawAnalysis: text
    };
  } catch (error) { 
    console.error("Analysis Engine Error:", error);
    if (error instanceof Error && error.message.includes('quota')) onQuotaError?.();
    return { strategy: 'NEUTRAL', regime: 'ERROR', analysis: '上行链路异常' }; 
  }
};
