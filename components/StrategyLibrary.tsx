import React, { useState } from 'react';
import Panel from './Panel';

const strategies = [
  {
    category: "正 Gamma 粘性环境 (Positive Gamma / Glue Strategy)",
    color: "emerald",
    items: [
      { id: "S1", name: "保守型牛市看跌价差 (Bull Put Spread)", logic: "卖点 = min(0DTE 0G, 1DTE 0G) - 15点", desc: "当 GEX 为正时，做市商的逆向对冲充当稳定器。" },
      { id: "S2", name: "磁铁效应看涨蝶式 (Pinning Butterfly)", logic: "靶心 = King Strike (Max GEX)", desc: "博取价格被吸向最大 Gamma 密集区的利润。常发生于低波动环境。" },
      { id: "S3", name: "波动率均值回归对角价差", logic: "Vol Trigger 边界保护", desc: "偏离中枢但未跌破 VT 时，建立回归仓位。" },
      { id: "S4", name: "Delta Slingshot 进场", logic: "触碰 GEX 支撑后反弹", desc: "在强大的 Positive GEX 支撑位寻找回踩确认点。" }
    ]
  },
  {
    category: "负 Gamma 燃油环境 (Negative Gamma / Fuel Strategy)",
    color: "rose",
    items: [
      { id: "S5", name: "动能穿墙长普 (Gamma Vacuum)", logic: "确认 0DTE < 0 且跌破 Put Wall", desc: "对冲流加速下跌动能，适合方向性长普。" },
      { id: "S6", name: "防御型熊市看涨价差 (Bear Call Spread)", logic: "卖点 = Zero Gamma + 10点", desc: "利用 Zero Gamma 作为物理阻力位进行压力测试。" },
      { id: "S7", name: "Put 反向比率价差 (Vol Explosion)", logic: "卖 1 ATM / 买 2 OTM", desc: "博取波动率非线性扩张，覆盖卖腿损失。" },
      { id: "S8", name: "崩盘对冲陷阱 (Black Swan Hedge)", logic: "5 Delta OTM Put", desc: "极端对冲压力下的廉价尾部保险。" }
    ]
  },
  {
    category: "制度切换策略 (Regime Shift / Pivot)",
    color: "amber",
    items: [
      { id: "S9", name: "Zero-Gamma 翻转突破", logic: "从正转负时建立空头", desc: "制度突变是最高确定性的趋势起点。" },
      { id: "S10", name: "VT 波动率溢出套利", logic: "突破 VT 后的 Gamma 追逐", desc: "顺应做市商强制调仓方向的动能策略。" }
    ]
  }
];

const archetypes = [
  {
    category: "流动性锚点与核心墙 (Liquidity Anchors & Walls)",
    icon: "fa-solid fa-anchor",
    color: "blue",
    patterns: [
      { n: "1", t: "Magnet Pin", d: "价格被吸向最大 Gamma 密集区", l: "MMs 在高 GEX 行权价附近进行逆向对冲，导致价格在到期前在该位震荡。" },
      { n: "4", t: "Put Wall Defense", d: "主要看跌支撑防御", l: "大型看跌期权持有者迫使做市商在价格下跌时买入标的以对冲其卖出的 Put Delta。" },
      { n: "5", t: "Call Wall Compression", d: "上方看涨敞口压制", l: "做市商在价格上涨时被迫卖出标的，以对冲其卖出的 Call Delta，形成结构化阻力。" },
      { n: "6", t: "Zero-Gamma Flip", d: "制度反转临界点", l: "价格跨过正负 Gamma 的分水岭。此时市场波动率会发生阶梯式跳跃。" },
      { n: "13", t: "Institutional Anchor Shift", d: "King Strike 迁移", l: "盘中最大敞口位发生变动，暗示大型机构投资者正在调整其风险敞口或对冲目标。" },
      { n: "17", t: "Multi-DTE Lock", d: "多重期限共振锁定", l: "不同到期日的 GEX 墙重合在同一价位。这是市场中最难被突破的物理屏障。" }
    ]
  },
  {
    category: "动能驱动与对冲真空 (Momentum & Voids)",
    icon: "fa-solid fa-wind",
    color: "rose",
    patterns: [
      { n: "2", t: "Gamma Vacuum", d: "快速滑过敞口稀疏区", l: "GEX 总量极低的价位区间，对冲流动性匮乏，少量订单即可引发剧烈价格滑移。" },
      { n: "7", t: "VT Breakout", d: "波动率触发位加速", l: "跌破/突破 Volatility Trigger 后，做市商必须以指数级速度追逐方向进行对冲。" },
      { n: "10", t: "Gamma Squeeze", d: "空头回补非线性加速", l: "上涨触发 Call 卖方强制买入标的，买入推高价格进一步触发更多买入，形成正反馈循环。" },
      { n: "12", t: "Delta Slingshot", d: "深踩支撑后弹射", l: "对冲流因极端下跌而过度扩张，一旦价格守住关键 GEX 支撑，平仓流会引发瞬间报复性反弹。" },
      { n: "19", t: "Volatility Expansion", d: "负 G 制度震幅放大", l: "负 Gamma 下做市商“高买低卖”的追逐行为，使得每一次反弹都成为更深下跌的蓄力。" },
      { n: "20", t: "Hedge Unwinding", d: "突发撤单引发真空", l: "关键阻力位的大量 Open Interest 被突然平仓或移除，导致原本的支撑/阻力瞬间消失。" }
    ]
  },
  {
    category: "微观结构与周期流 (Micro-Structural Flows)",
    icon: "fa-solid fa-microchip",
    color: "amber",
    patterns: [
      { n: "3", t: "Mean Reversion", d: "均值回归动态", l: "在正 Gamma 制度下，价格偏离 HVN 后由于 MMs 的稳定作用产生的回归拉力。" },
      { n: "8", t: "Tide Divergence", d: "资金流与价格背离", l: "Market Tide 显示资金极度看空但价格不跌，通常预示机构正在悄悄承接散户抛压。" },
      { n: "9", t: "1DTE Anchor Lead", d: "次日大额敞口引导", l: "0DTE 到期日，次日(1DTE)的大额未平仓合约预告了当下的流动性中枢位置。" },
      { n: "11", t: "Liquidity Trap", d: "HVN 诱多/诱空陷阱", l: "价格在 HVN 附近横盘消耗所有对手盘，随后发动反向突袭以清理被套仓位。" },
      { n: "14", t: "Vanna Vortex", d: "Vol 相关性强制对冲", l: "由于隐含波动率(IV)的变化导致 Delta 改变，做市商即使在标的价格不动时也必须调仓。" },
      { n: "15", t: "Charm Decay", d: "时间价值衰减引发抛售", l: "临近尾盘，期权 Delta 随时间流逝快速归零，做市商平掉对冲头寸引发的价格波动。" },
      { n: "16", t: "Delta Exhaustion", d: "买卖盘动能枯竭", l: "价格到达某个特定 GEX 极端水平，使得一方的潜在对冲需求已被完全满足。" },
      { n: "18", t: "Pre-Opex De-risking", d: "到期前仓位调整", l: "在月度或季度期权到期日前 1-2 天，大型基金开始大规模平仓导致的系统性震荡。" }
    ]
  }
];

const StrategyLibrary: React.FC = () => {
  const [activeView, setActiveView] = useState<'strategies' | 'theory'>('strategies');
  const [activeTheoryTab, setActiveTheoryTab] = useState<'regime' | 'time' | 'king' | 'archetypes'>('regime');

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-6 px-4">
      <div className="bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[rgb(var(--accent-rgb),0.1)] flex items-center justify-center border border-[rgb(var(--accent-rgb),0.2)] shadow-inner">
            <i className="fa-solid fa-graduation-cap accent-text text-xl"></i>
          </div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-widest">战略与动力学理论中心</h2>
            <p className="text-[10px] text-zinc-500 font-bold mt-1 uppercase tracking-tight">机构级对冲模式 & 策略矩阵</p>
          </div>
        </div>
        
        <div className="flex bg-black/40 p-1 rounded-xl border border-zinc-800">
           <button 
             onClick={() => setActiveView('strategies')}
             className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeView === 'strategies' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
           >
             实战策略库
           </button>
           <button 
             onClick={() => setActiveView('theory')}
             className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeView === 'theory' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
           >
             核心动力学理论
           </button>
        </div>
      </div>

      {activeView === 'strategies' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {strategies.map((cat, idx) => (
            <Panel key={idx} title={cat.category} icon="fa-solid fa-square-poll-vertical" className="h-full">
              <div className="space-y-4">
                {cat.items.map((item) => (
                  <div key={item.id} className="group p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all hover:shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300`}>
                        {item.id}
                      </span>
                      <span className="text-[9px] font-mono text-zinc-500 bg-black/30 px-2 py-0.5 rounded">{item.logic}</span>
                    </div>
                    <h4 className="text-xs font-black text-zinc-200 mb-1">{item.name}</h4>
                    <p className="text-[10px] text-zinc-500 leading-relaxed italic">"{item.desc}"</p>
                  </div>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {[
              { id: 'regime', label: '对冲制度 (Regime)', icon: 'fa-solid fa-chart-line' },
              { id: 'time', label: '时间敏感性 (0DTE vs Far)', icon: 'fa-solid fa-hourglass-half' },
              { id: 'king', label: '机构锚点 (King Strike)', icon: 'fa-solid fa-anchor' },
              { id: 'archetypes', label: '20种经典模式 (Detailed)', icon: 'fa-solid fa-list-ol' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTheoryTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTheoryTab === tab.id 
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                  : 'bg-zinc-900 border-zinc-800 text-zinc-600 hover:border-zinc-700'
                }`}
              >
                <i className={tab.icon}></i>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="min-h-[400px]">
            {activeTheoryTab === 'regime' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in zoom-in-95 duration-300">
                <Panel title="Positive Gamma (+G) - 流动性粘滞" icon="fa-solid fa-shield-halved" subtitle="Market Maker 顺势对冲环境">
                  <div className="space-y-4 text-[11px] leading-relaxed text-zinc-400 font-mono">
                    <p className="text-emerald-400 font-black">做市商特征：低买高卖 (Mean Reverting)</p>
                    <p>当价格上涨，做市商卖出 Delta；价格下跌，做市商买入 Delta。这种逆向操作为市场提供了天然的“流动性粘滞”。</p>
                    <ul className="list-disc pl-4 space-y-2">
                      <li>波动率：通常呈压缩状态 (Vol Compression)。</li>
                      <li>价格行为：震荡上行或窄幅横盘，回调往往在关键 GEX 位被快速承接。</li>
                      <li>交易对策：逢低买入，由于对冲流阻碍趋势发展，适合高抛低吸。</li>
                    </ul>
                  </div>
                </Panel>
                <Panel title="Negative Gamma (-G) - 对冲燃油" icon="fa-solid fa-fire-flame-curved" subtitle="Market Maker 逆势加速环境">
                  <div className="space-y-4 text-[11px] leading-relaxed text-zinc-400 font-mono">
                    <p className="text-rose-400 font-black">做市商特征：高买低卖 (Momentum Chasing)</p>
                    <p>当价格下跌，做市商必须卖出更多标的以保持中性；价格上涨则反之。这种被迫对冲成为了波动的“放大器”。</p>
                    <ul className="list-disc pl-4 space-y-2">
                      <li>波动率：呈爆炸式扩张 (Vol Expansion)。</li>
                      <li>价格行为：单边趋势极强，容易出现跳空和非线性杀跌/拉升。</li>
                      <li>交易对策：顺势而为，寻找突破，注意由于对冲真空导致的“瞬间回撤”。</li>
                    </ul>
                  </div>
                </Panel>
              </div>
            )}

            {activeTheoryTab === 'time' && (
              <div className="space-y-6 animate-in zoom-in-95 duration-300">
                <Panel title="Gamma 的时间维度：0DTE vs Far-Term" icon="fa-solid fa-clock">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-4">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest border-b border-zinc-900 pb-2">近端 (0DTE/1DTE) - 动态博弈区</h4>
                      <p className="text-[11px] text-zinc-400 leading-relaxed font-mono">
                        近端期权的 Gamma 极高且随时间快速衰减 (Charm)。这里的对冲流是市场的“战术动能”。
                      </p>
                      <ul className="space-y-2 text-[10px] text-zinc-500 font-mono">
                        <li><span className="text-zinc-300">● 瞬间影响力：</span> 尾盘的强力拉升或砸盘多由 0DTE 强制平仓/对冲引起。</li>
                        <li><span className="text-zinc-300">● 脆弱性：</span> 极易受到小额订单引发的连锁反应。</li>
                      </ul>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest border-b border-zinc-900 pb-2">远端 (Monthly/Quarterly) - 结构化墙</h4>
                      <p className="text-[11px] text-zinc-400 leading-relaxed font-mono">
                        远端大额仓位构成了市场的“战略防御”。虽然 Gamma 绝对值较低，但其总量构成了坚固的支撑/阻力墙。
                      </p>
                      <ul className="space-y-2 text-[10px] text-zinc-500 font-mono">
                        <li><span className="text-zinc-300">● 物理屏障：</span> 价格在季度到期前往往难以逾越主要的 Call Wall。</li>
                        <li><span className="text-zinc-300">● 锚定效应：</span> 远端大额仓位决定了市场的中长期引力中心。</li>
                      </ul>
                    </div>
                  </div>
                </Panel>
              </div>
            )}

            {activeTheoryTab === 'king' && (
              <div className="space-y-6 animate-in zoom-in-95 duration-300">
                <Panel title="分析核心：King Strike 与机构锚点" icon="fa-solid fa-crown">
                  <div className="p-4 bg-zinc-900/30 rounded-2xl border border-zinc-800 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-500">
                        <i className="fa-solid fa-chess-king text-2xl"></i>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-black text-white uppercase tracking-widest">King Strike (最大敞口位)</h4>
                        <p className="text-[10px] text-zinc-500 font-bold mt-1">全场 GEX 绝对值最大的行权价</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-black/40 border border-zinc-900">
                        <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest block mb-2">1. 价格磁铁</span>
                        <p className="text-[10px] text-zinc-500 leading-relaxed">在低波动环境下，价格具有被吸向 King Strike 的自然倾向 (Pinning)。</p>
                      </div>
                      <div className="p-4 rounded-xl bg-black/40 border border-zinc-900">
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block mb-2">2. 极限阈值</span>
                        <p className="text-[10px] text-zinc-500 leading-relaxed">King Strike 是做市商面临最大单边压力的位置，一旦跌破/突破，常伴随极端行情。</p>
                      </div>
                      <div className="p-4 rounded-xl bg-black/40 border border-zinc-900">
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block mb-2">3. 流动性深水区</span>
                        <p className="text-[10px] text-zinc-500 leading-relaxed">此价位聚集了最多的撮合意愿，是订单执行的最优选择，也是成交量最为密集的区域。</p>
                      </div>
                    </div>
                  </div>
                </Panel>
              </div>
            )}

            {activeTheoryTab === 'archetypes' && (
              <div className="animate-in zoom-in-95 duration-300 space-y-10">
                {archetypes.map((cat, catIdx) => (
                  <div key={catIdx} className="space-y-4">
                    <div className="flex items-center gap-3 px-2">
                       <i className={`${cat.icon} ${
                         cat.color === 'blue' ? 'text-blue-400' : 
                         cat.color === 'rose' ? 'text-rose-400' : 'text-amber-400'
                       } text-lg`}></i>
                       <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-300">{cat.category}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {cat.patterns.map(item => (
                        <div key={item.n} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl flex gap-4 items-start group hover:border-zinc-600 transition-all hover:bg-zinc-900/80">
                           <span className={`text-[12px] font-black text-zinc-700 group-hover:text-${cat.color}-500 transition-colors bg-black/30 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0`}>
                             {item.n.padStart(2, '0')}
                           </span>
                           <div className="space-y-1.5 flex-1">
                             <div className="flex items-center justify-between">
                               <p className="text-[11px] font-black text-zinc-200 uppercase tracking-widest group-hover:text-white">{item.t}</p>
                               <span className="text-[7px] font-black text-zinc-500 uppercase px-1.5 py-0.5 bg-black/40 rounded border border-zinc-800">PATTERN</span>
                             </div>
                             <p className="text-[10px] font-bold text-zinc-400 leading-snug">{item.d}</p>
                             <div className="pt-2 mt-2 border-t border-zinc-800/50">
                               <span className={`text-[8px] font-black ${
                                 cat.color === 'blue' ? 'text-blue-500/70' : 
                                 cat.color === 'rose' ? 'text-rose-500/70' : 'text-amber-500/70'
                               } uppercase tracking-tighter block mb-1`}>动力学逻辑 (Core Logic):</span>
                               <p className="text-[9px] text-zinc-500 font-mono leading-relaxed italic line-clamp-2 group-hover:line-clamp-none transition-all">
                                 "{item.l}"
                               </p>
                             </div>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                <div className="p-8 bg-zinc-950/50 border border-dashed border-zinc-800 rounded-3xl text-center">
                   <i className="fa-solid fa-lightbulb text-amber-500/50 text-2xl mb-4"></i>
                   <h4 className="text-sm font-black text-zinc-300 uppercase mb-2">学习提示</h4>
                   <p className="text-[10px] text-zinc-500 max-w-xl mx-auto leading-relaxed uppercase tracking-widest">
                     理解机构对冲模式的关键在于将价格视为“带电粒子”，而 Gamma 敞口则是“电场”。
                     价格总是沿着阻力最小的路径移动，而对冲墙则是不可逾越的物理边界。
                   </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StrategyLibrary;