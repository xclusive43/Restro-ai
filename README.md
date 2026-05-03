# 🍽️ RestroAI — Smart Restaurant Management System

> A full-stack, real-time restaurant management platform built with **Next.js 16**, **Firebase**, and **TypeScript**. Supports QR-based table ordering, live kitchen management for staff, and a feature-rich admin dashboard with analytics.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Tech Stack](#-tech-stack)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Firestore Collections](#-firestore-collections)
- [User Roles](#-user-roles)
- [Pages & Routes](#-pages--routes)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Firebase Setup](#-firebase-setup)
- [Firestore Security Rules](#-firestore-security-rules)
- [Firebase Storage Rules](#-firebase-storage-rules)
- [Deployment](#-deployment)
- [Known Issues & Notes](#-known-issues--notes)

---

## 🧭 Overview

RestroAI is a production-ready restaurant management system that enables:

- **Customers** to scan a QR code at their table, browse the menu, and place orders directly from their phone — no app install required.
- **Staff** to receive and manage orders in real time, track kitchen status, and view shift analytics.
- **Admins** to manage the full restaurant — menu, categories, staff, promotional banners, settings, and view live revenue insights.

All data flows are **real-time via Firestore listeners**, so changes are instantly reflected across all connected devices.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + custom CSS variables |
| UI Components | [shadcn/ui](https://ui.shadcn.com/) (Dialog, Input, Button, Skeleton, Card) |
| Backend / DB | Firebase (Firestore, Auth, Storage, Realtime DB) |
| State Management | [Zustand](https://zustand-demo.pmnd.rs/) |
| Notifications | [Sonner](https://sonner.emilkowal.ski/) |
| Animations | [Framer Motion](https://www.framer.com/motion/) |
| Charts | Custom pure SVG `LineChart` (zero dependencies) |
| QR Codes | [qrcode](https://www.npmjs.com/package/qrcode) |
| Icons | [Lucide React](https://lucide.dev/) + inline SVGs |

---

## ✨ Features

### Customer Portal
- 📱 **QR Table Tracking** — Scan a table QR to auto-assign orders to a table
- 🛒 **Live Shopping Cart** — Add/remove items, view subtotal, GST, platform fee breakdown
- 🔍 **Menu Search** — Instant client-side search across item name and description
- 🗂 **Category Tabs** — Filter menu by category, scrollable tabs
- 🎠 **Offer Banner Slider** — Auto-scrolling promotional banners with touch/swipe support, gradient or background image, dots & arrow navigation
- 🧾 **Receipt Page** — Printable receipt after order is served
- 👤 **Guest & Registered** ordering — No login required for customers

### Staff Portal
- 📊 **Shift Dashboard** — Live metrics: active orders, served count, revenue, last-30-min orders
- 📈 **Hourly Order Rate Chart** — Live SVG line chart showing order volume by hour today
- 🟠 **Status Breakdown** — Stacked colour bar + count cards per status
- 🔴 **Kitchen Alert** — Automatic "High Volume" warning when >5 active orders
- 🗃 **Order Management** — Live card grid with status filter tabs (All / Placed / Preparing / Ready)
- 📄 **Pagination** — 12 active + 8 served orders per page

### Admin Portal
- 📊 **Dashboard** — 4 stat cards + 3 live line charts + status distribution bar
  - Orders by hour today
  - Revenue by hour today (served orders)
  - Orders trend over last 7 days
- 🍽️ **Menu Items** — Full CRUD: image upload, price, GST%, category, availability toggle · Paginated (10/page) · Category filter
- 🗂 **Categories** — CRUD with image upload · Paginated (10/page)
- 👥 **Staff Manager** — Add/edit/block/delete staff · Role filter tabs (Manager, Cook, Server) · Paginated (8/page)
- 📦 **Orders** — Full order history · Status filter tabs · Paginated (15/page)
- 🏷️ **Offer Banners** — Create promotional banners with gradient picker, emoji, badge, image upload · Paginated (8/page)
- 🔐 **Audit Logs** — System-wide activity log · Inline search · Paginated (20/page) · Colour-coded action badges
- ⚙️ **Settings** — Restaurant name, icon, theme colour, GST rate, platform fee, open/close toggle, auto-accept, print receipts
- 🎨 **Theme Color Picker** — 5+ global brand colour options applied site-wide via CSS variables
- 👤 **Profile** — Admin profile management

### Authentication
- Firebase Email/Password auth
- **Role-based redirection on login**:
  - `admin` → `/admin`
  - `staff` → `/staff/dashboard`
  - `customer` → `/` (menu)
- Case-insensitive role matching
- Safety-net redirect on customer root page
- Hard navigation (`window.location.href`) to bypass Next.js router race conditions

---

## 📁 Project Structure

```
restro-ai/
├── src/
│   ├── app/
│   │   ├── (admin)/admin/          # Admin portal (protected)
│   │   │   ├── page.tsx            # Dashboard with live charts
│   │   │   ├── layout.tsx          # Admin sidebar navigation
│   │   │   ├── orders/             # Order history + status filter + pagination
│   │   │   ├── menu/               # Menu item CRUD
│   │   │   ├── categories/         # Category CRUD
│   │   │   ├── staff/              # Staff management
│   │   │   ├── offers/             # Offer banner management
│   │   │   ├── audit/              # Audit logs
│   │   │   ├── settings/           # Global restaurant settings
│   │   │   └── profile/            # Admin profile
│   │   ├── (auth)/login/           # Login page
│   │   ├── (customer)/             # Customer portal
│   │   │   └── page.tsx            # Menu + search + banner slider + cart
│   │   ├── (staff)/staff/          # Staff portal (protected)
│   │   │   ├── page.tsx            # Order management
│   │   │   ├── dashboard/          # Shift overview + live charts
│   │   │   └── layout.tsx          # Staff sidebar
│   │   ├── api/                    # Next.js API routes
│   │   ├── receipt/[orderId]/      # Printable receipt
│   │   └── unauthorized/           # Access denied page
│   ├── components/
│   │   ├── menu/
│   │   │   ├── BannerSlider.tsx    # Customer offer carousel
│   │   │   ├── CategoryManager.tsx # Admin category CRUD (paginated)
│   │   │   ├── CategoryTabs.tsx    # Customer category filter tabs
│   │   │   ├── MenuCard.tsx        # Customer menu item card
│   │   │   ├── MenuGrid.tsx        # Menu grid with search + category filter
│   │   │   └── MenuItemManager.tsx # Admin menu item CRUD (paginated)
│   │   ├── cart/
│   │   │   └── CartDrawer.tsx      # Slide-out cart with order summary
│   │   ├── order/
│   │   │   └── OrderCard.tsx       # Staff kitchen order card with status actions
│   │   ├── shared/
│   │   │   ├── LineChart.tsx       # Pure SVG animated line chart
│   │   │   ├── Pagination.tsx      # Reusable paginator + usePagination hook
│   │   │   ├── StaffManager.tsx    # Admin staff CRUD (paginated)
│   │   │   ├── ImageUpload.tsx     # Firebase Storage image uploader
│   │   │   └── ProtectedRoute.tsx  # Auth guard HOC
│   │   └── ui/                     # shadcn/ui base components
│   ├── hooks/
│   │   ├── useAuth.ts              # Firebase auth state + role resolver
│   │   └── useSettingsStore.ts     # Zustand store for global settings
│   ├── lib/firebase/
│   │   ├── client.ts               # Firebase app + Firestore + Auth + Storage init
│   │   ├── firestore.ts            # Typed CRUD + listen helpers + Collections map
│   │   ├── storage.ts              # uploadImage / deleteFile helpers
│   │   ├── auth.ts                 # Login / logout / register helpers
│   │   ├── admin.ts                # Firebase Admin SDK (server-side)
│   │   └── realtime.ts             # Firebase Realtime DB helpers
│   ├── store/
│   │   └── cartStore.ts            # Zustand cart state
│   └── types/
│       └── index.ts                # All Firestore document interfaces
├── firestore.rules                 # Firestore security rules
├── storage.rules                   # Firebase Storage security rules
├── database.rules.json             # Realtime DB rules
└── .env.local                      # Environment variables (not committed)
```

---

## 🗄 Firestore Collections

| Collection | Document Interface | Description |
|---|---|---|
| `users` | `UserDoc` | All user accounts (admin, staff, customer) |
| `categories` | `CategoryDoc` | Menu categories with image |
| `menu_items` | `MenuItemDoc` | Menu items with price, GST, availability |
| `orders` | `OrderDoc` | Customer orders with items, totals, status |
| `offers` | `OfferDoc` | Promotional banners shown in slider |
| `audit_logs` | `AuditLogDoc` | System-wide activity log |
| `settings` | `GlobalSettingsDoc` | Single `global` document for restaurant config |

---

## 👤 User Roles

| Role | Access | Auto-redirect to |
|---|---|---|
| `admin` | Full admin portal | `/admin` |
| `staff` | Staff portal only | `/staff/dashboard` |
| `customer` | Customer menu | `/` |
| `guest` | Customer menu (no login) | `/` |

Staff members also have a **sub-role** (`staffRole`):
- `manager` — Full staff portal access
- `cook` — Kitchen order management
- `server` — Table-side order updates

---

## 🗺 Pages & Routes

### Customer
| Route | Description |
|---|---|
| `/` | Menu page — search, category tabs, banner slider, cart |
| `/receipt/[orderId]` | Printable order receipt |

### Auth
| Route | Description |
|---|---|
| `/login` | Email/password login with role-based redirect |

### Admin (requires `role === "admin"`)
| Route | Description |
|---|---|
| `/admin` | Dashboard — stat cards, 3 line charts, status bar |
| `/admin/orders` | All orders · filter by status · paginated |
| `/admin/menu` | Menu item CRUD · category filter · paginated |
| `/admin/categories` | Category CRUD · paginated |
| `/admin/staff` | Staff management · role filter · paginated |
| `/admin/offers` | Offer banner CRUD · image upload · paginated |
| `/admin/audit` | Audit logs · inline search · paginated |
| `/admin/settings` | Restaurant config — name, icon, theme, fees |
| `/admin/profile` | Admin profile |

### Staff (requires `role === "staff"`)
| Route | Description |
|---|---|
| `/staff` | Active orders grid · status filter · pagination |
| `/staff/dashboard` | Shift overview — metrics, hourly chart, status bar |

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- A [Firebase](https://console.firebase.google.com/) project with:
  - Authentication (Email/Password enabled)
  - Firestore Database
  - Firebase Storage
  - Realtime Database

### Installation

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd restro-ai

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# Fill in your Firebase config values (see below)

# 4. Start the development server
npm run dev
```

The app will be available at **http://localhost:3000**.

---

## 🔐 Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# ── Firebase Client SDK (public, safe to expose) ─────────────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com

# ── Firebase Admin SDK (server-side only, NEVER expose publicly) ──────────────
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

> **Never commit `.env.local` to version control.** It is already listed in `.gitignore`.

---

## 🔥 Firebase Setup

### 1. Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project** → follow the wizard
3. Disable Google Analytics if not needed

### 2. Enable Authentication
1. Go to **Authentication → Sign-in method**
2. Enable **Email/Password**

### 3. Create Firestore Database
1. Go to **Firestore Database → Create database**
2. Start in **test mode** initially (update rules before production)
3. Choose a region close to your users

### 4. Enable Firebase Storage
1. Go to **Storage → Get started**
2. Start in test mode

### 5. Enable Realtime Database
1. Go to **Realtime Database → Create database**
2. Start in locked mode and apply the rules from `database.rules.json`

### 6. Create the First Admin User
Since there's no self-registration for admins, create the first admin manually:

```
1. Go to Firebase Console → Authentication → Add user
2. Note the UID of the created user
3. Go to Firestore → users collection → Add document with ID = <uid>
4. Set fields:
   - name: "Your Name"
   - email: "admin@yourdomain.com"
   - role: "admin"
   - createdAt: <server timestamp>
```

### 7. Create Global Settings Document
In Firestore → `settings` collection → Document ID: `global`:

```json
{
  "restaurantName": "My Restaurant",
  "restaurantIcon": "🍽️",
  "themeColor": "#f97316",
  "isOpen": true,
  "gstRate": 5,
  "platformFee": 3,
  "autoAcceptOrders": false,
  "printReceipts": true
}
```

---

## 🛡 Firestore Security Rules

Deploy the rules from `firestore.rules` to your Firebase project.

**Key rules summary:**

| Collection | Read | Write |
|---|---|---|
| `users` | Own doc or admin | Admin only |
| `categories` | Anyone | Admin |
| `menu_items` | Anyone | Admin |
| `orders` | Owner or admin/staff | Authenticated users (create) / Admin/Staff (update) |
| `offers` | Anyone (public) | Admin only |
| `settings` | Anyone | Admin only |
| `audit_logs` | Admin only | Denied (server-side only) |

To deploy rules:
```bash
firebase deploy --only firestore:rules
```

Or paste the contents of `firestore.rules` into **Firebase Console → Firestore → Rules** and click **Publish**.

---

## 📦 Firebase Storage Rules

Deploy the rules from `storage.rules` to your Firebase project.

**Key rules summary:**

| Path | Read | Write |
|---|---|---|
| `categories/` | Anyone | Authenticated users |
| `menu/` | Anyone | Authenticated users |
| `offers/` | Anyone | Authenticated users |
| `avatars/` | Anyone | Authenticated users |
| Everything else | ❌ Denied | ❌ Denied |

To deploy:
```bash
firebase deploy --only storage
```

Or paste `storage.rules` into **Firebase Console → Storage → Rules** and click **Publish**.

---

## 🎨 Theme Customisation

The admin can change the global brand colour from **Admin → Settings → Color Palette**. The selected colour is applied site-wide via a CSS custom property:

```css
/* Applied to :root */
--brand-500: <chosen color>;
```

Available preset colours include Orange, Blue, Green, Purple, Rose, Amber, and Cyan.

---

## 📊 Analytics & Charts

The dashboards use a custom pure-SVG `LineChart` component with:
- Smooth cubic Bézier curves
- Gradient fill under the line
- Animated draw-on-mount
- Hover tooltips
- Responsive via `viewBox`

**Admin Dashboard charts:**
1. Orders by hour (today)
2. Revenue by hour — served orders only (today)
3. Orders trend — last 7 days

**Staff Dashboard charts:**
1. Hourly order rate (today)
2. Order status breakdown bar

---

## 📄 Pagination

All list pages use the shared `usePagination` hook + `Pagination` component:

| Page | Page Size |
|---|---|
| Admin Orders | 15 |
| Admin Audit Logs | 20 |
| Admin Menu Items | 10 |
| Admin Categories | 10 |
| Admin Staff | 8 |
| Admin Offers | 8 |
| Staff Active Orders | 12 |
| Staff Served Orders | 8 |

---

## 🚢 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel Dashboard → Project → Settings → Environment Variables
```

Make sure to add all `.env.local` variables to the Vercel project's environment settings.

### Manual Build

```bash
npm run build
npm run start
```

---

## ⚠️ Known Issues & Notes

### Authentication Redirect
- A **400ms delay** is applied after login before role-checking Firestore. This prevents race conditions where the auth token hasn't propagated to Firestore yet.
- Login uses **`window.location.href`** (hard navigation) instead of `router.replace` to guarantee cross-browser redirect reliability.
- A **safety-net `useEffect`** on the customer root page auto-redirects admins/staff if they somehow land there.

### Firestore Rules Must Be Deployed
Rules in `firestore.rules` and `storage.rules` **must be manually deployed** to Firebase Console if the Firebase CLI auto-deploy is not configured.

### First Login for New Staff
When a new staff user first logs in, there may be a brief delay before their role is recognised. If an "insufficient permissions" error appears, refreshing the page resolves it.

### Offer Banner Images
When you delete a banner, the associated image is automatically removed from Firebase Storage. When replacing an image, the old one is cleaned up automatically.

### Search Scope
The customer menu search is **client-side only** — it searches across all menu items already loaded in memory. There is no Firestore text-search index required.

---

## 📜 License

This project is for internal/private use. All rights reserved.

---

## 🤝 Contributing

Internal project. Raise issues or pull requests via your team's internal repository.

---

*Built with ❤️ using Next.js + Firebase*
