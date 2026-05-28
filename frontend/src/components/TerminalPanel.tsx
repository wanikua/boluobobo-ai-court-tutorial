import React, { useEffect, useRef, useState } from 'react';
import { Terminal, ArrowDown, Search, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { MatchEvent } from '../types/api';

interface TerminalPanelProps {
  regimeId: string;
  displayName: string;
  backend?: string;
  events: MatchEvent[];
  isStreaming?: boolean;
  status: 'running' | 'completed' | 'failed' | 'idle';
  sediment?: any;
}

function formatSediment(sediment: any): { label: string, status: 'saved' | 'rejected' | 'skipped' | 'error' | 'none', text: string } {
  if (!sediment) {
    return { label: 'None', status: 'none', text: 'No skill sedimentation recorded.' };
  }

  // If it's a string
  if (typeof sediment === 'string') {
    if (sediment === 'success') {
      return { label: 'Saved', status: 'saved', text: 'Skill extracted successfully.' };
    }
    if (sediment.startsWith('failed') || sediment.includes('error') || sediment.includes('fail')) {
      return { label: 'Failed', status: 'error', text: sediment };
    }
    return { label: 'Status', status: 'none', text: sediment };
  }

  // If it's an object
  if (typeof sediment === 'object') {
    if (sediment.saved) {
      const parts = String(sediment.saved).split('/');
      const filename = parts[parts.length - 1] || 'skill.md';
      let text = `Skill saved: ${filename}`;
      if (sediment.auditedBy) {
        text += ` (Audited by: ${sediment.auditedBy})`;
      }
      return { label: 'Saved', status: 'saved', text };
    }
    if (sediment.rejected) {
      let text = `Skill rejected: ${sediment.rejected}`;
      if (sediment.auditedBy) {
        text += ` (Audited by: ${sediment.auditedBy})`;
      }
      return { label: 'Rejected', status: 'rejected', text };
    }
    if (sediment.skipped) {
      return { label: 'Skipped', status: 'skipped', text: `Skill skipped: ${sediment.skipped}` };
    }
    if (sediment.error) {
      return { label: 'Error', status: 'error', text: `Error: ${sediment.error}` };
    }
  }

  return { label: 'Status', status: 'none', text: String(JSON.stringify(sediment)) };
}

function formatSkillEvent(e: MatchEvent): { title: string, desc: string, color: string } {
  if (e.status) {
    let title = `SKILL ${e.status.toUpperCase()}`;
    let desc = '';
    let color = 'var(--accent-cyan)'; // default cyan for saved
    if (e.status === 'saved') {
      const parts = (e.skillPath || '').split('/');
      const skillFile = parts[parts.length - 1] || 'skill.md';
      desc = `Successfully extracted & registered new skill: ${skillFile}`;
      if (e.auditedBy) {
        desc += ` (Audited by: ${e.auditedBy})`;
      }
    } else if (e.status === 'rejected') {
      desc = `Skill rejected: ${e.reason || 'does not meet criteria'}`;
      if (e.auditedBy) {
        desc += ` (Audited by: ${e.auditedBy})`;
      }
      color = 'var(--accent-crimson)'; // crimson
    } else if (e.status === 'skipped') {
      desc = `Skill skipped: ${e.reason || 'no novel patterns detected'}`;
      color = 'var(--accent-gold)'; // gold
    } else if (e.status === 'error') {
      desc = `Skill sedimentation error: ${e.reason || 'internal error'}`;
      color = 'var(--accent-crimson)'; // crimson
    }
    return { title, desc, color };
  }
  
  // Legacy fallback
  return {
    title: 'SKILL EXTRACTED',
    desc: e.text || 'Nous Hermes skill extracted successfully.',
    color: 'var(--accent-cyan)'
  };
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({
  regimeId,
  displayName,
  backend = 'claude-3-5-sonnet',
  events = [],
  isStreaming = false,
  status,
  sediment,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeActor, setActiveActor] = useState<string | null>(null);

  // Auto scroll effect
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  // Track the most recent active actor
  useEffect(() => {
    if (events.length > 0) {
      const activeEvent = [...events]
        .reverse()
        .find(e => e.actor && e.type === 'turn');
      if (activeEvent?.actor) {
        setActiveActor(activeEvent.actor);
      }
    }
  }, [events]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 30;
    setAutoScroll(isAtBottom);
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

  const filteredEvents = events.filter(e => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (e.actor && e.actor.toLowerCase().includes(term)) ||
      (e.text && e.text.toLowerCase().includes(term)) ||
      e.type.toLowerCase().includes(term)
    );
  });

  return (
    <div className="glass-panel glass-panel-cyan flex flex-col h-[500px] overflow-hidden relative" style={{ display: 'flex', flexDirection: 'column' }}>
      
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[rgba(10,11,16,0.5)] border-b border-[rgba(255,255,255,0.06)] shrink-0" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(10,11,16,0.5)' }}>
        <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="flex items-center justify-center w-8 h-8 rounded bg-[rgba(0,240,255,0.1)] border border-[rgba(0,240,255,0.2)] text-[var(--accent-cyan)]" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Terminal size={16} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]" style={{ fontSize: '14px', fontWeight: 600 }}>{displayName}</h3>
            <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)]" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: 'var(--text-secondary)' }}>
              <span>ID: {regimeId}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[rgba(255,255,255,0.2)]" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }}></span>
              <span className="font-mono text-cyan-400">{backend}</span>
            </div>
          </div>
        </div>

        {/* Live Status indicator */}
        <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {status === 'running' && (
            <span className="live-badge">{isStreaming ? 'Streaming' : 'Live'}</span>
          )}
          {status === 'completed' && (
            <span className="flex items-center gap-1 text-[11px] text-[var(--accent-green)] font-semibold uppercase tracking-wider" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--accent-green)', fontWeight: 600 }}>
              <CheckCircle size={12} /> Complete
            </span>
          )}
          {status === 'failed' && (
            <span className="flex items-center gap-1 text-[11px] text-[var(--accent-crimson)] font-semibold uppercase tracking-wider" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--accent-crimson)', fontWeight: 600 }}>
              <AlertTriangle size={12} /> Failed
            </span>
          )}
          {status === 'idle' && (
            <span className="text-[11px] text-[var(--text-muted)] font-semibold uppercase tracking-wider" style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
              Standby
            </span>
          )}
        </div>
      </div>

      {/* Terminal Tools Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[rgba(10,11,16,0.3)] border-b border-[rgba(255,255,255,0.04)] text-xs shrink-0" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(10,11,16,0.3)', fontSize: '12px' }}>
        <div className="flex items-center gap-2 max-w-[60%]" style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '60%' }}>
          <span className="text-[var(--text-muted)] font-semibold text-[10px]" style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>ACTIVE ROLE:</span>
          {activeActor ? (
            <span className={`role-badge ${getRoleStyleClass(activeActor)}`} style={{ fontSize: '10px' }}>
              {activeActor}
            </span>
          ) : (
            <span className="text-[var(--text-muted)] text-[10px]">None</span>
          )}
        </div>

        {/* Search tool */}
        <div className="flex items-center gap-1 bg-[rgba(0,0,0,0.3)] rounded border border-[rgba(255,255,255,0.06)] px-2 py-0.5" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', padding: '2px 8px' }}>
          <Search size={10} className="text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Filter logs..."
            className="w-24 bg-transparent border-none text-[10px] text-[var(--text-primary)] focus:outline-none focus:ring-0 p-0"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '96px', background: 'transparent', border: 'none', fontSize: '10px', color: 'var(--text-primary)', outline: 'none', padding: 0 }}
          />
        </div>
      </div>

      {/* Terminal Output Display */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed text-[#c5c9db] bg-[#0c0d16] scroll-fade-y"
        style={{ flex: 1, overflowY: 'auto', padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '12px', background: '#0c0d16' }}
      >
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] gap-2" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px', color: 'var(--text-muted)' }}>
            <span className="text-center">No terminal logs recorded.</span>
          </div>
        ) : (
          <div className="space-y-3" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredEvents.map((e, index) => {
              if (e.type === 'chunk') {
                return (
                  <span key={index} className="whitespace-pre-wrap break-all" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {e.text}
                  </span>
                );
              }

              if (e.type === 'turn') {
                return (
                  <div key={index} className="p-3 rounded border border-[rgba(255,255,255,0.03)] bg-[rgba(255,255,255,0.01)]" style={{ border: '1px solid rgba(255,255,255,0.03)', background: 'rgba(255,255,255,0.01)', borderRadius: '4px', padding: '12px' }}>
                    <div className="flex items-center justify-between mb-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`role-badge ${getRoleStyleClass(e.actor || 'agent')}`}>
                          {e.actor || 'agent'}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">turn #{e.seq}</span>
                      </div>
                      <span className="text-[9px] text-[var(--text-muted)]">
                        {new Date(e.ts).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-[#e4e7f5]" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#e4e7f5' }}>
                      {e.text}
                    </p>
                  </div>
                );
              }

              if (e.type === 'skill' || e.type === 'judge') {
                if (e.type === 'skill') {
                  const formatted = formatSkillEvent(e);
                  return (
                    <div key={index} className="p-2.5 rounded border flex items-start gap-2.5" style={{ display: 'flex', gap: '10px', background: `${formatted.color}08`, border: `1px solid ${formatted.color}26`, borderRadius: '4px', padding: '10px', color: formatted.color }}>
                      <ShieldCheck className="shrink-0" size={14} style={{ marginTop: '2px', color: formatted.color }} />
                      <div>
                        <span className="font-semibold uppercase tracking-wider text-[9px] block mb-0.5" style={{ display: 'block', fontSize: '9px', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '2px', color: formatted.color }}>
                          {formatted.title}
                        </span>
                        <p className="text-xs text-[#ccd2eb]" style={{ fontSize: '12px', color: '#ccd2eb' }}>{formatted.desc}</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={index} className="p-2.5 rounded border border-[rgba(0,240,255,0.15)] bg-[rgba(0,240,255,0.03)] text-[var(--accent-cyan)] flex items-start gap-2.5" style={{ display: 'flex', gap: '10px', background: 'rgba(0,240,255,0.03)', border: '1px solid rgba(0,240,255,0.15)', borderRadius: '4px', padding: '10px' }}>
                    <ShieldCheck className="shrink-0 text-cyan-400" size={14} style={{ marginTop: '2px' }} />
                    <div>
                      <span className="font-semibold uppercase tracking-wider text-[9px] block mb-0.5" style={{ display: 'block', fontSize: '9px', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '2px' }}>
                        {e.type.toUpperCase()} EVENT DETECTED
                      </span>
                      <p className="text-xs text-[#a0e9ee]" style={{ fontSize: '12px', color: '#a0e9ee' }}>{e.text}</p>
                    </div>
                  </div>
                );
              }

              if (e.type === 'match_start' || e.type === 'match_end') {
                return (
                  <div key={index} className="py-2 border-y border-[rgba(255,255,255,0.05)] text-center text-[var(--text-muted)] text-[10px] tracking-wider uppercase font-semibold" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', padding: '8px 0', fontSize: '10px', letterSpacing: '0.05em', fontWeight: 600 }}>
                    {e.text} (seq #{e.seq})
                  </div>
                );
              }

              return (
                <div key={index} className="text-[#a5b4fc]">
                  <span className="text-[var(--text-muted)]">[{e.type}]</span> {e.text}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Auto Scroll indicator */}
      {!autoScroll && filteredEvents.length > 0 && (
        <button
          onClick={() => setAutoScroll(true)}
          className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold tracking-wider text-black bg-[var(--accent-cyan)] hover:bg-[#3bf5ff] border border-[var(--accent-cyan)] shadow-lg rounded-full"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'absolute', bottom: '16px', right: '16px', color: 'black', background: 'var(--accent-cyan)', padding: '6px 12px', borderRadius: '9999px', fontSize: '10px', fontWeight: 600 }}
        >
          <ArrowDown size={12} /> SCROLL BOTTOM
        </button>
      )}

      {/* Sediment sedimentation tag */}
      {status === 'completed' && sediment !== undefined && (
        <div className="px-4 py-1.5 bg-[#09151e] border-t border-[rgba(255,255,255,0.04)] text-[10px] flex items-center justify-between shrink-0" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 16px', borderTop: '1px solid rgba(255,255,255,0.04)', background: '#09151e', fontSize: '10px' }}>
          <span className="text-[var(--text-muted)]">CROSS-MATCH MEMORY LOOP:</span>
          {(() => {
            const formatted = formatSediment(sediment);
            if (formatted.status === 'error' || formatted.status === 'rejected') {
              return <span className="text-[var(--accent-crimson)] font-mono">{formatted.text}</span>;
            }
            if (formatted.status === 'skipped') {
              return <span className="text-[var(--accent-gold)] font-mono">{formatted.text}</span>;
            }
            return (
              <span className="text-[var(--accent-cyan)] flex items-center gap-1 font-semibold" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                <ShieldCheck size={11} /> {formatted.text}
              </span>
            );
          })()}
        </div>
      )}
    </div>
  );
};
export default TerminalPanel;
