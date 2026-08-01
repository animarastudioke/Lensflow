# LensFlow - Premium SaaS Platform for Photographers & Videographers

A complete, production-ready platform inspired by Pixieset but built with modern architecture, premium UX, and enterprise-grade features.

## Features

- **Client Galleries** - Beautiful, responsive galleries with albums, collections, proofing, favorites, comments, and video delivery
- **File Management** - Drag-and-drop uploads with resumable, chunked transfers, automatic compression, thumbnail generation, and metadata preservation
- **Booking System** - Availability, packages, mini-sessions, questionnaires, contracts, deposits, calendar sync, and reminders
- **CRM** - Clients, leads, projects, tasks, notes, timeline, contracts, quotes, invoices, custom fields, tags, and activity history
- **Online Store** - Digital downloads, prints, frames, albums, photo books, canvas, USB packages with coupons, gift cards, cart, checkout, taxes, shipping, refunds, and multi-currency
- **Website Builder** - Portfolio, landing pages, pricing, contact, testimonials, blog, SEO, sitemap, custom domains, SSL, and themes
- **Business Tools** - Income/expense tracking, profit/revenue/tax reports, quotation builder, invoice/receipt generator
- **Notifications** - Email, SMS, WhatsApp, and in-app notifications
- **Team Management** - Roles, permissions, audit logs, and admin panel
- **Analytics** - Revenue, expenses, analytics dashboard

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend**: Next.js Route Handlers, Server Actions
- **Database**: Supabase PostgreSQL (with RLS, views, triggers)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Validation**: Zod
- **Forms**: React Hook Form
- **Email**: Resend
- **SMS/WhatsApp**: Africa's Talking
- **Payments**: Stripe, Flutterwave, M-Pesa, PayPal
- **Image Processing**: Sharp
- **Video Processing**: FFmpeg
- **Deployment**: Vercel, Supabase, GitHub

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Supabase account
- Stripe account (for payments)
- Resend account (for emails)
- Africa's Talking account (for SMS/WhatsApp)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/lensflow.git
   cd lensflow
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

4. Start Supabase locally:
   ```bash
   supabase start
   ```

5. Run database migrations:
   ```bash
   pnpm db:push
   ```

6. Generate TypeScript types:
   ```bash
   pnpm db:generate
   ```

7. Start development server:
   ```bash
   pnpm dev
   ```

8. Open http://localhost:3000

## Project Structure

```
lensflow/
├── .github/workflows/     # CI/CD pipelines
├── public/                # Static assets
├── src/
│   ├── app/               # Next.js 15 App Router
│   ├── components/        # Shared components
│   ├── features/          # Feature-based modules
│   ├── lib/               # Core utilities & clients
│   ├── hooks/             # Global React hooks
│   ├── stores/            # Zustand stores
│   ├── styles/            # Global styles
│   └── middleware.ts      # Next.js middleware
├── supabase/
│   ├── migrations/        # SQL migrations
│   ├── seed/              # Seed data
│   ├── functions/         # Edge Functions
│   └── types/             # Generated types
├── tests/                 # Unit, integration, e2e tests
├── docs/                  # Documentation
└── Configuration files
```

## Database

The database uses a normalized PostgreSQL schema with:
- Row Level Security (RLS) on all tables
- Comprehensive indexes for performance
- Foreign keys and constraints for data integrity
- Views for common queries
- Triggers for updated_at, audit logs, and webhook processing
- Seed data for development

Run migrations:
```bash
pnpm db:push          # Apply migrations
pnpm db:generate      # Generate TypeScript types
pnpm db:reset         # Reset database (dev only)
```

## Testing

```bash
pnpm test             # Run unit tests
pnpm test:watch       # Watch mode
pnpm test:ui          # UI mode
pnpm test:e2e         # Run e2e tests
pnpm test:e2e:ui      # E2E UI mode
```

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Configure environment variables
3. Deploy

### Manual Build

```bash
pnpm build
pnpm start
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- Documentation: [docs.lensflow.io](https://docs.lensflow.io)
- Issues: [GitHub Issues](https://github.com/your-org/lensflow/issues)
- Email: support@lensflow.io