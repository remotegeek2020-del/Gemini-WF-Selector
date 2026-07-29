'use client'

import { useState } from 'react'
import type { Metadata } from 'next'

// Note: metadata export doesn't work in client components — set via layout or head tag instead

const SHARED_CSS = `
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
    --whis: #a855f7;
    --whis-bright: #c084fc;
    --whis-bg: rgba(168,85,247,0.08);
    --whis-bg2: rgba(168,85,247,0.04);
    --whis-border: rgba(168,85,247,0.25);
    --whis-glow: rgba(168,85,247,0.3);
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
      --whis-bg: rgba(168,85,247,0.06);
      --whis-bg2: rgba(168,85,247,0.03);
      --whis-border: rgba(168,85,247,0.3);
      --whis-glow: rgba(168,85,247,0.15);
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
    --whis-bg: rgba(168,85,247,0.08); --whis-bg2: rgba(168,85,247,0.04);
    --whis-border: rgba(168,85,247,0.25); --whis-glow: rgba(168,85,247,0.3);
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
    --whis-bg: rgba(168,85,247,0.06); --whis-bg2: rgba(168,85,247,0.03);
    --whis-border: rgba(168,85,247,0.3); --whis-glow: rgba(168,85,247,0.15);
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

  /* Tabs */
  .pl-tabs {
    display: flex; gap: 4px;
    background: var(--surface); border: 1px solid var(--border-soft);
    border-radius: 10px; padding: 4px; margin-bottom: 48px;
  }
  .pl-tab {
    flex: 1; display: flex; align-items: center; justify-content: center; gap-8px;
    padding: 9px 16px; border-radius: 7px; border: none; cursor: pointer;
    font-size: 13px; font-weight: 600; letter-spacing: 0.01em;
    transition: all 0.18s; background: transparent; color: var(--text-muted);
    gap: 7px;
  }
  .pl-tab:hover { color: var(--text); background: var(--surface2); }
  .pl-tab.active-waterfall { background: var(--accent); color: #fff; box-shadow: 0 2px 8px var(--accent-glow); }
  .pl-tab.active-whis { background: var(--whis); color: #fff; box-shadow: 0 2px 8px var(--whis-glow); }
  .pl-tab-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

  .pl-header { margin-bottom: 56px; text-align: center; }

  .pl-eyebrow {
    display: inline-flex; align-items: center; gap: 8px;
    font-size: 11px; font-weight: 600; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--accent); margin-bottom: 16px;
  }
  .pl-eyebrow.whis-eye { color: var(--whis-bright); }
  .pl-eyebrow-dot {
    width: 6px; height: 6px; background: var(--accent);
    border-radius: 50%; animation: pl-pulse 2s ease-in-out infinite;
  }
  .pl-eyebrow-dot.whis-dot { background: var(--whis-bright); }

  @keyframes pl-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.7); }
  }

  .pl-h1 {
    font-size: clamp(28px, 5vw, 42px); font-weight: 700;
    letter-spacing: -0.02em; line-height: 1.1;
    color: var(--text); margin-bottom: 12px;
  }
  .pl-h1 span.whis-name {
    background: linear-gradient(135deg, var(--whis-bright), #e879f9);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .pl-subtitle {
    font-size: 15px; color: var(--text-muted); max-width: 500px;
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

  .pl-spine.whis-spine {
    background: linear-gradient(to bottom,
      transparent 0%, var(--whis) 10%, var(--whis-bright) 35%,
      #e879f9 65%, var(--whis) 90%, transparent 100%
    );
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

  @keyframes pl-flowWhis {
    0%   { top: 0%; opacity: 0; background: var(--whis); }
    5%   { opacity: 1; }
    50%  { background: var(--whis-bright); }
    95%  { opacity: 0.8; }
    100% { top: 100%; opacity: 0; background: #e879f9; }
  }

  .whis-spine-dot { animation: pl-flowWhis 3s linear infinite !important; }
  .whis-spine-dot:nth-child(2) { animation-delay: -1s !important; }
  .whis-spine-dot:nth-child(3) { animation-delay: -2s !important; }

  @media (prefers-reduced-motion: reduce) {
    .pl-spine-dot, .whis-spine-dot { animation: none; opacity: 0; }
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
  .pl-node.whis-entry {
    border-color: var(--whis); color: var(--text);
    box-shadow: 0 0 0 4px var(--bg), 0 0 24px var(--whis-glow);
  }
  .pl-node.whis-complete {
    border-color: var(--whis);
    box-shadow: 0 0 0 4px var(--bg), 0 0 16px var(--whis-glow);
  }
  .pl-node-label {
    font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em;
    color: var(--accent); font-weight: 700;
  }
  .pl-node-label.whis-label { color: var(--whis-bright); }

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
  .pl-tool-tag {
    display: inline-block; font-size: 9px; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; padding: 2px 6px; border-radius: 4px;
    margin-bottom: 5px;
  }

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

  .pl-phase.pw { background: var(--whis-bg); border-color: var(--whis-border); }
  .pl-phase.pw .pl-phase-badge { background: var(--whis-bg); color: var(--whis-bright); border: 1px solid var(--whis-border); }
  .pl-phase.pw .pl-tool { border-color: rgba(168,85,247,0.15); }
  .pl-phase.pw .pl-skip { border-left-color: var(--whis); }

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
  .pl-gate-icon.whis-icon {
    background: var(--whis-bg); border-color: var(--whis-border);
    color: var(--whis-bright);
  }
  .pl-gate strong { color: var(--text); font-weight: 600; }

  .pl-output {
    position: relative; z-index: 2; width: 100%;
    border-radius: var(--radius); background: var(--surface);
    border: 1.5px solid var(--border); padding: 20px;
    box-shadow: 0 0 24px var(--accent-glow);
  }
  .pl-output.whis-output {
    border-color: var(--whis-border);
    box-shadow: 0 0 24px var(--whis-glow);
  }
  .pl-output-title {
    font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.1em; color: var(--accent); margin-bottom: 14px;
  }
  .pl-output-title.whis-title { color: var(--whis-bright); }
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

  /* Whis-specific */
  .whis-trigger-box {
    position: relative; z-index: 2; width: 100%;
    border-radius: 8px; background: var(--whis-bg2);
    border: 1px solid var(--whis-border); padding: 14px 16px;
    font-size: 12px; color: var(--text-muted);
  }
  .whis-trigger-box .wtb-label {
    font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--whis-bright); margin-bottom: 8px;
  }
  .whis-trigger-box ul {
    list-style: none; display: flex; flex-direction: column; gap: 5px;
  }
  .whis-trigger-box ul li::before {
    content: '→ '; color: var(--whis-bright); font-weight: 700;
  }

  .whis-build-grid {
    display: flex; flex-direction: column; gap: 12px; width: 100%;
    position: relative; z-index: 2;
  }
  .whis-build-item {
    background: var(--surface); border: 1px solid var(--border-soft);
    border-radius: 10px; padding: 14px 16px;
    display: flex; gap: 14px; align-items: flex-start;
  }
  .wbi-badge {
    flex-shrink: 0; width: 36px; height: 36px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 800; letter-spacing: -0.02em;
  }
  .wbi-content { flex: 1; }
  .wbi-title { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 3px; }
  .wbi-desc { font-size: 11px; color: var(--text-muted); line-height: 1.5; }
  .wbi-timeline {
    font-size: 10px; font-weight: 600; letter-spacing: 0.06em;
    text-transform: uppercase; margin-top: 5px; color: var(--text-dim);
  }
  .wbi-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 7px; }
  .wbi-tag {
    font-size: 9.5px; font-weight: 600; padding: 2px 7px; border-radius: 4px;
    background: var(--surface2); border: 1px solid var(--border-soft);
    color: var(--text-muted);
  }
  .wbi-tag.ready { border-color: rgba(52,211,153,0.3); color: #34d399; background: rgba(52,211,153,0.06); }
  .wbi-tag.soon { border-color: rgba(251,146,60,0.3); color: #fb923c; background: rgba(251,146,60,0.06); }
  .wbi-tag.later { border-color: rgba(168,85,247,0.3); color: var(--whis-bright); background: var(--whis-bg2); }
  .wbi-tag.gray-area { border-color: rgba(248,113,113,0.3); color: #f87171; background: rgba(248,113,113,0.06); }

  .whis-capability-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
    position: relative; z-index: 2; width: 100%;
  }
  .wcap-item {
    background: var(--surface); border: 1px solid var(--whis-border);
    border-radius: 10px; padding: 14px 16px;
  }
  .wcap-icon { font-size: 20px; margin-bottom: 6px; }
  .wcap-title { font-size: 12px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
  .wcap-desc { font-size: 11px; color: var(--text-muted); line-height: 1.5; }

  .whis-section-label {
    font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--whis-bright); margin-bottom: 12px;
    position: relative; z-index: 2; width: 100%; padding-bottom: 8px;
    border-bottom: 1px solid var(--whis-border);
  }

  .pl-footnote {
    margin-top: 48px; text-align: center; font-size: 11px;
    color: var(--text-dim); line-height: 1.7;
  }

  @media (max-width: 520px) {
    body.pipeline-page { padding: 32px 16px 60px; }
    .pl-tools { grid-template-columns: 1fr; }
    .pl-output-grid { grid-template-columns: 1fr 1fr; }
    .pl-legend { gap: 7px; }
    .whis-capability-grid { grid-template-columns: 1fr; }
    .pl-tabs { flex-direction: column; }
  }
`

function WaterfallTab() {
  return (
    <>
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
    </>
  )
}

function WhisTab() {
  return (
    <>
      <header className="pl-header">
        <div className="pl-eyebrow whis-eye">
          <span className="pl-eyebrow-dot whis-dot" />
          Identity Resolution Agent · In Design
        </div>
        <h1 className="pl-h1"><span className="whis-name">Whis</span></h1>
        <p className="pl-subtitle">
          When the enrichment waterfall exhausts every API and identity is still uncertain, Whis takes over — an autonomous agent that does the investigative work APIs can&apos;t: cross-referencing signals, reversing identities, and surfacing the real person behind an alias or burner email.
        </p>
      </header>

      <div className="pl-pipeline">
        <div className="pl-spine whis-spine">
          <div className="pl-spine-dot whis-spine-dot" />
          <div className="pl-spine-dot whis-spine-dot" />
          <div className="pl-spine-dot whis-spine-dot" />
        </div>

        {/* Entry: After waterfall */}
        <div className="pl-node whis-entry">
          <div className="pl-node-label whis-label">Handoff</div>
          Enrichment Waterfall Complete
        </div>

        <div className="pl-connector"><div className="pl-arrow" /></div>

        {/* Trigger gate */}
        <div className="pl-gate">
          <div className="pl-gate-icon whis-icon">◈</div>
          <div>
            <strong>Confidence Gate</strong> — Whis only activates when the waterfall&apos;s output falls below threshold: confidence score &lt; 60%, or missing both a real name and a company. Full profiles skip Whis entirely — no cost, no delay.
          </div>
        </div>

        <div className="pl-connector"><div className="pl-arrow" /></div>

        {/* What Whis is given */}
        <div className="whis-trigger-box">
          <div className="wtb-label">What Whis receives from the waterfall</div>
          <ul>
            <li>Raw opt-in data: name (possibly alias), email, phone, source</li>
            <li>All enriched signals collected so far (partial or conflicting)</li>
            <li>A confidence score and list of which fields are still missing</li>
            <li>The original form payload including device hints, UTM data, IP</li>
          </ul>
        </div>

        <div className="pl-connector"><div className="pl-arrow" /></div>

        {/* Phase W1 */}
        <div className="pl-phase pw">
          <div className="pl-phase-header">
            <span className="pl-phase-badge">Step 1</span>
            <span className="pl-phase-title">Web Intelligence Search</span>
            <span className="pl-phase-meta">Cheapest first</span>
          </div>
          <div className="pl-phase-body">
            <div className="pl-skip">Whis first tries the cheapest path: searching the open web for the combination of name + email, name + phone, or email alone. Small cost ($0.001–0.005 per search), high discovery rate for public figures and business owners.</div>
            <div className="pl-tools">
              <div className="pl-tool">
                <div className="pl-tool-tag" style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}>Phase 1 · MVP</div>
                <div className="pl-tool-name">Web Search API</div>
                <div className="pl-tool-desc">Search &quot;bart clay bart.random@gmail.com&quot; — surfaces LinkedIn profiles, company pages, news mentions, social accounts linked to that identity</div>
              </div>
              <div className="pl-tool">
                <div className="pl-tool-tag" style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}>Phase 1 · MVP</div>
                <div className="pl-tool-name">Email → LinkedIn</div>
                <div className="pl-tool-desc">Even a Gmail address can be matched to a LinkedIn profile via Google&apos;s own index — Whis searches &quot;site:linkedin.com bart clay merchant services&quot; with known partial signals</div>
              </div>
            </div>
          </div>
        </div>

        <div className="pl-connector"><div className="pl-arrow" /></div>

        {/* Phase W2 */}
        <div className="pl-phase pw">
          <div className="pl-phase-header">
            <span className="pl-phase-badge">Step 2</span>
            <span className="pl-phase-title">Reverse Identity Lookup</span>
            <span className="pl-phase-meta">Core dirty work</span>
          </div>
          <div className="pl-phase-body">
            <div className="pl-skip">Given any identity signal — email, phone, or IP — Whis runs reverse lookups to find the real owner. This is the step where an alias email resolves to a real name, and a burner phone reveals a carrier and region that narrows the match.</div>
            <div className="pl-tools">
              <div className="pl-tool">
                <div className="pl-tool-tag" style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}>Phase 1 · MVP</div>
                <div className="pl-tool-name">Email Reverse (FullContact)</div>
                <div className="pl-tool-desc">Email → real name, location, social profiles, employer. Works on personal Gmail/Yahoo too — built on aggregated opt-in data. Most reliable identity pivot available.</div>
              </div>
              <div className="pl-tool">
                <div className="pl-tool-tag" style={{ background: 'rgba(251,146,60,0.1)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.25)' }}>Phase 2</div>
                <div className="pl-tool-name">Phone Reverse (Twilio Lookup)</div>
                <div className="pl-tool-desc">Phone → carrier, line type (cell/VoIP/landline), caller name (CNAM). CNAM lookup returns the registered name on the line — often the real owner even if a fake name was given at opt-in.</div>
              </div>
              <div className="pl-tool">
                <div className="pl-tool-tag" style={{ background: 'rgba(251,146,60,0.1)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.25)' }}>Phase 2</div>
                <div className="pl-tool-name">Email Breach Cross-Reference</div>
                <div className="pl-tool-desc">Checks if the email appears in known breach datasets. Breach records often contain a real name, location, or other accounts linked to the same person — revealing the identity behind an alias address.</div>
              </div>
              <div className="pl-tool">
                <div className="pl-tool-tag" style={{ background: 'rgba(168,85,247,0.1)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.25)' }}>Phase 3</div>
                <div className="pl-tool-name">IP → Identity (IPInfo + Clearbit)</div>
                <div className="pl-tool-desc">If the form submission IP is available, resolve it to company, ISP, and region. A corporate IP reveals the employer immediately. A residential ISP narrows the search radius to a city or zip code.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="pl-connector"><div className="pl-arrow" /></div>

        {/* Phase W3 */}
        <div className="pl-phase pw">
          <div className="pl-phase-header">
            <span className="pl-phase-badge">Step 3</span>
            <span className="pl-phase-title">Social Graph &amp; Cross-Account Matching</span>
            <span className="pl-phase-meta">Deep linking</span>
          </div>
          <div className="pl-phase-body">
            <div className="pl-skip">Once a real name or LinkedIn URL is surfaced from Steps 1–2, Whis cross-references it against every other signal to build a unified identity. This step finds the real professional profile behind an alias and matches scattered data points into a single person.</div>
            <div className="pl-tools">
              <div className="pl-tool">
                <div className="pl-tool-tag" style={{ background: 'rgba(251,146,60,0.1)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.25)' }}>Phase 2</div>
                <div className="pl-tool-name">LinkedIn via Real Name</div>
                <div className="pl-tool-desc">Once a real name is known, Proxycurl or PhantomBuster retrieves the LinkedIn profile — title, company, location, employment history. This is the same data Apollo provides but available even when Apollo found nothing.</div>
              </div>
              <div className="pl-tool">
                <div className="pl-tool-tag" style={{ background: 'rgba(251,146,60,0.1)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.25)' }}>Phase 2</div>
                <div className="pl-tool-name">Email Pattern Matching</div>
                <div className="pl-tool-desc">If the company domain is now known, Whis derives the likely work email (first.last@company.com, f.last@..., etc.) and runs it through Hunter or Findymail to confirm. Bridges the gap between a personal Gmail and the work identity.</div>
              </div>
              <div className="pl-tool">
                <div className="pl-tool-tag" style={{ background: 'rgba(168,85,247,0.1)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.25)' }}>Phase 3</div>
                <div className="pl-tool-name">Facebook Pixel Match (Meta CAPI)</div>
                <div className="pl-tool-desc">If the lead came from a Facebook ad, the pixel may have a hashed identity. Meta&apos;s Conversions API can match the event back to a Facebook profile — real name, location, and demographic data even when a fake name was entered at opt-in.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="pl-connector"><div className="pl-arrow" /></div>

        {/* Phase W4 - Browser */}
        <div className="pl-phase pw">
          <div className="pl-phase-header">
            <span className="pl-phase-badge">Step 4</span>
            <span className="pl-phase-title">Browser Agent (Last Resort)</span>
            <span className="pl-phase-meta">Only when Steps 1–3 fail</span>
          </div>
          <div className="pl-phase-body">
            <div className="pl-skip">A headless Playwright browser is the nuclear option — slow (~8–15 seconds), expensive relative to API calls, and only triggered when the lead still lacks an identity after all prior steps. Useful for high-value leads where getting the identity right is worth the cost.</div>
            <div className="pl-tools">
              <div className="pl-tool">
                <div className="pl-tool-tag" style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}>Phase 4 · ToS Gray Area</div>
                <div className="pl-tool-name">LinkedIn People Search</div>
                <div className="pl-tool-desc">Browses LinkedIn&apos;s people search with the name + location + industry signals. Extracts profile data including headline, current company, and connection count without requiring the target&apos;s LinkedIn URL.</div>
              </div>
              <div className="pl-tool">
                <div className="pl-tool-tag" style={{ background: 'rgba(168,85,247,0.1)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.25)' }}>Phase 3</div>
                <div className="pl-tool-name">Company Site Scrape</div>
                <div className="pl-tool-desc">If a company domain is known, browses the team/about page to find the person by name — pulling title, headshot, bio, and any social links listed publicly. Works for most SMBs and agencies.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="pl-connector"><div className="pl-arrow" /></div>

        {/* AI Merge */}
        <div className="pl-phase pw">
          <div className="pl-phase-header">
            <span className="pl-phase-badge">Final Step</span>
            <span className="pl-phase-title">AI Merge &amp; Re-Assignment</span>
            <span className="pl-phase-meta">Always runs</span>
          </div>
          <div className="pl-phase-body">
            <div className="pl-skip">Whis sends all findings to the AI with the original enriched data and asks it to reconcile conflicts, score confidence on each field, and produce a unified identity record. The updated record then re-runs through persona assignment with a much richer dataset.</div>
            <div className="pl-tools">
              <div className="pl-tool">
                <div className="pl-tool-name">Identity Reconciliation</div>
                <div className="pl-tool-desc">AI merges conflicting signals — if Step 1 says &quot;Bart Clay, ISO Agent&quot; and Step 2 says &quot;CNAM: B CLAY, TX&quot; and Step 3 says LinkedIn shows &quot;Bart Clay, Merchant Services Rep, Houston&quot;, it confirms the identity and updates all fields</div>
              </div>
              <div className="pl-tool">
                <div className="pl-tool-name">Confidence Scoring</div>
                <div className="pl-tool-desc">Every field gets a confidence score (0–100). Fields confirmed by multiple independent sources score high. Fields from a single source or that conflict score low. The lead record stores both the value and the confidence.</div>
              </div>
              <div className="pl-tool">
                <div className="pl-tool-name">Persona Re-Assignment</div>
                <div className="pl-tool-desc">With a richer profile, persona matching is re-run. A lead that was &quot;no match&quot; from incomplete data often resolves to a clear persona once Whis confirms the identity and industry.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="pl-connector"><div className="pl-arrow" /></div>

        {/* Output */}
        <div className="pl-output whis-output">
          <div className="pl-output-title whis-title">Whis Output — What Gets Updated</div>
          <div className="pl-output-grid">
            {[
              { icon: '🔍', label: 'Resolved Identity', sub: 'Real name, verified email, confirmed company — even when the lead opted in with an alias' },
              { icon: '📊', label: 'Confidence Map', sub: 'Per-field confidence scores so downstream systems know which data to trust' },
              { icon: '🔄', label: 'Updated Persona', sub: 'Persona re-assigned with the enriched identity — leads that were previously unmatched now route correctly' },
              { icon: '📋', label: 'Whis Audit Trail', sub: 'Full log of which steps ran, what each found, and how the final identity was determined' },
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
        <div className="pl-node whis-complete">
          <div className="pl-node-label whis-label">Complete</div>
          Identity resolved &amp; re-routed
        </div>
      </div>

      {/* Build Plan */}
      <div style={{ marginTop: '56px' }}>
        <div className="whis-section-label">Build Checklist &amp; Timeline</div>
        <div className="whis-build-grid">
          {[
            {
              num: '01',
              phase: 'Phase 1 · MVP',
              title: 'Core Agent Loop + Web Search + Email Reverse',
              desc: 'Build the agent scaffolding (async loop, tool dispatcher, result merger), wire up a web search API (Serper or Brave — ~$5/mo), and integrate FullContact email reverse. This alone resolves ~40% of alias identities. Triggered by confidence threshold on enriched leads.',
              timeline: '1–2 weeks',
              tags: [{ label: 'ready', text: 'Buildable Now' }, { label: 'ready', text: 'Low Cost' }],
            },
            {
              num: '02',
              phase: 'Phase 2',
              title: 'Phone Reverse + LinkedIn via Real Name + Email Pattern Match',
              desc: 'Add Twilio CNAM lookup ($0.004/call), LinkedIn enrichment via Proxycurl (~$0.01/profile), and work email derivation using known domain patterns. Phase 2 combined with Phase 1 resolves ~75% of previously unidentified leads.',
              timeline: '2–4 weeks from Phase 1',
              tags: [{ label: 'soon', text: 'Phase 2' }, { label: 'ready', text: 'API-based' }],
            },
            {
              num: '03',
              phase: 'Phase 3',
              title: 'IP Resolution + Meta CAPI Match + Company Page Scrape',
              desc: 'Pull company from IP using IPInfo ($99/mo for 50k lookups). For Facebook-sourced leads, use Meta Conversions API to match the opt-in event to a hashed identity. Add Playwright-based company site scraping as a targeted fallback for known domains.',
              timeline: '1–2 months from Phase 1',
              tags: [{ label: 'later', text: 'Phase 3' }, { label: 'ready', text: 'Meta CAPI Needs Setup' }],
            },
            {
              num: '04',
              phase: 'Phase 4 · Advanced',
              title: 'Browser Agent + LinkedIn People Search + Breach Cross-Reference',
              desc: 'Full headless Playwright agent that can browse LinkedIn search, scroll company team pages, and extract identity signals from the live web. Breach data cross-reference adds another layer but requires a data partner agreement. This phase handles the remaining hard cases.',
              timeline: '2–3 months from Phase 1',
              tags: [{ label: 'later', text: 'Phase 4' }, { label: 'gray-area', text: 'ToS Considerations' }],
            },
            {
              num: '05',
              phase: 'Monetization',
              title: 'Per-Account Gating — Whis as a Premium Add-On',
              desc: 'Whis runs additional API calls per lead that have real cost. Sub-accounts should not get it free. Options: credit-based (each Whis run costs N credits), subscription tier (Pro plan includes Whis), or pay-as-you-go per resolved identity. Architecture already supports per-account feature flags via agency_settings.',
              timeline: 'Design before Phase 1 ships',
              tags: [{ label: 'soon', text: 'Revenue Opportunity' }, { label: 'ready', text: 'Infra Ready' }],
            },
          ].map((item) => (
            <div key={item.num} className="whis-build-item">
              <div className="wbi-badge" style={{ background: 'var(--whis-bg)', border: '1px solid var(--whis-border)', color: 'var(--whis-bright)' }}>
                {item.num}
              </div>
              <div className="wbi-content">
                <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--whis-bright)', marginBottom: '3px' }}>{item.phase}</div>
                <div className="wbi-title">{item.title}</div>
                <div className="wbi-desc">{item.desc}</div>
                <div className="wbi-timeline">⏱ {item.timeline}</div>
                <div className="wbi-tags">
                  {item.tags.map((t) => (
                    <span key={t.text} className={`wbi-tag ${t.label}`}>{t.text}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* What to expect */}
      <div style={{ marginTop: '48px' }}>
        <div className="whis-section-label">What to Expect</div>
        <div className="whis-capability-grid">
          {[
            { icon: '🎭', title: 'Alias Detection', desc: 'Bart Clay using bart.random99@gmail.com — Whis finds the real email, LinkedIn, and employer from the alias alone.' },
            { icon: '📱', title: 'Phone Owner Reveal', desc: 'CNAM lookup returns the registered name on any US cell or landline. Works even when a fake name was submitted.' },
            { icon: '🌐', title: 'IP → Company', desc: 'Corporate IP or VPN with a known exit node reveals the employer before the lead even gives their name.' },
            { icon: '🔗', title: 'Cross-Account Link', desc: 'Finds the LinkedIn, Twitter, or company profile that shares the same identity as the alias email.' },
            { icon: '📈', title: 'Confidence Scoring', desc: 'Every field is tagged with how certain Whis is. High-confidence data goes to CRM; low-confidence is flagged for review.' },
            { icon: '⏱', title: 'Fully Async', desc: 'Whis runs in the background after the webhook returns. No delay in the lead&apos;s funnel experience. Results update the lead record silently.' },
            { icon: '💰', title: 'Cost-Controlled', desc: 'Steps run in cost order — cheapest first. Whis stops as soon as identity is confirmed with sufficient confidence, skipping remaining steps.' },
            { icon: '📋', title: 'Full Audit Trail', desc: 'Every step Whis takes is logged — what tool ran, what it found, and why Whis accepted or rejected the finding.' },
          ].map((item) => (
            <div key={item.title} className="wcap-item">
              <div className="wcap-icon">{item.icon}</div>
              <div className="wcap-title">{item.title}</div>
              <div className="wcap-desc">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="pl-footnote">
        Whis is designed for the hardest cases — leads with alias emails, partial names, or no LinkedIn URL.<br />
        It activates only when the standard waterfall can&apos;t produce a confident identity, keeping costs minimal.
      </div>
    </>
  )
}

export default function PipelinePage() {
  const [activeTab, setActiveTab] = useState<'waterfall' | 'whis'>('waterfall')

  return (
    <>
      <style>{SHARED_CSS}</style>
      <body className="pipeline-page">
        <div className="pl-page">
          {/* Tab bar */}
          <nav className="pl-tabs">
            <button
              type="button"
              className={`pl-tab ${activeTab === 'waterfall' ? 'active-waterfall' : ''}`}
              onClick={() => setActiveTab('waterfall')}
            >
              <span className="pl-tab-dot" style={{ background: activeTab === 'waterfall' ? '#fff' : '#6366f1' }} />
              Enrichment Waterfall
            </button>
            <button
              type="button"
              className={`pl-tab ${activeTab === 'whis' ? 'active-whis' : ''}`}
              onClick={() => setActiveTab('whis')}
            >
              <span className="pl-tab-dot" style={{ background: activeTab === 'whis' ? '#fff' : '#a855f7' }} />
              Whis · Identity Agent
            </button>
          </nav>

          {activeTab === 'waterfall' ? <WaterfallTab /> : <WhisTab />}
        </div>
      </body>
    </>
  )
}
