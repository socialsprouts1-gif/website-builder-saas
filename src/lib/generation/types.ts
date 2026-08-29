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
    text: string;
    textMuted: string;
    accent: string;
    accentContrast: string;
    border: string;
  };
  fonts: { display: string; body: string; googleFontsHref: string };
  radius: string;
  spacingScale: string[];
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
