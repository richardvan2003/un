import { GoogleGenAI, Modality } from "@google/genai";
import { AnalysisPacket, TradingAlert } from "../types";

const SYSTEM_INSTRUCTION = `
你是一位顶级 SPX 衍生品量化策略专家。生成极简、指令式的【实战速报】。

### 核心规则：
- **禁止废话**: 无开场白，无结尾，仅核心参数。
- **指令优先**: 使用强动词（买入、持仓、撤离）。
- **视觉结合**: 若有截图，直接提取异动，无需描述画面。

### 16:00 收盘点评估算法 (Protocol v7.0)：
评估值基于加权模型：A(35%) Top3 GEX, B(35%) Top3 DP, C(15%) TP/MOM, D(15%) Spot。
- **严禁输出权重比例**，仅提供预测数值。

### 报告排版规范：

### 1. 战术部署
- **信号**: [LONG/SHORT/NEUTRAL] + [动作]
- **推荐**: [策略名] ● [行权价] ● [C/P]
- **执行**: [TP/SL 点位]

### 2. 结构诊断
- **模式**: [GLUE/FUEL/VACUUM/PIN]
- **逻辑**: [一句话解释核心驱动力]

### 3. 数据快照
- **MOM/Tide**: [值] / [值] | **OFI**: [强度%]
- **Pillars**: 0DTE [+/-价位] | 1DTE [+/-价位]
- **Institutional**: GEX [Top3] | DP [Top3]
- 🎯 **16:00评估**: [单价数值] ([置信度%])
`;

export const analyzeGexData = async (
  packet: AnalysisPacket, 
  previousAlert?: TradingAlert | null,
  base64Images?: string[],
  onQuotaError?: () => void
): Promise<Partial<TradingAlert>> => {
  const levelsSummary = `0DTE_Pillars: Pos:${packet.major_0dte_pos?.price}, Neg:${packet.major_0dte_neg?.price} | 1DTE_Pillars: Pos:${packet.major_1dte_pos?.price}, Neg:${packet.major_1dte_neg?.price}`;
  const institutionalSummary = `GEX_0DTE_Top3: ${packet.top_oi_strikes.map(s => `${s.price}(${s.side})`).join(',')} | DarkPool_0DTE_Top3: ${packet.top_dark_pool_strikes.map(s => `${s.price}(${s.side})`).join(',')}`;
  const tideVal = packet.market_tide ? (packet.market_tide.net_call_premium - packet.market_tide.net_put_premium) : 0;
  
  const textPrompt = `
    [实时数据包]
    现价: ${packet.current_price} | VT: ${packet.volatility_trigger} | 0G: ${packet.zero_gamma} | King: ${packet.king_strike}
    MOM: ${packet.gex_vol_change_rate} | Tide: ${tideVal} | Velocity: ${packet.gex_velocity} | Conviction: ${packet.gex_acceleration} | OFI: ${packet.flow_intensity}%
    ${levelsSummary}
    ${institutionalSummary}

    任务：执行深度对冲分析。识别 Vision Matrix 中的异动。
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
      model: "gemini-3-pro-preview",
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
    if (lowerText.includes('long') || lowerText.includes('多头') || lowerText.includes('看多')) {
      direction = 'LONG';
    } else if (lowerText.includes('short') || lowerText.includes('空头') || lowerText.includes('看空')) {
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
      contents: [{ parts: [{ text: `请用专业、沉稳、语速缓慢且富有情感的语气播报以下实战速报：\n${text}` }] }],
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

// Audio Decoding Utilities
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
