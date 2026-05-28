import React, { useEffect, useState } from 'react';
import { Zap, History, BookOpen, Play, Cpu } from 'lucide-react';
import type { RegimeDetail, MatchSummary, MatchEvent } from './types/api';
import TerminalPanel from './components/TerminalPanel';
import JudgeLeaderboard from './components/JudgeLeaderboard';
import HistoryExplorer from './components/HistoryExplorer';
import CodexBrowser from './components/CodexBrowser';

// Premium Simulated Data for Sandbox Mode
const MOCK_PROMPT = "Establish secure and robust border defense policies for agricultural frontiers facing seasonal tribal raids.";

const SIMULATION_CIVS = [
  { id: 'china/tang', name: 'Tang Dynasty', pattern: 'checks-and-balances', backend: 'claude-3-5-sonnet' },
  { id: 'global/roman-republic', name: 'Roman Republic', pattern: 'checks-and-balances', backend: 'cc-mimo (1M)' },
  { id: 'global/soviet', name: 'Soviet Union', pattern: 'centralized', backend: 'cc-doubao' },
  { id: 'global/prussia', name: 'Kingdom of Prussia', pattern: 'centralized', backend: 'cc-stepfun' },
];

const SIMULATION_LOGS: { [regime: string]: Array<{ actor: string; text: string; delay: number }> } = {
  'china/tang': [
    { actor: 'zhongshu-sheren', text: '【中书省】奉天承运，皇帝诏曰。近期北方边境屡遭寇掠。起草《边防防御与春耕屯田方略》：派兵部部署季节巡视，户部调配粮草，优选河谷屯田，门下省速审。', delay: 1000 },
    { actor: 'bingbu', text: '【兵部】臣遵旨。已排定防守拓扑：二月至四月春耕期间，北方骑兵巡逻频次提升三倍。调拨五千府兵以作常备，工部迅速加固烽火台哨所。', delay: 3000 },
    { actor: 'hubu', text: '【户部】臣遵旨。拨付专饷五万贯、义仓粮一万石用以屯田开垦之需。成本分析：春季增饷将使季度赤字增加8%，但可挽回六成边防流民税收。', delay: 5000 },
    { actor: 'menxia-shiyushi', text: '【门下省】封驳意见：北方三月仍有倒春寒，骑兵春巡若无冬衣补给易起冻伤；且屯田开垦仅拨一万石不足御敌。要求：提高义仓存粮拨付至三成，增配棉衣。', delay: 7500 },
    { actor: 'zhongshu-sheren', text: '【中书省】修正案已采纳。重新分派：户部增拨春棉五千套，调配粮草提至三成。圣旨正本已呈尚书省执行。', delay: 9000 },
    { actor: 'emperor', text: '【皇帝】诏书已阅，善。准奏，颁行天下。', delay: 11000 },
  ],
  'global/roman-republic': [
    { actor: 'consul-a', text: 'Senate assembled. We must address the agricultural threat in Gaul. Hostile raids destroy our wheat supplies. I propose sending two legions to establish permanent garrisons (Castra) along the river borders.', delay: 1200 },
    { actor: 'senate', text: 'Senatus Consultum: We recognize the threat to the grain supply (Cura Annonae). However, authorizing two permanent legions requires massive silver coinage. We recommend a joint alliance with border tribes (Foederati) instead.', delay: 3200 },
    { actor: 'consul-b', text: 'I invoke my intercessio (veto) on Consul A\'s immediate legionary draft. A draft right now disrupts Rome\'s spring voting and plebeian sowing. We must debate funding.', delay: 5200 },
    { actor: 'tribune', text: 'Plebeian Assembly Veto! We reject any tax hikes on the plebeians to fund foreign border fortresses. Any military budget must be paid from patrician war spoils.', delay: 7200 },
    { actor: 'quaestor', text: 'Treasury statement (Aerarium): We currently hold sufficient silver from Macedonian campaigns. We can fund a defensive wall and draft one local auxiliary cohort without plebeian taxes.', delay: 9500 },
    { actor: 'censor', text: 'Audit passed. Citizens drafted must belong to the property classes. The compromise passes: one auxiliary cohort deployed, local tribal treaties renegotiated.', delay: 11500 },
  ],
  'global/soviet': [
    { actor: 'gensec', text: 'Comrades, our agricultural collectives in the Far East face seasonal capitalist sabotage. The Politburo orders the immediate establishment of military-agricultural defense zones (Sovkhozes).', delay: 1500 },
    { actor: 'gosplan', text: 'Gosplan directives issued. We have allocated 500 tractors and 20 tons of fuel from the Ural reserve. Defensive bunkers must be built using 15% of local factory materials by the end of May.', delay: 4000 },
    { actor: 'kgb', text: 'State Security alert. We have detected regional coordination leaks in local farm unions. 3 suspicious agents detained. Tightening surveillance on all border communication channels.', delay: 6500 },
    { actor: 'army', text: 'Red Army deploying. 4 motorized border divisions stationed along the river nodes. Tactical bunkers and minefields are established to secure the tractor zones.', delay: 8500 },
    { actor: 'pravda', text: 'Pravda editorial published: "The Iron Wall of Socialism Defends the People\'s Harvest!" Counter-intelligence operations are widely praised across state channels.', delay: 10500 },
    { actor: 'politburo', text: 'Collectivization and fortification metrics achieved. Border secure. Report forwarded to the Supreme Soviet.', delay: 12000 },
  ],
  'global/prussia': [
    { actor: 'emperor', text: 'Königliche Order: Our Silesian granaries are critical. General Staff must immediately outline a centralized defensive perimeter to repel raids.', delay: 1000 },
    { actor: 'chengxiang', text: 'Generalfeldmarschall: Plan established. The border is divided into 4 military administrative districts. A permanent garrison of 3,000 Grenadiers is deployed.', delay: 3500 },
    { actor: 'yushi-censor', text: 'Audit of military supply: Grenadiers require 5,000 tons of rye. Local Silesian estates will provide this through the standard grain tax. Drafted serfs will maintain defensive dykes.', delay: 6000 },
    { actor: 'shaofu-works', text: 'Fortress construction ongoing. Star-shaped stone fortresses (Schanzen) are being erected at critical choke points. Silesian peasants are mobilized for labor.', delay: 8500 },
    { actor: 'emperor', text: 'Order finalized. Complete central execution: Silesian defenses are absolute. Violations will face court-martial.', delay: 11000 },
  ]
};

const MOCK_JUDGE_SCORES = {
  'china/tang': { legality: 9.2, feasibility: 8.8, resilience: 9.0 },
  'global/roman-republic': { legality: 9.5, feasibility: 8.2, resilience: 8.5 },
  'global/soviet': { legality: 7.8, feasibility: 8.9, resilience: 8.4 },
  'global/prussia': { legality: 8.5, feasibility: 9.2, resilience: 7.9 },
};

const MOCK_JUDGE_VERDICTS = {
  'china/tang': `### Tang Dynasty Evaluation (Legality: 9.2, Feasibility: 8.8, Resilience: 9.0)

- **Legality**: Outstanding. The team perfectly followed the historical checks-and-balances flow. The draft started in the Zhongshu-sheren, went to Bingbu and Hubu, was successfully reviewed (and even rejected!) by Menxia-shiyushi, and finally signed by the Emperor.
- **Feasibility**: High. Tying military seasonal patrols to seasonal farming agricultural windows reflects strong logistics and low overhead.
- **Resilience**: Superior. The Menxia intervention identified key vulnerabilities (damp weather/frostbite risk and low grain reserves) before final deployment, preventing systemic collapse.`,

  'global/roman-republic': `### Roman Republic Evaluation (Legality: 9.5, Feasibility: 8.2, Resilience: 8.5)

- **Legality**: Perfect. The dual-consul system demonstrated true veto power (intercessio) when Consul B blocked Consul A's draft. The Tribune of the Plebs successfully protected the commons from regressive taxation.
- **Feasibility**: Moderate. While democratic-republican consensus was reached, the debate took 4 turn cycles, showing heavy decision-making overhead in emergencies.
- **Resilience**: Good. The treasury compromise (utilizing spoils of war) kept the domestic plebeian population stable and prevented domestic riots.`,

  'global/soviet': `### Soviet Union Evaluation (Legality: 7.8, Feasibility: 8.9, Resilience: 8.4)

- **Legality**: Moderate. General Secretary bypassed traditional Soviet legislative channels, relying purely on the Politburo. This is historically authentic but structurally autocratic.
- **Feasibility**: Very High. The central state planning (Gosplan) rapidly redistributed assets (tractors, fuel, security guards) across borders in record time.
- **Resilience**: Moderate. Tightening local surveillance and pre-emptive detentions create a highly brittle civil environment, raising long-term administrative friction.`,

  'global/prussia': `### Prussian Empire Evaluation (Legality: 8.5, Feasibility: 9.2, Resilience: 7.9)

- **Legality**: High. Strict military bureaucracy executed top-down royal mandates precisely.
- **Feasibility**: Exceptional. Prussian engineering and star-shaped fortress topology represent absolute structural peak efficiency.
- **Resilience**: Brittle. Forcing Silesian peasants into labor and heavy tax grain drafts risks domestic agricultural collapse and rebellion in the event of an extended campaign.`
};

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'live' | 'history' | 'codex'>('live');
  const [regimes, setRegimes] = useState<RegimeDetail[]>([]);
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchSummary | null>(null);
  const [selectedMatchEvents, setSelectedMatchEvents] = useState<MatchEvent[]>([]);

  // Live simulation states
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStatus, setSimulationStatus] = useState<'running' | 'completed' | 'idle'>('idle');
  const [simulationEvents, setSimulationEvents] = useState<{ [regime: string]: MatchEvent[] }>({
    'china/tang': [],
    'global/roman-republic': [],
    'global/soviet': [],
    'global/prussia': [],
  });

  // Fetch real data on load
  useEffect(() => {
    fetchRegimes();
    fetchMatches();
  }, []);

  const fetchRegimes = async () => {
    try {
      const res = await fetch('/api/regimes');
      if (res.ok) {
        const data = await res.json();
        setRegimes(data);
      }
    } catch (e) {
      console.warn("Failed to fetch regimes, using fallback.", e);
    }
  };

  const fetchMatches = async () => {
    try {
      const res = await fetch('/api/matches');
      if (res.ok) {
        const data = await res.json();
        setMatches(data);
      }
    } catch (e) {
      console.warn("Failed to fetch matches.", e);
    }
  };

  const fetchMatchDetails = async (matchId: string) => {
    try {
      const res = await fetch(`/api/matches/${matchId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedMatchEvents(data.events || []);
      }
    } catch (e) {
      console.error("Failed to load match details:", e);
    }
  };

  // Launch a mock simulation in the UI
  const handleStartSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimulationStatus('running');
    
    // Clear previous simulation events
    setSimulationEvents({
      'china/tang': [],
      'global/roman-republic': [],
      'global/soviet': [],
      'global/prussia': [],
    });

    const startTime = Date.now();

    // Map each log delay to an interval timer
    Object.keys(SIMULATION_LOGS).forEach((regime) => {
      const logs = SIMULATION_LOGS[regime];
      
      logs.forEach((log, index) => {
        setTimeout(() => {
          setSimulationEvents(prev => {
            const current = prev[regime] || [];
            
            // Append a match start event on very first item
            const prefix = index === 0 
              ? [{ matchId: 'mock-sim', ts: startTime, seq: 0, type: 'match_start' as const, text: 'MATCH INITIATED: ' + MOCK_PROMPT }] 
              : [];

            const newEvent: MatchEvent = {
              matchId: 'mock-sim',
              ts: startTime + log.delay,
              seq: index + 1,
              type: 'turn',
              actor: log.actor,
              text: log.text,
            };

            return {
              ...prev,
              [regime]: [...current, ...prefix, newEvent]
            };
          });
        }, log.delay);
      });

      // Append sediment completed at the end of logs stream
      const totalDelay = logs[logs.length - 1].delay + 1000;
      setTimeout(() => {
        setSimulationEvents(prev => {
          const current = prev[regime] || [];
          const endEvent: MatchEvent = {
            matchId: 'mock-sim',
            ts: startTime + totalDelay,
            seq: logs.length + 2,
            type: 'skill',
            text: 'Nous Hermes skill extracted: learned-seasonal-frontier-risk-planning.md saved.',
          };
          return {
            ...prev,
            [regime]: [...current, endEvent]
          };
        });
      }, totalDelay);
    });

    // Complete the entire simulation
    setTimeout(() => {
      setSimulationStatus('completed');
      setIsSimulating(false);

      // Append this mock match to the matches history list so the user can interact with it!
      const mockSummary: MatchSummary = {
        id: `mock-match-${Math.random().toString(36).substring(2, 7)}`,
        format: 'structured',
        mtime: Date.now(),
        meta: {
          matchId: 'mock-match',
          regime: 'china/tang & others (Tournament)',
          backend: 'multi-backend',
          prompt: MOCK_PROMPT,
          exitCode: 0,
          sediment: 'success'
        }
      };
      setMatches(prev => [mockSummary, ...prev]);

    }, 14000);
  };

  const handleSelectHistoryMatch = (matchId: string) => {
    const match = matches.find(m => m.id === matchId) || null;
    setSelectedMatch(match);
    if (match) {
      fetchMatchDetails(match.id);
    }
  };

  return (
    <div className="flex min-h-screen text-[var(--text-primary)]" style={{ display: 'flex', minHeight: '100vh' }}>
      
      {/* LEFT SIDEBAR NAVBAR */}
      <aside className="w-64 bg-[var(--bg-secondary)] border-r border-[rgba(255,255,255,0.06)] flex flex-col p-5 shrink-0" style={{ width: '256px', display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '20px', background: 'var(--bg-secondary)' }}>
        
        {/* Branding Logo */}
        <div className="flex items-center gap-3 mb-8" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[rgba(0,240,255,0.08)] border border-[rgba(0,240,255,0.25)] text-[var(--accent-cyan)] shadow-[0_0_15px_rgba(0,240,255,0.1)]" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cpu size={20} />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight font-heading m-0 text-[var(--text-primary)]" style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>CivAgent</h1>
            <span className="text-[10px] font-mono text-[var(--accent-gold)] uppercase tracking-wider">v5.0.1 (STABLE)</span>
          </div>
        </div>

        {/* Tab Links */}
        <nav className="flex-1 space-y-2" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('live')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-all ${
              activeTab === 'live'
                ? 'bg-[rgba(0,240,255,0.06)] border-[rgba(0,240,255,0.3)] text-[var(--accent-cyan)] shadow-[0_0_12px_rgba(0,240,255,0.05)]'
                : 'bg-transparent border-transparent text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.02)]'
            }`}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', fontWeight: 600, padding: '12px 16px', textAlign: 'left' }}
          >
            <Zap size={14} /> Live Tournament
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-all ${
              activeTab === 'history'
                ? 'bg-[rgba(0,240,255,0.06)] border-[rgba(0,240,255,0.3)] text-[var(--accent-cyan)] shadow-[0_0_12px_rgba(0,240,255,0.05)]'
                : 'bg-transparent border-transparent text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.02)]'
            }`}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', fontWeight: 600, padding: '12px 16px', textAlign: 'left' }}
          >
            <History size={14} /> Match Archive
          </button>

          <button
            onClick={() => setActiveTab('codex')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-all ${
              activeTab === 'codex'
                ? 'bg-[rgba(0,240,255,0.06)] border-[rgba(0,240,255,0.3)] text-[var(--accent-cyan)] shadow-[0_0_12px_rgba(0,240,255,0.05)]'
                : 'bg-transparent border-transparent text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.02)]'
            }`}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', fontWeight: 600, padding: '12px 16px', textAlign: 'left' }}
          >
            <BookOpen size={14} /> Regimes Codex
          </button>
        </nav>

        {/* Footer info */}
        <div className="pt-4 border-t border-[rgba(255,255,255,0.04)] text-[10px] text-[var(--text-muted)] font-mono shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '16px', fontSize: '10px' }}>
          <span>Agentic Front-End</span>
          <span className="block mt-1">Status: OK</span>
        </div>

      </aside>

      {/* MAIN CONTAINER WORKSPACE */}
      <main className="flex-1 flex flex-col min-w-0" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        
        {/* Top Header */}
        <header className="h-16 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(10,11,16,0.35)] backdrop-filter backdrop-blur px-6 flex items-center justify-between shrink-0" style={{ height: '64px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(10,11,16,0.35)' }}>
          <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)]" style={{ fontSize: '12px', fontWeight: 600 }}>Active Workspace</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[rgba(255,255,255,0.2)]" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }}></span>
            <span className="text-xs font-mono text-[var(--text-secondary)]">/Users/leo/Projects/civagent</span>
          </div>

          <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="text-[10px] font-mono bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] px-2 py-0.5 rounded text-[var(--text-secondary)]" style={{ fontSize: '10px', padding: '2px 8px' }}>
              Models: 10 backends
            </span>
          </div>
        </header>

        {/* Tab Contents Workspace */}
        <div className="flex-1 overflow-y-auto p-6" style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          
          {/* TAB 1: LIVE TOURNAMENT MONITOR */}
          {activeTab === 'live' && (
            <div className="space-y-6" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Task/Prompt Overview Card */}
              <div className="glass-panel p-5 flex flex-col md:flex-row items-center justify-between gap-5 relative overflow-hidden" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', padding: '20px', borderRadius: '12px' }}>
                <div className="space-y-2 max-w-[70%]" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '70%' }}>
                  <div className="flex items-center gap-2 text-[10px] text-[var(--accent-cyan)] font-mono uppercase tracking-wider" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', fontWeight: 600 }}>
                    <Cpu size={12} />
                    <span>ORCHESTRATION CONSOLE COMMAND</span>
                  </div>
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]" style={{ fontSize: '14px', fontWeight: 600 }}>
                    Active Prompt: <span className="font-mono text-[var(--text-secondary)] font-normal">"{MOCK_PROMPT}"</span>
                  </h2>
                </div>

                <div className="shrink-0" style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={handleStartSimulation}
                    disabled={simulationStatus === 'running'}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                      simulationStatus === 'running'
                        ? 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.05)] text-[var(--text-muted)] cursor-not-allowed'
                        : 'bg-[var(--accent-cyan)] text-black border-[var(--accent-cyan)] hover:bg-[#3bf5ff] shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                    }`}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontSize: '11px', fontWeight: 700, color: simulationStatus === 'running' ? 'var(--text-muted)' : 'black', background: simulationStatus === 'running' ? 'rgba(255,255,255,0.02)' : 'var(--accent-cyan)', borderStyle: 'solid' }}
                  >
                    <Play size={14} /> Run Simulation
                  </button>
                </div>
              </div>

              {/* Parallel terminals grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                {SIMULATION_CIVS.map((civ) => {
                  const evs = simulationEvents[civ.id] || [];
                  const civStatus = 
                    simulationStatus === 'idle' ? 'idle' :
                    simulationStatus === 'running' && evs.length === 0 ? 'idle' :
                    simulationStatus === 'running' ? 'running' : 'completed';

                  return (
                    <TerminalPanel
                      key={civ.id}
                      regimeId={civ.id}
                      displayName={civ.name}
                      backend={civ.backend}
                      events={evs}
                      status={civStatus}
                      sedimentStatus={civStatus === 'completed' ? 'success' : undefined}
                    />
                  );
                })}
              </div>

              {/* Tournament scoreboard/Leaderboard (renders when completed) */}
              {simulationStatus === 'completed' && (
                <div className="animate-fade-in">
                  <JudgeLeaderboard
                    scores={MOCK_JUDGE_SCORES}
                    verdicts={MOCK_JUDGE_VERDICTS}
                    civNames={{
                      'china/tang': 'Tang Dynasty',
                      'global/roman-republic': 'Roman Republic',
                      'global/soviet': 'Soviet Union',
                      'global/prussia': 'Kingdom of Prussia',
                    }}
                  />
                </div>
              )}

            </div>
          )}

          {/* TAB 2: HISTORICAL MATCHES EXPLORER */}
          {activeTab === 'history' && (
            <HistoryExplorer
              matches={matches}
              onSelectMatch={handleSelectHistoryMatch}
              activeMatchId={selectedMatch?.id}
              activeMatchEvents={selectedMatchEvents}
            />
          )}

          {/* TAB 3: REGIMES CODEX */}
          {activeTab === 'codex' && (
            <CodexBrowser regimes={regimes} />
          )}

        </div>

      </main>

    </div>
  );
};
export default App;
