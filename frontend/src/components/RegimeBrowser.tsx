import React, { useState } from 'react';
import { Users, BarChart3, Network, Scroll } from 'lucide-react';
import type { RegimeDetail } from '../types/api';
import OrgChart from './regime/OrgChart';
import ModeComparison from './regime/ModeComparison';
import RelationshipNetwork from './regime/RelationshipNetwork';

interface RegimeBrowserProps {
  regimes: RegimeDetail[];
}

export const RegimeBrowser: React.FC<RegimeBrowserProps> = ({ regimes }) => {
  const [selectedSubTab, setSelectedSubTab] = useState<'org' | 'comparison' | 'network'>('org');
  const [selectedRegime, setSelectedRegime] = useState<RegimeDetail | null>(regimes[0] || null);

  // Set default selected regime if none is selected yet and regimes array loads
  React.useEffect(() => {
    if (!selectedRegime && regimes.length > 0) {
      setSelectedRegime(regimes[0]);
    }
  }, [regimes, selectedRegime]);

  return (
    <div className="space-y-6 flex flex-col h-full animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Sub Tabs Selection Bar */}
      <div className="glass-panel p-4 flex items-center justify-between gap-4 shrink-0" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '12px' }}>
        
        {/* Info label */}
        <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="flex items-center justify-center w-8 h-8 rounded bg-[rgba(0,240,255,0.08)] border border-[rgba(0,240,255,0.2)] text-[var(--accent-cyan)] shadow-[0_0_10px_rgba(0,240,255,0.05)]" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Scroll size={15} />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]" style={{ fontSize: '13px', fontWeight: 700 }}>
              Regime Visualization Browser
            </h2>
            <span className="text-[10px] text-[var(--text-secondary)] font-mono block">
              Form ②: Comparative academic analysis of 57 historical systems
            </span>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2" style={{ display: 'flex', gap: '8px' }}>
          
          <button
            onClick={() => setSelectedSubTab('org')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-all ${
              selectedSubTab === 'org'
                ? 'bg-[var(--accent-cyan)] text-black border-[var(--accent-cyan)] shadow-[0_0_10px_rgba(0,240,255,0.25)]'
                : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.05)] text-[var(--text-secondary)] hover:border-[rgba(255,255,255,0.12)]'
            }`}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', fontWeight: 600 }}
          >
            <Users size={14} /> Org Chart
          </button>

          <button
            onClick={() => setSelectedSubTab('comparison')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-all ${
              selectedSubTab === 'comparison'
                ? 'bg-[var(--accent-cyan)] text-black border-[var(--accent-cyan)] shadow-[0_0_10px_rgba(0,240,255,0.25)]'
                : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.05)] text-[var(--text-secondary)] hover:border-[rgba(255,255,255,0.12)]'
            }`}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', fontWeight: 600 }}
          >
            <BarChart3 size={14} /> Pattern Comparison
          </button>

          <button
            onClick={() => setSelectedSubTab('network')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-all ${
              selectedSubTab === 'network'
                ? 'bg-[var(--accent-cyan)] text-black border-[var(--accent-cyan)] shadow-[0_0_10px_rgba(0,240,255,0.25)]'
                : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.05)] text-[var(--text-secondary)] hover:border-[rgba(255,255,255,0.12)]'
            }`}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', fontWeight: 600 }}
          >
            <Network size={14} /> Relationship Network
          </button>

        </div>

      </div>

      {/* Central Viewport */}
      <div className="flex-1 overflow-hidden" style={{ flex: 1, overflow: 'hidden' }}>
        {selectedSubTab === 'org' && (
          <OrgChart
            regimes={regimes}
            selectedRegime={selectedRegime}
            onSelectRegime={setSelectedRegime}
          />
        )}

        {selectedSubTab === 'comparison' && (
          <ModeComparison regimes={regimes} />
        )}

        {selectedSubTab === 'network' && (
          <RelationshipNetwork regimes={regimes} />
        )}
      </div>

    </div>
  );
};
export default RegimeBrowser;
