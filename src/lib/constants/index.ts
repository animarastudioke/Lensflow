export const APP_CONSTANTS = {
  NAME: 'LensFlow',
  DESCRIPTION: 'Premium SaaS platform for photographers and videographers',
  VERSION: '0.1.0',
  URL: process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000',
  SUPPORT_EMAIL: 'support@lensflow.co.ke',
  SUPPORT_URL: 'https://docs.lensflow.co.ke',
  TERMS_URL: 'https://lensflow.co.ke/terms',
  PRIVACY_URL: 'https://lensflow.co.ke/privacy',
} as const

export const AUTH_CONSTANTS = {
  SESSION_COOKIE_NAME: 'lensflow-session',
  REFRESH_COOKIE_NAME: 'lensflow-refresh',
  MAX_SESSION_AGE: 60 * 60 * 24 * 30, // 30 days
  MAX_REFRESH_AGE: 60 * 60 * 24 * 365, // 1 year
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  MAGIC_LINK_EXPIRY: 60 * 60, // 1 hour
  OTP_EXPIRY: 60 * 10, // 10 minutes
  RATE_LIMIT_WINDOW: 60 * 15, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 10,
} as const

export const UPLOAD_CONSTANTS = {
  MAX_FILE_SIZE: 52428800, // 50MB
  MAX_VIDEO_SIZE: 1073741824, // 1GB
  MAX_ZIP_SIZE: 536870912, // 512MB
  CHUNK_SIZE: 5242880, // 5MB
  MAX_CHUNKS: 200,
  ALLOWED_IMAGE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/tiff',
    'image/webp',
    'image/heic',
    'image/avif',
    'image/x-canon-cr2',
    'image/x-canon-cr3',
    'image/x-nikon-nef',
    'image/x-sony-arw',
    'image/x-panasonic-rw2',
    'image/x-olympus-orf',
    'image/x-fuji-raf',
    'image/x-adobe-dng',
  ],
  ALLOWED_VIDEO_TYPES: [
    'video/mp4',
    'video/quicktime',
    'video/x-matroska',
    'video/webm',
    'video/x-msvideo',
  ],
  ALLOWED_RAW_EXTENSIONS: [
    '.cr2', '.cr3', '.nef', '.nrw', '.arw', '.rw2', '.orf', '.raf',
    '.dng', '.pef', '.srw', '.x3f', '.mef', '.mos', '.mrw', '.raw',
    '.rwl', '.dcr', '.k25', '.kdc', '.erf', '.fff', '.iiq', '.3fr', '.cap',
  ],
  THUMBNAIL_SIZES: [150, 300, 600, 1200],
  PREVIEW_SIZES: [1920, 2560, 3840],
  VIDEO_THUMBNAIL_TIME: 1, // seconds
  ZIP_MAX_FILES: 1000,
} as const

export const GALLERY_CONSTANTS = {
  MAX_GALLERIES_PER_STUDIO: 10000,
  MAX_ALBUMS_PER_GALLERY: 500,
  MAX_MEDIA_PER_ALBUM: 5000,
  MAX_COLLECTIONS_PER_GALLERY: 100,
  MAX_SHARE_LINKS_PER_GALLERY: 50,
  DEFAULT_PASSWORD_LENGTH: 8,
  DEFAULT_PIN_LENGTH: 6,
  SLUG_MAX_LENGTH: 100,
  TITLE_MAX_LENGTH: 200,
  DESCRIPTION_MAX_LENGTH: 2000,
  WATERMARK_MAX_OPACITY: 100,
  WATERMARK_MIN_OPACITY: 10,
  SLIDESHOW_INTERVAL_MIN: 3,
  SLIDESHOW_INTERVAL_MAX: 30,
} as const

export const BOOKING_CONSTANTS = {
  MAX_PACKAGES_PER_STUDIO: 100,
  MAX_AVAILABILITY_RULES: 500,
  MIN_SESSION_DURATION: 15, // minutes
  MAX_SESSION_DURATION: 480, // 8 hours
  DEPOSIT_MIN_PERCENT: 0,
  DEPOSIT_MAX_PERCENT: 100,
  CANCELLATION_NOTICE_MIN: 0, // hours
  CANCELLATION_NOTICE_MAX: 720, // 30 days
  RESCHEDULE_NOTICE_MIN: 1, // hours
  REMINDER_INTERVALS: [24, 2, 1], // hours before
  QUESTIONNAIRE_MAX_QUESTIONS: 50,
  CONTRACT_MAX_PAGES: 20,
} as const

export const STORE_CONSTANTS = {
  MAX_PRODUCTS_PER_STUDIO: 5000,
  MAX_VARIANTS_PER_PRODUCT: 50,
  MAX_IMAGES_PER_PRODUCT: 20,
  MAX_CATEGORIES: 100,
  MAX_COUPONS: 500,
  MAX_GIFT_CARDS: 10000,
  COUPON_CODE_MIN_LENGTH: 4,
  COUPON_CODE_MAX_LENGTH: 20,
  GIFT_CARD_CODE_LENGTH: 16,
  MIN_PRICE: 0,
  MAX_PRICE: 1000000,
  TAX_RATE_MIN: 0,
  TAX_RATE_MAX: 100,
  SHIPPING_ZONES_MAX: 50,
  INVENTORY_TRACKING: true,
  LOW_STOCK_THRESHOLD: 5,
} as const

export const PAYMENT_CONSTANTS = {
  SUPPORTED_CURRENCIES: [
    'USD', 'KES', 'NGN', 'ZAR', 'GHS', 'UGX', 'TZS', 'RWF', 'XOF', 'XAF', 'EUR', 'GBP',
  ],
  DEFAULT_CURRENCY: 'USD',
  MIN_AMOUNT: 50, // cents
  MAX_AMOUNT: 100000000, // cents (1M)
  REFUND_WINDOW_DAYS: 90,
  STRIPE_MIN_AMOUNT: 50,
  FLUTTERWAVE_MIN_AMOUNT: 10,
  MPESA_MIN_AMOUNT: 1,
  PAYPAL_MIN_AMOUNT: 10,
  WEBHOOK_TIMEOUT: 30000,
  IDEMPOTENCY_KEY_TTL: 86400, // 24 hours
} as const

export const NOTIFICATION_CONSTANTS = {
  MAX_IN_APP_NOTIFICATIONS: 1000,
  NOTIFICATION_RETENTION_DAYS: 90,
  EMAIL_BATCH_SIZE: 100,
  SMS_BATCH_SIZE: 50,
  WHATSAPP_BATCH_SIZE: 50,
  DIGEST_INTERVALS: {
    immediate: 0,
    hourly: 60,
    daily: 1440,
    weekly: 10080,
  },
  PRIORITY_LEVELS: ['low', 'normal', 'high', 'urgent'] as const,
  CHANNELS: ['email', 'sms', 'whatsapp', 'in_app', 'push'] as const,
} as const

export const UI_CONSTANTS = {
  SIDEBAR_WIDTH: 280,
  SIDEBAR_COLLAPSED_WIDTH: 72,
  HEADER_HEIGHT: 64,
  FOOTER_HEIGHT: 48,
  MOBILE_BREAKPOINT: 768,
  TABLET_BREAKPOINT: 1024,
  DESKTOP_BREAKPOINT: 1280,
  TOAST_DURATION: 5000,
  TOAST_MAX_COUNT: 5,
  MODAL_Z_INDEX: 50,
  DROPDOWN_Z_INDEX: 40,
  TOOLTIP_Z_INDEX: 30,
  DEBOUNCE_MS: 300,
  THROTTLE_MS: 100,
  ANIMATION_DURATION: 200,
} as const

export const SEO_CONSTANTS = {
  DEFAULT_TITLE: 'LensFlow - Premium Gallery Platform for Photographers',
  DEFAULT_DESCRIPTION: 'Deliver photos, manage clients, book sessions, sell prints, and grow your photography business with LensFlow.',
  DEFAULT_OG_IMAGE: '/og-default.png',
  TWITTER_HANDLE: '@lensflow',
  SITE_NAME: 'LensFlow',
  MAX_TITLE_LENGTH: 60,
  MAX_DESCRIPTION_LENGTH: 160,
} as const

export const DATE_CONSTANTS = {
  DEFAULT_TIMEZONE: 'UTC',
  DATE_FORMAT: 'PPP',
  TIME_FORMAT: 'p',
  DATETIME_FORMAT: 'PPpp',
  ISO_FORMAT: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  WEEK_START: 1, // Monday
} as const

export const PAGINATION_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 5,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const

export const SEARCH_CONSTANTS = {
  MIN_QUERY_LENGTH: 2,
  MAX_QUERY_LENGTH: 100,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  HIGHLIGHT_TAG: 'mark',
  FUZZINESS: 0.3,
} as const

export const AUDIT_CONSTANTS = {
  RETENTION_DAYS: 2555, // 7 years
  BATCH_SIZE: 100,
  EXPORT_MAX_ROWS: 10000,
  SENSITIVE_FIELDS: [
    'password',
    'token',
    'secret',
    'key',
    'credit_card',
    'ssn',
    'passport',
  ],
} as const