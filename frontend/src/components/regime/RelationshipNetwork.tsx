import React, { useEffect, useRef, useState } from 'react';
import { HelpCircle, Network } from 'lucide-react';
import type { RegimeDetail } from '../../types/api';

interface RelationshipNetworkProps {
  regimes: RegimeDetail[];
}

export const RelationshipNetwork: React.FC<RelationshipNetworkProps> = ({ regimes }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredRegime, setHoveredRegime] = useState<RegimeDetail | null>(null);
  const [connections, setConnections] = useState<Array<{ from: { x: number; y: number }; to: { x: number; y: number }; id: string }>>([]);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  // Handle window resize to re-draw connection paths
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update connection curves whenever hovered node changes
  useEffect(() => {
    updatePaths();
  }, [hoveredRegime, windowWidth]);

  const updatePaths = () => {
    if (!containerRef.current || !hoveredRegime) {
      setConnections([]);
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const fromEl = document.getElementById(`node-${hoveredRegime.id.replace(/\//g, '-')}`);
    if (!fromEl) return;

    const fromRect = fromEl.getBoundingClientRect();
    const fromX = fromRect.left - containerRect.left + fromRect.width / 2;
    const fromY = fromRect.top - containerRect.top + fromRect.height / 2;

    const newConnections: Array<{ from: { x: number; y: number }; to: { x: number; y: number }; id: string }> = [];
    
    // Find regimes sharing >= 1 tag
    const sharedRegimes = regimes.filter(r => 
      r.id !== hoveredRegime.id && 
      r.metadata?.tags?.some(t => hoveredRegime.metadata?.tags?.includes(t))
    );

    sharedRegimes.forEach(r => {
      const toEl = document.getElementById(`node-${r.id.replace(/\//g, '-')}`);
      if (toEl) {
        const toRect = toEl.getBoundingClientRect();
        const toX = toRect.left - containerRect.left + toRect.width / 2;
        const toY = toRect.top - containerRect.top + toRect.height / 2;
        newConnections.push({
          from: { x: fromX, y: fromY },
          to: { x: toX, y: toY },
          id: r.id
        });
      }
    });

    setConnections(newConnections);
  };

  const chinaRegimes = regimes.filter(r => r.metadata?.region === 'china');
  const globalRegimes = regimes.filter(r => r.metadata?.region === 'global');

  // Node size scaling positive to agentCount
  const getNodeSizeStyle = (count?: number) => {
    const num = count || 5;
    if (num >= 8) return { scale: 'scale-105', padding: 'px-3 py-1.5', font: 'text-xs' };
    if (num >= 6) return { scale: 'scale-100', padding: 'px-2.5 py-1', font: 'text-[11px]' };
    return { scale: 'scale-95', padding: 'px-2 py-0.5', font: 'text-[10px]' };
  };

  return (
    <div className="flex flex-col h-[500px] overflow-hidden" style={{ display: 'flex', flexDirection: 'column', height: '500px', overflow: 'hidden' }}>
      
      {/* Description header */}
      <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.06)] shrink-0 mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px', marginBottom: '16px' }}>
        <div className="flex items-center gap-2 text-[var(--accent-cyan)] font-heading" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)' }}>
          <Network size={15} />
          <h4 className="text-xs font-bold uppercase tracking-wider">
            CIVILIZATION INFLUENCE & SHARED RELATIONSHIP MAP
          </h4>
        </div>
        <span className="text-[10px] text-[var(--text-muted)] italic font-mono flex items-center gap-1" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}>
          <HelpCircle size={12} /> Hover a node to visualize shared tags linkages
        </span>
      </div>

      {/* Network split view */}
      <div 
        ref={containerRef}
        className="flex-1 grid grid-cols-5 gap-4 overflow-hidden relative select-none"
        style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', position: 'relative', overflow: 'hidden' }}
      >
        
        {/* Dynamic SVG connection paths container */}
        {hoveredRegime && connections.length > 0 && (
          <svg 
            className="absolute inset-0 pointer-events-none z-10"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}
          >
            {connections.map((c) => {
              // Draw a smooth curved Bezier connection path instead of direct rigid lines
              const midX = (c.from.x + c.to.x) / 2;
              const pathD = `M ${c.from.x} ${c.from.y} C ${midX} ${c.from.y}, ${midX} ${c.to.y}, ${c.to.x} ${c.to.y}`;
              
              return (
                <g key={c.id}>
                  {/* Glowing wide backing path */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="rgba(0, 240, 255, 0.08)"
                    strokeWidth={4}
                  />
                  {/* Sharp core path */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="rgba(0, 240, 255, 0.4)"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    className="animate-dash"
                    style={{
                      animation: 'dash 30s linear infinite'
                    }}
                  />
                </g>
              );
            })}
          </svg>
        )}

        {/* Column 1 & 2: China Dynasties (flex columns) */}
        <div 
          className="col-span-2 overflow-y-auto max-h-full space-y-2.5 p-2 bg-[rgba(255,255,255,0.01)] rounded border border-[rgba(255,255,255,0.02)] scroll-fade-y" 
          style={{ gridColumn: 'span 2', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' }}
        >
          <span className="text-[9px] text-cyan-400 font-mono font-bold tracking-wider block" style={{ fontSize: '9px' }}>
            CHINA REGIONS
          </span>
          <div className="flex flex-wrap gap-2 align-content-start" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignContent: 'flex-start' }}>
            {chinaRegimes.map((r) => {
              const name = r.id.split('/').pop()?.replace('-', ' ') || '';
              const size = getNodeSizeStyle(r.metadata?.agentCount);
              const isHovered = hoveredRegime?.id === r.id;
              const isConnected = connections.some(c => c.id === r.id);

              return (
                <div
                  key={r.id}
                  id={`node-${r.id.replace(/\//g, '-')}`}
                  onMouseEnter={() => setHoveredRegime(r)}
                  onMouseLeave={() => setHoveredRegime(null)}
                  className={`rounded-full border font-mono font-semibold transition-all cursor-pointer ${size.padding} ${size.font} ${size.scale} ${
                    isHovered
                      ? 'bg-[var(--accent-cyan)] text-black border-[var(--accent-cyan)] shadow-[0_0_12px_rgba(0,240,255,0.45)] z-20'
                      : isConnected
                      ? 'bg-[rgba(0,240,255,0.06)] border-[rgba(0,240,255,0.4)] text-[var(--accent-cyan)] shadow-[0_0_8px_rgba(0,240,255,0.05)] z-20'
                      : 'bg-[#121420] border-[rgba(255,255,255,0.04)] text-[var(--text-secondary)] hover:border-[rgba(255,255,255,0.15)]'
                  }`}
                  style={{ whiteSpace: 'nowrap', borderRadius: '9999px', cursor: 'pointer', transition: 'all var(--transition-fast)' }}
                >
                  {name}
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 3 & 4: Global Empires */}
        <div 
          className="col-span-2 overflow-y-auto max-h-full space-y-2.5 p-2 bg-[rgba(255,255,255,0.01)] rounded border border-[rgba(255,255,255,0.02)] scroll-fade-y" 
          style={{ gridColumn: 'span 2', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' }}
        >
          <span className="text-[9px] text-purple-400 font-mono font-bold tracking-wider block" style={{ fontSize: '9px' }}>
            GLOBAL REGIONS
          </span>
          <div className="flex flex-wrap gap-2 align-content-start" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignContent: 'flex-start' }}>
            {globalRegimes.map((r) => {
              const name = r.id.split('/').pop()?.replace('-', ' ') || '';
              const size = getNodeSizeStyle(r.metadata?.agentCount);
              const isHovered = hoveredRegime?.id === r.id;
              const isConnected = connections.some(c => c.id === r.id);

              return (
                <div
                  key={r.id}
                  id={`node-${r.id.replace(/\//g, '-')}`}
                  onMouseEnter={() => setHoveredRegime(r)}
                  onMouseLeave={() => setHoveredRegime(null)}
                  className={`rounded-full border font-mono font-semibold transition-all cursor-pointer ${size.padding} ${size.font} ${size.scale} ${
                    isHovered
                      ? 'bg-[var(--accent-cyan)] text-black border-[var(--accent-cyan)] shadow-[0_0_12px_rgba(0,240,255,0.45)] z-20'
                      : isConnected
                      ? 'bg-[rgba(0,240,255,0.06)] border-[rgba(0,240,255,0.4)] text-[var(--accent-cyan)] shadow-[0_0_8px_rgba(0,240,255,0.05)] z-20'
                      : 'bg-[#121420] border-[rgba(255,255,255,0.04)] text-[var(--text-secondary)] hover:border-[rgba(255,255,255,0.15)]'
                  }`}
                  style={{ whiteSpace: 'nowrap', borderRadius: '9999px', cursor: 'pointer', transition: 'all var(--transition-fast)' }}
                >
                  {name}
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 5: Right sidebar detailed hovered node tooltips */}
        <div 
          className="col-span-1 glass-panel p-4 bg-[rgba(10,11,16,0.5)] border-[rgba(255,255,255,0.05)] flex flex-col justify-center h-full"
          style={{ gridColumn: 'span 1', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '16px', borderRadius: '8px', zIndex: 20 }}
        >
          {hoveredRegime ? (
            <div className="space-y-4 animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="border-b border-[rgba(255,255,255,0.06)] pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                <span className="text-[8px] text-[var(--text-muted)] font-mono uppercase tracking-wider block">HOVER INSPECTOR</span>
                <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase font-mono mt-0.5">
                  {hoveredRegime.id.split('/').pop()?.replace('-', ' ')}
                </h4>
              </div>

              <div className="space-y-2.5 text-[10px] text-[var(--text-secondary)] font-mono" style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '10px' }}>
                <div>
                  <span className="text-[8px] text-[var(--text-muted)] block">ERA:</span>
                  <span className="text-cyan-300 block leading-tight">{hoveredRegime.metadata?.era?.en || 'Ancient'}</span>
                </div>
                <div>
                  <span className="text-[8px] text-[var(--text-muted)] block">PATTERN:</span>
                  <span className="text-purple-300 block leading-tight">{hoveredRegime.metadata?.orchestrationPattern}</span>
                </div>
                <div>
                  <span className="text-[8px] text-[var(--text-muted)] block">AGENT TEAMS:</span>
                  <span className="text-amber-400 block font-bold">{hoveredRegime.metadata?.agentCount || 5} nodes</span>
                </div>
                <div>
                  <span className="text-[8px] text-[var(--text-muted)] block">INFLUENCE TAGS:</span>
                  <div className="flex flex-wrap gap-1 mt-1" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                    {(hoveredRegime.metadata?.tags || []).map((tag, idx) => (
                      <span key={idx} className="text-[8px] bg-[rgba(255,255,255,0.04)] px-1.5 py-0.5 rounded border border-[rgba(255,255,255,0.06)]" style={{ fontSize: '8px', padding: '1px 4px' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-[var(--text-muted)] text-[10px] space-y-2" style={{ textAlign: 'center', fontSize: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Network size={20} className="mx-auto text-[rgba(255,255,255,0.05)]" style={{ margin: '0 auto' }} />
              <span>Hover a regime node to analyze shared tags connections timeline.</span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
export default RelationshipNetwork;
