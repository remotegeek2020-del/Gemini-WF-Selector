'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import type { HotLeadCriteria } from '@/types'

const TITLE_ROLES = ['Executive', 'Manager', 'Owner', 'Director', 'Finance', 'Operations', 'Sales', 'IT / Technology', 'Legal', 'HR / People', 'Marketing', 'Product']
const INDUSTRIES = ['Real Estate', 'Healthcare', 'Finance / Banking', 'Legal', 'Construction', 'Retail / E-commerce', 'SaaS / Software', 'Manufacturing', 'Insurance', 'Hospitality', 'Education', 'Professional Services', 'Transportation / Logistics', 'Energy / Utilities', 'Media / Entertainment']
const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']
const REVENUE_OPTIONS = ['$500K', '$1M', '$2M', '$5M', '$10M', '$25M', '$50M', '$100M', '$250M']
const ENRICHMENT_SOURCES = [2, 3, 4, 5]
const PDL_VERIFIED_MONTHS = [3, 6, 12, 18, 24]
const JOB_CHANGE_MONTHS = [3, 6, 12, 18]

const DEFAULT_CRITERIA: HotLeadCriteria = {
  requireDecisionMaker: false, requireVpOrAbove: false, requireDirectorOrAbove: false, requireManagerOrAbove: false,
  titleKeywords: '', titleRoles: [], titleRolesOther: '',
  minEmployees: null, maxEmployees: null, minRevenue: '', requireFunding: false, maxFoundedYearsAgo: null,
  targetIndustries: [], targetIndustriesOther: '', excludeIndustries: [], excludeIndustriesOther: '',
  requireVerifiedEmail: false, requirePhone: false, requireLinkedin: false, requireMultipleContactMethods: false,
  maxPdlVerifiedMonths: null, minEnrichmentSources: null,
  targetStates: [], targetCities: '', targetCountries: '', excludeLocations: '',
  recentJobChangeMonths: null, minYearsInRole: null, minCompaniesWorked: null, requireCareerGrowth: false,
  previousNotableCompanies: '', careerSignalsOther: '',
  requireCompanyLinkedin: false, requireCompanyPhone: false, requireCompanyWebsite: false,
  companyHq: '', companyKeywords: '', companySignalsOther: '',
  requirePaidAd: false, requireUtmCampaign: '', requireFormName: '', requireOrganicSearch: false, leadSourceOther: '',
  minCriteriaMatch: null, strictMode: false,
  customInstructions: '',
}

function Checkbox({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex items-start gap-2 cursor-pointer group">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer flex-shrink-0" />
      <span>
        <span className="text-sm text-gray-800 group-hover:text-gray-900">{label}</span>
        {hint && <span className="block text-xs text-gray-400 mt-0.5">{hint}</span>}
      </span>
    </label>
  )
}

function MultiSelect({ options, selected, onChange, other, onOther, otherPlaceholder }: {
  options: string[]; selected: string[]; onChange: (v: string[]) => void
  other?: string; onOther?: (v: string) => void; otherPlaceholder?: string
}) {
  const toggle = (opt: string) => onChange(selected.includes(opt) ? selected.filter((x) => x !== opt) : [...selected, opt])
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button key={opt} type="button" onClick={() => toggle(opt)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selected.includes(opt) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
            {opt}
          </button>
        ))}
      </div>
      {onOther !== undefined && (
        <Input value={other || ''} onChange={(e) => onOther(e.target.value)} placeholder={otherPlaceholder || 'Other (custom)…'} className="text-sm h-8" />
      )}
    </div>
  )
}

function CriteriaSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
        <span className="text-sm font-semibold text-gray-700">{title}</span>
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-4 py-4 space-y-3 bg-white">{children}</div>}
    </div>
  )
}

interface Lead { id: string; first_name: string | null; last_name: string | null; email: string | null; is_hot: boolean | null }

interface TestResult {
  is_hot: boolean
  hot_reasoning: string
  criteria_matched: string[]
}

function TestModal({ accountId, criteria, onClose }: { accountId: string; criteria: HotLeadCriteria; onClose: () => void }) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [leadsLoading, setLeadsLoading] = useState(true)
  const [leadsError, setLeadsError] = useState<string | null>(null)
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // pipeline=all so leads from every pipeline are available, not just 'main'
    fetch(`/api/accounts/${accountId}/leads?limit=50&pipeline=all`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load leads (${r.status})`)
        return r.json()
      })
      .then((d) => setLeads(d.leads || []))
      .catch((e) => setLeadsError(e.message || 'Could not load leads'))
      .finally(() => setLeadsLoading(false))
  }, [accountId])

  const runTest = async () => {
    if (!selectedLeadId) return
    setTesting(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch(`/api/accounts/${accountId}/settings/test-hot-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: selectedLeadId, criteria }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Test failed'); return }
      setResult(data)
    } catch {
      setError('Request failed')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-base font-semibold text-gray-900">Test Hot Lead Criteria</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-500">Pick an existing lead and run your current (unsaved) criteria against it to preview the AI result.</p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Select a lead</label>
            {leadsError ? (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{leadsError}</p>
            ) : (
              <select value={selectedLeadId} onChange={(e) => { setSelectedLeadId(e.target.value); setResult(null) }}
                disabled={leadsLoading}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400">
                <option value="">{leadsLoading ? 'Loading leads…' : leads.length === 0 ? 'No leads found' : '— choose a lead —'}</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {[l.first_name, l.last_name].filter(Boolean).join(' ') || l.email || l.id}
                    {l.is_hot != null ? (l.is_hot ? ' 🔥' : ' ○') : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
          <Button onClick={runTest} disabled={!selectedLeadId || testing} className="w-full">
            {testing ? 'Running AI assessment…' : 'Run Test →'}
          </Button>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          {result && (
            <div className={`rounded-lg border-2 p-4 space-y-3 ${result.is_hot ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{result.is_hot ? '🔥' : '○'}</span>
                <span className={`text-base font-bold ${result.is_hot ? 'text-orange-700' : 'text-gray-600'}`}>
                  {result.is_hot ? 'HOT LEAD' : 'Not Hot'}
                </span>
              </div>
              {result.criteria_matched.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Criteria Matched</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.criteria_matched.map((c, i) => (
                      <span key={i} className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full font-medium">{c}</span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">AI Reasoning</p>
                <p className="text-sm text-gray-700">{result.hot_reasoning}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function HotLeadCriteriaSection({ accountId }: { accountId: string }) {
  const [criteria, setCriteria] = useState<HotLeadCriteria>(DEFAULT_CRITERIA)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showTest, setShowTest] = useState(false)

  const set = <K extends keyof HotLeadCriteria>(key: K, value: HotLeadCriteria[K]) =>
    setCriteria((prev) => ({ ...prev, [key]: value }))

  useEffect(() => {
    fetch(`/api/accounts/${accountId}/settings`)
      .then((r) => r.json())
      .then((d) => { if (d.hotLeadCriteria) setCriteria({ ...DEFAULT_CRITERIA, ...d.hotLeadCriteria }) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [accountId])

  const save = async () => {
    setSaving(true)
    setSaved(false)
    setSaveError(null)
    try {
      const res = await fetch(`/api/accounts/${accountId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hot_lead_criteria: criteria }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setSaveError(data.error || `Save failed (${res.status})`)
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setSaveError('Network error — criteria not saved')
    } finally {
      setSaving(false)
    }
  }

  const hasAnyCriteria =
    criteria.requireDecisionMaker || criteria.requireVpOrAbove || criteria.requireDirectorOrAbove ||
    criteria.requireManagerOrAbove || criteria.titleKeywords?.trim() || (criteria.titleRoles?.length ?? 0) > 0 ||
    criteria.titleRolesOther?.trim() || criteria.minEmployees || criteria.maxEmployees || criteria.minRevenue ||
    criteria.requireFunding || criteria.maxFoundedYearsAgo || (criteria.targetIndustries?.length ?? 0) > 0 ||
    criteria.targetIndustriesOther?.trim() || (criteria.excludeIndustries?.length ?? 0) > 0 ||
    criteria.excludeIndustriesOther?.trim() || criteria.requireVerifiedEmail || criteria.requirePhone ||
    criteria.requireLinkedin || criteria.requireMultipleContactMethods || criteria.maxPdlVerifiedMonths ||
    criteria.minEnrichmentSources || (criteria.targetStates?.length ?? 0) > 0 || criteria.targetCities?.trim() ||
    criteria.targetCountries?.trim() || criteria.excludeLocations?.trim() || criteria.recentJobChangeMonths ||
    criteria.minYearsInRole || criteria.minCompaniesWorked || criteria.requireCareerGrowth ||
    criteria.previousNotableCompanies?.trim() || criteria.careerSignalsOther?.trim() ||
    criteria.requireCompanyLinkedin || criteria.requireCompanyPhone || criteria.requireCompanyWebsite ||
    criteria.companyHq?.trim() || criteria.companyKeywords?.trim() || criteria.companySignalsOther?.trim() ||
    criteria.requirePaidAd || criteria.requireOrganicSearch || criteria.requireUtmCampaign?.trim() ||
    criteria.requireFormName?.trim() || criteria.leadSourceOther?.trim() || criteria.customInstructions?.trim()

  if (loading) return null

  return (
    <>
      {showTest && <TestModal accountId={accountId} criteria={criteria} onClose={() => setShowTest(false)} />}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle>Hot Lead Criteria</CardTitle>
              <p className="text-sm text-gray-500 mt-1">AI uses these criteria to flag high-priority leads. Configured per sub-account.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowTest(true)}>Test →</Button>
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Criteria'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">

          {/* Default fallback notice */}
          {!hasAnyCriteria ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Using Default AI Criteria</p>
              <p className="text-sm text-amber-800 mb-2">No criteria configured. The AI will use its built-in defaults to decide what's a hot lead:</p>
              <ul className="text-sm text-amber-900 space-y-1 list-none">
                <li>• <strong>Decision-making authority</strong> — Owner, CEO, President, VP, Director, C-level, Managing Partner, Principal</li>
                <li>• <strong>Persona fit</strong> — company size and industry matches the assigned persona well</li>
                <li>• <strong>Direct match</strong> — lead was matched to a persona directly, not via default fallback</li>
                <li>• <strong>Rich profile</strong> — meaningful data available (title, company, LinkedIn)</li>
              </ul>
              <p className="text-xs text-amber-600 mt-2">Configure criteria below to override these defaults with rules specific to this account.</p>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 flex items-center gap-2">
              <span className="text-green-600 text-base">✓</span>
              <p className="text-sm text-green-800 font-medium">Custom criteria active — AI will use your rules below instead of the built-in defaults.</p>
            </div>
          )}

          {/* Scoring Threshold — always visible at top */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 space-y-2">
            <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Scoring Mode</p>
            <div className="flex flex-wrap gap-4 items-center">
              <Checkbox checked={!!criteria.strictMode} onChange={(v) => set('strictMode', v)} label="Strict mode — ALL criteria must be met" />
              {!criteria.strictMode && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">OR match at least</span>
                  <select value={criteria.minCriteriaMatch ?? ''} onChange={(e) => set('minCriteriaMatch', e.target.value ? Number(e.target.value) : null)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm">
                    <option value="">any</option>
                    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <span className="text-sm text-gray-600">criteria</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 1: Title & Seniority */}
          <CriteriaSection title="1 · Job Title &amp; Seniority">
            <Checkbox checked={!!criteria.requireDecisionMaker} onChange={(v) => set('requireDecisionMaker', v)} label="Is a decision maker" hint="Owner, CEO, President, C-Suite, Managing Partner, Principal" />
            <Checkbox checked={!!criteria.requireVpOrAbove} onChange={(v) => set('requireVpOrAbove', v)} label="Seniority is VP or above" />
            <Checkbox checked={!!criteria.requireDirectorOrAbove} onChange={(v) => set('requireDirectorOrAbove', v)} label="Seniority is Director or above" />
            <Checkbox checked={!!criteria.requireManagerOrAbove} onChange={(v) => set('requireManagerOrAbove', v)} label="Seniority is Manager or above" />
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Title contains keywords (comma-separated)</label>
              <Input value={criteria.titleKeywords || ''} onChange={(e) => set('titleKeywords', e.target.value)} placeholder="CEO, Founder, Owner, Director…" className="text-sm h-8" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Title role type</label>
              <MultiSelect options={TITLE_ROLES} selected={criteria.titleRoles || []} onChange={(v) => set('titleRoles', v)}
                other={criteria.titleRolesOther} onOther={(v) => set('titleRolesOther', v)} otherPlaceholder="Other role types…" />
            </div>
          </CriteriaSection>

          {/* Section 2: Company Size */}
          <CriteriaSection title="2 · Company Size &amp; Stage">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Min employees</label>
                <Input type="number" value={criteria.minEmployees ?? ''} onChange={(e) => set('minEmployees', e.target.value ? Number(e.target.value) : null)} placeholder="e.g. 10" className="text-sm h-8" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Max employees</label>
                <Input type="number" value={criteria.maxEmployees ?? ''} onChange={(e) => set('maxEmployees', e.target.value ? Number(e.target.value) : null)} placeholder="e.g. 500" className="text-sm h-8" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Minimum annual revenue</label>
              <select value={criteria.minRevenue || ''} onChange={(e) => set('minRevenue', e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-full">
                <option value="">Any</option>
                {REVENUE_OPTIONS.map((r) => <option key={r} value={r}>{r}+</option>)}
              </select>
            </div>
            <Checkbox checked={!!criteria.requireFunding} onChange={(v) => set('requireFunding', v)} label="Has received funding (any round)" />
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Startup — founded within last N years</label>
              <Input type="number" value={criteria.maxFoundedYearsAgo ?? ''} onChange={(e) => set('maxFoundedYearsAgo', e.target.value ? Number(e.target.value) : null)} placeholder="e.g. 5" className="text-sm h-8 w-32" />
            </div>
          </CriteriaSection>

          {/* Section 3: Industry */}
          <CriteriaSection title="3 · Industry">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Target industries</label>
              <MultiSelect options={INDUSTRIES} selected={criteria.targetIndustries || []} onChange={(v) => set('targetIndustries', v)}
                other={criteria.targetIndustriesOther} onOther={(v) => set('targetIndustriesOther', v)} otherPlaceholder="Other target industries…" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Exclude industries</label>
              <MultiSelect options={INDUSTRIES} selected={criteria.excludeIndustries || []} onChange={(v) => set('excludeIndustries', v)}
                other={criteria.excludeIndustriesOther} onOther={(v) => set('excludeIndustriesOther', v)} otherPlaceholder="Other excluded industries…" />
            </div>
          </CriteriaSection>

          {/* Section 4: Contact Data Quality */}
          <CriteriaSection title="4 · Contact Data Quality">
            <Checkbox checked={!!criteria.requireVerifiedEmail} onChange={(v) => set('requireVerifiedEmail', v)} label="Has a verified email address" />
            <Checkbox checked={!!criteria.requirePhone} onChange={(v) => set('requirePhone', v)} label="Has at least one phone number" />
            <Checkbox checked={!!criteria.requireLinkedin} onChange={(v) => set('requireLinkedin', v)} label="Has a LinkedIn profile" />
            <Checkbox checked={!!criteria.requireMultipleContactMethods} onChange={(v) => set('requireMultipleContactMethods', v)} label="Has both phone AND email" />
            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">PDL data verified within</label>
                <select value={criteria.maxPdlVerifiedMonths ?? ''} onChange={(e) => set('maxPdlVerifiedMonths', e.target.value ? Number(e.target.value) : null)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
                  <option value="">Any</option>
                  {PDL_VERIFIED_MONTHS.map((m) => <option key={m} value={m}>{m} months</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Min enrichment sources</label>
                <select value={criteria.minEnrichmentSources ?? ''} onChange={(e) => set('minEnrichmentSources', e.target.value ? Number(e.target.value) : null)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
                  <option value="">Any</option>
                  {ENRICHMENT_SOURCES.map((n) => <option key={n} value={n}>{n}+ tools</option>)}
                </select>
              </div>
            </div>
          </CriteriaSection>

          {/* Section 5: Location */}
          <CriteriaSection title="5 · Location / Geography">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Target US states</label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {US_STATES.map((s) => (
                  <button key={s} type="button"
                    onClick={() => set('targetStates', (criteria.targetStates || []).includes(s) ? (criteria.targetStates || []).filter((x) => x !== s) : [...(criteria.targetStates || []), s])}
                    className={`px-2 py-0.5 rounded text-xs font-mono border transition-colors ${(criteria.targetStates || []).includes(s) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Target cities (comma-separated)</label>
              <Input value={criteria.targetCities || ''} onChange={(e) => set('targetCities', e.target.value)} placeholder="Miami, Austin, Chicago…" className="text-sm h-8" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Target countries (comma-separated)</label>
              <Input value={criteria.targetCountries || ''} onChange={(e) => set('targetCountries', e.target.value)} placeholder="United States, Canada…" className="text-sm h-8" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Exclude locations</label>
              <Input value={criteria.excludeLocations || ''} onChange={(e) => set('excludeLocations', e.target.value)} placeholder="e.g. New York, California…" className="text-sm h-8" />
            </div>
          </CriteriaSection>

          {/* Section 6: Career Signals */}
          <CriteriaSection title="6 · Career Signals">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Changed jobs within last</label>
              <select value={criteria.recentJobChangeMonths ?? ''} onChange={(e) => set('recentJobChangeMonths', e.target.value ? Number(e.target.value) : null)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
                <option value="">Not required</option>
                {JOB_CHANGE_MONTHS.map((m) => <option key={m} value={m}>{m} months</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Min years in current role</label>
                <Input type="number" value={criteria.minYearsInRole ?? ''} onChange={(e) => set('minYearsInRole', e.target.value ? Number(e.target.value) : null)} placeholder="e.g. 2" className="text-sm h-8" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Min companies worked at</label>
                <Input type="number" value={criteria.minCompaniesWorked ?? ''} onChange={(e) => set('minCompaniesWorked', e.target.value ? Number(e.target.value) : null)} placeholder="e.g. 3" className="text-sm h-8" />
              </div>
            </div>
            <Checkbox checked={!!criteria.requireCareerGrowth} onChange={(v) => set('requireCareerGrowth', v)} label="Career shows upward trajectory" hint="Promotions visible in employment history" />
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Previously worked at notable company (comma-separated)</label>
              <Input value={criteria.previousNotableCompanies || ''} onChange={(e) => set('previousNotableCompanies', e.target.value)} placeholder="Google, Amazon, Goldman Sachs…" className="text-sm h-8" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Other career signal (custom)</label>
              <Input value={criteria.careerSignalsOther || ''} onChange={(e) => set('careerSignalsOther', e.target.value)} placeholder="e.g. recently promoted, serial entrepreneur…" className="text-sm h-8" />
            </div>
          </CriteriaSection>

          {/* Section 7: Company Signals */}
          <CriteriaSection title="7 · Company Signals">
            <Checkbox checked={!!criteria.requireCompanyLinkedin} onChange={(v) => set('requireCompanyLinkedin', v)} label="Company has a LinkedIn page" />
            <Checkbox checked={!!criteria.requireCompanyPhone} onChange={(v) => set('requireCompanyPhone', v)} label="Company has a phone number" />
            <Checkbox checked={!!criteria.requireCompanyWebsite} onChange={(v) => set('requireCompanyWebsite', v)} label="Company has a website" />
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Company HQ in (city, state, or country)</label>
              <Input value={criteria.companyHq || ''} onChange={(e) => set('companyHq', e.target.value)} placeholder="Texas, Florida, US…" className="text-sm h-8" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Company keywords (comma-separated)</label>
              <Input value={criteria.companyKeywords || ''} onChange={(e) => set('companyKeywords', e.target.value)} placeholder="payment, merchant, fintech…" className="text-sm h-8" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Other company signal (custom)</label>
              <Input value={criteria.companySignalsOther || ''} onChange={(e) => set('companySignalsOther', e.target.value)} placeholder="e.g. high-growth startup, franchise business…" className="text-sm h-8" />
            </div>
          </CriteriaSection>

          {/* Section 8: Lead Source */}
          <CriteriaSection title="8 · Lead Source Signals">
            <Checkbox checked={!!criteria.requirePaidAd} onChange={(v) => set('requirePaidAd', v)} label="Came from a paid ad" hint="UTM source is present" />
            <Checkbox checked={!!criteria.requireOrganicSearch} onChange={(v) => set('requireOrganicSearch', v)} label="Came from organic search" />
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Specific UTM campaign</label>
              <Input value={criteria.requireUtmCampaign || ''} onChange={(e) => set('requireUtmCampaign', e.target.value)} placeholder="e.g. summer-2024-promo" className="text-sm h-8" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Specific form name</label>
              <Input value={criteria.requireFormName || ''} onChange={(e) => set('requireFormName', e.target.value)} placeholder="e.g. Contact Us, Free Quote" className="text-sm h-8" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Other lead source (custom)</label>
              <Input value={criteria.leadSourceOther || ''} onChange={(e) => set('leadSourceOther', e.target.value)} placeholder="e.g. referral from partner, webinar attendee…" className="text-sm h-8" />
            </div>
          </CriteriaSection>

          {/* Section 9: Custom Instructions */}
          <CriteriaSection title="9 · Custom AI Instructions">
            <p className="text-xs text-gray-500">Free-text instructions appended directly to the AI prompt. Use this to describe your ideal hot lead in plain language.</p>
            <textarea
              value={criteria.customInstructions || ''}
              onChange={(e) => set('customInstructions', e.target.value)}
              rows={4}
              placeholder={'Example: A hot lead for us is a business owner in the payment processing space with 10+ employees who has recently changed jobs or started a new business. Prioritize leads with both a mobile phone and verified email.'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </CriteriaSection>

          {saveError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{saveError}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setShowTest(true)}>Test with a lead →</Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Criteria'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
