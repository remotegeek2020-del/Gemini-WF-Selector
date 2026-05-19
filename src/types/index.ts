export interface Account {
  id: string
  name: string
  slug: string
  nurture_enabled: boolean
  created_at: string
  updated_at: string
}

export interface UserRole {
  user_id: string
  role: 'agency_admin' | 'sub_account'
  account_id: string | null
}

export interface ApiKey {
  id: string
  account_id: string
  service: string
  key_value: string
  extra_data: Record<string, unknown> | null
  updated_at: string
}

export interface Persona {
  id: string
  account_id: string
  name: string
  description: string
  characteristics: string
  sample_person: string | null
  state: string | null
  county: string | null
  avatar_url: string | null
  highlevel_workflow_id: string | null
  highlevel_workflow_name: string | null
  color: string
  is_default: boolean
  pipeline: 'main' | 'nurture'
  created_at: string
  updated_at: string
}

export interface Lead {
  id: string
  account_id: string
  highlevel_contact_id: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  source: string | null
  pipeline: 'main' | 'nurture'
  raw_data: Record<string, unknown>
  enriched_data: Record<string, unknown> | null
  assigned_persona_id: string | null
  persona_reasoning: string | null
  status: LeadStatus
  workflow_triggered: boolean
  error_message: string | null
  created_at: string
  updated_at: string
  personas?: Persona | null
}

export type LeadStatus = 'pending' | 'enriching' | 'assigned' | 'failed' | 'no_persona'

export interface EnrichmentResult {
  persona_id: string | null
  reasoning: string
  enriched_data: Record<string, unknown>
}

export interface ApolloPersonData {
  id?: string
  first_name?: string
  last_name?: string
  name?: string
  linkedin_url?: string
  title?: string
  city?: string
  state?: string
  country?: string
  photo_url?: string
  twitter_url?: string
  github_url?: string
  facebook_url?: string
  extrapolated_email_confidence?: number
  headline?: string
  email?: string
  employment_history?: ApolloEmployment[]
  seniority?: string
  organization?: ApolloOrganization
}

export interface ApolloEmployment {
  id?: string
  created_at?: string
  current?: boolean
  degree?: string
  description?: string
  emails?: string[]
  end_date?: string
  grade_level?: string
  kind?: string
  major?: string
  organization_id?: string
  organization_name?: string
  raw_address?: string
  start_date?: string
  title?: string
}

export interface ApolloOrganization {
  id?: string
  name?: string
  website_url?: string
  linkedin_url?: string
  twitter_url?: string
  facebook_url?: string
  primary_phone?: { number?: string; source?: string }
  logo_url?: string
  crunchbase_url?: string
  primary_domain?: string
  sanitized_phone?: string
  market_cap?: string
  industry?: string
  keywords?: string[]
  estimated_num_employees?: number
  snippets_loaded?: boolean
  annual_revenue?: number
  annual_revenue_printed?: string
  total_funding?: number
  total_funding_printed?: string
  latest_funding_round_date?: string
  latest_funding_stage?: string
  founded_year?: number
  city?: string
  state?: string
  country?: string
}

export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'openrouter'

export interface AIConfig {
  provider: AIProvider
  model: string
  apiKey: string
}

export interface ReportSummary {
  total: number
  assigned: number
  pending: number
  failed: number
  no_persona: number
  enriching: number
}

export interface PersonaReport {
  persona_id: string | null
  persona_name: string
  persona_color: string
  count: number
  last_lead_date: string | null
}
