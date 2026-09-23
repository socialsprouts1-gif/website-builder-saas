/**
 * Hand-maintained mirror of supabase/migrations/0001_init.sql.
 * Regenerate with `supabase gen types typescript` once you have a linked
 * project; the shape below is what the app code is written against.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type ProjectStatus = 'draft' | 'generating' | 'ready' | 'failed';
export type GenerationInputMode = 'prompt' | 'screenshot' | 'voice' | 'template';
export type VersionSource = 'initial' | 'chat' | 'visual_edit' | 'screenshot' | 'voice' | 'template';
export type ChatRole = 'user' | 'assistant' | 'system';

export type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  onboarding_business_type: string | null;
  default_model: string | null;
  voice_storage_enabled: boolean;
  is_admin: boolean;
  created_at: string;
}

export type ProjectRow = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  business_type: string | null;
  description: string | null;
  status: ProjectStatus;
  model: string | null;
  design_system: Json | null;
  current_version_id: string | null;
  is_template: boolean;
  vercel_project_id: string | null;
  vercel_project_name: string | null;
  deploy_url: string | null;
  custom_domain: string | null;
  /** Set when the site has a public address on Lumen. */
  published_at: string | null;
  public_slug: string | null;
  favicon_url: string | null;
  payment_url: string | null;
  payment_label: string | null;
  whatsapp_number: string | null;
  whatsapp_message: string | null;
  whatsapp_leads: boolean;
  booking_enabled: boolean;
  booking_services: string[];
  booking_note: string | null;
  shop_enabled: boolean;
  shop_cod_enabled: boolean;
  shop_payment_note: string | null;
  /** The template this site was built from (migration 0017). */
  blueprint_id: string | null;
  created_at: string;
  updated_at: string;
}

export type ProjectVersionRow = {
  id: string;
  project_id: string;
  version_number: number;
  label: string | null;
  source: VersionSource;
  files: Json;
  created_at: string;
}

export type GenerationJobRow = {
  id: string;
  project_id: string;
  user_id: string;
  status: string;
  stage: string | null;
  input_mode: GenerationInputMode;
  prompt_text: string | null;
  screenshot_url: string | null;
  model_used: string | null;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  error: string | null;
  /** Live progress a returning browser can read: {stage, message, files}. */
  progress: Json | null;
  /** The template this build fills in (migration 0017). */
  blueprint_id: string | null;
  created_at: string;
  completed_at: string | null;
}

export type ChatMessageRow = {
  id: string;
  project_id: string;
  role: ChatRole;
  content: string;
  version_id: string | null;
  created_at: string;
}

export type ChatbotRow = {
  id: string;
  project_id: string;
  name: string;
  greeting: string;
  tone: 'friendly' | 'professional' | 'concise';
  accent_color: string;
  embed_key: string;
  is_active: boolean;
  created_at: string;
  /** Why the last visitor question could not be answered, for the owner. */
  last_error: string | null;
  last_error_at: string | null;
}

export type ChatbotDocumentRow = {
  id: string;
  chatbot_id: string;
  source_type: 'site' | 'faq' | 'connector';
  title: string | null;
  content: string;
  created_at: string;
}

export type ChatbotEmbeddingRow = {
  id: string;
  document_id: string;
  chatbot_id: string;
  chunk_text: string;
  embedding: number[] | null;
  created_at: string;
}

export type ChatbotConversationRow = {
  id: string;
  chatbot_id: string;
  visitor_session_id: string;
  created_at: string;
}

export type ChatbotMessageRow = {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export type ApiKeyRow = {
  id: string;
  user_id: string;
  provider: string;
  encrypted_key: string;
  last4: string;
  is_active: boolean;
  validated_at: string | null;
  created_at: string;
}

export type ConnectorAccountRow = {
  id: string;
  user_id: string;
  provider: string;
  encrypted_credentials: string | null;
  metadata: Json;
  status: string;
  connected_at: string;
}

export type ConnectorProjectRow = {
  id: string;
  project_id: string;
  provider: string;
  config: Json;
  status: string;
  created_at: string;
}

export type UsageEventRow = {
  id: string;
  user_id: string;
  project_id: string | null;
  event_type: string;
  model: string | null;
  key_source: 'platform' | 'byok';
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  created_at: string;
}

export type SubscriptionRow = {
  id: string;
  user_id: string;
  razorpay_subscription_id: string | null;
  razorpay_customer_id: string | null;
  plan: string;
  status: string;
  gstin: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export type InvoiceRow = {
  id: string;
  subscription_id: string;
  razorpay_invoice_id: string | null;
  razorpay_payment_id: string | null;
  amount_paise: number;
  currency: string;
  gstin: string | null;
  pdf_url: string | null;
  status: string;
  issued_at: string;
}

export type TemplateRow = {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  project_id: string | null;
  preview_url: string | null;
  sort_order: number;
  is_published: boolean;
}

export type RateLimitEventRow = {
  id: number;
  bucket: string;
  created_at: string;
}

export type FlaggedContentRow = {
  id: string;
  project_id: string | null;
  reason: string;
  detail: string | null;
  resolved: boolean;
  created_at: string;
}

/** Supabase's generic expects Row/Insert/Update per table; keys are optional on write.
 *  These MUST be type aliases, not interfaces: postgrest constrains them to
 *  Record<string, unknown>, and only aliases get an implicit index signature. */
type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

/** An enquiry left on a published site by someone who is not a Lumen user. */
export type LeadRow = {
  id: string;
  project_id: string;
  name: string | null;
  contact: string | null;
  message: string | null;
  /** The page the form was on, so the owner knows what they were looking at. */
  page: string | null;
  /** 'enquiry' or 'booking'. A booking is an enquiry with a date on it. */
  kind: string;
  service: string | null;
  preferred_date: string | null;
  preferred_time: string | null;
  created_at: string;
  read_at: string | null;
}

/** Something that went wrong, written down where it can be read. */
export type ErrorEventRow = {
  id: string;
  user_id: string | null;
  project_id: string | null;
  scope: string;
  message: string;
  detail: Json | null;
  created_at: string;
}

/** A day's page views for one path of one site. */
export type SiteVisitRow = {
  project_id: string;
  day: string;
  path: string;
  views: number;
}

/** One person, one day, one site — as a hash that cannot be reversed. */
export type SiteVisitorRow = {
  project_id: string;
  day: string;
  visitor_hash: string;
}

/** Something a shop sells. Money is paise, always, and always an integer. */
export type ShopProductRow = {
  id: string;
  project_id: string;
  slug: string;
  title: string;
  description: string | null;
  summary: string | null;
  price_paise: number;
  compare_at_paise: number | null;
  category: string | null;
  /** Hosted image URLs, card image first. */
  images: Json;
  /** Null means the shop does not count stock. */
  stock: number | null;
  active: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

/** What it costs to send an order, and when that becomes free. */
export type ShopShippingRateRow = {
  id: string;
  project_id: string;
  label: string;
  note: string | null;
  price_paise: number;
  free_over_paise: number | null;
  position: number;
  active: boolean;
  created_at: string;
}

/** An order as placed. Every total is recorded, never recomputed later. */
export type ShopOrderRow = {
  id: string;
  project_id: string;
  reference: string;
  customer_name: string | null;
  customer_contact: string | null;
  customer_email: string | null;
  address: string | null;
  city: string | null;
  postcode: string | null;
  note: string | null;
  shipping_label: string | null;
  subtotal_paise: number;
  shipping_paise: number;
  total_paise: number;
  status: string;
  payment_method: string;
  created_at: string;
  updated_at: string;
}

export type ShopOrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  title: string;
  unit_paise: number;
  quantity: number;
  line_paise: number;
}

export type Database = {
  public: {
    Tables: {
      users: Table<UserRow>;
      projects: Table<ProjectRow>;
      project_versions: Table<ProjectVersionRow>;
      generation_jobs: Table<GenerationJobRow>;
      chat_messages: Table<ChatMessageRow>;
      chatbots: Table<ChatbotRow>;
      chatbot_documents: Table<ChatbotDocumentRow>;
      chatbot_embeddings: Table<ChatbotEmbeddingRow>;
      chatbot_conversations: Table<ChatbotConversationRow>;
      chatbot_messages: Table<ChatbotMessageRow>;
      api_keys: Table<ApiKeyRow>;
      connectors_account: Table<ConnectorAccountRow>;
      connectors_project: Table<ConnectorProjectRow>;
      usage_events: Table<UsageEventRow>;
      subscriptions: Table<SubscriptionRow>;
      invoices: Table<InvoiceRow>;
      templates: Table<TemplateRow>;
      rate_limit_events: Table<RateLimitEventRow>;
      flagged_content: Table<FlaggedContentRow>;
      leads: Table<LeadRow>;
      error_events: Table<ErrorEventRow>;
      site_visits: Table<SiteVisitRow>;
      site_visitors: Table<SiteVisitorRow>;
      shop_products: Table<ShopProductRow>;
      shop_shipping_rates: Table<ShopShippingRateRow>;
      shop_orders: Table<ShopOrderRow>;
      shop_order_items: Table<ShopOrderItemRow>;
    };
    Views: Record<never, never>;
    Functions: {
      match_chatbot_chunks: {
        Args: { p_chatbot_id: string; p_embedding: number[]; p_limit?: number };
        Returns: { chunk_text: string; similarity: number }[];
      };
      record_visit: {
        Args: { p_project: string; p_path: string; p_visitor: string };
        Returns: void;
      };
    };
    Enums: {
      project_status: ProjectStatus;
      generation_input_mode: GenerationInputMode;
      version_source: VersionSource;
    };
    CompositeTypes: Record<never, never>;
  };
}
