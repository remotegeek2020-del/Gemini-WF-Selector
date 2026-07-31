import { apolloEnrichPerson, formatApolloDataForGemini } from '@/lib/apollo/tools'
import { lushaEnrichPerson, formatLushaData } from '@/lib/lusha/tools'
import { pdlEnrichPerson } from './tools/pdl'
import { datagmaEnrichPerson } from './tools/datagma'
import { bettercontactFindPhone } from './tools/bettercontact'
import { kasprFindPhone } from './tools/kaspr'
import { cognismFindPhone } from './tools/cognism'
import { contactoutFindEmails } from './tools/contactout'
import { hunterFindEmail, extractDomainFromEmail, isPersonalEmail } from './tools/hunter'
import { dropcontactFindEmail } from './tools/dropcontact'
import { findymailFindEmail } from './tools/findymail'
import { enrowVerifyEmails } from './tools/enrow'

export interface EnrichmentKeys {
  apollo?: string
  lusha?: string
  pdl?: string
  datagma?: string
  bettercontact?: string
  kaspr?: string
  cognism?: string
  contactout?: string
  hunter?: string
  dropcontact?: string
  findymail?: string
  enrow?: string
}

export interface EnrichmentLeadInput {
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  linkedinUrl?: string | null
  rawData?: Record<string, unknown>
}

export interface EnrichmentPipelineResult {
  gate_passed: boolean
  enriched_data: Record<string, unknown>
  sources_used: string[]
  sources_skipped: string[]
  source_errors?: Record<string, string>
}

function mergeField<T>(existing: T | undefined, incoming: T | undefined): T | undefined {
  return existing !== undefined && existing !== null && existing !== '' ? existing : incoming
}

function getAllPhones(ed: Record<string, unknown>, formPhone?: string | null): string[] {
  const phones: string[] = []
  if (formPhone) phones.push(formPhone)
  const lushaPhones = ed.lusha_phones as string[] | undefined
  if (lushaPhones?.length) phones.push(...lushaPhones)
  const datagmaPhones = ed.datagma_phones as string[] | undefined
  if (datagmaPhones?.length) phones.push(...datagmaPhones)
  const pdlPhones = ed.pdl_phones as string[] | undefined
  if (pdlPhones?.length) phones.push(...pdlPhones)
  const apolloPhones = (ed.phone_numbers as { sanitized_number?: string }[] | undefined)?.map(p => p.sanitized_number).filter(Boolean) as string[] | undefined
  if (apolloPhones?.length) phones.push(...apolloPhones)
  const bcPhones = ed.bettercontact_phones as string[] | undefined
  if (bcPhones?.length) phones.push(...bcPhones)
  const kasprPhones = ed.kaspr_phones as string[] | undefined
  if (kasprPhones?.length) phones.push(...kasprPhones)
  const cognismPhones = ed.cognism_phones as string[] | undefined
  if (cognismPhones?.length) phones.push(...cognismPhones)
  return Array.from(new Set(phones.filter(Boolean)))
}

function getAllEmails(ed: Record<string, unknown>, formEmail?: string | null): string[] {
  const emails: string[] = []
  if (formEmail) emails.push(formEmail)
  const lushaEmails = ed.lusha_emails as string[] | undefined
  if (lushaEmails?.length) emails.push(...lushaEmails)
  const pdlEmails = ed.pdl_emails as string[] | undefined
  if (pdlEmails?.length) emails.push(...pdlEmails)
  const coEmails = ed.contactout_emails as string[] | undefined
  if (coEmails?.length) emails.push(...coEmails)
  if (ed.hunter_email) emails.push(ed.hunter_email as string)
  if (ed.dropcontact_email) emails.push(ed.dropcontact_email as string)
  if (ed.findymail_email) emails.push(ed.findymail_email as string)
  if (ed.cognism_email) emails.push(ed.cognism_email as string)
  return Array.from(new Set(emails.filter(Boolean)))
}

export async function runEnrichmentPipeline(
  lead: EnrichmentLeadInput,
  keys: EnrichmentKeys
): Promise<EnrichmentPipelineResult> {
  const sources_used: string[] = []
  const sources_skipped: string[] = []
  const source_errors: Record<string, string> = {}

  // ── Gate check ───────────────────────────────────────────────────────────
  if (!lead.email && !lead.phone && !lead.linkedinUrl) {
    return { gate_passed: false, enriched_data: {}, sources_used, sources_skipped: ['all'] }
  }

  let ed: Record<string, unknown> = {}

  // ── Phase 1: Apollo ───────────────────────────────────────────────────────
  if (keys.apollo) {
    const apolloResult = await apolloEnrichPerson(keys.apollo, {
      email: lead.email || undefined,
      firstName: lead.firstName || undefined,
      lastName: lead.lastName || undefined,
      linkedinUrl: lead.linkedinUrl || undefined,
    })
    if (apolloResult.person) {
      const formatted = formatApolloDataForGemini(apolloResult.person)
      ed = { ...ed, ...formatted, apollo_raw: apolloResult.person }
      sources_used.push('apollo')
    } else {
      sources_used.push('apollo') // still ran, just no match
    }
  } else {
    sources_skipped.push('apollo')
  }

  // Resolve LinkedIn URL — from enrichment or original lead
  let linkedinUrl = (ed.linkedin_url as string | undefined) || lead.linkedinUrl || undefined

  // ── Phase 1b: Lusha (LinkedIn URL preferred, email fallback) ─────────────
  if (keys.lusha && (linkedinUrl || lead.email)) {
    const lushaResult = await lushaEnrichPerson(keys.lusha, {
      linkedinUrl: linkedinUrl || undefined,
      firstName: lead.firstName || undefined,
      lastName: lead.lastName || undefined,
      email: lead.email || undefined,
      company: (ed.current_company as string | undefined) || undefined,
    })
    if (lushaResult.person) {
      const lushaFormatted = formatLushaData(lushaResult.person)
      ed = { ...ed, ...lushaFormatted, lusha_raw: lushaResult.person }
      sources_used.push('lusha')
    } else {
      if (lushaResult.error) source_errors['lusha'] = lushaResult.error
      ed = { ...ed, lusha_raw: null }
      sources_used.push('lusha')
    }
  } else {
    sources_skipped.push('lusha')
  }

  // ── Phase 2a: PDL — runs when Apollo is missing profile, phones, or work email ─
  // Note: don't count the form-submitted phone — only enrichment-sourced phones count here
  const apolloFoundProfile = !!(ed.title || ed.current_company)
  const hasEnrichedPhone = getAllPhones(ed, null).length > 0
  const currentEmailForGate = (ed.email as string | undefined) || lead.email || undefined
  const hasWorkEmail = !!(currentEmailForGate && !isPersonalEmail(currentEmailForGate))
  if (keys.pdl && (!apolloFoundProfile || !hasEnrichedPhone || !hasWorkEmail)) {
    const pdlResult = await pdlEnrichPerson(keys.pdl, {
      email: lead.email,
      phone: lead.phone,
      firstName: lead.firstName,
      lastName: lead.lastName,
      linkedinUrl: linkedinUrl || lead.linkedinUrl,
      company: (ed.current_company as string | undefined) || undefined,
    })
    if (pdlResult.data) {
      // Preserve Apollo's title/company/linkedin — PDL only fills gaps
      const preMergeTitle = ed.title
      const preMergeCompany = ed.current_company
      const preMergeLinkedin = ed.linkedin_url
      ed = { ...ed, ...pdlResult.data }
      if (preMergeTitle) ed.title = preMergeTitle
      if (preMergeCompany) ed.current_company = preMergeCompany
      if (preMergeLinkedin) ed.linkedin_url = preMergeLinkedin
      // Resolve LinkedIn from PDL if not yet found
      if (!linkedinUrl && pdlResult.data.pdl_linkedin) {
        linkedinUrl = pdlResult.data.pdl_linkedin as string
        ed.linkedin_url = linkedinUrl
      }
    } else if (pdlResult.error) {
      source_errors['pdl'] = pdlResult.error
    }
    sources_used.push('pdl') // ran (data found or not)
  } else {
    sources_skipped.push('pdl')
  }

  // ── Phase 2b: Datagma (LinkedIn required) ────────────────────────────────
  if (keys.datagma && linkedinUrl) {
    const datagmaResult = await datagmaEnrichPerson(keys.datagma, { linkedinUrl })
    if (datagmaResult.data) {
      // Fill gaps only — don't overwrite Apollo data
      if (!ed.title && datagmaResult.data.datagma_title) ed.title = datagmaResult.data.datagma_title
      if (!ed.current_company && datagmaResult.data.datagma_company) ed.current_company = datagmaResult.data.datagma_company
      ed.datagma_phones = datagmaResult.data.datagma_phones
      if (datagmaResult.data.datagma_email) ed.datagma_email = datagmaResult.data.datagma_email
      ed.datagma_raw = datagmaResult.data.datagma_raw
    }
    sources_used.push('datagma') // ran (data found or not)
  } else {
    sources_skipped.push('datagma')
  }

  // ── Phase 3: Phone recovery ───────────────────────────────────────────────
  const phonesFound = getAllPhones(ed, lead.phone)
  if (phonesFound.length === 0 || (phonesFound.length === 1 && phonesFound[0] === lead.phone)) {
    // Only form phone — try to find a better one

    if (keys.bettercontact) {
      const bcResult = await bettercontactFindPhone(keys.bettercontact, {
        email: lead.email,
        firstName: lead.firstName,
        lastName: lead.lastName,
        company: ed.current_company as string | undefined,
        linkedinUrl: linkedinUrl,
      })
      if (bcResult.phones.length > 0) ed.bettercontact_phones = bcResult.phones
      sources_used.push('bettercontact') // ran (phones found or not)
    } else {
      sources_skipped.push('bettercontact')
    }

    if (keys.kaspr && linkedinUrl) {
      const kasprResult = await kasprFindPhone(keys.kaspr, { linkedinUrl })
      if (kasprResult.phones.length > 0) ed.kaspr_phones = kasprResult.phones
      sources_used.push('kaspr') // ran (phones found or not)
    } else {
      sources_skipped.push('kaspr')
    }

    if (keys.cognism) {
      const cognismResult = await cognismFindPhone(keys.cognism, {
        email: lead.email,
        linkedinUrl,
        firstName: lead.firstName,
        lastName: lead.lastName,
        company: ed.current_company as string | undefined,
      })
      if (cognismResult.phones.length > 0) {
        ed.cognism_phones = cognismResult.phones
        if (cognismResult.email) ed.cognism_email = cognismResult.email
      }
      sources_used.push('cognism') // ran (phones found or not)
    } else {
      sources_skipped.push('cognism')
    }
  } else {
    sources_skipped.push('bettercontact', 'kaspr', 'cognism')
  }

  // ── Phase 4: Email recovery (B2B only) ────────────────────────────────────
  const currentEmail = (ed.email as string | undefined) || lead.email || undefined
  const needsWorkEmail = !currentEmail || (!!currentEmail && isPersonalEmail(currentEmail))
  const companyDomain = currentEmail && !isPersonalEmail(currentEmail)
    ? extractDomainFromEmail(currentEmail)
    : (ed.company_website as string | undefined)?.replace(/^https?:\/\//, '').split('/')[0] || null

  if (needsWorkEmail) {
    if (keys.contactout && linkedinUrl) {
      const coResult = await contactoutFindEmails(keys.contactout, { linkedinUrl })
      if (coResult.emails.length > 0) {
        ed.contactout_emails = coResult.emails
        if (coResult.phones.length > 0) ed.contactout_phones = coResult.phones
      }
      sources_used.push('contactout') // ran (emails found or not)
    } else {
      sources_skipped.push('contactout')
    }

    if (keys.hunter && companyDomain && lead.firstName && lead.lastName) {
      const hunterResult = await hunterFindEmail(keys.hunter, {
        domain: companyDomain,
        firstName: lead.firstName,
        lastName: lead.lastName,
      })
      if (hunterResult.email) {
        ed.hunter_email = hunterResult.email
        ed.hunter_confidence = hunterResult.confidence
      }
      sources_used.push('hunter') // ran (email found or not)
    } else {
      sources_skipped.push('hunter')
    }

    if (keys.dropcontact && lead.firstName && lead.lastName && (companyDomain || ed.current_company)) {
      const dcResult = await dropcontactFindEmail(keys.dropcontact, {
        firstName: lead.firstName,
        lastName: lead.lastName,
        companyName: ed.current_company as string | undefined,
        companyDomain: companyDomain || undefined,
      })
      if (dcResult.emails.length > 0) {
        ed.dropcontact_email = dcResult.email
        ed.dropcontact_emails = dcResult.emails
      }
      sources_used.push('dropcontact') // ran (email found or not)
    } else {
      sources_skipped.push('dropcontact')
    }

    if (keys.findymail && (linkedinUrl || (companyDomain && lead.firstName && lead.lastName))) {
      const fmResult = await findymailFindEmail(keys.findymail, {
        linkedinUrl,
        firstName: lead.firstName,
        lastName: lead.lastName,
        domain: companyDomain,
      })
      if (fmResult.email) ed.findymail_email = fmResult.email
      sources_used.push('findymail') // ran (email found or not)
    } else {
      sources_skipped.push('findymail')
    }
  } else {
    sources_skipped.push('contactout', 'hunter', 'dropcontact', 'findymail')
  }

  // ── Phase 5: Enrow email verification ────────────────────────────────────
  if (keys.enrow) {
    const allEmails = getAllEmails(ed, lead.email)
    if (allEmails.length > 0) {
      const verifications = await enrowVerifyEmails(keys.enrow, allEmails)
      ed.enrow_verified_emails = verifications
      // Mark valid emails clearly
      ed.verified_emails = Object.entries(verifications)
        .filter(([, status]) => status === 'valid')
        .map(([email]) => email)
      sources_used.push('enrow')
    } else {
      sources_skipped.push('enrow')
    }
  } else {
    sources_skipped.push('enrow')
  }

  // ── Consolidate: add merged summary fields ────────────────────────────────
  ed.all_phones = getAllPhones(ed, lead.phone)
  ed.all_emails = getAllEmails(ed, lead.email)
  if (Object.keys(source_errors).length > 0) ed.source_errors = source_errors

  return {
    gate_passed: true,
    enriched_data: ed,
    sources_used,
    sources_skipped,
    source_errors,
  }
}
