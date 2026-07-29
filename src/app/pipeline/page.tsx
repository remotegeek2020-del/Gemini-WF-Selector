import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Lead Enrichment Waterfall — LeadRouter',
  description: 'Sequential, credit-efficient pipeline that enriches inbound leads through up to 12 data sources with AI-powered persona assignment.',
}

export default function PipelinePage() {
  return (
    <>
      <style>{`
        :root {
          --bg: #0B1120;
          --surface: #131c30;
          --surface2: #1a2540;
          --border: rgba(99,102,241,0.18);
          --border-soft: rgba(255,255,255,0.07);
          --text: #e2e8f0;
          --text-muted: #7c8db5;
          --text-dim: #4a5578;
          --accent: #6366f1;
          --accent-glow: rgba(99,102,241,0.35);
          --phase1: #818cf8;
          --phase1-bg: rgba(129,140,248,0.1);
          --phase1-border: rgba(129,140,248,0.25);
          --phase2: #38bdf8;
          --phase2-bg: rgba(56,189,248,0.08);
          --phase2-border: rgba(56,189,248,0.22);
          --phase3: #fb923c;
          --phase3-bg: rgba(251,146,60,0.08);
          --phase3-border: rgba(251,146,60,0.22);
          --phase4: #34d399;
          --phase4-bg: rgba(52,211,153,0.08);
          --phase4-border: rgba(52,211,153,0.22);
          --phase5: #a78bfa;
          --phase5-bg: rgba(167,139,250,0.1);
          --phase5-border: rgba(167,139,250,0.25);
          --ai-color: #f472b6;
          --ai-bg: rgba(244,114,182,0.08);
          --ai-border: rgba(244,114,182,0.22);
          --radius: 12px;
          --spine-w: 2px;
        }

        @media (prefers-color-scheme: light) {
          :root {
            --bg: #f0f4ff;
            --surface: #ffffff;
            --surface2: #f5f7ff;
            --border: rgba(99,102,241,0.2);
            --border-soft: rgba(0,0,0,0.08);
            --text: #1e2a4a;
            --text-muted: #4a5578;
            --text-dim: #8895b3;
            --accent-glow: rgba(99,102,241,0.15);
            --phase1-bg: rgba(129,140,248,0.07);
            --phase1-border: rgba(129,140,248,0.3);
            --phase2-bg: rgba(56,189,248,0.07);
            --phase2-border: rgba(56,189,248,0.3);
            --phase3-bg: rgba(251,146,60,0.07);
            --phase3-border: rgba(251,146,60,0.28);
            --phase4-bg: rgba(52,211,153,0.07);
            --phase4-border: rgba(52,211,153,0.3);
            --phase5-bg: rgba(167,139,250,0.07);
            --phase5-border: rgba(167,139,250,0.3);
            --ai-bg: rgba(244,114,182,0.07);
            --ai-border: rgba(244,114,182,0.3);
          }
        }

        :root[data-theme="dark"] {
          --bg: #0B1120; --surface: #131c30; --surface2: #1a2540;
          --border: rgba(99,102,241,0.18); --border-soft: rgba(255,255,255,0.07);
          --text: #e2e8f0; --text-muted: #7c8db5; --text-dim: #4a5578;
          --accent-glow: rgba(99,102,241,0.35);
          --phase1-bg: rgba(129,140,248,0.1); --phase1-border: rgba(129,140,248,0.25);
          --phase2-bg: rgba(56,189,248,0.08); --phase2-border: rgba(56,189,248,0.22);
          --phase3-bg: rgba(251,146,60,0.08); --phase3-border: rgba(251,146,60,0.22);
          --phase4-bg: rgba(52,211,153,0.08); --phase4-border: rgba(52,211,153,0.22);
          --phase5-bg: rgba(167,139,250,0.1); --phase5-border: rgba(167,139,250,0.25);
          --ai-bg: rgba(244,114,182,0.08); --ai-border: rgba(244,114,182,0.22);
        }

        :root[data-theme="light"] {
          --bg: #f0f4ff; --surface: #ffffff; --surface2: #f5f7ff;
          --border: rgba(99,102,241,0.2); --border-soft: rgba(0,0,0,0.08);
          --text: #1e2a4a; --text-muted: #4a5578; --text-dim: #8895b3;
          --accent-glow: rgba(99,102,241,0.15);
          --phase1-bg: rgba(129,140,248,0.07); --phase1-border: rgba(129,140,248,0.3);
          --phase2-bg: rgba(56,189,248,0.07); --phase2-border: rgba(56,189,248,0.3);
          --phase3-bg: rgba(251,146,60,0.07); --phase3-border: rgba(251,146,60,0.28);
          --phase4-bg: rgba(52,211,153,0.07); --phase4-border: rgba(52,211,153,0.3);
          --phase5-bg: rgba(167,139,250,0.07); --phase5-border: rgba(167,139,250,0.3);
          --ai-bg: rgba(244,114,182,0.07); --ai-border: rgba(244,114,182,0.3);
        }

        html { box-sizing: border-box; }
        *, *::before, *::after { box-sizing: inherit; margin: 0; padding: 0; }

        body.pipeline-page {
          background: var(--bg);
          color: var(--text);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
          font-size: 14px;
          line-height: 1.6;
          min-height: 100vh;
          padding: 48px 24px 80px;
          transition: background 0.3s, color 0.3s;
        }

        .pl-page { max-width: 760px; margin: 0 auto; }

        .pl-header { margin-bottom: 56px; text-align: center; }

        .pl-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 11px; font-weight: 600; letter-spacing: 0.12em;
          text-transform: uppercase; color: var(--accent); margin-bottom: 16px;
        }
        .pl-eyebrow-dot {
          width: 6px; height: 6px; background: var(--accent);
          border-radius: 50%; animation: pl-pulse 2s ease-in-out infinite;
        }
        @keyframes pl-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }

        .pl-h1 {
          font-size: clamp(28px, 5vw, 42px); font-weight: 700;
          letter-spacing: -0.02em; line-height: 1.1;
          color: var(--text); margin-bottom: 12px;
        }
        .pl-subtitle {
          font-size: 15px; color: var(--text-muted); max-width: 480px;
          margin: 0 auto; line-height: 1.7;
        }

        .pl-legend {
          display: flex; flex-wrap: wrap; justify-content: center;
          gap: 10px; margin-top: 28px;
        }
        .pl-legend-item {
          display: flex; align-items: center; gap: 6px;
          font-size: 11px; font-weight: 500; color: var(--text-muted);
          padding: 4px 10px; border-radius: 20px;
          border: 1px solid var(--border-soft); background: var(--surface);
        }
        .pl-legend-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

        .pl-pipeline {
          position: relative; display: flex; flex-direction: column;
          align-items: center; gap: 0;
        }

        .pl-spine {
          position: absolute; left: 50%; top: 0; bottom: 0; width: var(--spine-w);
          background: linear-gradient(to bottom,
            transparent 0%, var(--accent) 8%, var(--phase1) 20%,
            var(--phase2) 38%, var(--phase3) 52%, var(--phase4) 68%,
            var(--phase5) 80%, var(--ai-color) 92%, transparent 100%
          );
          opacity: 0.35; transform: translateX(-50%);
          pointer-events: none; z-index: 0;
        }

        .pl-spine-dot {
          position: absolute; left: 50%; width: 8px; height: 8px;
          border-radius: 50%; transform: translate(-50%, -50%);
          pointer-events: none; z-index: 1;
          animation: pl-flowDown 3.5s linear infinite;
        }
        .pl-spine-dot:nth-child(2) { animation-delay: -1.17s; }
        .pl-spine-dot:nth-child(3) { animation-delay: -2.33s; }

        @keyframes pl-flowDown {
          0%   { top: 0%; opacity: 0; background: var(--accent); }
          5%   { opacity: 1; }
          40%  { background: var(--phase3); }
          70%  { background: var(--phase4); }
          95%  { opacity: 0.8; }
          100% { top: 100%; opacity: 0; background: var(--ai-color); }
        }

        @media (prefers-reduced-motion: reduce) {
          .pl-spine-dot { animation: none; opacity: 0; }
          .pl-eyebrow-dot { animation: none; }
        }

        .pl-node {
          position: relative; z-index: 2;
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          padding: 10px 20px; border-radius: 24px;
          background: var(--surface); border: 1.5px solid var(--border);
          font-size: 12px; font-weight: 600; color: var(--text-muted);
          letter-spacing: 0.04em; text-align: center; min-width: 160px;
          box-shadow: 0 0 0 4px var(--bg), 0 2px 12px rgba(0,0,0,0.15);
        }
        .pl-node.entry {
          border-color: var(--accent); color: var(--text);
          box-shadow: 0 0 0 4px var(--bg), 0 0 20px var(--accent-glow);
        }
        .pl-node-label {
          font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em;
          color: var(--accent); font-weight: 700;
        }

        .pl-connector {
          position: relative; z-index: 1; height: 32px;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
        }
        .pl-arrow {
          width: 0; height: 0;
          border-left: 5px solid transparent; border-right: 5px solid transparent;
          border-top: 7px solid var(--text-dim);
        }

        .pl-phase {
          position: relative; z-index: 2; width: 100%;
          border-radius: var(--radius); border: 1.5px solid var(--border-soft);
          overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,0.1);
        }
        .pl-phase-header {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 20px 12px; border-bottom: 1px solid var(--border-soft);
        }
        .pl-phase-badge {
          font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; padding: 3px 10px; border-radius: 20px; flex-shrink: 0;
        }
        .pl-phase-title { font-size: 13px; font-weight: 600; color: var(--text); flex: 1; }
        .pl-phase-meta { font-size: 11px; color: var(--text-dim); text-align: right; flex-shrink: 0; }
        .pl-phase-body { padding: 16px 20px; }
        .pl-skip {
          font-size: 11px; color: var(--text-dim); font-style: italic;
          margin-bottom: 14px; padding: 6px 10px;
          background: var(--surface2); border-radius: 6px;
          border-left: 2px solid var(--text-dim); line-height: 1.5;
        }

        .pl-tools {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px;
        }
        .pl-tool {
          background: var(--surface2); border: 1px solid var(--border-soft);
          border-radius: 8px; padding: 10px 12px;
        }
        .pl-tool-name { font-size: 12px; font-weight: 600; color: var(--text); margin-bottom: 3px; }
        .pl-tool-desc { font-size: 10.5px; color: var(--text-muted); line-height: 1.45; }

        .pl-waterfall-note {
          display: flex; align-items: center; gap: 5px;
          margin-top: 12px; font-size: 10.5px; color: var(--text-dim);
        }

        /* Phase colors */
        .pl-phase.p1 { background: var(--phase1-bg); border-color: var(--phase1-border); }
        .pl-phase.p1 .pl-phase-badge { background: var(--phase1-bg); color: var(--phase1); border: 1px solid var(--phase1-border); }
        .pl-phase.p1 .pl-tool { border-color: rgba(129,140,248,0.15); }
        .pl-phase.p1 .pl-skip { border-left-color: var(--phase1); }

        .pl-phase.p2 { background: var(--phase2-bg); border-color: var(--phase2-border); }
        .pl-phase.p2 .pl-phase-badge { background: var(--phase2-bg); color: var(--phase2); border: 1px solid var(--phase2-border); }
        .pl-phase.p2 .pl-tool { border-color: rgba(56,189,248,0.15); }
        .pl-phase.p2 .pl-skip { border-left-color: var(--phase2); }

        .pl-phase.p3 { background: var(--phase3-bg); border-color: var(--phase3-border); }
        .pl-phase.p3 .pl-phase-badge { background: var(--phase3-bg); color: var(--phase3); border: 1px solid var(--phase3-border); }
        .pl-phase.p3 .pl-tool { border-color: rgba(251,146,60,0.15); }
        .pl-phase.p3 .pl-skip { border-left-color: var(--phase3); }

        .pl-phase.p4 { background: var(--phase4-bg); border-color: var(--phase4-border); }
        .pl-phase.p4 .pl-phase-badge { background: var(--phase4-bg); color: var(--phase4); border: 1px solid var(--phase4-border); }
        .pl-phase.p4 .pl-tool { border-color: rgba(52,211,153,0.15); }
        .pl-phase.p4 .pl-skip { border-left-color: var(--phase4); }

        .pl-phase.p5 { background: var(--phase5-bg); border-color: var(--phase5-border); }
        .pl-phase.p5 .pl-phase-badge { background: var(--phase5-bg); color: var(--phase5); border: 1px solid var(--phase5-border); }
        .pl-phase.p5 .pl-tool { border-color: rgba(167,139,250,0.15); }
        .pl-phase.p5 .pl-skip { border-left-color: var(--phase5); }

        .pl-phase.pai { background: var(--ai-bg); border-color: var(--ai-border); }
        .pl-phase.pai .pl-phase-badge { background: var(--ai-bg); color: var(--ai-color); border: 1px solid var(--ai-border); }
        .pl-phase.pai .pl-tool { border-color: rgba(244,114,182,0.15); }

        .pl-gate {
          position: relative; z-index: 2; width: 100%;
          border-radius: 8px; background: var(--surface);
          border: 1px dashed var(--border); padding: 12px 16px;
          display: flex; align-items: center; gap: 10px;
          font-size: 12px; color: var(--text-muted);
        }
        .pl-gate-icon {
          width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
          background: rgba(251,146,60,0.12); border: 1px solid rgba(251,146,60,0.25);
          border-radius: 6px; color: #fb923c; flex-shrink: 0; font-size: 14px;
        }
        .pl-gate strong { color: var(--text); font-weight: 600; }

        .pl-output {
          position: relative; z-index: 2; width: 100%;
          border-radius: var(--radius); background: var(--surface);
          border: 1.5px solid var(--border); padding: 20px;
          box-shadow: 0 0 24px var(--accent-glow);
        }
        .pl-output-title {
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.1em; color: var(--accent); margin-bottom: 14px;
        }
        .pl-output-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px;
        }
        .pl-output-item {
          display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px;
          background: var(--surface2); border-radius: 8px; border: 1px solid var(--border-soft);
        }
        .pl-output-icon {
          width: 28px; height: 28px; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; flex-shrink: 0; background: var(--border);
        }
        .pl-output-label { font-size: 12px; font-weight: 600; color: var(--text); line-height: 1.3; margin-bottom: 2px; }
        .pl-output-sub { font-size: 10px; color: var(--text-muted); line-height: 1.4; }

        .pl-footnote {
          margin-top: 48px; text-align: center; font-size: 11px;
          color: var(--text-dim); line-height: 1.7;
        }

        @media (max-width: 520px) {
          body.pipeline-page { padding: 32px 16px 60px; }
          .pl-tools { grid-template-columns: 1fr; }
          .pl-output-grid { grid-template-columns: 1fr 1fr; }
          .pl-legend { gap: 7px; }
        }
      `}</style>

      <body className="pipeline-page">
        <div className="pl-page">

          {/* Header */}
          <header className="pl-header">
            <div className="pl-eyebrow">
              <span className="pl-eyebrow-dot" />
              System Architecture
            </div>
            <h1 className="pl-h1">Lead Enrichment Waterfall</h1>
            <p className="pl-subtitle">
              A sequential, credit-efficient pipeline that enriches each inbound lead through up to 12 data sources — activating only the tools whose API keys are configured.
            </p>
            <div className="pl-legend">
              {[
                { color: '#818cf8', label: 'Phase 1 — Primary' },
                { color: '#38bdf8', label: 'Phase 2 — Fallback Profile' },
                { color: '#fb923c', label: 'Phase 3 — Phone Recovery' },
                { color: '#34d399', label: 'Phase 4 — Email Recovery' },
                { color: '#a78bfa', label: 'Phase 5 — Verification' },
                { color: '#f472b6', label: 'AI Analysis' },
              ].map((item) => (
                <div key={item.label} className="pl-legend-item">
                  <span className="pl-legend-dot" style={{ background: item.color }} />
                  {item.label}
                </div>
              ))}
            </div>
          </header>

          {/* Pipeline */}
          <div className="pl-pipeline">
            <div className="pl-spine">
              <div className="pl-spine-dot" />
              <div className="pl-spine-dot" />
              <div className="pl-spine-dot" />
            </div>

            <div className="pl-node entry">
              <div className="pl-node-label">Trigger</div>
              New Lead Arrives via Webhook
            </div>

            <div className="pl-connector"><div className="pl-arrow" /></div>

            <div className="pl-gate">
              <div className="pl-gate-icon">⚡</div>
              <div>
                <strong>Gate Check</strong> — requires at least one of: email address, phone number, or LinkedIn URL. If none present, pipeline stops immediately — no credits used.
              </div>
            </div>

            <div className="pl-connector"><div className="pl-arrow" /></div>

            {/* Phase 1 */}
            <div className="pl-phase p1">
              <div className="pl-phase-header">
                <span className="pl-phase-badge">Phase 1</span>
                <span className="pl-phase-title">Primary Enrichment</span>
                <span className="pl-phase-meta">Always runs</span>
              </div>
              <div className="pl-phase-body">
                <div className="pl-skip">Apollo always runs first. Lusha runs only when Apollo returns a LinkedIn URL.</div>
                <div className="pl-tools">
                  <div className="pl-tool">
                    <div className="pl-tool-name">Apollo.io</div>
                    <div className="pl-tool-desc">Title, company, industry, employment history, LinkedIn URL, company size &amp; revenue</div>
                  </div>
                  <div className="pl-tool">
                    <div className="pl-tool-name">Lusha</div>
                    <div className="pl-tool-desc">Direct dials and personal emails — runs when a LinkedIn URL is available</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pl-connector"><div className="pl-arrow" /></div>

            {/* Phase 2 */}
            <div className="pl-phase p2">
              <div className="pl-phase-header">
                <span className="pl-phase-badge">Phase 2</span>
                <span className="pl-phase-title">Profile Fallback</span>
                <span className="pl-phase-meta">Conditional</span>
              </div>
              <div className="pl-phase-body">
                <div className="pl-skip">PDL fires only when Apollo found no job title AND no company. Datagma fires when a LinkedIn URL is available. Both are skipped if Phase 1 returned a full profile.</div>
                <div className="pl-tools">
                  <div className="pl-tool">
                    <div className="pl-tool-name">People Data Labs</div>
                    <div className="pl-tool-desc">Large dataset fallback — strong coverage for SMBs, independent agents, and 1099 reps</div>
                  </div>
                  <div className="pl-tool">
                    <div className="pl-tool-name">Datagma</div>
                    <div className="pl-tool-desc">LinkedIn profile enrichment + mobile phone finder from LinkedIn URL</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pl-connector"><div className="pl-arrow" /></div>

            {/* Phase 3 */}
            <div className="pl-phase p3">
              <div className="pl-phase-header">
                <span className="pl-phase-badge">Phase 3</span>
                <span className="pl-phase-title">Phone Recovery</span>
                <span className="pl-phase-meta">Stops on first match</span>
              </div>
              <div className="pl-phase-body">
                <div className="pl-skip">Entire phase skipped if a phone number is already found. Tools run in order — once a phone is returned, the remaining tools in this phase are skipped.</div>
                <div className="pl-tools">
                  <div className="pl-tool">
                    <div className="pl-tool-name">BetterContact</div>
                    <div className="pl-tool-desc">Aggregates 15+ phone sources — highest coverage, runs first</div>
                  </div>
                  <div className="pl-tool">
                    <div className="pl-tool-name">Kaspr</div>
                    <div className="pl-tool-desc">LinkedIn-sourced mobile numbers — runs if phone still missing</div>
                  </div>
                  <div className="pl-tool">
                    <div className="pl-tool-name">Cognism</div>
                    <div className="pl-tool-desc">B2B mobile + email finder — last resort phone recovery</div>
                  </div>
                </div>
                <div className="pl-waterfall-note">
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  Waterfall stops as soon as a phone is found — saves API credits
                </div>
              </div>
            </div>

            <div className="pl-connector"><div className="pl-arrow" /></div>

            {/* Phase 4 */}
            <div className="pl-phase p4">
              <div className="pl-phase-header">
                <span className="pl-phase-badge">Phase 4</span>
                <span className="pl-phase-title">Email Recovery</span>
                <span className="pl-phase-meta">Stops on first match</span>
              </div>
              <div className="pl-phase-body">
                <div className="pl-skip">Entire phase skipped if a work email is already found. Targets leads who opted in with a personal Gmail or Yahoo address. Tools run in order — first work email found stops the chain.</div>
                <div className="pl-tools">
                  <div className="pl-tool">
                    <div className="pl-tool-name">ContactOut</div>
                    <div className="pl-tool-desc">Work + personal email from LinkedIn URL — runs first</div>
                  </div>
                  <div className="pl-tool">
                    <div className="pl-tool-name">Hunter.io</div>
                    <div className="pl-tool-desc">Work email by company domain — runs when domain is known</div>
                  </div>
                  <div className="pl-tool">
                    <div className="pl-tool-name">Dropcontact</div>
                    <div className="pl-tool-desc">Work email by name + company — GDPR-safe, runs after Hunter</div>
                  </div>
                  <div className="pl-tool">
                    <div className="pl-tool-name">Findymail</div>
                    <div className="pl-tool-desc">Email via LinkedIn URL or name + domain — final fallback</div>
                  </div>
                </div>
                <div className="pl-waterfall-note">
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  Waterfall stops as soon as a work email is found — saves API credits
                </div>
              </div>
            </div>

            <div className="pl-connector"><div className="pl-arrow" /></div>

            {/* Phase 5 */}
            <div className="pl-phase p5">
              <div className="pl-phase-header">
                <span className="pl-phase-badge">Phase 5</span>
                <span className="pl-phase-title">Email Verification</span>
                <span className="pl-phase-meta">~$0.001 per email</span>
              </div>
              <div className="pl-phase-body">
                <div className="pl-skip">Runs on all collected emails from every phase. Marks each as valid, risky, or undeliverable before the lead record is saved.</div>
                <div className="pl-tools">
                  <div className="pl-tool">
                    <div className="pl-tool-name">Enrow</div>
                    <div className="pl-tool-desc">Deliverability verification for all collected emails — returns validity scores and filters undeliverables</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pl-connector"><div className="pl-arrow" /></div>

            {/* AI Phase */}
            <div className="pl-phase pai">
              <div className="pl-phase-header">
                <span className="pl-phase-badge">AI Analysis</span>
                <span className="pl-phase-title">Persona Assignment &amp; Lead Scoring</span>
                <span className="pl-phase-meta">Runs after all enrichment</span>
              </div>
              <div className="pl-phase-body">
                <div className="pl-tools">
                  <div className="pl-tool">
                    <div className="pl-tool-name">Persona Matching</div>
                    <div className="pl-tool-desc">AI reads the full enriched profile and assigns the best-matching persona using title, industry, company type, and experience level</div>
                  </div>
                  <div className="pl-tool">
                    <div className="pl-tool-name">Hot Lead Scoring</div>
                    <div className="pl-tool-desc">Lightweight AI assessment flags high-priority leads based on seniority, company fit, and profile completeness</div>
                  </div>
                </div>
                <div className="pl-waterfall-note">
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                  Supports Gemini, OpenAI, Anthropic, OpenRouter — configured once at agency level
                </div>
              </div>
            </div>

            <div className="pl-connector"><div className="pl-arrow" /></div>

            {/* Output */}
            <div className="pl-output">
              <div className="pl-output-title">Output — Actions Triggered</div>
              <div className="pl-output-grid">
                {[
                  { icon: '📋', label: 'Lead Record', sub: 'Full enriched data + persona + score stored in database' },
                  { icon: '⚙️', label: 'GHL Workflow', sub: "Assigned persona's workflow triggered in GoHighLevel" },
                  { icon: '👤', label: 'Contact Updated', sub: 'Enriched name, title, company, phone pushed back to GHL contact' },
                  { icon: '✉️', label: 'Email Alert', sub: 'Team notified with persona match, hot flag, and reasoning' },
                ].map((item) => (
                  <div key={item.label} className="pl-output-item">
                    <div className="pl-output-icon">{item.icon}</div>
                    <div>
                      <div className="pl-output-label">{item.label}</div>
                      <div className="pl-output-sub">{item.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pl-connector"><div className="pl-arrow" /></div>
            <div className="pl-node">
              <div className="pl-node-label">Complete</div>
              Lead processed &amp; routed
            </div>
          </div>

          <div className="pl-footnote">
            All enrichment tools are opt-in — a tool only runs when its API key is saved in Agency Settings.<br />
            No key configured = tool skipped = no cost incurred.
          </div>
        </div>
      </body>
    </>
  )
}
