import React, { useEffect, useState } from 'react';
import { ShieldAlert, Users, Award, Loader2 } from 'lucide-react';
import type { RegimeDetail } from '../../types/api';
import type { IdentityRole, IdentityData } from '../../types/regime';

interface OrgChartProps {
  regimes: RegimeDetail[];
  selectedRegime: RegimeDetail | null;
  onSelectRegime: (regime: RegimeDetail) => void;
}

export const OrgChart: React.FC<OrgChartProps> = ({
  regimes,
  selectedRegime,
  onSelectRegime,
}) => {
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<IdentityRole[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch identity MD whenever active regime changes
  useEffect(() => {
    if (!selectedRegime) {
      setRoles([]);
      return;
    }

    const fetchIdentity = async () => {
      setLoading(true);
      try {
        const parts = selectedRegime.id.split('/');
        if (parts.length < 2) {
          console.warn('Invalid selected regime ID format:', selectedRegime.id);
          setRoles([]);
          setLoading(false);
          return;
        }
        const region = parts[0];
        const id = parts[1];
        
        const res = await fetch(`/api/regimes/${region}/${id}/identity`);
        if (res.ok) {
          const data: IdentityData = await res.json();
          
          if (data.raw) {
            const parsed = parseIdentityRoles(data.raw);
            setRoles(parsed);
          } else {
            setRoles([]);
          }
        }
      } catch (e) {
        console.error('Failed to fetch identity MD:', e);
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchIdentity();
  }, [selectedRegime]);

  // Parse markdown roles table
  const parseIdentityRoles = (rawMarkdown: string): IdentityRole[] => {
    const lines = rawMarkdown.split('\n');
    const parsedRoles: IdentityRole[] = [];
    let inTable = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const parts = trimmed.split('|').map(p => p.trim()).filter(Boolean);
        
        // Header detection
        if (trimmed.toLowerCase().includes('agent id') || trimmed.toLowerCase().includes('ai 职责')) {
          inTable = true;
          continue;
        }
        
        // Split separator
        if (trimmed.includes('---')) {
          continue;
        }
        
        if (inTable && parts.length >= 3) {
          parsedRoles.push({
            roleName: parts[0] || '',
            agentId: (parts[1] || '').replace(/`/g, ''),
            responsibility: parts[2] || '',
            model: (parts[3] || '').replace(/`/g, ''),
          });
        }
      } else if (inTable) {
        // Exited table - stop parsing
        break;
      }
    }
    return parsedRoles;
  };

  // Group regimes for sidebar listing
  const filteredRegimes = regimes.filter(r => 
    r.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const chinaRegimes = filteredRegimes.filter(r => r.metadata?.region === 'china');
  const globalRegimes = filteredRegimes.filter(r => r.metadata?.region === 'global');

  // Segregate roles into Coordinators (Emperor/Consul/Gensec/Co-decision peers) and Executors
  // Supports multiple peer/co-decision top-level roles (e.g. Council/Parliament/Commission co-decision in global/eu)
  const coordinatorRoles = roles.filter(r => 
    r.responsibility.toLowerCase().includes('coordinator') || 
    r.responsibility.toLowerCase().includes('起草') || 
    r.responsibility.toLowerCase().includes('总管') ||
    r.responsibility.toLowerCase().includes('调度') ||
    r.responsibility.toLowerCase().includes('co-decision') ||
    r.responsibility.toLowerCase().includes('decider') ||
    r.responsibility.toLowerCase().includes('decision-maker') ||
    r.responsibility.toLowerCase().includes('decision maker') ||
    r.responsibility.toLowerCase().includes('co-legislat') ||
    r.responsibility.toLowerCase().includes('proposes legislation') ||
    r.responsibility.toLowerCase().includes('propose legislation')
  );

  const finalCoordinators =
    coordinatorRoles.length > 0 ? coordinatorRoles : roles.length > 0 ? [roles[0]] : [];
  const coordinatorIds = finalCoordinators.map(c => c.agentId);
  const executorRoles = roles.filter(r => !coordinatorIds.includes(r.agentId));

  const getRoleBadgeStyle = (resp: string) => {
    const r = resp.toLowerCase();
    if (r.includes('review') || r.includes('审核') || r.includes('监察')) return 'role-review';
    if (r.includes('code') || r.includes('开发') || r.includes('工程')) return 'role-engineering';
    if (r.includes('devops') || r.includes('运维') || r.includes('部署')) return 'role-devops';
    return 'role-management';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
      
      {/* Sidebar - Regimes Selector */}
      <div className="lg:col-span-1 glass-panel p-5 flex flex-col h-[540px] overflow-hidden" style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', height: '540px', padding: '20px', borderRadius: '12px' }}>
        
        {/* Search */}
        <div className="mb-4 shrink-0" style={{ marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Search regimes..."
            className="w-full text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', fontSize: '12px' }}
          />
        </div>

        {/* List scroll */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scroll-fade-y" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* China Dynasties */}
          {chinaRegimes.length > 0 && (
            <div className="space-y-1.5" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span className="text-[10px] text-cyan-400 font-mono font-bold uppercase tracking-wider block" style={{ display: 'block', fontSize: '10px' }}>
                CHINA DYNASTIES ({chinaRegimes.length})
              </span>
              <div className="space-y-1" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {chinaRegimes.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => onSelectRegime(r)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold tracking-wide border transition-all ${
                      selectedRegime?.id === r.id
                        ? 'bg-[rgba(0,240,255,0.06)] border-[rgba(0,240,255,0.3)] text-[var(--accent-cyan)] shadow-[0_0_8px_rgba(0,240,255,0.05)]'
                        : 'bg-transparent border-transparent text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.02)]'
                    }`}
                    style={{ fontSize: '11px', textAlign: 'left', padding: '8px 12px' }}
                  >
                    {r.id.split('/').pop()?.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Global Empires */}
          {globalRegimes.length > 0 && (
            <div className="space-y-1.5" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span className="text-[10px] text-purple-400 font-mono font-bold uppercase tracking-wider block" style={{ display: 'block', fontSize: '10px' }}>
                GLOBAL EMPIRES ({globalRegimes.length})
              </span>
              <div className="space-y-1" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {globalRegimes.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => onSelectRegime(r)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold tracking-wide border transition-all ${
                      selectedRegime?.id === r.id
                        ? 'bg-[rgba(0,240,255,0.06)] border-[rgba(0,240,255,0.3)] text-[var(--accent-cyan)] shadow-[0_0_8px_rgba(0,240,255,0.05)]'
                        : 'bg-transparent border-transparent text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.02)]'
                    }`}
                    style={{ fontSize: '11px', textAlign: 'left', padding: '8px 12px' }}
                  >
                    {r.id.split('/').pop()?.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Main Org Chart Workspace */}
      <div className="lg:col-span-3 glass-panel p-6 flex flex-col h-[540px] overflow-hidden" style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', height: '540px', padding: '24px', borderRadius: '12px' }}>
        {selectedRegime ? (
          <div className="flex flex-col h-full overflow-hidden" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.06)] shrink-0" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] uppercase tracking-wider" style={{ fontSize: '16px', fontWeight: 700 }}>
                  {selectedRegime.id.split('/').pop()?.replace('-', ' ')} Organizational Architecture
                </h3>
                <span className="text-[10px] text-[var(--text-secondary)] font-mono block">
                  EPOCH: {selectedRegime.metadata?.era?.en || 'Ancient'} · PATTERN: {selectedRegime.metadata?.orchestrationPattern}
                </span>
              </div>
              <span className="live-badge">Form ② Viz</span>
            </div>

            {/* Tree Flow / Content Workspace */}
            <div className="flex-1 overflow-y-auto p-4 mt-4 relative" style={{ flex: 1, overflowY: 'auto', marginTop: '16px' }}>
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--text-muted)]" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
                  <Loader2 className="animate-spin text-[var(--accent-cyan)]" size={32} />
                  <span>Compiling historical identity manifests...</span>
                </div>
              ) : roles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--text-muted)]" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px' }}>
                  <ShieldAlert size={36} className="text-[rgba(255,255,255,0.1)]" />
                  <span>IDENTITY.md role mappings not loaded or empty.</span>
                </div>
              ) : (
                <div className="space-y-8 animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  
                  {/* CSS Hierarchical Flow diagram */}
                  <div className="flex flex-col items-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    
                    {/* Coordinators Grid (supports single or co-decision peers) */}
                    {finalCoordinators.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-4 w-full mb-2" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px', width: '100%', marginBottom: '8px' }}>
                        {finalCoordinators.map((coord) => (
                          <div 
                            key={coord.agentId}
                            className="glass-panel glass-panel-gold p-4 text-center w-[250px] relative hover:border-amber-400" 
                            style={{ 
                              padding: '14px', 
                              border: '1px solid var(--accent-gold)', 
                              borderRadius: '12px', 
                              textAlign: 'center', 
                              width: '250px',
                              background: 'rgba(251,191,36,0.03)'
                            }}
                          >
                            <span className="text-[9px] text-amber-400 font-bold block mb-1 font-heading uppercase tracking-wider flex items-center justify-center gap-1">
                              <Award size={11} fill="var(--accent-gold)" /> COORDINATOR / DECIDER
                            </span>
                            <h4 className="text-sm font-bold text-[var(--text-primary)] mb-0.5">{coord.roleName}</h4>
                            <code className="text-[9px] text-[var(--text-secondary)] font-mono block mb-1.5">{coord.agentId}</code>
                            <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">{coord.responsibility}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Vertical connecting line */}
                    {executorRoles.length > 0 && (
                      <div style={{ width: '2px', height: '32px', background: 'linear-gradient(to bottom, var(--accent-gold), var(--accent-cyan))' }}></div>
                    )}

                    {/* Executors Horizontal Grid */}
                    {executorRoles.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-4 w-full" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px', width: '100%' }}>
                        {executorRoles.map((exec) => (
                          <div 
                            key={exec.agentId} 
                            className="glass-panel p-3.5 text-center w-[210px] hover:border-[rgba(0,240,255,0.25)] relative"
                            style={{ 
                              padding: '14px', 
                              borderRadius: '8px', 
                              width: '210px', 
                              textAlign: 'center',
                              background: 'rgba(18,20,32,0.4)',
                              border: '1px solid rgba(255,255,255,0.04)'
                            }}
                          >
                            <span className={`role-badge ${getRoleBadgeStyle(exec.responsibility)}`} style={{ fontSize: '8px', padding: '1px 5px', display: 'inline-block', marginBottom: '6px' }}>
                              {exec.responsibility.includes('Review') || exec.responsibility.includes('审核') ? 'REVIEWER' : 'EXECUTOR'}
                            </span>
                            <h5 className="text-xs font-bold text-[var(--text-primary)] mb-0.5">{exec.roleName}</h5>
                            <code className="text-[9px] text-[var(--text-secondary)] font-mono block mb-1">{exec.agentId}</code>
                            <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">{exec.responsibility}</p>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>

                  {/* Tabular Details Section */}
                  <div className="glass-panel p-4 bg-[rgba(10,11,16,0.3)] border-[rgba(255,255,255,0.04)] text-xs rounded-lg" style={{ padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(10,11,16,0.3)', fontSize: '12px' }}>
                    <div className="flex items-center gap-2 text-cyan-400 mb-3" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', marginBottom: '12px' }}>
                      <Users size={13} />
                      <h4 className="font-heading font-bold uppercase tracking-wider text-[10px]">
                        ROLE MAPPING DETAILS & MODEL HIERARCHY
                      </h4>
                    </div>

                    <table className="w-full text-left font-mono text-[11px]" style={{ width: '100%', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: '11px', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr className="border-b border-[rgba(255,255,255,0.06)] text-[var(--text-muted)]" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <th className="pb-2">Historical Role</th>
                          <th className="pb-2">Agent ID</th>
                          <th className="pb-2">AI Responsibility</th>
                          <th className="pb-2 text-right">Recommended Model</th>
                        </tr>
                      </thead>
                      <tbody className="text-[var(--text-secondary)]">
                        {roles.map((role) => (
                          <tr key={role.agentId} className="border-b border-[rgba(255,255,255,0.03)] hover:text-white" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td className="py-2.5 font-sans font-semibold text-[var(--text-primary)]">{role.roleName}</td>
                            <td className="py-2.5 text-cyan-300">{role.agentId}</td>
                            <td className="py-2.5 text-xs font-sans text-[var(--text-secondary)]">{role.responsibility}</td>
                            <td className="py-2.5 text-right text-purple-300">{role.model || 'Default'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] gap-3" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
            <Users size={40} className="text-[rgba(255,255,255,0.1)]" />
            <span>Select a historical regime from the sidebar to inspect its organizational department structure.</span>
          </div>
        )}
      </div>

    </div>
  );
};
export default OrgChart;
