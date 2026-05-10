/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly PUBLIC_SITE_URL: string;
  readonly PUBLIC_API_BASE: string;
  readonly PUBLIC_ADSENSE_PUBLISHER_ID: string;
  readonly PUBLIC_ADBLOCK_MODAL_ENABLED: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
