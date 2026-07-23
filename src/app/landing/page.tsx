import type { Metadata } from 'next'
import './landing.css'

export const metadata: Metadata = {
  title: 'Lead Router — AI-Powered Lead Routing for HighLevel',
  description:
    'Automatically enrich, qualify, and route every inbound lead in under 60 seconds. Powered by Apollo, Lusha, and your choice of AI model.',
}

export default function LandingPage() {
  return (
    <div className="landing-page">
      {/* ── TOP BAR ── */}
      <nav className="lp-topbar">
        <div className="lp-wrap lp-topbar-inner">
          <a className="lp-logo" href="#">
            <div className="lp-logo-dot">⚡</div>
            Lead Router
          </a>
          <nav className="lp-topbar-nav">
            <a href="#problem">Problem</a>
            <a href="#how">How It Works</a>
            <a href="#features">Features</a>
            <a href="#install">Setup</a>
          </nav>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div className="lp-hero">
        <div className="lp-hero-grid" />
        <div className="lp-hero-glow" />
        <div className="lp-wrap lp-hero-content">
          <div className="lp-eyebrow">
            <div className="lp-eyebrow-dot" />
            AI-Powered Lead Intelligence
          </div>
          <h1>Every lead, <em>qualified</em><br />in under 60 seconds.</h1>
          <p className="lp-hero-sub">
            Lead Router enriches every inbound lead with real company and professional data, matches them
            to your ideal buyer personas, and fires the right HighLevel workflow — automatically, on every channel.
          </p>
          <div className="lp-channel-row">
            <div className="lp-channel-pill"><div className="lp-dot lp-dot-main" />LinkedIn / Main</div>
            <div className="lp-channel-pill"><div className="lp-dot lp-dot-fb" />Facebook Ads</div>
            <div className="lp-channel-pill"><div className="lp-dot lp-dot-gg" />Google Ads</div>
            <div className="lp-channel-pill"><div className="lp-dot lp-dot-nu" />Nurture Pipeline</div>
            <div className="lp-channel-pill dashed">+ custom channels</div>
          </div>
          <div className="lp-hero-stats">
            <div>
              <div className="lp-stat-num"><span>2</span> data sources</div>
              <div className="lp-stat-label">Apollo.io + Lusha enrichment</div>
            </div>
            <div>
              <div className="lp-stat-num"><span>4</span> AI providers</div>
              <div className="lp-stat-label">Gemini · OpenAI · Anthropic · OpenRouter</div>
            </div>
            <div>
              <div className="lp-stat-num">One-click</div>
              <div className="lp-stat-label">HL workflow trigger per persona</div>
            </div>
            <div>
              <div className="lp-stat-num"><span>&lt;60s</span></div>
              <div className="lp-stat-label">Lead enriched and routed</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PROBLEM ── */}
      <section id="problem" className="lp-section">
        <div className="lp-wrap">
          <div className="lp-section-eyebrow">The Problem</div>
          <h2>Leads come in raw.<br />Your team pays the price.</h2>
          <p className="lp-section-intro">
            Ad platforms deliver form fills — not context. Without knowing who a lead actually is,
            your team guesses, misroutes, and loses deals to slower follow-up.
          </p>
          <div className="lp-problem-grid">
            <div className="lp-problem-card">
              <div className="lp-problem-icon">🎯</div>
              <div className="lp-problem-title">No qualification at the door</div>
              <div className="lp-problem-body">You receive a name, email, and phone. Nothing tells you if this person fits your ideal buyer profile or which salesperson should own them.</div>
            </div>
            <div className="lp-problem-card">
              <div className="lp-problem-icon">⏳</div>
              <div className="lp-problem-title">Manual research wastes hours</div>
              <div className="lp-problem-body">Someone has to look up the company, check LinkedIn, figure out the title, and decide which workflow to trigger. By then, the lead has gone cold.</div>
            </div>
            <div className="lp-problem-card">
              <div className="lp-problem-icon">📭</div>
              <div className="lp-problem-title">Wrong people notified</div>
              <div className="lp-problem-body">A Facebook lead that belongs to your SMB team fires the enterprise workflow. A high-value LinkedIn lead sits unrouted for two days. Notifications go to everyone or no one.</div>
            </div>
            <div className="lp-problem-card">
              <div className="lp-problem-icon">🔀</div>
              <div className="lp-problem-title">Channels bleed into each other</div>
              <div className="lp-problem-body">LinkedIn leads and Facebook leads require different playbooks. One CRM pipeline handles everything, so nothing gets the right treatment.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="lp-section">
        <div className="lp-wrap">
          <div className="lp-section-eyebrow">How It Works</div>
          <h2>Six steps. Zero manual work.</h2>
          <p className="lp-section-intro">
            A lead hits your ad form and the entire qualification-and-routing pipeline runs automatically in the background.
          </p>
          <div className="lp-flow-wrapper">
            <div className="lp-flow">
              <div className="lp-flow-node">
                <div className="lp-flow-icon-wrap">📋</div>
                <div className="lp-flow-step">Step 1</div>
                <div className="lp-flow-label">Lead Submits Form</div>
                <div className="lp-flow-sub">Facebook, LinkedIn, Google Ads, or any HL form</div>
                <div className="lp-flow-connector-dot" />
              </div>
              <div className="lp-flow-node">
                <div className="lp-flow-icon-wrap">🔗</div>
                <div className="lp-flow-step">Step 2</div>
                <div className="lp-flow-label">Webhook Fires</div>
                <div className="lp-flow-sub">HighLevel sends the payload to your channel URL</div>
                <div className="lp-flow-connector-dot" />
              </div>
              <div className="lp-flow-node">
                <div className="lp-flow-icon-wrap ai">🔬</div>
                <div className="lp-flow-step">Step 3</div>
                <div className="lp-flow-label">AI Enrichment</div>
                <div className="lp-flow-sub">Apollo + Lusha pull company, title, LinkedIn, phone</div>
                <div className="lp-flow-connector-dot" />
              </div>
              <div className="lp-flow-node">
                <div className="lp-flow-icon-wrap ai">🧠</div>
                <div className="lp-flow-step">Step 4</div>
                <div className="lp-flow-label">Persona Match</div>
                <div className="lp-flow-sub">AI assigns lead to closest buyer persona</div>
                <div className="lp-flow-connector-dot" />
              </div>
              <div className="lp-flow-node">
                <div className="lp-flow-icon-wrap accent">⚡</div>
                <div className="lp-flow-step">Step 5</div>
                <div className="lp-flow-label">HL Workflow Fires</div>
                <div className="lp-flow-sub">The right automation triggers for that persona</div>
                <div className="lp-flow-connector-dot" />
              </div>
              <div className="lp-flow-node">
                <div className="lp-flow-icon-wrap accent">📬</div>
                <div className="lp-flow-step">Step 6</div>
                <div className="lp-flow-label">Team Notified</div>
                <div className="lp-flow-sub">Email alert sent to the right people for that channel</div>
              </div>
            </div>
          </div>

          <div className="lp-table-wrap">
            <table className="lp-compare-table">
              <thead>
                <tr>
                  <th>Capability</th>
                  <th>Without Lead Router</th>
                  <th>With Lead Router</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Lead qualification speed</td>
                  <td>Hours of manual research</td>
                  <td><span className="lp-check">✓</span> Under 60 seconds</td>
                </tr>
                <tr>
                  <td>Enriched data (company, title, LinkedIn)</td>
                  <td><span className="lp-cross">✗</span> Manual or not done</td>
                  <td><span className="lp-check">✓</span> Automatic via Apollo + Lusha</td>
                </tr>
                <tr>
                  <td>Per-channel routing &amp; personas</td>
                  <td><span className="lp-cross">✗</span> One CRM pipeline for all</td>
                  <td><span className="lp-check">✓</span> Isolated per channel</td>
                </tr>
                <tr>
                  <td>HL workflow trigger</td>
                  <td><span className="lp-cross">✗</span> Manual or blanket automation</td>
                  <td><span className="lp-check">✓</span> Per-persona, automatic</td>
                </tr>
                <tr>
                  <td>Ad attribution (campaign / ad / form)</td>
                  <td><span className="lp-cross">✗</span> Lost after form submit</td>
                  <td><span className="lp-check">✓</span> Captured and displayed per lead</td>
                </tr>
                <tr>
                  <td>Notification routing</td>
                  <td><span className="lp-cross">✗</span> Everyone or no one</td>
                  <td><span className="lp-check">✓</span> Per-channel, per-persona</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="lp-section">
        <div className="lp-wrap">
          <div className="lp-section-eyebrow">Features</div>
          <h2>Everything your team needs.<br />Nothing they don&apos;t.</h2>
          <p className="lp-section-intro">
            Built specifically for agencies and businesses running paid traffic into HighLevel.
          </p>
          <div className="lp-features-grid">
            <div className="lp-feature-card hl-teal">
              <div className="lp-feat-icon">🧠</div>
              <div className="lp-feat-title">AI Persona Matching</div>
              <div className="lp-feat-body">Define your ideal buyer types in plain language. The AI reads enriched lead data and assigns every lead to the closest persona — or the default fallback if none match.</div>
              <div className="lp-feat-tags">
                <span className="lp-feat-tag">Gemini 2.5</span>
                <span className="lp-feat-tag">GPT-4o</span>
                <span className="lp-feat-tag">Claude</span>
                <span className="lp-feat-tag">OpenRouter</span>
              </div>
            </div>
            <div className="lp-feature-card hl-accent">
              <div className="lp-feat-icon">🔀</div>
              <div className="lp-feat-title">Multi-Channel Pipelines</div>
              <div className="lp-feat-body">Each ad channel gets its own webhook URL, persona set, and notification list. Facebook leads never mix with LinkedIn leads. Every channel runs its own playbook.</div>
              <div className="lp-feat-tags">
                <span className="lp-feat-tag">Facebook Ads</span>
                <span className="lp-feat-tag">LinkedIn</span>
                <span className="lp-feat-tag">Google Ads</span>
                <span className="lp-feat-tag">Nurture</span>
              </div>
            </div>
            <div className="lp-feature-card">
              <div className="lp-feat-icon">🔬</div>
              <div className="lp-feat-title">Deep Lead Enrichment</div>
              <div className="lp-feat-body">Apollo.io provides company data, job title, seniority, and LinkedIn profile. Lusha adds verified direct phone numbers and emails — especially when leads use personal emails on forms.</div>
            </div>
            <div className="lp-feature-card">
              <div className="lp-feat-icon">⚡</div>
              <div className="lp-feat-title">Automatic HL Workflow Trigger</div>
              <div className="lp-feat-body">Each persona has a designated HighLevel workflow ID. The moment a lead is matched, the workflow fires. No manual enrollment, no delays, no missed follow-ups.</div>
            </div>
            <div className="lp-feature-card">
              <div className="lp-feat-icon">📬</div>
              <div className="lp-feat-title">Smart Email Notifications</div>
              <div className="lp-feat-body">Set notification emails per pipeline — not per persona. Every enriched lead on that channel alerts your team. Persona-level emails stack on top for fine-grained routing.</div>
            </div>
            <div className="lp-feature-card">
              <div className="lp-feat-icon">🏷️</div>
              <div className="lp-feat-title">Attribution Tracking</div>
              <div className="lp-feat-body">Captures campaign, ad set, ad ID, UTM parameters, and form name from every HighLevel payload. See exactly which ad generated each lead — visible in the dashboard on every lead card.</div>
            </div>
            <div className="lp-feature-card">
              <div className="lp-feat-icon">✍️</div>
              <div className="lp-feat-title">HL Contact Write-back</div>
              <div className="lp-feat-body">Automatically adds persona name as a contact tag, posts AI reasoning as a contact note, and fills custom fields (Persona, Score, Reasoning) — all from the enrichment result.</div>
            </div>
            <div className="lp-feature-card">
              <div className="lp-feat-icon">📊</div>
              <div className="lp-feat-title">Dashboard &amp; Reporting</div>
              <div className="lp-feat-body">View leads by channel, by persona, and by status. Re-enrich any lead with one click. Attribution data visible per lead. Reports break down volume and assignment rate by pipeline.</div>
            </div>
            <div className="lp-feature-card">
              <div className="lp-feat-icon">🔄</div>
              <div className="lp-feat-title">Re-enrichment</div>
              <div className="lp-feat-body">Any lead can be re-enriched on demand. The system pulls fresh Apollo and Lusha data, re-runs persona matching, and backfills attribution from the original payload — even for old leads.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── INSTALL ── */}
      <section id="install" className="lp-section">
        <div className="lp-wrap">
          <div className="lp-section-eyebrow">Installation</div>
          <h2>Up and routing in<br />under 15 minutes.</h2>
          <p className="lp-section-intro">
            No developer required. No custom code. Three configuration steps and leads start flowing automatically.
          </p>
          <div className="lp-install-steps">
            <div className="lp-install-step">
              <div className="lp-step-line" />
              <div className="lp-step-num">1</div>
              <div>
                <div className="lp-step-title">Add your API keys</div>
                <div className="lp-step-desc">In Settings, paste your Apollo.io key, HighLevel Private Integration key and Location ID, and your AI model key. Optionally add Lusha for richer phone data and Postmark for email alerts.</div>
                <div className="lp-step-details">
                  <div className="lp-step-detail"><span className="lp-step-detail-icon">🔑</span>Apollo.io</div>
                  <div className="lp-step-detail"><span className="lp-step-detail-icon">🔑</span>HighLevel + Location ID</div>
                  <div className="lp-step-detail"><span className="lp-step-detail-icon">🔑</span>AI Provider (Gemini / OpenAI / Claude)</div>
                  <div className="lp-step-detail"><span className="lp-step-detail-icon">🔑</span>Lusha (optional)</div>
                  <div className="lp-step-detail"><span className="lp-step-detail-icon">📧</span>Postmark (optional)</div>
                </div>
              </div>
            </div>
            <div className="lp-install-step">
              <div className="lp-step-line" />
              <div className="lp-step-num">2</div>
              <div>
                <div className="lp-step-title">Define your buyer personas</div>
                <div className="lp-step-desc">Create one persona per ideal buyer type. Write a plain-language description of who they are, what they want, and what signals identify them. Assign a HighLevel workflow ID to each one. Set a default persona as a catch-all.</div>
                <div className="lp-step-details">
                  <div className="lp-step-detail"><span className="lp-step-detail-icon">👤</span>Name &amp; description</div>
                  <div className="lp-step-detail"><span className="lp-step-detail-icon">⚡</span>HL Workflow ID</div>
                  <div className="lp-step-detail"><span className="lp-step-detail-icon">🎯</span>Default fallback persona</div>
                </div>
              </div>
            </div>
            <div className="lp-install-step">
              <div className="lp-step-num">3</div>
              <div>
                <div className="lp-step-title">Copy the webhook URL into HighLevel</div>
                <div className="lp-step-desc">Each channel has its own URL in the Settings page. Copy it and paste it into your HighLevel workflow as the &quot;Send Webhook&quot; action — or directly into your Facebook Lead Ads setup. That&apos;s it. Leads start routing automatically.</div>
                <div className="lp-step-details">
                  <div className="lp-step-detail"><span className="lp-step-detail-icon">📋</span>One URL per channel</div>
                  <div className="lp-step-detail"><span className="lp-step-detail-icon">🔒</span>Secret token in URL for security</div>
                  <div className="lp-step-detail"><span className="lp-step-detail-icon">✅</span>Live within minutes</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── AGENCY ── */}
      <section className="lp-section">
        <div className="lp-wrap">
          <div className="lp-section-eyebrow">Built for Agencies</div>
          <h2>Run it across all<br />your client accounts.</h2>
          <p className="lp-section-intro">
            Lead Router is multi-tenant from the ground up. One agency dashboard manages every client,
            each with their own isolated configuration, leads, personas, and data.
          </p>
          <div className="lp-agency-cards">
            <div className="lp-agency-card">
              <div className="lp-agency-card-icon">🏢</div>
              <div className="lp-agency-card-title">Per-Account Isolation</div>
              <div className="lp-agency-card-body">Every client account has its own API keys, pipelines, personas, leads, and webhook URLs. Nothing bleeds between clients.</div>
            </div>
            <div className="lp-agency-card">
              <div className="lp-agency-card-icon">👥</div>
              <div className="lp-agency-card-title">Role-Based Access</div>
              <div className="lp-agency-card-body">Agency admins see all accounts. Sub-account users see only their own data. Access is enforced at the database level.</div>
            </div>
            <div className="lp-agency-card">
              <div className="lp-agency-card-icon">📦</div>
              <div className="lp-agency-card-title">Persona Library</div>
              <div className="lp-agency-card-body">Build a shared library of persona templates at the agency level. Deploy proven buyer profiles to any client account with one click.</div>
            </div>
            <div className="lp-agency-card">
              <div className="lp-agency-card-icon">🤖</div>
              <div className="lp-agency-card-title">AI Persona Generator</div>
              <div className="lp-agency-card-body">Enable AI-assisted persona creation per account. Describe the target audience and the AI writes the full persona profile automatically.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-wrap">
          <div className="lp-footer-logo">
            <div className="lp-footer-logo-dot">⚡</div>
            Lead Router
          </div>
          <div className="lp-footer-sub">AI-powered lead enrichment &amp; persona routing for HighLevel</div>
        </div>
      </footer>
    </div>
  )
}
