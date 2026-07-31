'use client'

import { useState, useEffect, useCallback } from 'react'

// ── Tool definitions ──────────────────────────────────────────────────────────

const REQUIRED_TOOLS = ['apollo', 'enrow'] as const

interface ToolDef {
  name: string
  description: string
  pack: 'profile' | 'phone' | 'email'
  phase: string
  hitRate: number   // fraction of leads this tool actually runs on (waterfall effect)
  avgCostWhenRun: number  // cost per call when the tool does run
}

const TOOL_DEFS: Record<string, ToolDef> = {
  pdl: {
    name: 'People Data Labs',
    description: '1.5B+ profiles — strongest for SMBs, independents, and gig workers Apollo often misses.',
    pack: 'profile', phase: 'Phase 2', hitRate: 0.30, avgCostWhenRun: 0.04,
  },
  datagma: {
    name: 'Datagma',
    description: 'LinkedIn-native — extracts mobile phones directly from LinkedIn profiles. Requires LinkedIn URL.',
    pack: 'profile', phase: 'Phase 2', hitRate: 0.50, avgCostWhenRun: 0.18,
  },
  lusha: {
    name: 'Lusha',
    description: 'Best-in-class direct dials and personal mobiles. Premium cost but unmatched phone quality.',
    pack: 'phone', phase: 'Phase 1b', hitRate: 0.60, avgCostWhenRun: 0.45,
  },
  bettercontact: {
    name: 'BetterContact',
    description: 'Aggregates 15+ phone data sources in a single call — highest overall coverage for phone recovery.',
    pack: 'phone', phase: 'Phase 3', hitRate: 0.35, avgCostWhenRun: 0.22,
  },
  kaspr: {
    name: 'Kaspr',
    description: 'Specialized in LinkedIn-sourced mobiles. Strong EU + North American coverage.',
    pack: 'phone', phase: 'Phase 3', hitRate: 0.20, avgCostWhenRun: 0.18,
  },
  cognism: {
    name: 'Cognism',
    description: 'GDPR-compliant B2B data. Best UK and EMEA phone coverage. Good for European leads.',
    pack: 'phone', phase: 'Phase 3', hitRate: 0.15, avgCostWhenRun: 0.22,
  },
  contactout: {
    name: 'ContactOut',
    description: 'Aggregates emails from multiple sources. Work + personal email with confidence scores.',
    pack: 'email', phase: 'Phase 4', hitRate: 0.30, avgCostWhenRun: 0.12,
  },
  hunter: {
    name: 'Hunter.io',
    description: 'Pattern-matches company email formats. Very reliable for corporate domains.',
    pack: 'email', phase: 'Phase 4', hitRate: 0.25, avgCostWhenRun: 0.04,
  },
  dropcontact: {
    name: 'Dropcontact',
    description: 'GDPR-native (France) — generates and verifies work emails from name + company.',
    pack: 'email', phase: 'Phase 4', hitRate: 0.20, avgCostWhenRun: 0.08,
  },
  findymail: {
    name: 'Findymail',
    description: 'SMTP-verifies before returning — only sends back emails that will actually deliver.',
    pack: 'email', phase: 'Phase 4', hitRate: 0.12, avgCostWhenRun: 0.08,
  },
}

// Cost of required tools (always on)
const BASE_COST = 0.035 + 0.006  // apollo + enrow (avg)

// ── Bundle presets ────────────────────────────────────────────────────────────

export type BundlePreset = 'identity_only' | 'contact_builder' | 'phone_focus' | 'email_focus' | 'eu_gdpr' | 'full_waterfall' | 'custom'

interface Bundle {
  name: string
  description: string
  tools: string[]
  badge?: string
  costLow: number
  costHigh: number
}

const BUNDLES: Record<Exclude<BundlePreset, 'custom'>, Bundle> = {
  identity_only: {
    name: 'Identity Only',
    description: 'Just Apollo + email verification. Basic profile, no phone or work email recovery.',
    tools: [],
    costLow: 0.03, costHigh: 0.05,
  },
  contact_builder: {
    name: 'Contact Builder',
    description: 'Best all-around for B2B outreach — profile depth, phone recovery, and work email finder.',
    tools: ['pdl', 'bettercontact', 'contactout', 'hunter'],
    badge: 'Most Popular',
    costLow: 0.20, costHigh: 0.45,
  },
  phone_focus: {
    name: 'Phone Hunter',
    description: 'Maximum mobile recovery. Stacks Lusha, BetterContact, and Kaspr for the best dial rates.',
    tools: ['pdl', 'lusha', 'bettercontact', 'kaspr'],
    costLow: 0.35, costHigh: 0.85,
  },
  email_focus: {
    name: 'Email Finder',
    description: 'Work email discovery for email-first outreach. Uses four complementary finders.',
    tools: ['pdl', 'contactout', 'hunter', 'dropcontact'],
    costLow: 0.15, costHigh: 0.40,
  },
  eu_gdpr: {
    name: 'EU / GDPR',
    description: 'GDPR-compliant tools only. Best for European lead flows — Datagma, Cognism, Dropcontact.',
    tools: ['pdl', 'datagma', 'cognism', 'dropcontact'],
    costLow: 0.25, costHigh: 0.60,
  },
  full_waterfall: {
    name: 'Full Waterfall',
    description: 'Every tool enabled. Maximum data coverage across all 5 phases. Waterfall stops early when data is found.',
    tools: ['pdl', 'datagma', 'lusha', 'bettercontact', 'kaspr', 'cognism', 'contactout', 'hunter', 'dropcontact', 'findymail'],
    costLow: 0.30, costHigh: 1.13,
  },
}

const PACK_LABELS: Record<string, string> = {
  profile: 'Profile Depth',
  phone: 'Phone Recovery',
  email: 'Email Recovery',
}

const PACK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  profile: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  phone: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  email: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
}

// ── Cost estimator ────────────────────────────────────────────────────────────

function estimateCost(enabledTools: string[]): { low: number; avg: number; high: number } {
  let avg = BASE_COST
  for (const slug of enabledTools) {
    const def = TOOL_DEFS[slug]
    if (def) avg += def.hitRate * def.avgCostWhenRun
  }
  return { low: avg * 0.6, avg, high: avg * 2.2 }
}

function detectPreset(enabledTools: string[]): BundlePreset {
  const sorted = [...enabledTools].sort().join(',')
  for (const [key, bundle] of Object.entries(BUNDLES)) {
    if ([...bundle.tools].sort().join(',') === sorted) return key as BundlePreset
  }
  return 'custom'
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ToolConfig {
  bundle_preset: BundlePreset
  enabled_tools: string[]
}

export default function ToolConfigSection({ accountId }: { accountId: string }) {
  const [enabledTools, setEnabledTools] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/accounts/${accountId}/settings`)
      .then((r) => r.json())
      .then((data) => {
        const tc = data.toolConfig as ToolConfig | null
        setEnabledTools(tc?.enabled_tools ?? Object.keys(TOOL_DEFS))  // default: all tools enabled
      })
      .catch(() => setEnabledTools(Object.keys(TOOL_DEFS)))
      .finally(() => setLoading(false))
  }, [accountId])

  const activePreset = detectPreset(enabledTools)
  const cost = estimateCost(enabledTools)

  const applyPreset = useCallback((preset: Exclude<BundlePreset, 'custom'>) => {
    setEnabledTools(BUNDLES[preset].tools)
    setSaved(false)
    setSaveError(null)
  }, [])

  const toggleTool = useCallback((slug: string) => {
    setEnabledTools((prev) =>
      prev.includes(slug) ? prev.filter((t) => t !== slug) : [...prev, slug]
    )
    setSaved(false)
    setSaveError(null)
  }, [])

  const save = useCallback(async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/accounts/${accountId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_config: {
            bundle_preset: detectPreset(enabledTools),
            enabled_tools: enabledTools,
          },
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setSaveError((err as { error?: string }).error || 'Failed to save')
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
      setSaveError('Network error — try again')
    } finally {
      setSaving(false)
    }
  }, [accountId, enabledTools])

  const packGroups: Record<string, string[]> = { profile: [], phone: [], email: [] }
  for (const [slug, def] of Object.entries(TOOL_DEFS)) {
    packGroups[def.pack].push(slug)
  }

  if (loading) {
    return (
      <div className="border border-gray-200 rounded-xl p-6 animate-pulse">
        <div className="h-5 bg-gray-100 rounded w-48 mb-4" />
        <div className="h-4 bg-gray-100 rounded w-full mb-2" />
        <div className="h-4 bg-gray-100 rounded w-3/4" />
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Enrichment Tools</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Choose which enrichment tools run for this account. Apollo and Enrow are always active.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Saved
              </span>
            )}
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Save Config'}
            </button>
          </div>
        </div>
        {saveError && (
          <p className="mt-2 text-xs text-red-600 bg-red-50 rounded px-3 py-1.5">{saveError}</p>
        )}
      </div>

      <div className="p-6 bg-gray-50 space-y-6">

        {/* Bundle Presets */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Presets</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(Object.entries(BUNDLES) as [Exclude<BundlePreset, 'custom'>, Bundle][]).map(([key, bundle]) => {
              const isActive = activePreset === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  className={`text-left rounded-lg border p-3 transition-all ${
                    isActive
                      ? 'border-indigo-400 bg-indigo-50 ring-1 ring-indigo-400'
                      : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs font-700 font-semibold text-gray-900 leading-snug">{bundle.name}</span>
                    {bundle.badge && (
                      <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wide bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                        {bundle.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-emerald-700 font-semibold mb-1">
                    ${bundle.costLow.toFixed(2)}–${bundle.costHigh.toFixed(2)}/lead
                  </div>
                  <div className="text-[10.5px] text-gray-500 leading-snug">{bundle.description}</div>
                </button>
              )
            })}
          </div>
          {activePreset === 'custom' && (
            <div className="mt-2 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Custom configuration — does not match any preset
            </div>
          )}
        </div>

        {/* Individual tool toggles */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Individual Tools</p>

          {/* Required tools */}
          <div className="mb-4 rounded-lg border border-gray-200 overflow-hidden bg-white">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Required</span>
              <span className="text-[10px] text-gray-400">Always active — cannot be disabled</span>
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { slug: 'apollo', name: 'Apollo.io', desc: 'Seeds the entire waterfall — provides identity, LinkedIn URL, company, and title.', phase: 'Phase 1' },
                { slug: 'enrow', name: 'Enrow', desc: 'Verifies every collected email address for deliverability. Negligible cost.', phase: 'Phase 5' },
              ].map((t) => (
                <div key={t.slug} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-5 rounded-full bg-indigo-500 flex items-center justify-end px-0.5 flex-shrink-0 cursor-not-allowed opacity-80">
                    <div className="w-4 h-4 rounded-full bg-white shadow" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{t.name}</span>
                      <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">{t.phase}</span>
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Required</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Optional tools by pack */}
          {(['profile', 'phone', 'email'] as const).map((pack) => {
            const colors = PACK_COLORS[pack]
            const slugs = packGroups[pack]
            const allOn = slugs.every((s) => enabledTools.includes(s))
            const someOn = slugs.some((s) => enabledTools.includes(s))
            return (
              <div key={pack} className="mb-4 rounded-lg border border-gray-200 overflow-hidden bg-white">
                <div className={`px-4 py-2.5 border-b border-gray-100 flex items-center justify-between ${colors.bg}`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold uppercase tracking-wide ${colors.text}`}>
                      {PACK_LABELS[pack]}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {slugs.filter((s) => enabledTools.includes(s)).length}/{slugs.length} enabled
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (allOn) {
                        setEnabledTools((prev) => prev.filter((t) => !slugs.includes(t)))
                      } else {
                        setEnabledTools((prev) => Array.from(new Set([...prev, ...slugs])))
                      }
                      setSaved(false)
                    }}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${colors.border} ${colors.text} hover:opacity-80 transition-opacity`}
                  >
                    {allOn ? 'Disable All' : someOn ? 'Enable All' : 'Enable All'}
                  </button>
                </div>
                <div className="divide-y divide-gray-50">
                  {slugs.map((slug) => {
                    const def = TOOL_DEFS[slug]
                    const on = enabledTools.includes(slug)
                    return (
                      <div key={slug} className="flex items-center gap-3 px-4 py-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={on}
                          onClick={() => toggleTool(slug)}
                          className={`w-8 h-5 rounded-full transition-colors flex-shrink-0 flex items-center px-0.5 ${
                            on ? 'bg-indigo-500 justify-end' : 'bg-gray-200 justify-start'
                          }`}
                        >
                          <div className="w-4 h-4 rounded-full bg-white shadow" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-semibold ${on ? 'text-gray-900' : 'text-gray-400'}`}>
                              {def.name}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colors.bg} ${colors.text} border ${colors.border}`}>
                              {def.phase}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              ~${(def.hitRate * def.avgCostWhenRun).toFixed(3)}/lead avg
                            </span>
                          </div>
                          <p className={`text-xs mt-0.5 ${on ? 'text-gray-500' : 'text-gray-300'}`}>{def.description}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Cost Estimator */}
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Estimated Cost Per Lead</span>
            <span className="text-xs text-emerald-600">Based on typical waterfall hit rates</span>
          </div>
          <div className="flex items-end gap-4">
            <div>
              <div className="text-2xl font-bold text-emerald-700">${cost.avg.toFixed(3)}</div>
              <div className="text-xs text-emerald-600">avg</div>
            </div>
            <div className="text-gray-400 text-sm mb-1">·</div>
            <div>
              <div className="text-lg font-semibold text-emerald-500">${cost.low.toFixed(3)}</div>
              <div className="text-xs text-emerald-400">best case</div>
            </div>
            <div className="text-gray-400 text-sm mb-1">·</div>
            <div>
              <div className="text-lg font-semibold text-orange-500">${cost.high.toFixed(3)}</div>
              <div className="text-xs text-orange-400">worst case</div>
            </div>
          </div>
          <p className="text-[11px] text-emerald-600 mt-2">
            The waterfall stops early when data is found — most leads cost significantly less than worst case.
            {enabledTools.length === 0 && ' Add tools above to get more complete data.'}
          </p>
        </div>

        {/* Tools active count */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>
            {REQUIRED_TOOLS.length + enabledTools.length} tools active
            {' · '}
            {Object.keys(TOOL_DEFS).length - enabledTools.length} optional tools disabled
          </span>
          <button
            type="button"
            onClick={() => { setEnabledTools(Object.keys(TOOL_DEFS)); setSaved(false) }}
            className="text-indigo-500 hover:text-indigo-700 font-medium"
          >
            Enable all
          </button>
        </div>
      </div>
    </div>
  )
}
