import type { Lead } from '@/types'

function getPipelineLabel(slug: string): string {
  const labels: Record<string, string> = { main: 'Main (LinkedIn)', nurture: 'Nurture' }
  return labels[slug] || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function bar(pct: number, width = 20): string {
  const filled = Math.round((pct / 100) * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

function pct(n: number, total: number): string {
  return total === 0 ? '0%' : `${Math.round((n / total) * 100)}%`
}

export interface ReportEmailOptions {
  leads: Lead[]
  pipeline: string
  dateLabel: string
  hotOnly: boolean
  generatedAt?: Date
  scheduleLabel?: string
}

export function buildReportEmailContent(opts: ReportEmailOptions): { html: string; text: string; subject: string } {
  const { leads, pipeline, dateLabel, hotOnly, generatedAt = new Date(), scheduleLabel } = opts

  const total = leads.length
  const hotLeads = leads.filter((l) => l.is_hot)
  const hotCount = hotLeads.length
  const assignedCount = leads.filter((l) => l.status === 'assigned').length
  const pendingCount = leads.filter((l) => l.status === 'pending').length
  const enrichingCount = leads.filter((l) => l.status === 'enriching').length
  const failedCount = leads.filter((l) => l.status === 'failed').length
  const noPersonaCount = leads.filter((l) => l.status === 'no_persona').length
  const pipelineLabel = getPipelineLabel(pipeline)

  // Persona breakdown
  const personaMap = new Map<string, number>()
  for (const lead of leads) {
    const name = lead.personas?.name || 'Unassigned'
    personaMap.set(name, (personaMap.get(name) || 0) + 1)
  }
  const topPersonas = Array.from(personaMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6)

  // Company breakdown
  const companyMap = new Map<string, number>()
  for (const lead of leads) {
    const ed = (lead.enriched_data || {}) as Record<string, unknown>
    const apolloRaw = (ed.apollo_raw || {}) as Record<string, unknown>
    const company =
      (ed.current_company as string) ||
      (apolloRaw.organization as Record<string, string> | undefined)?.name ||
      ''
    if (company.trim()) companyMap.set(company.trim(), (companyMap.get(company.trim()) || 0) + 1)
  }
  const topCompanies = Array.from(companyMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6)

  // Enrichment source usage
  const sourceMap = new Map<string, number>()
  for (const lead of leads) {
    const ed = (lead.enriched_data || {}) as Record<string, unknown>
    if (Array.isArray(ed.sources_used)) {
      for (const src of ed.sources_used as string[]) {
        sourceMap.set(src, (sourceMap.get(src) || 0) + 1)
      }
    }
  }
  const sources = Array.from(sourceMap.entries()).sort((a, b) => b[1] - a[1])

  // Data coverage stats
  const hasPhone = leads.filter((l) => {
    const ed = (l.enriched_data || {}) as Record<string, unknown>
    return l.phone || (Array.isArray(ed.all_phones) && (ed.all_phones as unknown[]).length > 0)
  }).length
  const hasEmail = leads.filter((l) => l.email).length
  const hasLinkedIn = leads.filter((l) => {
    const ed = (l.enriched_data || {}) as Record<string, unknown>
    return ed.linkedin_url || l.email?.includes('linkedin')
  }).length
  const hasCompany = leads.filter((l) => {
    const ed = (l.enriched_data || {}) as Record<string, unknown>
    const apolloRaw = (ed.apollo_raw || {}) as Record<string, unknown>
    return (
      (ed.current_company as string) ||
      (apolloRaw.organization as Record<string, string> | undefined)?.name
    )
  }).length

  // Seniority breakdown
  const seniorityMap = new Map<string, number>()
  for (const lead of leads) {
    const ed = (lead.enriched_data || {}) as Record<string, unknown>
    const s = (ed.seniority as string)?.trim()
    if (s) seniorityMap.set(s, (seniorityMap.get(s) || 0) + 1)
  }
  const topSeniority = Array.from(seniorityMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const subject = `${hotOnly ? '🔥 Hot Leads' : '📊 Lead'} Report — ${pipelineLabel} — ${dateLabel} (${total} lead${total !== 1 ? 's' : ''})`

  const generatedStr = generatedAt.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  // ─── HTML ────────────────────────────────────────────────────────────────────
  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- HEADER -->
  <tr><td style="background:#1e1b4b;border-radius:12px 12px 0 0;padding:28px 32px 24px;">
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#a5b4fc;">Lead Router${scheduleLabel ? ` · ${scheduleLabel}` : ''}</p>
    <h1 style="margin:0 0 6px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.2;">${hotOnly ? '🔥 Hot Leads Report' : '📊 Lead Report'}</h1>
    <p style="margin:0;font-size:13px;color:#c7d2fe;">${pipelineLabel} &nbsp;·&nbsp; ${dateLabel}</p>
    <p style="margin:8px 0 0;font-size:11px;color:#818cf8;">Generated ${generatedStr}</p>
  </td></tr>

  <!-- SUMMARY STRIP -->
  <tr><td style="background:#312e81;padding:0 32px;">
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:16px 0;text-align:center;border-right:1px solid #4338ca;">
        <p style="margin:0;font-size:28px;font-weight:800;color:#ffffff;">${total}</p>
        <p style="margin:4px 0 0;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#a5b4fc;">Total Leads</p>
      </td>
      <td style="padding:16px 0;text-align:center;border-right:1px solid #4338ca;">
        <p style="margin:0;font-size:28px;font-weight:800;color:${hotCount > 0 ? '#fb923c' : '#ffffff'};">${hotCount}</p>
        <p style="margin:4px 0 0;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#a5b4fc;">Hot Leads 🔥</p>
      </td>
      <td style="padding:16px 0;text-align:center;border-right:1px solid #4338ca;">
        <p style="margin:0;font-size:28px;font-weight:800;color:#34d399;">${assignedCount}</p>
        <p style="margin:4px 0 0;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#a5b4fc;">Assigned</p>
      </td>
      <td style="padding:16px 0;text-align:center;">
        <p style="margin:0;font-size:28px;font-weight:800;color:#fbbf24;">${pendingCount + noPersonaCount}</p>
        <p style="margin:4px 0 0;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#a5b4fc;">Pending</p>
      </td>
    </tr>
    </table>
  </td></tr>

  <!-- BODY -->
  <tr><td style="background:#ffffff;padding:0 32px 32px;border-radius:0 0 12px 12px;">

    ${hotCount > 0 ? `
    <!-- HOT LEADS -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
    <tr><td>
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#92400e;border-bottom:2px solid #fed7aa;padding-bottom:8px;">🔥 Hot Leads — Prioritize These</p>
      ${hotLeads.slice(0, 8).map((lead) => {
        const ed = (lead.enriched_data || {}) as Record<string, unknown>
        const apolloRaw = (ed.apollo_raw || {}) as Record<string, unknown>
        const company = (ed.current_company as string) || (apolloRaw.organization as Record<string, string> | undefined)?.name || ''
        const title = (ed.title as string) || (apolloRaw.title as string) || ''
        const linkedin = (ed.linkedin_url as string) || (apolloRaw.linkedin_url as string) || ''
        const allPhones = Array.isArray(ed.all_phones)
          ? (ed.all_phones as Array<Record<string, unknown>>).map((p) => (p.number || p.value || '') as string).filter(Boolean)
          : []
        const phone = lead.phone || allPhones[0] || ''
        const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.email || 'Unknown'
        return `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;border:1px solid #fed7aa;border-left:3px solid #f97316;border-radius:6px;background:#fffbf5;">
        <tr><td style="padding:12px 14px;">
          <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:#111827;">${name}${title ? ` <span style="font-weight:400;color:#6b7280;">· ${title}</span>` : ''}${company ? ` <span style="font-weight:600;color:#374151;">@ ${company}</span>` : ''}</p>
          ${lead.email ? `<p style="margin:2px 0;font-size:12px;color:#6b7280;">📧 ${lead.email}${phone ? ` &nbsp;·&nbsp; 📱 ${phone}` : ''}</p>` : ''}
          ${linkedin ? `<p style="margin:2px 0;font-size:12px;color:#6b7280;">🔗 ${linkedin}</p>` : ''}
          <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;">
            ${lead.pipeline ? `<span style="background:#f3f4f6;border-radius:4px;padding:1px 6px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">${getPipelineLabel(lead.pipeline)}</span>` : ''}
            ${lead.source ? ` &nbsp;·&nbsp; via ${lead.source}` : ''}
          </p>
          ${lead.hot_reasoning ? `<p style="margin:6px 0 0;font-size:12px;color:#92400e;font-style:italic;line-height:1.4;">"${lead.hot_reasoning}"</p>` : ''}
        </td></tr>
        </table>`
      }).join('')}
      ${hotCount > 8 ? `<p style="margin:4px 0 0;font-size:12px;color:#9ca3af;text-align:center;">+ ${hotCount - 8} more hot leads in the attached CSV</p>` : ''}
    </td></tr>
    </table>
    ` : ''}

    <!-- STATUS BREAKDOWN -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
    <tr><td>
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">Status Breakdown</p>
      ${[
        { label: 'Assigned', count: assignedCount, color: '#10b981' },
        { label: 'No Persona', count: noPersonaCount, color: '#9ca3af' },
        { label: 'Pending', count: pendingCount, color: '#f59e0b' },
        { label: 'Enriching', count: enrichingCount, color: '#6366f1' },
        { label: 'Failed', count: failedCount, color: '#ef4444' },
      ].filter(s => s.count > 0).map(s => {
        const p = total ? Math.round((s.count / total) * 100) : 0
        return `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
        <tr>
          <td width="100" style="font-size:12px;color:#374151;font-weight:500;">${s.label}</td>
          <td>
            <div style="background:#f3f4f6;border-radius:4px;height:8px;overflow:hidden;">
              <div style="background:${s.color};height:8px;width:${p}%;border-radius:4px;"></div>
            </div>
          </td>
          <td width="70" style="text-align:right;font-size:12px;color:#6b7280;white-space:nowrap;">${s.count} &nbsp;(${p}%)</td>
        </tr>
        </table>`
      }).join('')}
    </td></tr>
    </table>

    ${topPersonas.length > 0 ? `
    <!-- PERSONA BREAKDOWN -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
    <tr><td>
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">By Persona</p>
      ${topPersonas.map(([name, count]) => {
        const p = total ? Math.round((count / total) * 100) : 0
        return `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
        <tr>
          <td width="150" style="font-size:12px;color:#374151;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px;">${name}</td>
          <td>
            <div style="background:#f3f4f6;border-radius:4px;height:8px;overflow:hidden;">
              <div style="background:#6366f1;height:8px;width:${p}%;border-radius:4px;"></div>
            </div>
          </td>
          <td width="70" style="text-align:right;font-size:12px;color:#6b7280;white-space:nowrap;">${count} &nbsp;(${p}%)</td>
        </tr>
        </table>`
      }).join('')}
    </td></tr>
    </table>
    ` : ''}

    ${topCompanies.length > 0 ? `
    <!-- TOP COMPANIES -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
    <tr><td>
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">Top Companies</p>
      <table width="100%" cellpadding="0" cellspacing="0">
      ${topCompanies.map(([name, count], i) => `
        <tr style="border-bottom:${i < topCompanies.length - 1 ? '1px solid #f3f4f6' : 'none'};">
          <td style="padding:7px 0;font-size:13px;color:#111827;font-weight:500;">${name}</td>
          <td style="padding:7px 0;text-align:right;font-size:12px;color:#6b7280;">${count} lead${count !== 1 ? 's' : ''}</td>
        </tr>
      `).join('')}
      </table>
    </td></tr>
    </table>
    ` : ''}

    ${topSeniority.length > 0 ? `
    <!-- SENIORITY BREAKDOWN -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
    <tr><td>
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">Seniority Levels</p>
      <table width="100%" cellpadding="0" cellspacing="0">
      ${topSeniority.map(([level, count], i) => {
        const p = total ? Math.round((count / total) * 100) : 0
        return `
        <tr style="border-bottom:${i < topSeniority.length - 1 ? '1px solid #f3f4f6' : 'none'};">
          <td style="padding:7px 0;font-size:13px;color:#111827;font-weight:500;text-transform:capitalize;">${level}</td>
          <td style="padding:7px 0;text-align:right;font-size:12px;color:#6b7280;">${count} &nbsp;(${p}%)</td>
        </tr>`
      }).join('')}
      </table>
    </td></tr>
    </table>
    ` : ''}

    ${sources.length > 0 ? `
    <!-- ENRICHMENT SOURCES -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
    <tr><td>
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#374151;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">Enrichment Sources Used</p>
      ${sources.map(([src, count]) => {
        const p = total ? Math.round((count / total) * 100) : 0
        return `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
        <tr>
          <td width="100" style="font-size:12px;color:#374151;font-weight:500;text-transform:uppercase;letter-spacing:0.04em;">${src}</td>
          <td>
            <div style="background:#f3f4f6;border-radius:4px;height:8px;overflow:hidden;">
              <div style="background:#0ea5e9;height:8px;width:${p}%;border-radius:4px;"></div>
            </div>
          </td>
          <td width="80" style="text-align:right;font-size:12px;color:#6b7280;white-space:nowrap;">${count}/${total} &nbsp;(${p}%)</td>
        </tr>
        </table>`
      }).join('')}
    </td></tr>
    </table>
    ` : ''}

    <!-- DATA COVERAGE -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;">
    <tr><td>
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#374151;">Data Coverage</p>
      <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        ${[
          { label: 'Has Email', n: hasEmail },
          { label: 'Has Phone', n: hasPhone },
          { label: 'Has Company', n: hasCompany },
          { label: 'Has LinkedIn', n: hasLinkedIn },
        ].map(({ label, n }) => {
          const p = total ? Math.round((n / total) * 100) : 0
          return `
          <td style="text-align:center;padding:0 8px;">
            <p style="margin:0;font-size:22px;font-weight:700;color:${p >= 75 ? '#10b981' : p >= 50 ? '#f59e0b' : '#9ca3af'};">${p}%</p>
            <p style="margin:4px 0 0;font-size:11px;color:#6b7280;">${label}</p>
          </td>`
        }).join('')}
      </tr>
      </table>
    </td></tr>
    </table>

    <!-- FOOTER -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;border-top:1px solid #e5e7eb;padding-top:20px;">
    <tr>
      <td style="font-size:12px;color:#9ca3af;">
        <p style="margin:0;">📎 Full CSV attached — ${total} lead${total !== 1 ? 's' : ''} · 26 columns including all enrichment data${hotCount > 0 ? ` · ${hotCount} hot lead${hotCount !== 1 ? 's' : ''} sorted to top` : ''}</p>
        <p style="margin:6px 0 0;">Sent by <strong>Lead Router</strong></p>
      </td>
    </tr>
    </table>

  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`.trim()

  // ─── PLAIN TEXT ──────────────────────────────────────────────────────────────
  const text = [
    `LEAD REPORT — ${pipelineLabel} — ${dateLabel}`,
    `Generated: ${generatedStr}`,
    '',
    `SUMMARY`,
    `Total Leads: ${total}`,
    `Hot Leads:   ${hotCount}`,
    `Assigned:    ${assignedCount}`,
    `Pending:     ${pendingCount + noPersonaCount}`,
    failedCount > 0 ? `Failed:      ${failedCount}` : '',
    '',
    hotCount > 0 ? [
      `🔥 HOT LEADS (${hotCount})`,
      '─'.repeat(40),
      ...hotLeads.slice(0, 8).map((l) => {
        const ed = (l.enriched_data || {}) as Record<string, unknown>
        const apolloRaw = (ed.apollo_raw || {}) as Record<string, unknown>
        const company = (ed.current_company as string) || (apolloRaw.organization as Record<string, string> | undefined)?.name || ''
        const title = (ed.title as string) || ''
        const name = [l.first_name, l.last_name].filter(Boolean).join(' ') || l.email || 'Unknown'
        return [
          `${name}${title ? ` · ${title}` : ''}${company ? ` @ ${company}` : ''}`,
          l.email ? `  Email: ${l.email}` : '',
          l.phone ? `  Phone: ${l.phone}` : '',
          (l.pipeline || l.source) ? `  Channel: ${[l.pipeline ? getPipelineLabel(l.pipeline) : '', l.source ? `via ${l.source}` : ''].filter(Boolean).join(' ')}` : '',
          l.hot_reasoning ? `  Reason: ${l.hot_reasoning}` : '',
        ].filter(Boolean).join('\n')
      }),
      '',
    ].join('\n') : '',
    topPersonas.length > 0 ? [
      'BY PERSONA',
      '─'.repeat(40),
      ...topPersonas.map(([name, count]) => `${name.padEnd(28)} ${count} (${pct(count, total)})`),
      '',
    ].join('\n') : '',
    topCompanies.length > 0 ? [
      'TOP COMPANIES',
      '─'.repeat(40),
      ...topCompanies.map(([name, count]) => `${name.padEnd(28)} ${count} lead${count !== 1 ? 's' : ''}`),
      '',
    ].join('\n') : '',
    sources.length > 0 ? [
      'ENRICHMENT SOURCES',
      '─'.repeat(40),
      ...sources.map(([src, count]) => `${src.toUpperCase().padEnd(12)} ${count}/${total} (${pct(count, total)})`),
      '',
    ].join('\n') : '',
    `Full CSV (${total} leads, 26 columns) is attached.`,
    '',
    `Sent by Lead Router`,
  ].filter(Boolean).join('\n')

  return { html, text, subject }
}
