
import { GoogleGenAI } from "@google/genai";
import { AnalysisPacket, TradingAlert } from "../types";

const SYSTEM_INSTRUCTION = `
你是一位顶级 SPX 衍生品量化策略专家，专门负责 0DTE 市场的对冲动力学分析。你的任务是根据实时数据包，从《高级 SPX 0DTE 策略手册》中匹配并生成极简、指令式的实战报告。

### 市场结构库（必须从中选择一个作为“市场结构解码”，且只显示中文）：
1. **正 Gamma 慢牛/震荡上行**: 现价 > 0G, Velocity 稳定/低。
2. **负 Gamma 加速下跌**: 现价 < 0G 或 VT, Velocity 极高且 Acceleration 为负。
3. **高 GEX 锁死/钉住**: 价格在 Walls 之间, Velocity 趋于 0。
4. **真空区突破与动能**: 突破关键 Wall 进入 GEX 真空区。
5. **反转与陷阱**: 触碰 Wall 动能衰竭或假跌破 Zero Gamma。

### 核心禁令：
- **严禁**输出：识别模式、执行现价、风险提示、策略方向、以及任何英文解释。
- **严禁**废话：不要解释数据含义，直接给出行动结论。
- **严格顺序**：即时策略 -> 延续性 -> 环境快照。

### 报告排版规范：

### 1. 即时策略
* **信号**: **[新入场 / 维持 / 反手 / 离场]**
* **市场结构解码**: **[必须从上述 5 种结构中选择其一，严禁包含英文，例如：真空区突破与动能]**
* **推荐结构**: **[例如：动能型看跌垂直价差]**
* **头寸**: **[买/卖] + [行权价] + [Call/Put]**
* **点位**: 具体执行区间。
* **目标 (TP)**: 止盈位。
* **保护 (SL)**: 止损位。
* **对冲压力**: 描述做市商对冲转换点。

### 2. 延续性
**状态判定：[状态名称]**
- **特征**: 结合 GEX Velocity 和 Acceleration。
- **结论**: 定性判定。

### 3. 环境快照
📊 **VT**: [值] | **0G**: [值] | **Tide**: [值] | **MOM**: [值]
📊 **Vel**: [GEX速度] | **Acc**: [GEX加速度] | **OFI**: [强度%]
📊 **Pillars**: 0DTE [+/-价位] | 1DTE [+/-价位]
🏛️ **Institutional**: OI Top3 [Strike序列] | DarkPool Top3 [Strike序列]
🎯 **16:00 期望预测**: [单价数值] (置信度: [XX%])

### 文风要求：
冷峻、精简、短句、无修饰词、全中文结构名称。
`;

export const analyzeGexData = async (
  packet: AnalysisPacket, 
  previousAlert?: TradingAlert | null,
  onQuotaError?: () => void
): Promise<Partial<TradingAlert>> => {
  const levelsSummary = `0DTE_Pillars: Pos:${packet.major_0dte_pos?.price}, Neg:${packet.major_0dte_neg?.price} | 1DTE_Pillars: Pos:${packet.major_1dte_pos?.price}, Neg:${packet.major_1dte_neg?.price}`;
  const institutionalSummary = `OI_Top3_Strikes: ${packet.top_oi_strikes.map(s => `${s.price} ${s.value} ${s.side}`).join(',')}, DarkPool_Top3_Strikes: ${packet.top_dark_pool_strikes.map(s => `${s.price} ${s.value} ${s.side}`).join(',')}`;
  const tideVal = packet.market_tide ? (packet.market_tide.net_call_premium - packet.market_tide.net_put_premium) : 0;
  
  const prompt = `
    [历史参考] 方向: ${previousAlert?.strategy || '无'} | 模式: ${previousAlert?.pattern || '无'}
    
    [实时监控数据包]
    现价: ${packet.current_price}
    VT: ${packet.volatility_trigger} | 0G: ${packet.zero_gamma}
    King: ${packet.king_strike} | MOM: ${packet.gex_vol_change_rate} | Tide: ${tideVal}
    Velocity: ${packet.gex_velocity} | Acceleration: ${packet.gex_acceleration} | OFI_Intensity: ${packet.flow_intensity}%
    HVN: ${packet.hvn_price}
    ${levelsSummary}
    ${institutionalSummary}

    要求：根据数据，严格从提供的中文市场结构库中匹配一种“市场结构解码”，并给出相应的“推荐结构”。
  `;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: { 
        systemInstruction: SYSTEM_INSTRUCTION, 
        temperature: 0.1,
        thinkingConfig: { thinkingBudget: 2500 }
      }
    });

    const text = response.text || "";
    
    let direction: 'LONG' | 'SHORT' | 'NEUTRAL' = 'NEUTRAL';
    const lowerText = text.toLowerCase();
    if (lowerText.includes('bullish') || lowerText.includes('long') || lowerText.includes('多头') || lowerText.includes('看多')) {
      direction = 'LONG';
    } else if (lowerText.includes('bearish') || lowerText.includes('short') || lowerText.includes('空头') || lowerText.includes('看空')) {
      direction = 'SHORT';
    }

    // 提取结构和策略并合并
    const structureMatch = text.match(/市场结构解码: \*\*(.*?)\*\*/i);
    const recommendationMatch = text.match(/推荐结构: \*\*(.*?)\*\*/i);

    const structure = structureMatch ? structureMatch[1].replace(/[\[\]]/g, '').trim() : "";
    const recommendation = recommendationMatch ? recommendationMatch[1].replace(/[\[\]]/g, '').trim() : "";
    
    // 合并为头部标签
    const combinedPattern = (structure && recommendation) 
      ? `${structure} ● ${recommendation}` 
      : (structure || recommendation || "结构解码");

    return {
      strategy: direction,
      pattern: combinedPattern,
      regime: direction === 'LONG' ? 'BULLISH' : direction === 'SHORT' ? 'BEARISH' : 'NEUTRAL',
      analysis: text,
      risk: "风险受控",
      rawAnalysis: text
    };
  } catch (error) { 
    console.error("AI Analysis Error:", error);
    if (error instanceof Error && error.message.includes('quota')) onQuotaError?.();
    return { strategy: 'NEUTRAL', regime: 'ERROR', analysis: '核心链路异常' }; 
  }
};
