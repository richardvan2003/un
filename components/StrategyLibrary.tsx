
import React, { useState } from 'react';
import Panel from './Panel';

interface StrategyItem {
  id: string;
  name: string;
  structure: string;
  trigger: string;
  execution: string;
  caseStudy: string;
  logic: string;
}

interface StrategyCategory {
  category: string;
  color: string;
  icon: string;
  items: StrategyItem[];
}

const strategyTypes = [
  { id: 'single', name: '单腿期权', sub: 'Single Option', icon: 'fa-solid fa-check' },
  { id: 'vertical', name: '垂直策略', sub: 'Vertical Spread', icon: 'fa-solid fa-stairs' },
  { id: 'covered', name: '股票担保', sub: 'Covered Stock', icon: 'fa-solid fa-shield-halved' },
  { id: 'collar', name: '领式策略', sub: 'Collar', icon: 'fa-solid fa-compress' },
  { id: 'straddle', name: '跨式策略', sub: 'Straddle', icon: 'fa-solid fa-arrows-left-right' },
  { id: 'strangle', name: '宽跨式策略', sub: 'Strangle', icon: 'fa-solid fa-arrows-split-up-and-left' },
  { id: 'calendar', name: '日历策略', sub: 'Calendar Spread', icon: 'fa-solid fa-calendar-day' },
  { id: 'diagonal', name: '对角策略', sub: 'Diagonal Spread', icon: 'fa-solid fa-arrow-right-from-bracket' },
  { id: 'butterfly', name: '蝶式策略', sub: 'Butterfly', icon: 'fa-solid fa-mountain' },
  { id: 'condor', name: '鹰式策略', sub: 'Condor', icon: 'fa-solid fa-bridge' },
  { id: 'iron_butterfly', name: '铁蝶式策略', sub: 'Iron Butterfly', icon: 'fa-solid fa-vector-square' },
  { id: 'iron_condor', name: '铁鹰式策略', sub: 'Iron Condor', icon: 'fa-solid fa-vector-square' },
  { id: 'custom', name: '自定义策略', sub: 'Custom', icon: 'fa-solid fa-pen-to-square' },
];

const advancedStrategies: StrategyCategory[] = [
  {
    category: "正 Gamma 慢牛/震荡上行 (Positive Gamma / Glue)",
    color: "emerald",
    icon: "fa-solid fa-shield-halved",
    items: [
      { id: "S1", name: "保守型牛市看跌价差 (Bull Put Spread)", structure: "Vertical Spread", trigger: "慢牛格局，防止回调测试 Zero Gamma", execution: "卖点 = Zero Gamma - 15点", caseStudy: "现价 6850，Zero Gamma 6830。卖 6815 Put / 买 6805 Put。", logic: "利用正 Gamma 环境下的均值回归特性，在关键翻转位下方建立缓冲保护。" },
      { id: "S2", name: "机构级 GEX 备兑 (Covered Stock Alpha)", structure: "Covered Stock", trigger: "持仓标的且预期上方 Call Wall 难以突破", execution: "卖出 Call Wall 处的 Call", caseStudy: "持有 SPY，Call Wall @ 6880。卖出 6880 抛补看涨期权。", logic: "在对冲墙位置利用做市商的卖盘压力增加持仓收益，利用墙的阻力增加胜率。" },
      { id: "S3", name: "目标导向的看涨蝶式 (Targeted Call Butterfly)", structure: "Butterfly", trigger: "上方 Call Wall 充当磁铁效应，预期收敛", execution: "靶心 = Call Wall", caseStudy: "现价 6830，Call Wall 6850。买 6820 / 卖 2x 6850 / 买 6880 Call。", logic: "赌做市商将价格锚定在最大正敞口节点，Butterfly 提供极高的盈亏比。" },
      { id: "S4", name: "断翼看涨蝶式 (Call Broken Wing Butterfly)", structure: "Custom", trigger: "看涨但担心市场突然反转下跌", execution: "零成本或收权利金结构", caseStudy: "买 6840 Call / 卖 2x 6860 Call / 买 6890 Call。", logic: "变相的垂直价差，但在上行过度时提供额外防御，下行风险可控甚至为正收益。" },
      { id: "S5", name: "领式结构性防御 (GEX Collar Defense)", structure: "Collar", trigger: "牛市末端，保护利润并利用 Gamma 墙", execution: "买 Put Wall 处的 Put / 卖 Call Wall 处的 Call", caseStudy: "买入 6800 Put，卖出 6900 Call。", logic: "利用两端 GEX 极点建立低成本甚至零成本的安全区，将持仓锁定在对冲墙之间。" }
    ]
  },
  {
    category: "负 Gamma 加速下跌 (Negative Gamma / Fuel)",
    color: "rose",
    icon: "fa-solid fa-fire",
    items: [
      { id: "S6", name: "激进型长普 (Long Put)", structure: "Single Option", trigger: "跌破 Zero Gamma，市场进入加速区", execution: "买入 Delta -0.3 至 -0.4 的 Put", caseStudy: "跌破 6830。直接买入 6810 Put。", logic: "负 Gamma 下，下跌会引发做市商抛售标的进行对冲，形成单边加速动能。" },
      { id: "S7", name: "波动率扩张宽跨式 (Vol Strangle)", structure: "Strangle", trigger: "价格处于真空区，Gamma 正转负，方向不明但波幅预期极大", execution: "买入 OTM Call & Put", caseStudy: "买入 6880 Call / 6780 Put。", logic: "利用负 Gamma 环境下的高波动率溢出，博取 Vega 和单边 Gamma 爆发利润。" },
      { id: "S8", name: "零轴翻转跨式 (Gamma Flip Straddle)", structure: "Straddle", trigger: "价格在 Zero Gamma 临界点极度纠结，一旦突破将有大级别移动", execution: "买入 ATM Call & Put", caseStudy: "Zero Gamma 6830。买入 6830 跨式。", logic: "赌市场离开平衡点的瞬间，对冲压力会导致价格迅速脱离当前位置。" },
      { id: "S9", name: "负 Gamma 防御价差 (Bear Call Spread)", structure: "Vertical Spread", trigger: "下跌趋势中，反弹至 Zero Gamma 受阻", execution: "卖点 = Zero Gamma + 10点", caseStudy: "反弹至 6830。卖 6840 Call / 买 6850 Call。", logic: "利用 Zero Gamma 转换成的结构性阻力，建立非方向性空头头寸。" },
      { id: "S10", name: "阶梯式 Put 布局 (Laddered Puts)", structure: "Vertical Spread", trigger: "瀑布式下跌，多阶段获利", execution: "分批买入 Put Debit Spread", caseStudy: "买 6800/6790 + 买 6780/6770 Spread。", logic: "通过锁定阶段性利润降低负 Gamma 带来的 IV 快速回落风险。" }
    ]
  },
  {
    category: "高 GEX 锁死/钉住 (Pinning / High GEX Vol)",
    color: "blue",
    icon: "fa-solid fa-arrows-to-dot",
    items: [
      { id: "S11", name: "宽距铁鹰 (Wide Iron Condor)", structure: "Iron Condor", trigger: "高 GEX，上下墙体牢固且 IV 虚高", execution: "卖点 = Walls ± 10点", caseStudy: "卖 6870 Call / 卖 6820 Put。", logic: "做市商的对冲买卖单将价格限制在窄幅，宽距保护可吸收日内噪点波动。" },
      { id: "S12", name: "带保护铁蝶式 (Protected Iron Butterfly)", structure: "Iron Butterfly", trigger: "极其确定的 Pinning (钉住) 行情，如大过期日", execution: "靶心 = Pin Strike", caseStudy: "Pin @ 6850。卖 6850 Straddle，买 6875 C / 6825 P。", logic: "在 Gamma 中性点进行最大 Theta 收集，利用翅膀限制意外突破的风险。" },
      { id: "S13", name: "时间价值日历 (Calendar Spread)", structure: "Calendar Spread", trigger: "短期价格钉住，预期未来有波动", execution: "卖 0DTE / 买 1DTE ATM Call", caseStudy: "卖 0DTE 6850 Call / 买 1DTE 6850 Call。", logic: "捕捉 0DTE 指数级的时间价值衰减，同时通过 1DTE 腿保留潜在机会。" },
      { id: "S14", name: "对冲墙内鹰式 (Standard Condor)", structure: "Condor", trigger: "价格被困在大型 GEX 节点之间", execution: "卖出中间区域，买入外围", caseStudy: "卖出 6840/6860，买入 6830/6870。", logic: "非铁鹰结构（全部使用 Call 或 Put），在某些对冲环境下具有更好的权利金偏移优势。" },
      { id: "S15", name: "双重对角线 (Double Diagonal)", structure: "Diagonal Spread", trigger: "低波动环境，降低 Gamma 风险", execution: "卖 0DTE / 买远期 OTM", caseStudy: "卖 0DTE 6870C / 6820P；买 7DTE 6880C / 6810P。", logic: "通过跨到远期的买腿来对冲近端的 Gamma 敞口，适合震荡缓升或缓跌行情。" }
    ]
  },
  {
    category: "真空区突破与动能 (Vacuum / Momentum)",
    color: "amber",
    icon: "fa-solid fa-gauge-high",
    items: [
      { id: "S16", name: "真空区借记价差 (Vacuum Debit Spread)", structure: "Vertical Spread", trigger: "突破关键墙，进入阻力真空区", execution: "买入 ATM / 卖出下一个 Wall 之前", caseStudy: "突破 6830，买 6830 Call / 卖 6845 Call。", logic: "利用做市商被动空头回补的动能，卖腿设在下一个节点前以确保获利。" },
      { id: "S17", name: "动能追击单腿 (Breakout Single)", structure: "Single Option", trigger: "GEX 翻正伴随 Tide 强流入", execution: "买入 0DTE ATM Call", caseStudy: "放量突破 6850。买入 6850 Call。", logic: "Gamma 爆炸期的最简单打法，利用 Delta 的快速扩张（做多 Gamma）获利。" },
      { id: "S18", name: "早盘动能跟进 (Morning Momentum)", structure: "Vertical Spread", trigger: "开盘 GEX Max Change 显示单边倾向", execution: "跟随主要机构资金流向", caseStudy: "巨量流入 6850。买入 6830/6840 Call Spread。", logic: "顺势而为，利用开盘后的庄家对冲重新定位过程。" }
    ]
  },
  {
    category: "反转与陷阱 (Reversals & Traps)",
    color: "zinc",
    icon: "fa-solid fa-shuffle",
    items: [
      { id: "S19", name: "Call Wall 衰竭反转 (Fade the Wall)", structure: "Vertical Spread", trigger: "触碰 Call Wall 但成交量和 GEX 增长背离", execution: "建立逆向 Bearish 仓位", caseStudy: "价格 6850。买入 6845 Put / 卖出 6835 Put。", logic: "赌做市商不再继续买入标的维持对冲，引发多头获利了结的回撤。" },
      { id: "S20", name: "流动性陷阱反转 (Trap Reversal)", structure: "Custom", trigger: "假跌破 Zero Gamma 后快速拉回", execution: "比例价差 (Ratio Spread) 或裸卖 OTM", caseStudy: "跌破 6830 后收复。卖 2x 6815 Put / 买 1x 6825 Put。", logic: "博取均值回归，利用陷阱区间的做空盘被迫止损带来的推升动力。" }
    ]
  }
];

const StrategyLibrary: React.FC = () => {
  const [activeView, setActiveView] = useState<'strategies' | 'theory'>('strategies');
  const [filterType, setFilterType] = useState<string | null>(null);

  const filteredStrategies = advancedStrategies.map(cat => ({
    ...cat,
    items: filterType 
      ? cat.items.filter(item => item.structure.toLowerCase().includes(filterType.toLowerCase())) 
      : cat.items
  })).filter(cat => cat.items.length > 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-6 px-4">
      {/* Header Panel */}
      <div className="bg-zinc-900/40 p-6 rounded-3xl border border-zinc-800 flex flex-col xl:flex-row items-center justify-between gap-6 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[rgb(var(--accent-rgb),0.1)] flex items-center justify-center border border-[rgb(var(--accent-rgb),0.2)]">
            <i className="fa-solid fa-chess-board accent-text text-2xl"></i>
          </div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-widest">高级 SPX 0DTE 策略手册</h2>
            <p className="text-[10px] text-zinc-500 font-bold mt-1 uppercase">根据 GEX 制度与做市商对冲动力学优化</p>
          </div>
        </div>
        
        <div className="flex bg-black/40 p-1 rounded-2xl border border-zinc-800">
           <button 
             onClick={() => setActiveView('strategies')}
             className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'strategies' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
           >
             实战策略库
           </button>
           <button 
             onClick={() => setActiveView('theory')}
             className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'theory' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
           >
             动力学理论
           </button>
        </div>
      </div>

      {activeView === 'strategies' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
          <Panel title="策略结构图例" subtitle="选择结构以过滤策略" icon="fa-solid fa-shapes">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {strategyTypes.map(type => (
                <button 
                  key={type.id}
                  onClick={() => setFilterType(filterType === type.sub ? null : type.sub)}
                  className={`p-3 rounded-2xl border transition-all text-left flex flex-col gap-2 group ${
                    filterType === type.sub ? 'bg-indigo-500/20 border-indigo-500/50' : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <i className={`${type.icon} text-sm ${filterType === type.sub ? 'text-indigo-400' : 'text-zinc-600'}`}></i>
                  <div>
                    <p className={`text-[10px] font-black leading-none ${filterType === type.sub ? 'text-white' : 'text-zinc-400'}`}>{type.name}</p>
                    <p className="text-[7px] text-zinc-600 font-bold uppercase mt-1 tracking-tighter">{type.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </Panel>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {filteredStrategies.map((cat, idx) => (
              <div key={idx} className="space-y-4">
                <div className="flex items-center gap-3 px-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${cat.color}-500/10 border border-${cat.color}-500/20`}>
                    <i className={`${cat.icon} text-${cat.color}-500 text-sm`}></i>
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-300">{cat.category}</h3>
                </div>
                
                <div className="space-y-4">
                  {cat.items.map(item => (
                    <div key={item.id} className="bg-zinc-950/40 border border-zinc-800 rounded-2xl p-5 hover:bg-zinc-900/60 transition-all group shadow-lg">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-500">{item.id}</span>
                          <div>
                            <h4 className="text-xs font-black text-white group-hover:accent-text transition-colors">{item.name}</h4>
                            <span className="text-[7px] font-black uppercase text-zinc-600 tracking-widest">{item.structure}</span>
                          </div>
                        </div>
                        <div className="px-2 py-0.5 rounded-md bg-black/40 border border-zinc-900 text-[8px] font-bold font-mono text-zinc-500">
                          {item.execution}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">触发条件</p>
                          <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">{item.trigger}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">实战案例</p>
                          <p className="text-[10px] text-zinc-400 font-mono italic">{item.caseStudy}</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-zinc-900 flex items-start gap-3">
                         <i className="fa-solid fa-brain text-[rgb(var(--accent-rgb))] opacity-50 text-[10px] mt-0.5"></i>
                         <div>
                            <p className="text-[8px] font-black accent-text uppercase tracking-widest mb-1">核心对冲逻辑</p>
                            <p className="text-[10px] text-zinc-500 leading-relaxed font-sans">{item.logic}</p>
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeView === 'theory' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <Panel title="GEX 制度理论：核心状态机" icon="fa-solid fa-atom">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-4">
              <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full -mr-16 -mt-16"></div>
                <h4 className="text-emerald-400 text-sm font-black uppercase tracking-widest flex items-center gap-2">
                   <i className="fa-solid fa-magnet"></i> 正 Gamma 环境 (Glue)
                </h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-mono">
                  Market Makers (MM) 处于“逆向对冲”状态。价格上涨时卖出，下跌时买入。这种机制为市场提供“粘性 (Glue)”，显著压制波动率，使价格向高流动性节点收敛。
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="px-2 py-1 rounded bg-black/40 text-[8px] font-black text-emerald-500/70 border border-emerald-500/10">低 IV 溢价</span>
                  <span className="px-2 py-1 rounded bg-black/40 text-[8px] font-black text-emerald-500/70 border border-emerald-500/10">均值回归</span>
                  <span className="px-2 py-1 rounded bg-black/40 text-[8px] font-black text-emerald-500/70 border border-emerald-500/10">吸铁石效应</span>
                </div>
              </div>
              <div className="p-6 rounded-3xl bg-rose-500/5 border border-rose-500/10 space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-3xl rounded-full -mr-16 -mt-16"></div>
                <h4 className="text-rose-400 text-sm font-black uppercase tracking-widest flex items-center gap-2">
                   <i className="fa-solid fa-wind"></i> 负 Gamma 环境 (Fuel)
                </h4>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-mono">
                  MM 处于“顺向对冲”状态。价格下跌时必须卖出标的，上涨时必须买入。对冲行为变成了波动的“燃油 (Fuel)”，引发加速下跌或空头挤压，波动率急剧扩张。
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="px-2 py-1 rounded bg-black/40 text-[8px] font-black text-rose-500/70 border border-rose-500/10">高 IV 溢价</span>
                  <span className="px-2 py-1 rounded bg-black/40 text-[8px] font-black text-rose-500/70 border border-rose-500/10">单边加速</span>
                  <span className="px-2 py-1 rounded bg-black/40 text-[8px] font-black text-rose-500/70 border border-rose-500/10">波动溢出</span>
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="对冲动力学进阶：多维度交互矩阵" subtitle="深度解码 Expiry 交互与关键行权价影响" icon="fa-solid fa-microchip">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4">
              
              {/* 0DTE vs 1DTE Interaction */}
              <div className="bg-zinc-900/30 p-5 rounded-2xl border border-zinc-800 space-y-4 hover:border-blue-500/30 transition-colors group">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-6 bg-blue-500 rounded-full group-hover:animate-pulse"></div>
                  <h4 className="text-[10px] font-black text-white uppercase tracking-widest">0DTE 与 1DTE 交互 (The Relay)</h4>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-zinc-500 uppercase flex items-center gap-1">
                      <i className="fa-solid fa-link"></i> 流动性接力 (Liquidity Bridge)
                    </p>
                    <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
                      0DTE 掌控即时定价权，决定日内振幅。当 0DTE 敞口释放后，市场动能往往由 1DTE 的结构墙接手。若 0DTE GEX 弱而 1DTE 强，日内突破往往会演变为假突破。
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-zinc-500 uppercase flex items-center gap-1">
                      <i className="fa-solid fa-shuffle"></i> 结构性背离 (Structural Divergence)
                    </p>
                    <p className="text-[10px] text-zinc-400 leading-relaxed font-sans italic">
                      若 0DTE 为负 (加速) 而 1DTE 为正 (粘滞)，会出现经典的“日内闪崩后 V 反”。1DTE 的正 Gamma 提供了最终的硬地板。
                    </p>
                  </div>
                </div>
              </div>

              {/* King Strike Impact */}
              <div className="bg-zinc-900/30 p-5 rounded-2xl border border-zinc-800 space-y-4 hover:border-amber-500/30 transition-colors group">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-6 bg-amber-500 rounded-full group-hover:animate-pulse"></div>
                  <h4 className="text-[10px] font-black text-white uppercase tracking-widest">King Strike (引力黑洞)</h4>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-zinc-500 uppercase flex items-center gap-1">
                      <i className="fa-solid fa-anchor"></i> 锚定效应 (The Anchor)
                    </p>
                    <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
                      King Strike 是全市场最大敞口密集区。此处对冲频率最高，MM 的买卖盘会将价格强行“锁死 (Pinning)”在此。它是震荡行情的终点，也是趋势爆发的起点。
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-zinc-500 uppercase flex items-center gap-1">
                      <i className="fa-solid fa-explosion"></i> 挤压临界 (The Squeeze Point)
                    </p>
                    <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
                      一旦 King Strike 被暴力突破，MM 必须进行覆盖性对冲，导致 Delta 瞬间爆炸，形成“真空区”后的极速拉升或暴跌。
                    </p>
                  </div>
                </div>
              </div>

              {/* Vanna & Charm Section */}
              <div className="bg-zinc-900/30 p-5 rounded-2xl border border-zinc-800 space-y-4 hover:border-indigo-500/30 transition-colors group">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-6 bg-indigo-500 rounded-full group-hover:animate-pulse"></div>
                  <h4 className="text-[10px] font-black text-white uppercase tracking-widest">二阶因子 (Vanna & Charm)</h4>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-zinc-500 uppercase flex items-center gap-1">
                      <i className="fa-solid fa-clock"></i> 时间衰减魅力 (Charm / Delta Decay)
                    </p>
                    <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
                      随时间推移，OTM 期权的 Delta 会自然衰减。在 0DTE 尾盘，这意味着 MM 必须持续释放标的头寸，这是引发尾盘“缓慢漂移”或“电梯行情”的主因。
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-zinc-500 uppercase flex items-center gap-1">
                      <i className="fa-solid fa-chart-line"></i> 波动率共振 (Vanna / Vol-Delta)
                    </p>
                    <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
                      当波动率 (IV) 下降时，MM 必须买入更多标的以平衡 Delta。这就是为什么“缩量缓涨”在正 Gamma 环境下具有极强的持续性。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Panel>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="p-8 bg-zinc-950/50 border border-dashed border-zinc-800 rounded-3xl flex flex-col items-center text-center">
                <i className="fa-solid fa-graduation-cap text-[rgb(var(--accent-rgb))] opacity-50 text-2xl mb-4"></i>
                <h4 className="text-sm font-black text-zinc-300 uppercase mb-2">战略结论 (Strategic Consensus)</h4>
                <p className="text-[10px] text-zinc-500 max-w-md leading-relaxed uppercase tracking-[0.1em]">
                  不要在 King Strike 处博弈趋势。在 King Strike 处收集 Theta (时间价值)，在 Vacuum Zone (真空区) 追逐 Gamma (单边动能)。
                </p>
             </div>
             
             <div className="p-8 bg-zinc-950/50 border border-dashed border-rose-900/30 rounded-3xl flex flex-col items-center text-center">
                <i className="fa-solid fa-skull-crossbones text-rose-500/50 text-2xl mb-4"></i>
                <h4 className="text-sm font-black text-zinc-300 uppercase mb-2">致命错误 (Terminal Errors)</h4>
                <p className="text-[10px] text-zinc-500 max-w-md leading-relaxed uppercase tracking-[0.1em]">
                  在负 Gamma 制度下逆势抄底是自杀行为。负 Gamma 环境下不存在支撑位，只存在“动能衰竭点”。
                </p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StrategyLibrary;
