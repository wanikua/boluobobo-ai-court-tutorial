import React, { useState } from 'react';
import { History, Calendar, ShieldCheck, FileText, ChevronRight, Terminal } from 'lucide-react';
import type { MatchSummary, MatchEvent } from '../types/api';

interface HistoryExplorerProps {
  matches: MatchSummary[];
  onSelectMatch: (matchId: string) => void;
  activeMatchId?: string;
  activeMatchEvents: MatchEvent[];
}

export const HistoryExplorer: React.FC<HistoryExplorerProps> = ({
  matches,
  onSelectMatch,
  activeMatchId,
  activeMatchEvents,
}) => {
  const [filterRegime, setFilterRegime] = useState('');

  const getFormatBadgeStyle = (format: string) => {
    return format === 'structured'
      ? 'bg-[rgba(0,240,255,0.08)] text-[var(--accent-cyan)] border border-[rgba(0,240,255,0.2)]'
      : 'bg-[rgba(255,255,255,0.04)] text-[var(--text-secondary)] border border-[rgba(255,255,255,0.06)]';
  };

  const getExitCodeBadgeStyle = (code?: number) => {
    if (code === undefined) return 'bg-[rgba(255,255,255,0.04)] text-[var(--text-muted)] border border-[rgba(255,255,255,0.06)]';
    return code === 0
      ? 'bg-[rgba(57,255,20,0.08)] text-[var(--accent-green)] border border-[rgba(57,255,20,0.25)]'
      : 'bg-[rgba(255,46,147,0.08)] text-[var(--accent-crimson)] border border-[rgba(255,46,147,0.25)]';
  };

  const getRoleStyleClass = (actor: string) => {
    const act = actor.toLowerCase();
    if (act.includes('emperor') || act.includes('consul') || act.includes('gensec') || act.includes('sheren') || act.includes('basileus') || act.includes('chengxiang')) {
      return 'role-coordinator';
    }
    if (act.includes('censor') || act.includes('tribune') || act.includes('patriarch') || act.includes('review') || act.includes('audit')) {
      return 'role-review';
    }
    if (act.includes('army') || act.includes('bingbu') || act.includes('works') || act.includes('engineering') || act.includes('taiwei')) {
      return 'role-engineering';
    }
    if (act.includes('research') || act.includes('senate') || act.includes('dromos')) {
      return 'role-research';
    }
    if (act.includes('hubu') || act.includes('finance') || act.includes('genikon') || act.includes('quaestor') || act.includes('gosplan')) {
      return 'role-data';
    }
    if (act.includes('gongbu') || act.includes('devops') || act.includes('domestikos') || act.includes('aedile') || act.includes('kgb')) {
      return 'role-devops';
    }
    if (act.includes('libu') || act.includes('content') || act.includes('pravda') || act.includes('protoasecretis')) {
      return 'role-content';
    }
    if (act.includes('xingbu') || act.includes('legal') || act.includes('praetor') || act.includes('tingwei') || act.includes('supreme')) {
      return 'role-legal';
    }
    return 'role-management';
  };

  // Filter matches based on search / filter inputs
  const filteredMatches = matches.filter(m => {
    if (!filterRegime) return true;
    const term = filterRegime.toLowerCase();
    const regime = m.meta?.regime || '';
    const matchId = m.id || '';
    const backend = m.meta?.backend || '';
    return (
      regime.toLowerCase().includes(term) ||
      matchId.toLowerCase().includes(term) ||
      backend.toLowerCase().includes(term)
    );
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
      
      {/* List Container */}
      <div className="lg:col-span-1 glass-panel p-5 flex flex-col h-[580px] overflow-hidden" style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', height: '580px', padding: '20px', borderRadius: '12px' }}>
        
        {/* Title */}
        <div className="flex items-center gap-2 mb-4 shrink-0" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <History className="text-[var(--accent-cyan)]" size={16} />
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]" style={{ fontSize: '14px', fontWeight: 700 }}>MATCH ARCHIVE</h2>
        </div>

        {/* Filter Input */}
        <div className="mb-4 shrink-0" style={{ marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Search by regime, ID or backend..."
            className="w-full text-xs"
            value={filterRegime}
            onChange={(e) => setFilterRegime(e.target.value)}
            style={{ width: '100%', fontSize: '12px' }}
          />
        </div>

        {/* List of matches */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scroll-fade-y" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredMatches.length === 0 ? (
            <div className="text-center py-10 text-[var(--text-muted)] text-xs" style={{ textAlign: 'center', padding: '40px 0', fontSize: '12px' }}>
              No matches found.
            </div>
          ) : (
            filteredMatches.map((m) => {
              const isActive = activeMatchId === m.id;
              const date = new Date(m.mtime);
              const label = m.meta?.regime || 'legacy';

              return (
                <div
                  key={m.id}
                  onClick={() => onSelectMatch(m.id)}
                  className={`p-3.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between group ${
                    isActive
                      ? 'bg-[rgba(0,240,255,0.06)] border-[rgba(0,240,255,0.35)] shadow-[0_0_12px_rgba(0,240,255,0.05)]'
                      : 'bg-[rgba(255,255,255,0.01)] border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.12)]'
                  }`}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  <div className="space-y-1.5 max-w-[80%]" style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '80%' }}>
                    
                    {/* Title Regime */}
                    <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="text-sm font-semibold text-[var(--text-primary)]" style={{ fontSize: '14px', fontWeight: 600 }}>
                        {label}
                      </span>
                      <span className={`role-badge ${getFormatBadgeStyle(m.format)}`} style={{ fontSize: '8px', padding: '1px 4px' }}>
                        {m.format}
                      </span>
                    </div>

                    {/* Meta match stamp */}
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-[var(--text-secondary)] font-mono" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', fontSize: '10px', color: 'var(--text-secondary)' }}>
                      <span className="flex items-center gap-0.5" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                        <Calendar size={10} /> {date.toLocaleDateString()}
                      </span>
                      <span className="text-[rgba(255,255,255,0.15)]">|</span>
                      <span>ID: {m.id.substring(0, 13)}...</span>
                    </div>

                  </div>

                  <ChevronRight 
                    size={16} 
                    className={`text-[var(--text-muted)] group-hover:text-[var(--accent-cyan)] transition-colors ${isActive ? 'text-[var(--accent-cyan)]' : ''}`} 
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Detail / Playback Viewer */}
      <div className="lg:col-span-2 glass-panel p-6 flex flex-col h-[580px] overflow-hidden" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', height: '580px', padding: '24px', borderRadius: '12px' }}>
        {activeMatchId ? (
          <div className="flex flex-col h-full overflow-hidden" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            
            {/* Detail Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[rgba(255,255,255,0.06)] shrink-0" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
              <div className="space-y-1" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className="text-[10px] font-mono text-[var(--text-muted)] block">ACTIVE MATCH PLAYBACK</span>
                <h3 className="text-base font-bold text-[var(--text-primary)]" style={{ fontSize: '16px', fontWeight: 700 }}>
                  Match ID: {activeMatchId}
                </h3>
              </div>
              <div className="flex items-center gap-3" style={{ display: 'flex', gap: '12px' }}>
                <span className={`role-badge ${getExitCodeBadgeStyle(matches.find(m => m.id === activeMatchId)?.meta?.exitCode)}`} style={{ fontSize: '9px' }}>
                  Exit Code: {matches.find(m => m.id === activeMatchId)?.meta?.exitCode ?? '0 (OK)'}
                </span>
              </div>
            </div>

            {/* Main playback and skill timeline split */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden mt-6" style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginTop: '24px', overflow: 'hidden' }}>
              
              {/* Left Column: Logs Stream View */}
              <div className="flex flex-col overflow-hidden h-full" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                <div className="flex items-center gap-2 mb-3 text-[var(--text-secondary)] font-semibold text-xs" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  <Terminal size={14} />
                  <span>PLAYBACK LOGS STREAM</span>
                </div>
                <div className="flex-1 bg-[#0c0d16] rounded border border-[rgba(255,255,255,0.04)] p-4 font-mono text-[10px] overflow-y-auto leading-relaxed text-[#a0a5bc]" style={{ flex: 1, overflowY: 'auto', background: '#0c0d16', padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '11px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <span className="text-[var(--text-muted)] italic block mb-2">// Reading match event manifest...</span>
                  <span className="text-[var(--accent-green)] block mb-2">SYSTEM: match stream opened successfully.</span>
                  
                  <div className="space-y-2.5" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {activeMatchEvents.length === 0 ? (
                      <span className="text-[var(--text-muted)] block italic">No events loaded for this match.</span>
                    ) : (
                      activeMatchEvents.map((e, idx) => {
                        if (e.type === 'chunk') {
                          return <span key={idx} className="block whitespace-pre-wrap">{e.text}</span>;
                        }
                        if (e.type === 'turn') {
                          return (
                            <div key={idx} className="bg-[rgba(255,255,255,0.02)] p-2 rounded border border-[rgba(255,255,255,0.03)]" style={{ padding: '8px', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                              <div className="flex items-center gap-1.5 mb-1" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                <span className={`role-badge ${getRoleStyleClass(e.actor || 'agent')}`} style={{ fontSize: '8px' }}>
                                  {e.actor || 'agent'}
                                </span>
                              </div>
                              <p className="text-[10px] text-[#ccd2eb]">{e.text}</p>
                            </div>
                          );
                        }
                        return (
                          <div key={idx} className="text-cyan-300">
                            <span className="text-[var(--text-muted)]">[{e.type}]</span> {e.text}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Skill Sedimentation Timeline */}
              <div className="flex flex-col overflow-hidden h-full" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                <div className="flex items-center gap-2 mb-3 text-[var(--accent-cyan)] font-semibold text-xs" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--accent-cyan)', marginBottom: '12px' }}>
                  <ShieldCheck size={14} />
                  <span>SEDIMENTED SKILL TIMELINE</span>
                </div>

                <div className="flex-1 bg-[rgba(10,11,16,0.3)] rounded border border-[rgba(255,255,255,0.04)] p-4 overflow-y-auto" style={{ flex: 1, overflowY: 'auto', padding: '16px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {activeMatchEvents.filter(e => e.type === 'skill').length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] text-xs italic gap-2" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px', fontSize: '12px' }}>
                      <ShieldCheck size={28} className="text-[rgba(255,255,255,0.06)]" />
                      <span>No skills sedimented in this match.</span>
                    </div>
                  ) : (
                    activeMatchEvents
                      .filter(e => e.type === 'skill')
                      .map((e, idx) => (
                        <div key={idx} className="relative pl-6 border-l-2 border-[rgba(0,240,255,0.2)]" style={{ position: 'relative', paddingLeft: '24px', borderLeft: '2px solid rgba(0,240,255,0.2)' }}>
                          <div
                            className="absolute w-3.5 h-3.5 rounded-full bg-cyan-400 flex items-center justify-center"
                            style={{ position: 'absolute', left: '-8px', top: '2px', width: '14px', height: '14px', borderRadius: '50%', backgroundColor: 'var(--accent-cyan)' }}
                          >
                            <ShieldCheck size={8} className="text-black" />
                          </div>
                          <div>
                            <span className="text-[10px] font-mono text-[var(--text-secondary)] block">STAGE: SEDIMENT (seq #{e.seq})</span>
                            <p className="text-xs text-[#a0e9ee] mt-1 leading-relaxed font-mono" style={{ fontSize: '11px', color: '#a0e9ee', marginTop: '4px' }}>
                              {e.text}
                            </p>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

            </div>

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] gap-3" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: 'var(--text-muted)' }}>
            <FileText size={40} className="text-[rgba(255,255,255,0.1)]" />
            <span>Select a match from the archive list to view playback logs and extracted skills.</span>
          </div>
        )}
      </div>

    </div>
  );
};
export default HistoryExplorer;
