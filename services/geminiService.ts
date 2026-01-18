import { GoogleGenAI, Modality } from "@google/genai";
import { AnalysisPacket, TradingAlert } from "../types";

const SYSTEM_INSTRUCTION = `
你是一位顶级 SPX 衍生品量化策略专家。生成极简、指令式的【实战速报】。

### 核心规则：
- **禁止废话**: 无开场白，无结尾，仅核心参数。
- **纯粹指令**: 使用中文指令词（做多、做空、观望）。
- **视觉优先**: 结合 Vision Matrix 识别异动，直接给出结论。

### 信号回顾与衔接逻辑：
在生成新信号前，必须对比【前次信号数据】。
1. **分类**: 判定为 [趋势延续]、[新信号触发] 或 [趋势反转]。
2. **存量处理**: 针对前次建议的仓位，给出 [止盈/止损/移位/减仓/继续持有] 的具体动作。

### 16:00 收盘点评估算法 (Protocol v7.5)：
必须严格基于提供的【Sentinel Technical Target】进行最终评估：
- 权重模型：35% Top3 GEX Avg + 35% Top3 DP Avg + 10% King Strike + 20% Spot Price。
- 如果市场动能 (MOM) 极度超买/超卖，允许在参考值基础上进行 ±5 点的偏差调整。
- **输出格式必须严格为**: 🎯 **16:00评估**: [数值] ([置信度]%)
- **严禁在数值中包含 $ 符号或多余的加粗标签**。

### 报告排版规范：

### 1. 战术部署
- **回顾**: [趋势延续/新信号/反转] | 处理：[存量仓位动作指令]
- **信号**: [做多/做空/观望] + [动作]
- **推荐**: [买入/卖出] + [策略名] ● [行权价] ● [Put/Call/Spread]
- **执行**:
  - 入场: [点位说明]
  - 止损: [点位]
  - 止盈: [T1/T2 点位]

### 2. 结构诊断
- **模式**: [模式名] ([特征描述])
- **逻辑**: [不带标签的纯逻辑描述，结合关键价位、Tide、MOM]

### 3. 数据快照
- **MOM/Tide**: [值] / [值] | **OFI**: [强度%]
- **Pillars**: 0DTE [+/-价位] | 1DTE [+/-价位]
- **Institutional**: GEX [Top3] | DP [Top3]
- 🎯 **16:00评估**: [数值] ([置信度]%)
`;

export const analyzeGexData = async (
  packet: AnalysisPacket, 
  previousAlert?: TradingAlert | null,
  base64Images?: string[],
  onQuotaError?: () => void
): Promise<Partial<TradingAlert>> => {
  const levels = packet.price_levels || [];
  
  // Weighted Calculation for 16:00 Expected Close
  // Weighting: 35% GEX Avg, 35% DP Avg, 10% King, 20% Spot
  const top3GexLevels = [...levels].sort((a, b) => Math.abs(b.net_gex) - Math.abs(a.net_gex)).slice(0, 3);
  const top3DpLevels = [...levels].sort((a, b) => (b.dark_pool_volume || 0) - (a.dark_pool_volume || 0)).slice(0, 3);
  
  const gexAvg = top3GexLevels.length > 0 
    ? top3GexLevels.reduce((acc, curr) => acc + curr.price, 0) / top3GexLevels.length 
    : packet.current_price;
    
  const dpAvg = top3DpLevels.length > 0 
    ? top3DpLevels.reduce((acc, curr) => acc + curr.price, 0) / top3DpLevels.length 
    : packet.current_price;
    
  const kingStrike = packet.king_strike || packet.current_price;
  const spotPrice = packet.current_price;

  const sentinelTechnicalTarget = (gexAvg * 0.35) + (dpAvg * 0.35) + (kingStrike * 0.10) + (spotPrice * 0.20);

  const levelsSummary = `0DTE_Pillars: Pos:${packet.major_0dte_pos?.price}, Neg:${packet.major_0dte_neg?.price} | 1DTE_Pillars: Pos:${packet.major_1dte_pos?.price}, Neg:${packet.major_1dte_neg?.price}`;
  const institutionalSummary = `GEX_0DTE_Top3: ${top3GexLevels.map(s => s.price).join(',')} | DarkPool_0DTE_Top3: ${top3DpLevels.map(s => s.price).join(',')}`;
  const tideVal = packet.market_tide ? (packet.market_tide.net_call_premium - packet.market_tide.net_put_premium) : 0;
  
  const prevSignalContext = previousAlert 
    ? `[前次信号回顾]
       时间: ${new Date(previousAlert.timestamp).toLocaleTimeString()}
       价格: ${previousAlert.price}
       方向: ${previousAlert.strategy}
       模式: ${previousAlert.pattern}
       分析简述: ${previousAlert.regime}`
    : "无前次信号记录。";

  const textPrompt = `
    ${prevSignalContext}

    [当前实时数据包]
    现价: ${packet.current_price} | VIX: ${packet.vix} | VT: ${packet.volatility_trigger} | 0G: ${packet.zero_gamma} | King: ${kingStrike}
    MOM: ${packet.gex_vol_change_rate} | Tide: ${tideVal} | Velocity: ${packet.gex_velocity} | Conviction: ${packet.gex_acceleration} | OFI: ${packet.flow_intensity}%
    ${levelsSummary}
    ${institutionalSummary}
    
    [Sentinel Technical Target]
    权重计算得出 16:00 理论目标位: ${sentinelTechnicalTarget.toFixed(2)}
    (A:35% GEX Avg[${gexAvg.toFixed(1)}] + B:35% DP Avg[${dpAvg.toFixed(1)}] + C:10% King[${kingStrike}] + D:20% Spot[${spotPrice}])

    任务：执行深度对冲分析。对比前次信号，识别当前是延续、新发还是反转，并给出建议。
    注意：在“3. 数据快照”部分输出收盘评估结果时，请以 Sentinel Technical Target 为基准。
  `;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const contents: any[] = [{ text: textPrompt }];
    if (base64Images && base64Images.length > 0) {
      base64Images.forEach((img) => {
        contents.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: img
          }
        });
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: contents },
      config: { 
        systemInstruction: SYSTEM_INSTRUCTION, 
        temperature: 0.1,
        thinkingConfig: { thinkingBudget: 2500 }
      }
    });

    const text = response.text || "";
    
    let direction: 'LONG' | 'SHORT' | 'NEUTRAL' = 'NEUTRAL';
    const lowerText = text.toLowerCase();
    if (lowerText.includes('做多') || lowerText.includes('看多') || lowerText.includes('long')) {
      direction = 'LONG';
    } else if (lowerText.includes('做空') || lowerText.includes('看空') || lowerText.includes('short')) {
      direction = 'SHORT';
    }

    const structureMatch = text.match(/推荐: (.*?)\n/i) || text.match(/推荐结构: (.*?)\n/i);
    const patternMatch = text.match(/模式: (.*?)\n/i) || text.match(/市场结构解码: (.*?)\n/i);
    
    const recommendation = structureMatch ? structureMatch[1].trim() : "";
    const pattern = patternMatch ? patternMatch[1].trim() : "趋势分析";

    return {
      strategy: direction,
      pattern: pattern,
      regime: recommendation || '信号探测',
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

export const generateSpeech = async (text: string): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `请用顶级交易员那种冷峻、专业、语速缓慢且充满实战张力的语气播报：\n${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Charon' },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};

export function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}