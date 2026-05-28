import React, { useState } from 'react';
import { BookOpen, Globe, Star, Info } from 'lucide-react';
import type { RegimeDetail } from '../types/api';

interface CodexBrowserProps {
  regimes: RegimeDetail[];
}

export const CodexBrowser: React.FC<CodexBrowserProps> = ({ regimes }) => {
  const [selectedPattern, setSelectedPattern] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRegime, setSelectedRegime] = useState<RegimeDetail | null>(null);

  const patterns = [
    { id: 'all', name: 'All Patterns' },
    { id: 'centralized', name: 'Centralized' },
    { id: 'checks-and-balances', name: 'Checks & Balances' },
    { id: 'democratic', name: 'Democratic' },
    { id: 'dual-track', name: 'Dual-Track' },
    { id: 'federation', name: 'Federation' },
    { id: 'theocratic', name: 'Theocratic' },
  ];

  const filteredRegimes = regimes.filter(r => {
    const pattern = r.metadata?.orchestrationPattern || '';
    const name = r.metadata?.id || '';
    const tags = r.metadata?.tags || [];
    
    const matchesPattern = selectedPattern === 'all' || pattern === selectedPattern;
    const matchesSearch = 
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pattern.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesPattern && matchesSearch;
  });

  const getPatternBadgeColor = (pattern: string) => {
    switch (pattern) {
      case 'centralized': return 'text-[var(--accent-crimson)] bg-[rgba(255,46,147,0.06)] border-[rgba(255,46,147,0.25)]';
      case 'checks-and-balances': return 'text-[var(--accent-gold)] bg-[rgba(255,215,0,0.06)] border-[rgba(255,215,0,0.25)]';
      case 'democratic': return 'text-[var(--accent-cyan)] bg-[rgba(0,240,255,0.06)] border-[rgba(0,240,255,0.25)]';
      case 'dual-track': return 'text-purple-300 bg-[rgba(189,0,255,0.06)] border-[rgba(189,0,255,0.25)]';
      case 'federation': return 'text-[var(--accent-green)] bg-[rgba(57,255,20,0.06)] border-[rgba(57,255,20,0.25)]';
      case 'theocratic': return 'text-amber-400 bg-[rgba(251,191,36,0.06)] border-[rgba(251,191,36,0.25)]';
      default: return 'text-[var(--text-secondary)] bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.06)]';
    }
  };

  return (
    <div className="space-y-6" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Search and Filters Bar */}
      <div className="glass-panel p-4 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '16px', borderRadius: '12px' }}>
        
        {/* Search */}
        <div className="w-full md:w-80" style={{ width: '100%', maxWidth: '320px' }}>
          <input
            type="text"
            placeholder="Search regimes (e.g. tang, qin, roman)..."
            className="w-full text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', fontSize: '12px' }}
          />
        </div>

        {/* Pattern Selectors */}
        <div className="flex flex-wrap gap-2" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {patterns.map((p) => {
            const isSelected = selectedPattern === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPattern(p.id)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-all ${
                  isSelected
                    ? 'bg-[var(--accent-cyan)] text-black border-[var(--accent-cyan)] shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                    : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.05)] text-[var(--text-secondary)] hover:border-[rgba(255,255,255,0.12)]'
                }`}
                style={{ fontSize: '10px', padding: '6px 12px', fontWeight: 600, borderStyle: 'solid' }}
              >
                {p.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        
        {/* Regimes Grid */}
        <div className="lg:col-span-2 space-y-4" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>
            <Globe size={14} />
            <span>REGIMES INDEX ({filteredRegimes.length})</span>
          </div>

          <div 
            className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[580px] overflow-y-auto pr-1 scroll-fade-y" 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
              gap: '16px', 
              maxHeight: '580px', 
              overflowY: 'auto' 
            }}
          >
            {filteredRegimes.map((r) => {
              const isSelected = selectedRegime?.id === r.id;
              const name = r.id.split('/').pop() || '';
              const region = r.id.split('/')[0] || '';

              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRegime(r)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer glass-panel flex flex-col justify-between h-40 ${
                    isSelected
                      ? 'bg-[rgba(0,240,255,0.06)] border-[rgba(0,240,255,0.35)] shadow-[0_0_12px_rgba(0,240,255,0.05)]'
                      : 'bg-[rgba(18,20,32,0.4)] border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.12)]'
                  }`}
                  style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '160px', padding: '16px', borderRadius: '12px', cursor: 'pointer' }}
                >
                  <div className="space-y-1.5" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    
                    {/* Header: Epoch and tags */}
                    <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
                      <span className="uppercase tracking-wider text-cyan-400">{region}</span>
                      <span>{r.metadata?.epoch || 'Ancient'}</span>
                    </div>

                    {/* Regime Name */}
                    <h3 className="text-base font-bold text-[var(--text-primary)] uppercase tracking-tight" style={{ fontSize: '16px', fontWeight: 700 }}>
                      {name.replace('-', ' ')}
                    </h3>

                    {/* Tag list */}
                    <div className="flex flex-wrap gap-1" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {(r.metadata?.tags || []).slice(0, 3).map((tag, tagIdx) => (
                        <span key={tagIdx} className="text-[9px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] px-1.5 py-0.5 rounded text-[var(--text-secondary)] font-mono" style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '3px' }}>
                          {tag}
                        </span>
                      ))}
                    </div>

                  </div>

                  {/* Footer: Pattern Badge and Learned Skills Count */}
                  <div className="flex items-center justify-between border-t border-[rgba(255,255,255,0.05)] pt-2.5 mt-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', marginTop: '8px' }}>
                    <span className={`role-badge ${getPatternBadgeColor(r.metadata?.orchestrationPattern)}`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                      {r.metadata?.orchestrationPattern}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 font-semibold" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 600 }}>
                      <Star size={11} className="text-cyan-400" />
                      {r.skills?.length || 0} skills
                    </span>
                  </div>

                </div>
              );
            })}
          </div>

        </div>

        {/* Selected Regime Inspector */}
        <div className="lg:col-span-1 glass-panel p-5 flex flex-col h-[580px] overflow-hidden" style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', height: '580px', padding: '20px', borderRadius: '12px' }}>
          {selectedRegime ? (
            <div className="flex flex-col h-full overflow-hidden" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              
              {/* Header */}
              <div className="flex items-center gap-3 pb-3 border-b border-[rgba(255,255,255,0.06)] shrink-0" style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                <div className="flex items-center justify-center w-8 h-8 rounded bg-[rgba(189,0,255,0.1)] border border-[rgba(189,0,255,0.3)] text-purple-300" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BookOpen size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider" style={{ fontSize: '14px', fontWeight: 700 }}>
                    {selectedRegime.id.split('/').pop()?.replace('-', ' ')}
                  </h3>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono block">
                    PATTERN: {selectedRegime.metadata?.orchestrationPattern}
                  </span>
                </div>
              </div>

              {/* Inspector Content */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 mt-4 scroll-fade-y text-xs" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px', fontSize: '12px' }}>
                
                {/* Org Chart Teaser */}
                <div className="space-y-1.5" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold block" style={{ display: 'block', fontSize: '10px', fontWeight: 700 }}>
                    SYSTEM PROFILE & CITATION
                  </span>
                  <div className="bg-[rgba(0,0,0,0.3)] p-3 rounded border border-[rgba(255,255,255,0.03)] font-mono text-[10px] max-h-48 overflow-y-auto text-purple-200" style={{ padding: '12px', fontFamily: 'var(--font-mono)', fontSize: '11px', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '4px', maxHeight: '192px', overflowY: 'auto' }}>
                    {selectedRegime.identity ? (
                      selectedRegime.identity.split('\n').slice(0, 15).join('\n')
                    ) : (
                      <span className="text-[var(--text-muted)] italic">No specific system data seed available.</span>
                    )}
                    <span className="text-[var(--text-muted)] block mt-2">... (view identity templates in regimes/ directory)</span>
                  </div>
                </div>

                {/* Soul Code */}
                <div className="space-y-1.5" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold block" style={{ display: 'block', fontSize: '10px', fontWeight: 700 }}>
                    SOUL & ALIGNMENT CRITERIA
                  </span>
                  <div className="bg-[rgba(0,0,0,0.3)] p-3 rounded border border-[rgba(255,255,255,0.03)] font-mono text-[10px] max-h-40 overflow-y-auto text-cyan-200" style={{ padding: '12px', fontFamily: 'var(--font-mono)', fontSize: '11px', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '4px', maxHeight: '160px', overflowY: 'auto' }}>
                    {selectedRegime.soul ? (
                      selectedRegime.soul.split('\n').slice(0, 10).join('\n')
                    ) : (
                      <span className="text-[var(--text-muted)] italic">No explicit behaviors mapped.</span>
                    )}
                  </div>
                </div>

                {/* Skill List */}
                <div className="space-y-2" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold block" style={{ display: 'block', fontSize: '10px', fontWeight: 700 }}>
                    SEDIMENTED SKILLS ({selectedRegime.skills?.length || 0})
                  </span>
                  {selectedRegime.skills && selectedRegime.skills.length > 0 ? (
                    <div className="space-y-2" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedRegime.skills.map((s, sIdx) => (
                        <div key={sIdx} className="bg-[rgba(0,240,255,0.02)] p-2 rounded border border-[rgba(0,240,255,0.1)] font-mono text-[10px]" style={{ padding: '8px', border: '1px solid rgba(0,240,255,0.1)', background: 'rgba(0,240,255,0.02)', fontSize: '10px', borderRadius: '4px' }}>
                          <span className="text-[var(--accent-cyan)] font-semibold block">{s.filename}</span>
                          <span className="text-[var(--text-secondary)]">YAML schema compliant sedimentation</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 bg-[rgba(255,255,255,0.01)] rounded border border-[rgba(255,255,255,0.03)] text-[var(--text-muted)] italic" style={{ textAlign: 'center', padding: '16px', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                      No skills sedimented yet. Run a v5 match to extract patterns!
                    </div>
                  )}
                </div>

              </div>

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] gap-3" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: 'var(--text-muted)' }}>
              <Info size={36} className="text-[rgba(255,255,255,0.1)]" />
              <span>Select a regime card on the left to inspect its mapped organization charts, rules, and skills inventory.</span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
export default CodexBrowser;
