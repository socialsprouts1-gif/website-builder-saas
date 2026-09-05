export interface SiteFile {
  path: string;
  content: string;
}

export interface SitePage {
  path: string;
  title: string;
  purpose: string;
  sections: string[];
}

export interface SiteBrief {
  businessName: string;
  businessType: string;
  tagline: string;
  audience: string;
  tone: string;
  colorDirection: string;
  pages: SitePage[];
  mustHave: string[];
  seo: { title: string; description: string; keywords: string[] };
}

export interface DesignSystem {
  palette: {
    background: string;
    surface: string;
    /** A second surface for alternating bands, so sections are not one flat colour. */
    surfaceAlt: string;
    text: string;
    textMuted: string;
    accent: string;
    accentContrast: string;
    /** A supporting colour used sparingly for depth — never a second brand colour. */
    accentSoft: string;
    border: string;
  };
  fonts: {
    display: string;
    body: string;
    googleFontsHref: string;
    /** clamp() expressions so type scales with the viewport. */
    scale: { hero: string; h2: string; h3: string; body: string };
  };
  /** Full CSS gradient values the page uses for hero and section treatments. */
  gradients: { hero: string; accent: string; subtle: string };
  /** Full CSS box-shadow values, smallest to largest. */
  shadows: { sm: string; md: string; lg: string };
  radius: string;
  radiusLarge: string;
  spacingScale: string[];
  /** How decorative SVG/CSS art should look: e.g. "soft organic blobs". */
  decor: string;
  mood: string;
}

export type GenerationStage =
  | 'queued'
  | 'brief'
  | 'design'
  | 'code'
  | 'persist'
  | 'done'
  | 'failed';

export interface GenerationEvent {
  type: 'stage' | 'token' | 'file' | 'done' | 'error' | 'meta';
  stage?: GenerationStage;
  message?: string;
  path?: string;
  delta?: string;
  projectId?: string;
  versionId?: string;
  model?: string;
  substituted?: boolean;
}

export interface ScreenshotExtraction {
  layoutRegions: string[];
  palette: string[];
  typography: string;
  components: string[];
  observedCopyThemes: string[];
  notes: string;
}
