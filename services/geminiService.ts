
import { GoogleGenAI } from "@google/genai";
import { AnalysisPacket, TradingAlert } from "../types";

const SYSTEM_INSTRUCTION = `
你是一位华尔街 SPX 0DTE/1DTE（当日到期及次日到期）顶级量化策略师，专门负责通过 GEX（Gamma 敞口）流向解码做市商对冲行为。你的任务是提供极高准确度的多周期动力学分析。

### 核心逻辑框架：

1. **0DTE (当日即时动力学 - 战术层)**:
   - **GEX > 0 (正 Gamma)**: 波动抑制。做市商低买高卖以对冲。策略：逢低买入 (Buy Dip)，预期价格回归均值。
   - **GEX < 0 (负 Gamma)**: 波动扩张。做市商追涨杀跌以对冲。策略：逢高做空 (Sell Rip) 或顺势追空，预期波动率爆发。

2. **1DTE (次日结构锚点 - 战略层)**:
   - **1DTE Wall (核心墙)**: 市场心理与资金流的强力支点。价格靠近此处通常伴随动量减速、强力反弹或结构性反转。
   - **1DTE Drive (势能系数)**: 跨日动能方向。正值代表跨日买盘力量积累，负值代表跨日抛压。

3. **Multi-DTE 综合决策与冲突处理 (细致化分析核心)**:
   - **趋势共振 (Full Alignment)**: 
     - 0DTE 与 1DTE 方向完全一致（例如：0DTE 处于正 GEX 且 1DTE Drive 持续走强，或两者均显示极端负值）。
     - 策略：【看多】或【看空】。信号强度极高，建议顺势而为。
   - **动力学背离 (Signal Conflict)**:
     - **情况 A (虚假动力)**: 0DTE 建议看多（正 GEX），但 1DTE Drive 极度为负，或价格正面临上方 1DTE Wall 压制。
     - **情况 B (结构阻力)**: 0DTE 建议看空（负 GEX），但价格正踩在下方 1DTE 强支撑 Wall 之上，且 1DTE Drive 开始企稳。
     - **策略处理**: 必须建议 **【中性 (NEUTRAL)】**。
     - **风险识别**: 这种背离通常预示着 **“剧烈洗盘 (Whipsaw)”** 或 **“区间震荡 (Range-bound Chop)”**。做市商在不同到期日的对冲行为会相互抵消，导致价格缺乏方向性且频繁变盘。

### 输出格式 (必须严格遵守以下 Discord 标记风格):
- 🎯 **策略建议**: [看多/看空/中性] (必须综合 0DTE 动力与 1DTE 结构得出)
- 📊 **市场环境**: [描述当日 Gamma 状态 vs 次日 Wall/Drive 强度]
- 📝 **深度分析**: 简短精炼地解释 0DTE 即时动力与 1DTE 结构锚点之间的力学互动。
- ⚠️ **风险提示**: 明确指出是否面临“剧烈洗盘 (Whipsaw)”、“区间震荡 (Chop)”、“空头陷阱”或“流动性枯竭”。
`;

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const analyzeGexData = async (
  packet: AnalysisPacket, 
  onQuotaError?: () => void
): Promise<Partial<TradingAlert>> => {
  // CRITICAL: Initialize right before call to pick up newest API keys
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let lastError: any = null;
  const maxRetries = 3;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff: 1s, 2s, 4s
        await delay(Math.pow(2, attempt - 1) * 1000);
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `分析以下综合 DTE 市场数据，特别注意识别 0DTE 即时流量与 1DTE 长期结构之间的冲突，并对潜在的拉锯行情给出预警: ${JSON.stringify(packet)}`,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.15
        }
      });

      const text = response.text || "";
      
      const strategyMatch = text.match(/🎯 \*\*策略建议\*\*: (.*)/i);
      const regimeMatch = text.match(/📊 \*\*市场环境\*\*: (.*)/i);
      const analysisMatch = text.match(/📝 \*\*深度分析\*\*: (.*)/i);
      const riskMatch = text.match(/⚠️ \*\*风险提示\*\*: (.*)/i);

      let strategy: 'LONG' | 'SHORT' | 'NEUTRAL' = 'NEUTRAL';
      const stratRaw = (strategyMatch ? strategyMatch[1] : '').toUpperCase();
      
      if (stratRaw.includes('看多') || stratRaw.includes('LONG')) strategy = 'LONG';
      else if (stratRaw.includes('看空') || stratRaw.includes('SHORT')) strategy = 'SHORT';
      else strategy = 'NEUTRAL';

      return {
        strategy,
        regime: regimeMatch ? regimeMatch[1].replace(/[\[\]]/g, '') : '结构对齐中',
        analysis: analysisMatch ? analysisMatch[1] : '解码 Multi-DTE 互动逻辑...',
        risk: riskMatch ? riskMatch[1] : '实时波动监控中',
        rawAnalysis: text
      };
    } catch (error: any) {
      lastError = error;
      const isQuotaError = error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED');
      
      if (isQuotaError && onQuotaError) {
        onQuotaError();
      }

      console.warn(`Gemini API 尝试 ${attempt + 1} 失败:`, error.message);
      
      if (!isQuotaError || attempt === maxRetries) {
        break;
      }
    }
  }

  console.error("Gemini Multi-DTE 最终分析错误:", lastError);
  return {
    strategy: 'NEUTRAL',
    regime: lastError?.message?.includes('429') ? '并发配额耗尽' : '链路超时',
    analysis: '建议手动切换至付费 API Key 以确保高频监测稳定性。',
    risk: '服务暂不可用',
    rawAnalysis: lastError?.message || 'AI 引擎未响应。'
  };
};
