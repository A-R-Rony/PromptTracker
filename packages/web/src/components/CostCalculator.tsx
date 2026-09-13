import React, { useState } from 'react';

interface ModelPricing {
  name: string;
  provider: string;
  inputPerMillion: number;
  outputPerMillion: number;
}

const MODELS: ModelPricing[] = [
  { name: 'Gemini 3.7 Flash', provider: 'Google', inputPerMillion: 0.15, outputPerMillion: 0.60 },
  { name: 'Gemini 2.5 Pro', provider: 'Google', inputPerMillion: 1.25, outputPerMillion: 5.00 },
  { name: 'Claude 3.7 Sonnet', provider: 'Anthropic', inputPerMillion: 3.00, outputPerMillion: 15.00 },
  { name: 'Claude 3.5 Haiku', provider: 'Anthropic', inputPerMillion: 0.80, outputPerMillion: 4.00 },
  { name: 'GPT-4o', provider: 'OpenAI', inputPerMillion: 2.50, outputPerMillion: 10.00 },
  { name: 'DeepSeek Chat (V3)', provider: 'DeepSeek', inputPerMillion: 0.14, outputPerMillion: 0.28 },
];

export const CostCalculator: React.FC = () => {
  const [promptsPerDay, setPromptsPerDay] = useState(40);
  const [avgInputTokens, setAvgInputTokens] = useState(8000);
  const [avgOutputTokens, setAvgOutputTokens] = useState(1200);
  const [selectedModelIdx, setSelectedModelIdx] = useState(0);

  const model = MODELS[selectedModelIdx];
  const monthlyPrompts = promptsPerDay * 30;
  const monthlyInputTokens = monthlyPrompts * avgInputTokens;
  const monthlyOutputTokens = monthlyPrompts * avgOutputTokens;
  const totalTokens = monthlyInputTokens + monthlyOutputTokens;

  const inputCost = (monthlyInputTokens / 1_000_000) * model.inputPerMillion;
  const outputCost = (monthlyOutputTokens / 1_000_000) * model.outputPerMillion;
  const monthlyCost = inputCost + outputCost;

  return (
    <section id="cost-calculator" style={{ padding: '4rem 0' }}>
      <div className="container" style={{ maxWidth: '950px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div className="pill-badge pill-cyan" style={{ marginBottom: '0.75rem' }}>
            24-Hour Remote Sync + Local Data Tracking
          </div>
          <h2 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>Dynamic Token & Cost Calculation</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '680px', margin: '0 auto' }}>
            PromptLens calculates tokens and costs directly from your <strong>local session logs</strong> combined with automatic <strong>24-hour background rate sync</strong> from live model registries.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '2.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2.5rem' }}>
            
            {/* Left Controls */}
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  Select AI Model:
                </label>
                <select
                  value={selectedModelIdx}
                  onChange={(e) => setSelectedModelIdx(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: '#040812',
                    color: '#ffffff',
                    border: '1px solid rgba(0, 242, 254, 0.3)',
                    borderRadius: '8px',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.95rem'
                  }}
                >
                  {MODELS.map((m, idx) => (
                    <option key={m.name} value={idx}>
                      {m.name} ({m.provider}) — ${m.inputPerMillion}/M in, ${m.outputPerMillion}/M out
                    </option>
                  ))}
                </select>
              </div>

              {/* Slider 1 */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.88rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Daily Prompts Across Harnesses:</span>
                  <strong style={{ color: '#00f2fe' }}>{promptsPerDay} prompts/day</strong>
                </div>
                <input
                  type="range"
                  min="5"
                  max="300"
                  step="5"
                  value={promptsPerDay}
                  onChange={(e) => setPromptsPerDay(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#00f2fe' }}
                />
              </div>

              {/* Slider 2 */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.88rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Avg Context / In-Tokens:</span>
                  <strong style={{ color: '#c084fc' }}>{avgInputTokens.toLocaleString()} tokens</strong>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="64000"
                  step="1000"
                  value={avgInputTokens}
                  onChange={(e) => setAvgInputTokens(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#c084fc' }}
                />
              </div>

              {/* Slider 3 */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.88rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Avg Completion / Out-Tokens:</span>
                  <strong style={{ color: '#00f5a0' }}>{avgOutputTokens.toLocaleString()} tokens</strong>
                </div>
                <input
                  type="range"
                  min="200"
                  max="8000"
                  step="200"
                  value={avgOutputTokens}
                  onChange={(e) => setAvgOutputTokens(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#00f5a0' }}
                />
              </div>
            </div>

            {/* Right Output Box */}
            <div style={{
              background: '#040812',
              borderRadius: '12px',
              padding: '2rem',
              border: '1px solid rgba(0, 242, 254, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  Estimated Monthly Spend
                </div>
                <div style={{ fontSize: '3rem', fontWeight: 800, color: '#00f5a0', lineHeight: 1, marginBottom: '1rem' }}>
                  ${monthlyCost.toFixed(2)}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
                  Based on <strong>{monthlyPrompts.toLocaleString()}</strong> monthly prompts ({Math.round(totalTokens / 1_000_000 * 10) / 10}M tokens).
                </div>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span>Input Token Cost:</span>
                  <strong style={{ color: '#ffffff' }}>${inputCost.toFixed(3)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Output Token Cost:</span>
                  <strong style={{ color: '#ffffff' }}>${outputCost.toFixed(3)}</strong>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};
