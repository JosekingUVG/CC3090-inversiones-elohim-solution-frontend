/** JSON configuration shared by the store editor and storefront. */
export type StoreBlock = {
  id: string;
  type: string;
  content?: string;
  url?: string;
  alt?: string;
  title?: string;
  price?: number;
};

export type SectionProperties = {
  backgroundColor?: string;
  textColor?: string;
  bannerText?: string;
  fontWeight?: string;
  linkAction?: string;
  linkUrl?: string;
  storeName?: string;
  logoUrl?: string;
  title?: string;
  subtitle?: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  backgroundImage?: string;
  layoutType?: string;
  copyrightText?: string;
  content?: string;
  primaryButtonAction?: string;
  primaryButtonValue?: string;
  secondaryButtonAction?: string;
  secondaryButtonValue?: string;
  headline?: string;
  heading?: string;
  subheadline?: string;
  subheading?: string;
  ctaText?: string;
  verticalPadding?: number;
  paddingVertical?: number;
  columns?: number;
  productsCount?: number;
  pageSize?: number;
  opacity?: number;
  blur?: number;
  overlayOpacity?: number;
  stickyBanner?: boolean;
  stickyHeader?: boolean;
  showSearch?: boolean;
  useGlassmorphism?: boolean;
  textShadow?: boolean;
  showReservations?: boolean;
  showCardPayments?: boolean;
  menuItems?: string[];
  blocks?: StoreBlock[];
};

export type StoreSection = {
  id: string;
  type: string;
  name: string;
  properties: SectionProperties;
};

export type StorePage = {
  id: string;
  name: string;
  isHome?: boolean;
  sections: StoreSection[];
};

export type StoreTheme = {
  backgroundColor?: string;
  accentColor?: string;
  backgroundGradient?: string;
  useGradient?: boolean;
  isDark?: boolean;
};

/** Older saved designs may only have the sections array. */
export type StoreVisualConfig = {
  pages?: StorePage[];
  sections?: StoreSection[];
  currentPageId?: string;
  theme?: StoreTheme;
};

/** The editor normalizes legacy designs to always contain pages. */
export type StoreConfig = StoreVisualConfig & { pages: StorePage[] };
