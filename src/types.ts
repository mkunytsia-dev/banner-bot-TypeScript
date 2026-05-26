/**
 * Shared types for the banner-bot pipeline.
 */

/** Params passed to a template's render function. */
export interface BannerParams {
  title?: string;
  subtitle?: string;
  dateRange?: string;
  variant?: string;
  theme?: string;

  // Logo slots
  partnerLogo?: string;
  partnerLogo1?: string;
  partnerLogo2?: string;
  partnerLogo3?: string;
  cryptoIcon?: string;
  cryptoIcons?: string[];
  rightImage?: string;

  // SVG uploads resolved by web-server.js (svgId → logoSvg)
  logoSvg?: string;
  logoSvg1?: string;
  logoSvg2?: string;
  logoSvg3?: string;

  // Pre-rasterized partner logo (for template 7 / collaboration)
  partnerLogoRaster?: string;
  partnerLogoRasterW?: number;
  partnerLogoRasterH?: number;

  // Slider value (collaboration template)
  partnerHeight?: string;

  // Recolor toggle (legacy, currently unused)
  recolor?: string;
}

/** A single template definition in the TEMPLATES registry. */
export interface Template {
  name: string;
  description: string;
  render: (params: BannerParams) => string;
  fields: string[];
}

/** Map of templateId → Template. */
export type TemplateRegistry = Record<string, Template>;

/** A pending approval request. */
export interface PendingRequest {
  id: string;
  requester: string;
  slackHandle: string;
  templateId: string;
  params: BannerParams;
  pngFile: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt?: string;
  rejectReason?: string;
  decidedBy?: string;
}
