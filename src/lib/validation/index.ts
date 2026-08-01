import { z } from 'zod'

export const emailSchema = z.string().email('Invalid email address').max(254)

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[\p{L}\p{N}\s\-'.]+$/u, 'Name contains invalid characters')

export const slugSchema = z
  .string()
  .min(1, 'Slug is required')
  .max(100, 'Slug must be less than 100 characters')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug can only contain lowercase letters, numbers, and hyphens')

export const urlSchema = z.string().url('Invalid URL').max(2048)

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number')
  .max(15)

export const uuidSchema = z.string().uuid('Invalid UUID')

export const dateSchema = z.string().date('Invalid date')

export const datetimeSchema = z.string().datetime('Invalid datetime')

export const jsonSchema = z.string().json('Invalid JSON')

export const positiveIntSchema = z.coerce.number().int().positive('Must be a positive integer')

export const nonNegativeIntSchema = z.coerce.number().int().nonnegative('Must be a non-negative integer')

export const priceSchema = z.coerce.number().int().min(0, 'Price cannot be negative').max(100000000, 'Price too high')

export const percentageSchema = z.coerce.number().min(0).max(100, 'Percentage must be between 0 and 100')

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
})

export const searchSchema = z.object({
  q: z.string().min(2).max(100).optional(),
  filters: z.record(z.unknown()).optional(),
  ...paginationSchema.shape,
})

export const idParamSchema = z.object({
  id: uuidSchema,
})

export const idsBodySchema = z.object({
  ids: z.array(uuidSchema).min(1).max(100),
})

export const fileUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(100),
  size: z.number().int().positive().max(1073741824),
  checksum: z.string().optional(),
})

export const createStudioSchema = z.object({
  name: nameSchema,
  slug: slugSchema.optional(),
  domain: z.string().max(253).optional(),
  timezone: z.string().default('UTC'),
  currency: z.string().length(3).default('USD'),
  locale: z.string().max(10).default('en'),
})

export const updateStudioSchema = createStudioSchema.partial()

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(['photographer', 'team_member', 'editor']),
  message: z.string().max(500).optional(),
})

export const updateMemberSchema = z.object({
  role: z.enum(['photographer', 'team_member', 'editor']).optional(),
  status: z.enum(['active', 'inactive', 'pending']).optional(),
})

export const createClientSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  phone: phoneSchema.optional(),
  address: z.object({
    line1: z.string().max(200).optional(),
    line2: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    postalCode: z.string().max(20).optional(),
    country: z.string().length(2).optional(),
  }).optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  customFields: z.record(z.unknown()).optional(),
})

export const updateClientSchema = createClientSchema.partial()

export const createLeadSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  phone: phoneSchema.optional(),
  source: z.string().max(100).optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']).default('new'),
  value: priceSchema.optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  customFields: z.record(z.unknown()).optional(),
})

export const updateLeadSchema = createLeadSchema.partial()

export const createProjectSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
  clientId: uuidSchema,
  type: z.enum(['wedding', 'portrait', 'event', 'commercial', 'product', 'real_estate', 'other']),
  status: z.enum(['inquiry', 'booked', 'in_progress', 'delivered', 'completed', 'cancelled']).default('inquiry'),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  location: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  customFields: z.record(z.unknown()).optional(),
})

export const updateProjectSchema = createProjectSchema.partial()

export const createGallerySchema = z.object({
  projectId: uuidSchema.optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
  slug: slugSchema.optional(),
  status: z.enum(['draft', 'private', 'shared', 'public', 'archived']).default('draft'),
  password: z.string().min(4).max(50).optional().nullable(),
  pin: z.string().length(6).regex(/^\d+$/).optional().nullable(),
  allowDownload: z.boolean().default(true),
  allowFavorites: z.boolean().default(true),
  allowComments: z.boolean().default(true),
  allowProofing: z.boolean().default(false),
  watermarkEnabled: z.boolean().default(false),
  watermarkOpacity: z.number().int().min(10).max(100).default(50),
  watermarkPosition: z.enum(['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right']).default('center'),
  expiresAt: datetimeSchema.optional().nullable(),
  settings: z.record(z.unknown()).optional(),
})

export const updateGallerySchema = createGallerySchema.partial()

export const createAlbumSchema = z.object({
  galleryId: uuidSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  coverImageId: uuidSchema.optional().nullable(),
  order: z.number().int().nonnegative().default(0),
  isVisible: z.boolean().default(true),
})

export const updateAlbumSchema = createAlbumSchema.partial()

export const reorderAlbumsSchema = z.object({
  albumIds: z.array(uuidSchema).min(1),
})

export const mediaUploadSchema = z.object({
  albumId: uuidSchema.optional(),
  galleryId: uuidSchema,
  files: z.array(fileUploadSchema).min(1).max(100),
})

export const updateMediaSchema = z.object({
  filename: z.string().min(1).max(255).optional(),
  altText: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
  isHidden: z.boolean().optional(),
})

export const batchMediaSchema = z.object({
  mediaIds: z.array(uuidSchema).min(1).max(500),
  action: z.enum(['move', 'delete', 'hide', 'unhide', 'download', 'add_to_album', 'remove_from_album']),
  targetAlbumId: uuidSchema.optional(),
  targetGalleryId: uuidSchema.optional(),
})

export const createBookingPackageSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(5000).optional(),
  price: priceSchema,
  duration: z.number().int().positive().max(480),
  includes: z.array(z.string().max(200)).max(20).optional(),
  maxAttendees: z.number().int().positive().default(1),
  requiresDeposit: z.boolean().default(true),
  depositPercentage: percentageSchema.default(25),
  depositAmount: priceSchema.optional(),
  cancellationPolicy: z.string().max(2000).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().nonnegative().default(0),
})

export const updateBookingPackageSchema = createBookingPackageSchema.partial()

export const createAvailabilitySchema = z.object({
  packageId: uuidSchema.optional(),
  dayOfWeek: z.number().int().min(0).max(6), // 0 = Sunday
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  timezone: z.string().default('UTC'),
  isRecurring: z.boolean().default(true),
  exceptions: z.array(dateSchema).optional(),
  maxBookingsPerSlot: z.number().int().positive().default(1),
  bufferBefore: z.number().int().nonnegative().default(0),
  bufferAfter: z.number().int().nonnegative().default(0),
})

export const updateAvailabilitySchema = createAvailabilitySchema.partial()

export const createBookingSchema = z.object({
  packageId: uuidSchema,
  clientId: uuidSchema,
  startDateTime: datetimeSchema,
  endDateTime: datetimeSchema,
  timezone: z.string().default('UTC'),
  depositPaid: z.boolean().default(false),
  depositAmount: priceSchema.optional(),
  notes: z.string().max(5000).optional(),
  questionnaireResponses: z.record(z.unknown()).optional(),
  customFields: z.record(z.unknown()).optional(),
})

export const updateBookingSchema = createBookingSchema.partial()

export const createContractSchema = z.object({
  projectId: uuidSchema,
  clientId: uuidSchema,
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
  status: z.enum(['draft', 'sent', 'viewed', 'signed', 'declined', 'expired']).default('draft'),
  expiresAt: datetimeSchema.optional().nullable(),
  requiresSignature: z.boolean().default(true),
  signatureFields: z.array(z.object({
    label: z.string().max(100),
    required: z.boolean().default(true),
    type: z.enum(['signature', 'initials', 'date', 'text', 'checkbox']),
  })).max(10).optional(),
})

export const updateContractSchema = createContractSchema.partial()

export const createQuoteSchema = z.object({
  projectId: uuidSchema,
  clientId: uuidSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
  lineItems: z.array(z.object({
    description: z.string().min(1).max(500),
    quantity: z.number().int().positive().max(10000),
    unitPrice: priceSchema,
    taxRate: percentageSchema.default(0),
    discount: priceSchema.default(0),
  })).min(1).max(100),
  subtotal: priceSchema,
  taxTotal: priceSchema.default(0),
  discountTotal: priceSchema.default(0),
  total: priceSchema,
  currency: z.string().length(3).default('USD'),
  status: z.enum(['draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'converted']).default('draft'),
  validUntil: dateSchema.optional().nullable(),
  notes: z.string().max(5000).optional(),
  terms: z.string().max(10000).optional(),
})

export const updateQuoteSchema = createQuoteSchema.partial()

export const createInvoiceSchema = z.object({
  projectId: uuidSchema,
  clientId: uuidSchema,
  quoteId: uuidSchema.optional().nullable(),
  title: z.string().min(1).max(200),
  lineItems: z.array(z.object({
    description: z.string().min(1).max(500),
    quantity: z.number().int().positive().max(10000),
    unitPrice: priceSchema,
    taxRate: percentageSchema.default(0),
    discount: priceSchema.default(0),
  })).min(1).max(100),
  subtotal: priceSchema,
  taxTotal: priceSchema.default(0),
  discountTotal: priceSchema.default(0),
  total: priceSchema,
  currency: z.string().length(3).default('USD'),
  status: z.enum(['draft', 'sent', 'viewed', 'paid', 'partial', 'overdue', 'void', 'refunded']).default('draft'),
  dueDate: dateSchema,
  notes: z.string().max(5000).optional(),
  terms: z.string().max(10000).optional(),
})

export const updateInvoiceSchema = createInvoiceSchema.partial()

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
  type: z.enum(['digital', 'print', 'frame', 'album', 'book', 'canvas', 'usb', 'package']),
  category: z.string().max(100).optional(),
  sku: z.string().max(100).optional(),
  basePrice: priceSchema,
  salePrice: priceSchema.optional().nullable(),
  currency: z.string().length(3).default('USD'),
  taxRate: percentageSchema.default(0),
  trackInventory: z.boolean().default(false),
  inventory: z.number().int().nonnegative().default(0),
  lowStockThreshold: z.number().int().nonnegative().default(5),
  weight: z.number().nonnegative().optional(), // grams
  dimensions: z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
  }).optional(), // cm
  shippingClass: z.string().max(50).optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().nonnegative().default(0),
  tags: z.array(z.string().max(50)).max(20).optional(),
  seo: z.object({
    title: z.string().max(60).optional(),
    description: z.string().max(160).optional(),
    keywords: z.array(z.string().max(50)).max(10).optional(),
  }).optional(),
})

export const updateProductSchema = createProductSchema.partial()

export const createProductVariantSchema = z.object({
  productId: uuidSchema,
  name: z.string().min(1).max(100),
  sku: z.string().max(100).optional(),
  price: priceSchema,
  salePrice: priceSchema.optional().nullable(),
  weight: z.number().nonnegative().optional(),
  dimensions: z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
  }).optional(),
  inventory: z.number().int().nonnegative().default(0),
  lowStockThreshold: z.number().int().nonnegative().default(5),
  attributes: z.record(z.string()).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().nonnegative().default(0),
})

export const updateProductVariantSchema = createProductVariantSchema.partial()

export const createCouponSchema = z.object({
  code: z.string().min(4).max(20).regex(/^[A-Z0-9]+$/),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['percentage', 'fixed', 'free_shipping']),
  value: priceSchema,
  currency: z.string().length(3).default('USD'),
  minOrderAmount: priceSchema.optional().nullable(),
  maxDiscount: priceSchema.optional().nullable(),
  usageLimit: z.number().int().positive().optional().nullable(),
  usageLimitPerCustomer: z.number().int().positive().default(1),
  startsAt: datetimeSchema.optional().nullable(),
  expiresAt: datetimeSchema.optional().nullable(),
  applicableProducts: z.array(uuidSchema).optional(),
  applicableCategories: z.array(z.string()).optional(),
  excludedProducts: z.array(uuidSchema).optional(),
  isActive: z.boolean().default(true),
})

export const updateCouponSchema = createCouponSchema.partial()

export const createOrderSchema = z.object({
  clientId: uuidSchema,
  email: emailSchema,
  currency: z.string().length(3).default('USD'),
  items: z.array(z.object({
    productId: uuidSchema,
    variantId: uuidSchema.optional().nullable(),
    quantity: z.number().int().positive().max(100),
    unitPrice: priceSchema,
    totalPrice: priceSchema,
  })).min(1).max(100),
  subtotal: priceSchema,
  discountTotal: priceSchema.default(0),
  taxTotal: priceSchema.default(0),
  shippingTotal: priceSchema.default(0),
  total: priceSchema,
  status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']).default('pending'),
  paymentStatus: z.enum(['pending', 'partial', 'paid', 'refunded', 'failed']).default('pending'),
  fulfillmentStatus: z.enum(['unfulfilled', 'partial', 'fulfilled']).default('unfulfilled'),
  shippingAddress: z.object({
    firstName: z.string().max(100),
    lastName: z.string().max(100),
    line1: z.string().max(200),
    line2: z.string().max(200).optional(),
    city: z.string().max(100),
    state: z.string().max(100),
    postalCode: z.string().max(20),
    country: z.string().length(2),
    phone: phoneSchema.optional(),
  }).optional(),
  billingAddress: z.object({
    firstName: z.string().max(100),
    lastName: z.string().max(100),
    line1: z.string().max(200),
    line2: z.string().max(200).optional(),
    city: z.string().max(100),
    state: z.string().max(100),
    postalCode: z.string().max(20),
    country: z.string().length(2),
  }).optional(),
  notes: z.string().max(5000).optional(),
  customerNotes: z.string().max(2000).optional(),
  couponCode: z.string().max(20).optional().nullable(),
})

export const updateOrderSchema = createOrderSchema.partial()

export const createWebsiteSchema = z.object({
  name: z.string().min(1).max(100),
  subdomain: z.string().min(1).max(63).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  customDomain: z.string().max(253).optional().nullable(),
  theme: z.string().max(50).default('default'),
  settings: z.record(z.unknown()).optional(),
  seo: z.object({
    title: z.string().max(60).optional(),
    description: z.string().max(160).optional(),
    keywords: z.array(z.string().max(50)).max(10).optional(),
    ogImage: urlSchema.optional().nullable(),
  }).optional(),
  isPublished: z.boolean().default(false),
})

export const updateWebsiteSchema = createWebsiteSchema.partial()

export type EmailSchema = z.infer<typeof emailSchema>
export type PasswordSchema = z.infer<typeof passwordSchema>
export type NameSchema = z.infer<typeof nameSchema>
export type SlugSchema = z.infer<typeof slugSchema>
export type PaginationSchema = z.infer<typeof paginationSchema>
export type SearchSchema = z.infer<typeof searchSchema>
export type CreateStudioSchema = z.infer<typeof createStudioSchema>
export type UpdateStudioSchema = z.infer<typeof updateStudioSchema>
export type InviteMemberSchema = z.infer<typeof inviteMemberSchema>
export type UpdateMemberSchema = z.infer<typeof updateMemberSchema>
export type CreateClientSchema = z.infer<typeof createClientSchema>
export type UpdateClientSchema = z.infer<typeof updateClientSchema>
export type CreateLeadSchema = z.infer<typeof createLeadSchema>
export type UpdateLeadSchema = z.infer<typeof updateLeadSchema>
export type CreateProjectSchema = z.infer<typeof createProjectSchema>
export type UpdateProjectSchema = z.infer<typeof updateProjectSchema>
export type CreateGallerySchema = z.infer<typeof createGallerySchema>
export type UpdateGallerySchema = z.infer<typeof updateGallerySchema>
export type CreateAlbumSchema = z.infer<typeof createAlbumSchema>
export type UpdateAlbumSchema = z.infer<typeof updateAlbumSchema>
export type ReorderAlbumsSchema = z.infer<typeof reorderAlbumsSchema>
export type MediaUploadSchema = z.infer<typeof mediaUploadSchema>
export type UpdateMediaSchema = z.infer<typeof updateMediaSchema>
export type BatchMediaSchema = z.infer<typeof batchMediaSchema>
export type CreateBookingPackageSchema = z.infer<typeof createBookingPackageSchema>
export type UpdateBookingPackageSchema = z.infer<typeof updateBookingPackageSchema>
export type CreateAvailabilitySchema = z.infer<typeof createAvailabilitySchema>
export type UpdateAvailabilitySchema = z.infer<typeof updateAvailabilitySchema>
export type CreateBookingSchema = z.infer<typeof createBookingSchema>
export type UpdateBookingSchema = z.infer<typeof updateBookingSchema>
export type CreateContractSchema = z.infer<typeof createContractSchema>
export type UpdateContractSchema = z.infer<typeof updateContractSchema>
export type CreateQuoteSchema = z.infer<typeof createQuoteSchema>
export type UpdateQuoteSchema = z.infer<typeof updateQuoteSchema>
export type CreateInvoiceSchema = z.infer<typeof createInvoiceSchema>
export type UpdateInvoiceSchema = z.infer<typeof updateInvoiceSchema>
export type CreateProductSchema = z.infer<typeof createProductSchema>
export type UpdateProductSchema = z.infer<typeof updateProductSchema>
export type CreateProductVariantSchema = z.infer<typeof createProductVariantSchema>
export type UpdateProductVariantSchema = z.infer<typeof updateProductVariantSchema>
export type CreateCouponSchema = z.infer<typeof createCouponSchema>
export type UpdateCouponSchema = z.infer<typeof updateCouponSchema>
export type CreateOrderSchema = z.infer<typeof createOrderSchema>
export type UpdateOrderSchema = z.infer<typeof updateOrderSchema>
export type CreateWebsiteSchema = z.infer<typeof createWebsiteSchema>
export type UpdateWebsiteSchema = z.infer<typeof updateWebsiteSchema>