import React, { useState } from 'react';
import { Award, Star } from 'lucide-react';

interface ScoreDetails {
  legality: number;
  feasibility: number;
  resilience: number;
}

interface JudgeLeaderboardProps {
  scores: { [regime: string]: ScoreDetails };
  verdicts: { [regime: string]: string };
  civNames: { [regime: string]: string };
}

export const JudgeLeaderboard: React.FC<JudgeLeaderboardProps> = ({
  scores,
  verdicts,
  civNames,
}) => {
  const regimes = Object.keys(scores);
  const [selectedRegime, setSelectedRegime] = useState<string | null>(regimes[0] || null);

  if (regimes.length === 0) {
    return (
      <div className="glass-panel p-8 text-center text-[var(--text-muted)]" style={{ padding: '32px', textAlign: 'center' }}>
        No evaluation results delivered yet. Complete a match to view the judge's leaderboard.
      </div>
    );
  }

  // Calculate average score for ranking
  const getAverageScore = (s: ScoreDetails) => {
    return ((s.legality + s.feasibility + s.resilience) / 3).toFixed(1);
  };

  // Assign grade letters based on average score
  const getGradeBadge = (avg: number) => {
    if (avg >= 9.0) return { label: 'S', color: 'var(--accent-gold)' };
    if (avg >= 8.0) return { label: 'A', color: 'var(--accent-cyan)' };
    if (avg >= 7.0) return { label: 'B', color: 'var(--accent-purple)' };
    if (avg >= 5.0) return { label: 'C', color: 'var(--text-secondary)' };
    return { label: 'D', color: 'var(--accent-crimson)' };
  };

  // Sort regimes by average score descending
  const sortedRegimes = [...regimes].sort((a, b) => {
    const avgA = parseFloat(getAverageScore(scores[a]));
    const avgB = parseFloat(getAverageScore(scores[b]));
    return avgB - avgA;
  });

  return (
    <div className="glass-panel glass-panel-gold p-6 space-y-6" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="flex items-center justify-center w-9 h-9 rounded bg-[rgba(255,215,0,0.1)] border border-[rgba(255,215,0,0.3)] text-[var(--accent-gold)]" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Award size={18} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]" style={{ fontSize: '18px', fontWeight: 700 }}>AI Judge Leaderboard</h2>
          <p className="text-xs text-[var(--text-secondary)]" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Comparative evaluation based on historical constraint compliance, project feasibility, and systemic resilience.
          </p>
        </div>
      </div>

      {/* Grid of Results */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        
        {/* Score Table */}
        <div className="md:col-span-1 border-r border-[rgba(255,255,255,0.06)] pr-0 md:pr-6" style={{ borderRight: '1px solid rgba(255,255,255,0.06)', paddingRight: '24px' }}>
          <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3" style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '12px' }}>
            REGIME STANDINGS
          </h3>
          <div className="space-y-2.5" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sortedRegimes.map((regime, index) => {
              const itemScore = scores[regime];
              const avg = parseFloat(getAverageScore(itemScore));
              const grade = getGradeBadge(avg);
              const isSelected = selectedRegime === regime;

              return (
                <div
                  key={regime}
                  onClick={() => setSelectedRegime(regime)}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[rgba(255,215,0,0.05)] border-[rgba(255,215,0,0.3)] shadow-[0_0_12px_rgba(255,215,0,0.05)]'
                      : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.12)]'
                  }`}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="font-mono text-xs text-[var(--text-muted)] w-4" style={{ display: 'inline-block', width: '16px' }}>
                      #{index + 1}
                    </span>
                    <div>
                      <span className="text-sm font-semibold block text-[var(--text-primary)]" style={{ display: 'block', fontSize: '14px', fontWeight: 600 }}>
                        {civNames[regime] || regime}
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)] block font-mono" style={{ display: 'block', fontSize: '10px' }}>
                        {regime}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="text-right" style={{ textAlign: 'right' }}>
                      <span className="text-sm font-bold block font-mono text-[var(--text-primary)]" style={{ display: 'block', fontSize: '14px' }}>
                        {avg}
                      </span>
                      <span className="text-[8px] text-[var(--text-muted)] block" style={{ display: 'block', fontSize: '8px' }}>AVG SCORE</span>
                    </div>
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs"
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(255,255,255,0.04)',
                        border: `1px solid ${grade.color}`,
                        color: grade.color,
                        boxShadow: `0 0 8px ${grade.color}1e`
                      }}
                    >
                      {grade.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Details & Bar Charts */}
        <div className="md:col-span-2 space-y-5" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {selectedRegime && scores[selectedRegime] && (
            <div className="space-y-5" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Detailed Scores */}
              <div className="grid grid-cols-3 gap-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                
                {/* Legality Card */}
                <div className="glass-panel p-3 bg-[rgba(255,255,255,0.01)] border-[rgba(255,255,255,0.05)] rounded-lg text-center" style={{ padding: '12px', textAlign: 'center' }}>
                  <span className="text-[10px] text-[var(--text-secondary)] block font-semibold mb-1" style={{ display: 'block', fontSize: '10px', fontWeight: 600, marginBottom: '4px' }}>LEGALITY</span>
                  <span className="text-xl font-bold font-mono text-[var(--accent-gold)]" style={{ fontSize: '20px', color: 'var(--accent-gold)' }}>
                    {scores[selectedRegime].legality}/10
                  </span>
                  {/* CSS Progress Bar */}
                  <div className="w-full bg-[rgba(255,255,255,0.04)] h-1.5 rounded-full overflow-hidden mt-2" style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '999px', marginTop: '8px' }}>
                    <div 
                      className="bg-[var(--accent-gold)] h-full rounded-full transition-all duration-500" 
                      style={{ width: `${scores[selectedRegime].legality * 10}%`, height: '100%', backgroundColor: 'var(--accent-gold)' }}
                    ></div>
                  </div>
                </div>

                {/* Feasibility Card */}
                <div className="glass-panel p-3 bg-[rgba(255,255,255,0.01)] border-[rgba(255,255,255,0.05)] rounded-lg text-center" style={{ padding: '12px', textAlign: 'center' }}>
                  <span className="text-[10px] text-[var(--text-secondary)] block font-semibold mb-1" style={{ display: 'block', fontSize: '10px', fontWeight: 600, marginBottom: '4px' }}>FEASIBILITY</span>
                  <span className="text-xl font-bold font-mono text-[var(--accent-cyan)]" style={{ fontSize: '20px', color: 'var(--accent-cyan)' }}>
                    {scores[selectedRegime].feasibility}/10
                  </span>
                  <div className="w-full bg-[rgba(255,255,255,0.04)] h-1.5 rounded-full overflow-hidden mt-2" style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '999px', marginTop: '8px' }}>
                    <div 
                      className="bg-[var(--accent-cyan)] h-full rounded-full transition-all duration-500" 
                      style={{ width: `${scores[selectedRegime].feasibility * 10}%`, height: '100%', backgroundColor: 'var(--accent-cyan)' }}
                    ></div>
                  </div>
                </div>

                {/* Resilience Card */}
                <div className="glass-panel p-3 bg-[rgba(255,255,255,0.01)] border-[rgba(255,255,255,0.05)] rounded-lg text-center" style={{ padding: '12px', textAlign: 'center' }}>
                  <span className="text-[10px] text-[var(--text-secondary)] block font-semibold mb-1" style={{ display: 'block', fontSize: '10px', fontWeight: 600, marginBottom: '4px' }}>RESILIENCE</span>
                  <span className="text-xl font-bold font-mono text-[var(--accent-purple)]" style={{ fontSize: '20px', color: 'var(--accent-purple)' }}>
                    {scores[selectedRegime].resilience}/10
                  </span>
                  <div className="w-full bg-[rgba(255,255,255,0.04)] h-1.5 rounded-full overflow-hidden mt-2" style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '999px', marginTop: '8px' }}>
                    <div 
                      className="bg-[var(--accent-purple)] h-full rounded-full transition-all duration-500" 
                      style={{ width: `${scores[selectedRegime].resilience * 10}%`, height: '100%', backgroundColor: 'var(--accent-purple)' }}
                    ></div>
                  </div>
                </div>

              </div>

              {/* Verdict Verdict Section */}
              <div className="glass-panel p-5 bg-[rgba(10,11,16,0.3)] border-[rgba(255,255,255,0.04)] rounded-lg space-y-3 relative overflow-hidden" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="flex items-center gap-2 text-[var(--accent-gold)]" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-gold)' }}>
                  <Star size={14} fill="var(--accent-gold)" />
                  <h4 className="text-xs font-bold uppercase tracking-wider font-heading" style={{ fontSize: '12px', fontWeight: 700 }}>
                    AI JUDGE VERDICT & COMPLIANCE FEEDBACK
                  </h4>
                </div>

                <div 
                  className="text-xs text-[var(--text-primary)] leading-relaxed font-mono bg-[rgba(0,0,0,0.2)] p-4 rounded border border-[rgba(255,255,255,0.02)] max-h-56 overflow-y-auto"
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)',
                    lineHeight: '1.7',
                    background: 'rgba(0,0,0,0.2)',
                    padding: '16px',
                    borderRadius: '4px',
                    border: '1px solid rgba(255,255,255,0.02)',
                    maxHeight: '224px',
                    overflowY: 'auto'
                  }}
                >
                  {verdicts[selectedRegime] ? (
                    verdicts[selectedRegime].split('\n\n').map((paragraph, pIdx) => {
                      if (paragraph.startsWith('###')) {
                        return <h4 key={pIdx} className="text-sm font-semibold mt-3 mb-2 text-[var(--accent-cyan)]">{paragraph.replace('###', '').trim()}</h4>;
                      }
                      if (paragraph.startsWith('-')) {
                        return (
                          <ul key={pIdx} className="list-disc list-inside ml-2 mb-2 text-[var(--text-secondary)]">
                            {paragraph.split('\n').map((li, lIdx) => (
                              <li key={lIdx} className="mb-1">{li.replace('-', '').trim()}</li>
                            ))}
                          </ul>
                        );
                      }
                      return <p key={pIdx} className="mb-2.5 text-[var(--text-secondary)]">{paragraph}</p>;
                    })
                  ) : (
                    <span className="text-[var(--text-muted)] italic">No detailed analysis compiled by the judge.</span>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

      </div>

    </div>
  );
};
export default JudgeLeaderboard;
