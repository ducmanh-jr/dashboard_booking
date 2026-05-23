# NoWayHome Backend — Full Context Document

> AI-readable snapshot of the entire backend project. Generated from source files.

---

## 1. Project Overview

- **Name**: `nowayhome-backend`
- **Version**: `0.0.1`
- **Description**: RESTful API backend cho nền tảng đặt phòng trực tuyến NoWayHome (Agoda Clone)
- **License**: UNLICENSED (private)
- **Entry point**: `src/main.ts`
- **Default port**: `3000`
- **API docs**: `http://localhost:3000/api-docs` (Swagger UI — title: "NoWayHome API")

### Three user roles
| Role | Mô tả |
|------|--------|
| `customer` | Khách hàng tìm kiếm và đặt phòng |
| `partner` | Chủ khách sạn / host đăng ký và quản lý property |
| `admin` | Quản trị hệ thống, duyệt KYC, duyệt property |

---

## 2. Tech Stack

| Công nghệ | Version | Vai trò |
|-----------|---------|---------|
| **NestJS** | ^11.x | Framework backend, DI, module system |
| **TypeScript** | ^5.9 | Ngôn ngữ lập trình |
| **PostgreSQL** | 16-alpine (Docker) | Cơ sở dữ liệu chính |
| **Prisma ORM** | ^6.x | Schema, migration, type-safe query |
| **passport-jwt** | ^4.0 | JWT authentication strategy |
| **@nestjs/jwt** | ^11.0 | JWT signing/verification |
| **bcrypt** | ^6.0 | Password hashing |
| **@nestjs/swagger** | ^11.x | API documentation |
| **@nestjs/schedule** | — | Cron / scheduled tasks |
| **cache-manager** | ^7.x | In-memory caching |
| **cache-manager-redis-yet** | — | Optional Redis store (KeyvAdapter) |
| **joi** | ^18.x | Config validation |
| **class-validator** | ^0.15 | DTO validation |
| **class-transformer** | ^0.5 | DTO transformation |
| **Docker Compose** | — | PostgreSQL local container |

---

## 3. Environment Variables

File: `backend/.env` (copy từ `.env.example`)

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nowayhome?schema=public"
JWT_ACCESS_SECRET="dev_jwt_access_secret"
JWT_REFRESH_SECRET="dev_jwt_refresh_secret"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=3000

# Optional – Redis cache. Không có thì dùng in-memory cache
# REDIS_HOST=localhost
# REDIS_PORT=6379

# Cloudinary (dùng cho partner media upload)
# CLOUDINARY_CLOUD_NAME=...
# CLOUDINARY_API_KEY=...
# CLOUDINARY_API_SECRET=...
```

Config validation: `src/config/env.validation.ts` (joi schema), load qua `ConfigModule.forRoot({ validationSchema: envValidationSchema })`.

---

## 4. Scripts

```json
{
  "build": "nest build",
  "format": "prettier --write ...",
  "start": "nest start",
  "start:dev": "nest start --watch",
  "start:prod": "node dist/main",
  "lint": "eslint ... --fix"
}
```

Prisma seed: `ts-node prisma/seed.ts`

---

## 5. Docker Compose

File: `backend/docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: nowayhome-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: nowayhome
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docs/postgresql3.sql:/docker-entrypoint-initdb.d/init.sql
```

Init SQL: `docs/postgresql3.sql` được mount vào container lúc khởi tạo lần đầu.

---

## 6. Project Structure

```
backend/
├── docs/                         # SQL init scripts, diagrams, reports
├── prisma/
│   ├── schema.prisma             # Database schema (single source of truth)
│   ├── migrations/               # Migration files
│   └── seed.ts                   # Seed data script
├── prisma.config.ts              # Prisma config (schema path, datasource URL)
├── src/
│   ├── main.ts                   # Bootstrap, Swagger, ValidationPipe, TransformInterceptor
│   ├── app.module.ts             # Root module
│   ├── prisma/
│   │   ├── prisma.module.ts      # Global PrismaModule
│   │   └── prisma.service.ts     # PrismaClient wrapper
│   ├── config/
│   │   └── env.validation.ts     # Joi schema validation cho env vars
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts   # @CurrentUser() param decorator
│   │   │   ├── public.decorator.ts         # @Public() route decorator
│   │   │   └── roles.decorator.ts          # @Roles(...) decorator
│   │   ├── enums/
│   │   │   └── role.enum.ts               # Role.CUSTOMER | PARTNER | ADMIN
│   │   ├── filters/
│   │   │   ├── all-exceptions.filter.ts              # Global exception filter
│   │   │   └── prisma-client-exception.filter.ts     # Prisma error → HTTP response
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts          # JwtAuthGuard (global via APP_GUARD)
│   │   │   └── roles.guard.ts             # RolesGuard (global via APP_GUARD)
│   │   └── interceptors/
│   │       └── transform.interceptor.ts   # Global response transform + BigInt serialization
│   └── modules/
│       ├── auth/
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── dto/
│       │   │   ├── register.dto.ts
│       │   │   └── login.dto.ts
│       │   └── strategies/
│       │       ├── jwt.strategy.ts        # Access token strategy
│       │       └── jwt-refresh.strategy.ts # Refresh token strategy
│       ├── users/
│       │   ├── users.module.ts
│       │   ├── users.controller.ts
│       │   └── users.service.ts
│       ├── properties/
│       │   ├── properties.module.ts
│       │   ├── properties.controller.ts
│       │   └── properties.service.ts
│       ├── bookings/
│       │   ├── bookings.module.ts
│       │   ├── bookings.controller.ts
│       │   └── bookings.service.ts
│       ├── reviews/                        # ← NEW
│       │   ├── reviews.module.ts
│       │   ├── reviews.controller.ts
│       │   └── reviews.service.ts
│       ├── payments/                       # ← NEW (module chưa mount vào AppModule)
│       │   ├── payments.module.ts
│       │   ├── payments.controller.ts
│       │   └── payments.service.ts
│       ├── admin/
│       │   ├── admin.module.ts
│       │   ├── admin.controller.ts
│       │   └── admin.service.ts
│       └── partner/
│           ├── partner.module.ts
│           ├── partner.service.ts
│           ├── properties.controller.ts      # /partner/properties
│           ├── room-types.controller.ts      # /partner/room-types
│           ├── media.controller.ts           # /partner/media
│           ├── media.service.ts
│           └── dto/
│               ├── create-property.dto.ts
│               ├── update-property.dto.ts
│               ├── upsert-property-policies.dto.ts
│               ├── update-property-amenities.dto.ts
│               ├── create-room-type.dto.ts
│               ├── generate-daily-rates.dto.ts
│               └── presigned-media-url.dto.ts
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── nest-cli.json
└── .env
```

---

## 7. Prisma Schema

File: `prisma/schema.prisma`

### Datasource & Generator

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

### Enums (đầy đủ)

```prisma
enum user_type_enum         { customer  partner  admin }
enum user_status_enum       { active  suspended  pending  deleted }
enum kyc_status_enum        { pending  approved  rejected }
enum business_type_enum     { individual  company }
enum property_status_enum   { draft  pending_review  active  suspended  rejected }
enum property_type_enum     { hotel  homestay  resort  apartment  villa  hostel }
enum booking_status_enum    { pending  confirmed  checked_in  checked_out  cancelled  no_show }
enum payment_status_enum    { unpaid  partial  paid  refunded }
enum source_channel_enum    { web  mobile  ota  direct }
enum cancellation_type_enum { free  flexible  moderate  strict  non_refundable }
enum no_show_penalty_type_enum { full_amount  first_night  percent }
enum discount_type_enum     { percent  fixed }
enum parking_type_enum      { free  paid  none }
enum meal_plan_enum         { room_only  breakfast  half_board  full_board  all_inclusive }
enum media_type_enum        { image  video  virtual_tour }
enum media_category_enum    { exterior  interior  room  bathroom  dining  pool  amenity  other }
enum moderation_status_enum { pending  approved  rejected }
enum room_status_enum       { available  occupied  blocked  maintenance }
enum device_type_enum       { web  ios  android  other }
enum social_provider_enum   { google  facebook  apple  zalo }
enum gender_enum            { male  female  other }
enum loyalty_tier_enum      { member  silver  gold  platinum }
enum identifier_type_enum   { email  phone }
enum otp_purpose_enum       { register  login  reset_password  verify_phone  verify_email }
enum promo_type_enum        { early_bird  last_minute  long_stay  flash_sale  loyalty  custom }
enum refund_status_enum     { pending  processing  completed  failed }
enum payment_method_enum    { credit_card  debit_card  ewallet  bank_transfer  pay_later  loyalty_cash }
enum fee_type_enum          { platform  vat  service  other }
enum charged_to_enum        { customer  partner }
```

### Core Models

Prisma naming convention:
- Model PascalCase → `@@map` snake_case, field camelCase → `@map` snake_case.

#### User
```prisma
model User {
  id                BigInt           @id @default(autoincrement())
  uuid              String           @unique @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email             String           @unique @db.VarChar(255)
  phone             String?          @unique @db.VarChar(20)
  passwordHash      String?          @map("password_hash")
  fullName          String           @map("full_name")
  avatarUrl         String?          @map("avatar_url")
  userType          user_type_enum   @map("user_type")
  status            user_status_enum @default(pending)
  emailVerifiedAt   DateTime?        @map("email_verified_at")
  lastLoginAt       DateTime?        @map("last_login_at")
  preferredLanguage String           @default("vi") @map("preferred_language")
  createdAt         DateTime         @default(now()) @map("created_at")
  updatedAt         DateTime         @updatedAt @map("updated_at")
  deletedAt         DateTime?        @map("deleted_at")
  // Relations: auditLogs, bookings, cancelledBookings, moderatedReviews,
  //            customerProfile, otpTokens, reviewedPartnerProfiles, partnerProfile,
  //            properties (reviewer), propertyMedia, reviews, socialAccounts, userSessions
  @@map("users")
}
```

#### CustomerProfile ← NEW
```prisma
model CustomerProfile {
  id                   BigInt            @id @default(autoincrement())
  userId               BigInt            @unique @map("user_id")
  dateOfBirth          DateTime?         @map("date_of_birth") @db.Date
  gender               gender_enum?
  nationality          String?           @db.Char(2)
  idCardNumber         String?           @map("id_card_number")
  loyaltyTier          loyalty_tier_enum @default(member) @map("loyalty_tier")
  loyaltyPointsBalance Int               @default(0) @map("loyalty_points_balance")
  totalBookings        Int               @default(0) @map("total_bookings")
  createdAt            DateTime          @default(now()) @map("created_at")
  updatedAt            DateTime          @updatedAt @map("updated_at")
  user                 User
  @@map("customer_profiles")
}
```

#### PartnerProfile
```prisma
model PartnerProfile {
  id                BigInt             @id @default(autoincrement())
  userId            BigInt             @unique @map("user_id")
  businessName      String             @map("business_name")
  businessType      business_type_enum @map("business_type")
  taxCode           String?            @map("tax_code")
  idCardNumber      String?            @map("id_card_number")
  contractUrl       String?            @map("contract_url")
  kycStatus         kyc_status_enum    @default(pending) @map("kyc_status")
  kycReviewerId     BigInt?            @map("kyc_reviewed_by")
  kycReviewedAt     DateTime?          @map("kyc_reviewed_at")
  bankAccountName   String?            @map("bank_account_name")
  bankAccountNumber String?            @map("bank_account_number")
  bankName          String?            @map("bank_name")
  commissionTier    String             @default("standard") @map("commission_tier")
  createdAt         DateTime           @default(now()) @map("created_at")
  updatedAt         DateTime           @updatedAt @map("updated_at")
  user              User               @relation("PartnerUser")
  reviewer          User?              @relation("PartnerKycReviewer")
  properties        Property[]         @relation("PartnerProperties")
  promotions        Promotion[]
  @@map("partner_profiles")
}
```

#### Property
```prisma
model Property {
  id           BigInt               @id @default(autoincrement())
  partnerId    BigInt               @map("partner_id")
  slug         String               @unique @db.VarChar(300)
  name         String               @db.VarChar(500)
  propertyType property_type_enum   @map("property_type")
  description  String?
  address      String
  city         String               @db.VarChar(100)
  district     String?              @db.VarChar(100)
  countryCode  String               @default("VN") @map("country_code") @db.Char(2)
  latitude     Decimal              @db.Decimal(10,8)
  longitude    Decimal              @db.Decimal(11,8)
  starRating   Int?                 @map("star_rating") @db.SmallInt
  avgRating    Decimal              @default(0.00) @map("avg_rating") @db.Decimal(3,2)
  totalReviews Int                  @default(0) @map("total_reviews")
  checkInTime  DateTime             @default(dbgenerated("'14:00:00'::time")) @map("check_in_time") @db.Time(6)
  checkOutTime DateTime             @default(dbgenerated("'12:00:00'::time")) @map("check_out_time") @db.Time(6)
  status       property_status_enum @default(draft)
  reviewerId   BigInt?              @map("reviewed_by")
  reviewedAt   DateTime?            @map("reviewed_at")
  createdAt    DateTime             @default(now()) @map("created_at")
  updatedAt    DateTime             @updatedAt @map("updated_at")
  deletedAt    DateTime?            @map("deleted_at")
  partner      PartnerProfile       @relation("PartnerProperties")
  reviewer     User?                @relation("PropertyReviewer")
  policy       PropertyPolicy?
  media        PropertyMedia[]
  amenities    PropertyAmenity[]
  roomTypes    RoomType[]
  rooms        Room[]
  bookings     Booking[]
  reviews      Review[]
  // Indexes: (lat,lng), (partnerId), (status,avgRating), (city,status,deletedAt)
  @@map("properties")
}
```

#### RoomType
```prisma
model RoomType {
  id               BigInt   @id @default(autoincrement())
  propertyId       BigInt   @map("property_id")
  name             String   @db.VarChar(255)
  description      String?
  areaSqm          Decimal? @map("area_sqm") @db.Decimal(6,2)      // optional
  bedConfiguration String?  @map("bed_configuration") @db.VarChar(200)  // NEW
  maxOccupancy     Int      @default(2) @map("max_occupancy") @db.SmallInt
  viewType         String?  @map("view_type") @db.VarChar(100)     // NEW
  totalRooms       Int      @default(1) @map("total_rooms")
  basePrice        Decimal  @map("base_price") @db.Decimal(12,2)
  isActive         Boolean  @default(true) @map("is_active")       // NEW
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")
  deletedAt        DateTime? @map("deleted_at")                     // NEW
  property         Property
  ratePlans        RatePlan[]
  amenities        RoomTypeAmenity[]   // NEW
  media            PropertyMedia[]     // NEW (room-specific media)
  bookings         Booking[]           // NEW
  rooms            Room[]              // NEW
  @@map("room_types")
}
```

#### RatePlan ← UPDATED
```prisma
model RatePlan {
  id         BigInt         @id @default(autoincrement())
  roomTypeId BigInt         @map("room_type_id")
  name       String         @db.VarChar(200)
  mealPlan   meal_plan_enum @default(room_only) @map("meal_plan")  // NEW
  refundable Boolean        @default(true)                          // NEW
  basePrice  Decimal        @map("base_price") @db.Decimal(12,2)   // NEW
  isActive   Boolean        @default(true) @map("is_active")        // NEW
  createdAt  DateTime       @default(now()) @map("created_at")
  updatedAt  DateTime       @updatedAt @map("updated_at")
  dailyRates DailyRate[]
  bookings   Booking[]      // NEW
  roomType   RoomType
  @@map("rate_plans")
}
```

#### DailyRate ← UPDATED
```prisma
model DailyRate {
  id           BigInt   @id @default(autoincrement())
  ratePlanId   BigInt   @map("rate_plan_id")
  date         DateTime @db.Date
  price        Decimal  @db.Decimal(12,2)
  availableQty Int      @map("available_qty")
  minStay      Int      @default(1) @map("min_stay") @db.SmallInt  // NEW
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  ratePlan     RatePlan
  @@unique([ratePlanId, date])
  @@map("daily_rates")
}
```

#### Room ← NEW
```prisma
model Room {
  id         BigInt           @id @default(autoincrement())
  roomTypeId BigInt           @map("room_type_id")
  propertyId BigInt           @map("property_id")
  roomNumber String           @map("room_number") @db.VarChar(20)
  floor      Int?             @db.SmallInt
  status     room_status_enum @default(available)
  notes      String?
  createdAt  DateTime         @default(now()) @map("created_at")
  updatedAt  DateTime         @updatedAt @map("updated_at")
  property   Property
  roomType   RoomType
  @@unique([propertyId, roomNumber])
  @@map("rooms")
}
```

#### Booking ← MASSIVELY UPDATED
```prisma
model Booking {
  id                  BigInt              @id @default(autoincrement())
  bookingCode         String              @unique @map("booking_code") @db.VarChar(30)
  customerId          BigInt              @map("customer_id")
  propertyId          BigInt              @map("property_id")
  roomTypeId          BigInt              @map("room_type_id")      // NEW
  ratePlanId          BigInt              @map("rate_plan_id")      // NEW
  checkInDate         DateTime            @map("check_in_date") @db.Date
  checkOutDate        DateTime            @map("check_out_date") @db.Date
  numNights           Int                 @map("num_nights") @db.SmallInt  // NEW
  numAdults           Int                 @default(1) @map("num_adults")   // NEW
  numChildren         Int                 @default(0) @map("num_children") // NEW
  subtotalAmount      Decimal             @map("subtotal_amount") @db.Decimal(12,2)   // NEW
  discountAmount      Decimal             @default(0) @map("discount_amount")          // NEW
  taxAmount           Decimal             @default(0) @map("tax_amount")               // NEW
  totalAmount         Decimal             @map("total_amount") @db.Decimal(12,2)
  platformFeeAmount   Decimal             @default(0) @map("platform_fee_amount")      // NEW
  partnerPayoutAmount Decimal             @default(0) @map("partner_payout_amount")    // NEW
  currency            String              @default("VND") @db.Char(3)                  // NEW
  voucherId           BigInt?             @map("voucher_id")                           // NEW
  loyaltyPointsUsed   Int                 @default(0) @map("loyalty_points_used")     // NEW
  status              booking_status_enum @default(pending)
  paymentStatus       payment_status_enum @default(unpaid) @map("payment_status")     // NEW
  sourceChannel       source_channel_enum @default(web) @map("source_channel")        // NEW
  specialRequests     String?             @map("special_requests")                    // NEW
  cancellationReason  String?             @map("cancellation_reason")                 // NEW
  cancelledById       BigInt?             @map("cancelled_by")
  cancelledAt         DateTime?           @map("cancelled_at")
  createdAt           DateTime            @default(now()) @map("created_at")
  updatedAt           DateTime            @updatedAt @map("updated_at")
  deletedAt           DateTime?           @map("deleted_at")                          // NEW
  customer            User                @relation("CustomerBookings")
  cancelledBy         User?               @relation("BookingCanceller")
  property            Property
  roomType            RoomType            // NEW
  ratePlan            RatePlan            // NEW
  voucher             Voucher?            // NEW
  guests              BookingGuest[]      // NEW
  review              Review?             // NEW (1-1)
  @@map("bookings")
}
```

#### BookingGuest ← NEW
```prisma
model BookingGuest {
  id           BigInt    @id @default(autoincrement())
  bookingId    BigInt    @map("booking_id")
  fullName     String    @map("full_name")
  idCardNumber String?   @map("id_card_number")
  dateOfBirth  DateTime? @map("date_of_birth") @db.Date
  nationality  String?   @db.Char(2)
  isPrimary    Boolean   @default(false) @map("is_primary")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")
  booking      Booking
  @@map("booking_guests")
}
```

#### Review ← COMPLETELY REWRITTEN
```prisma
model Review {
  id                BigInt                 @id @default(autoincrement())
  bookingId         BigInt                 @unique @map("booking_id")  // 1 booking → 1 review
  propertyId        BigInt                 @map("property_id")
  customerId        BigInt                 @map("customer_id")
  overallRating     Decimal                @map("overall_rating") @db.Decimal(3,1)
  cleanlinessRating Decimal?               @map("cleanliness_rating") @db.Decimal(3,1)  // NEW
  serviceRating     Decimal?               @map("service_rating") @db.Decimal(3,1)      // NEW
  locationRating    Decimal?               @map("location_rating") @db.Decimal(3,1)     // NEW
  valueRating       Decimal?               @map("value_rating") @db.Decimal(3,1)        // NEW
  title             String?                @db.VarChar(255)
  content           String?
  moderationStatus  moderation_status_enum @default(pending) @map("moderation_status")  // NEW
  moderatedById     BigInt?                @map("moderated_by")                          // NEW
  moderatedAt       DateTime?              @map("moderated_at")                          // NEW
  createdAt         DateTime               @default(now()) @map("created_at")
  updatedAt         DateTime               @updatedAt @map("updated_at")
  deletedAt         DateTime?              @map("deleted_at")                            // NEW
  booking           Booking
  customer          User                   @relation("CustomerReviews")
  moderator         User?                  @relation("ReviewModerator")
  property          Property
  @@map("reviews")
}
```

#### Amenity ← NEW
```prisma
model Amenity {
  id        BigInt   @id @default(autoincrement())
  name      String   @unique @db.VarChar(100)
  category  String   @db.VarChar(50)
  iconCode  String?  @map("icon_code") @db.VarChar(50)
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  properties PropertyAmenity[]
  roomTypes  RoomTypeAmenity[]
  @@map("amenities")
}
```

#### PropertyAmenity ← NEW (junction table)
```prisma
model PropertyAmenity {
  propertyId BigInt   @map("property_id")
  amenityId  BigInt   @map("amenity_id")
  @@id([propertyId, amenityId])
  @@map("property_amenities")
}
```

#### RoomTypeAmenity ← NEW (junction table)
```prisma
model RoomTypeAmenity {
  roomTypeId BigInt   @map("room_type_id")
  amenityId  BigInt   @map("amenity_id")
  @@id([roomTypeId, amenityId])
  @@map("room_type_amenities")
}
```

#### PropertyMedia ← UPDATED
```prisma
model PropertyMedia {
  id           BigInt              @id @default(autoincrement())
  propertyId   BigInt              @map("property_id")
  roomTypeId   BigInt?             @map("room_type_id")   // NEW — optional room-specific media
  mediaType    media_type_enum     @default(image) @map("media_type")
  category     media_category_enum @default(other)
  url          String              @db.VarChar(500)
  thumbnailUrl String?             @map("thumbnail_url")
  caption      String?             @db.VarChar(500)
  isCover      Boolean             @default(false) @map("is_cover")
  sortOrder    Int                 @default(0) @map("sort_order") @db.SmallInt
  uploadedById BigInt              @map("uploaded_by")
  createdAt    DateTime            @default(now()) @map("created_at")
  property     Property
  roomType     RoomType?
  uploadedBy   User
  @@map("property_media")
}
```

#### PropertyPolicy ← MASSIVELY EXPANDED
```prisma
model PropertyPolicy {
  id                          BigInt                    @id @default(autoincrement())
  propertyId                  BigInt                    @unique @map("property_id")
  cancellationType            cancellation_type_enum    @default(flexible)
  freeCancelHours             Int?                      @map("free_cancel_hours")
  cancelPenaltyPercent        Decimal                   @default(0.00) @map("cancel_penalty_percent")
  minStayNights               Int                       @default(1) @map("min_stay_nights")
  maxStayNights               Int?                      @map("max_stay_nights")
  checkInFrom                 DateTime                  @default(dbgenerated("'14:00:00'::time")) @map("check_in_from") @db.Time(6)
  checkInUntil                DateTime                  @default(dbgenerated("'22:00:00'::time")) @map("check_in_until") @db.Time(6)
  checkOutFrom                DateTime?                 @map("check_out_from") @db.Time(6)
  checkOutUntil               DateTime                  @default(dbgenerated("'12:00:00'::time")) @map("check_out_until") @db.Time(6)
  earlyCheckInAllowed         Boolean                   @default(false)
  earlyCheckInFee             Decimal?
  lateCheckOutAllowed         Boolean                   @default(false)
  lateCheckOutFee             Decimal?
  petsAllowed                 Boolean                   @default(false)
  petFee                      Decimal?
  petMaxWeightKg              Decimal?
  smokingAllowed              Boolean                   @default(false)
  smokingPenalty              Decimal?
  childrenAllowed             Boolean                   @default(true)
  minChildAge                 Int?                      @default(0)
  infant04Fee                 Decimal                   @default(0.00) @map("infant_0_4_fee")
  child511Fee                 Decimal                   @default(0.00) @map("child_5_11_fee")
  freeBabyCot                 Boolean                   @default(false)
  child511MustUseExtraBed     Boolean                   @default(false)
  extraBedAvailable           Boolean                   @default(false)
  extraBedCharge              Decimal?
  extraPersonFee              Decimal?
  noShowPenaltyType           no_show_penalty_type_enum @default(full_amount)
  noShowPenaltyValue          Decimal?
  instantConfirmation         Boolean                   @default(true)
  depositRequired             Boolean                   @default(false)
  depositType                 discount_type_enum?
  depositValue                Decimal?
  depositDaysBefore           Int?
  acceptedPaymentMethods      Json?
  wifiFee                     Decimal                   @default(0.00)
  breakfastIncluded           Boolean                   @default(false)
  breakfastFee                Decimal?
  airportShuttleAvailable     Boolean                   @default(false)
  airportShuttleFee           Decimal?
  parkingType                 parking_type_enum         @default(none)
  parkingFee                  Decimal?
  partiesAllowed              Boolean                   @default(false)
  quietHoursStart             DateTime?                 @db.Time(6)
  quietHoursEnd               DateTime?                 @db.Time(6)
  requiresMarriageCertificate Boolean                   @default(false)   // NEW
  damageDepositRequired       Boolean                   @default(false)   // NEW
  damageDepositAmount         Decimal?                                    // NEW
  customRules                 String?
  liabilityWaiver             String?                                     // NEW
  forceMajeurePolicy          String?                                     // NEW
  createdAt                   DateTime                  @default(now())
  updatedAt                   DateTime                  @updatedAt
  property                    Property
  @@map("property_policies")
}
```

#### Promotion ← NEW
```prisma
model Promotion {
  id             BigInt             @id @default(autoincrement())
  partnerId      BigInt?            @map("partner_id")    // null = platform-wide
  name           String             @db.VarChar(255)
  promoType      promo_type_enum    @map("promo_type")
  discountType   discount_type_enum @map("discount_type")
  discountValue  Decimal            @map("discount_value")
  maxDiscount    Decimal?           @map("max_discount")
  minOrderAmount Decimal            @default(0.00) @map("min_order_amount")
  startDate      DateTime           @map("start_date") @db.Date
  endDate        DateTime           @map("end_date") @db.Date
  maxUses        Int?               @map("max_uses")
  totalUsed      Int                @default(0) @map("total_used")
  isActive       Boolean            @default(true) @map("is_active")
  createdBy      BigInt             @map("created_by")
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt
  deletedAt      DateTime?          @map("deleted_at")
  partner        PartnerProfile?
  vouchers       Voucher[]
  @@map("promotions")
}
```

#### Voucher ← NEW
```prisma
model Voucher {
  id             BigInt    @id @default(autoincrement())
  promotionId    BigInt    @map("promotion_id")
  code           String    @unique @db.VarChar(50)
  maxUsesPerUser Int       @default(1) @map("max_uses_per_user")
  totalUsed      Int       @default(0) @map("total_used")
  isActive       Boolean   @default(true) @map("is_active")
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  promotion      Promotion
  bookings       Booking[]
  @@map("vouchers")
}
```

#### OtpToken ← NEW
```prisma
model OtpToken {
  id             BigInt               @id @default(autoincrement())
  userId         BigInt?              @map("user_id")
  identifier     String               @db.VarChar(255)
  identifierType identifier_type_enum @map("identifier_type")
  purpose        otp_purpose_enum
  tokenHash      String               @map("token_hash")
  expiresAt      DateTime             @map("expires_at")
  usedAt         DateTime?            @map("used_at")
  attempts       Int                  @default(0) @db.SmallInt
  ipAddress      String?              @map("ip_address")
  createdAt      DateTime             @default(now())
  user           User?
  @@index([identifier, purpose, expiresAt])
  @@map("otp_tokens")
}
```

#### UserSession ← NEW (refresh token storage)
```prisma
model UserSession {
  id           BigInt           @id @default(autoincrement())
  userId       BigInt           @map("user_id")
  tokenHash    String           @unique @map("token_hash")
  deviceName   String?          @map("device_name")
  deviceType   device_type_enum @default(web) @map("device_type")
  ipAddress    String?          @map("ip_address")
  userAgent    String?          @map("user_agent")
  lastActiveAt DateTime?        @map("last_active_at")
  expiresAt    DateTime         @map("expires_at")
  revokedAt    DateTime?        @map("revoked_at")
  createdAt    DateTime         @default(now())
  user         User
  @@index([userId, revokedAt, expiresAt])
  @@map("user_sessions")
}
```

#### SocialAccount ← NEW
```prisma
model SocialAccount {
  id             BigInt               @id @default(autoincrement())
  userId         BigInt               @map("user_id")
  provider       social_provider_enum
  providerId     String               @map("provider_id")
  accessToken    String?              @map("access_token")
  refreshToken   String?              @map("refresh_token")
  tokenExpiresAt DateTime?            @map("token_expires_at")
  createdAt      DateTime             @default(now())
  updatedAt      DateTime             @updatedAt
  user           User
  @@unique([provider, providerId])
  @@map("social_accounts")
}
```

#### AuditLog ← UPDATED
```prisma
model AuditLog {
  id         BigInt   @id @default(autoincrement())
  actorId    BigInt   @map("actor_id")       // đổi từ userId → actorId
  action     String   @db.VarChar(100)
  entityType String   @map("entity_type")    // đổi từ entity → entityType
  entityId   BigInt   @map("entity_id")      // bắt buộc (non-nullable)
  oldValues  Json?    @map("old_values")     // NEW
  newValues  Json?    @map("new_values")     // NEW
  ipAddress  String?  @map("ip_address")     // NEW
  userAgent  String?  @map("user_agent")     // NEW
  createdAt  DateTime @default(now())
  actor      User     @relation("AuditActor")
  @@map("audit_logs")
}
```

---

## 8. Authentication Flow

### Strategy: JWT (Passport)

- **Access token**: expire `15m`, signed bằng `JWT_ACCESS_SECRET`
- **Refresh token**: expire `7d`, signed bằng `JWT_REFRESH_SECRET`
- **Refresh token storage**: lưu hash vào bảng `user_sessions` (model `UserSession`) — hỗ trợ multi-device, revoke theo session
- Guard mặc định toàn cục: `JwtAuthGuard` (đăng ký qua `APP_GUARD` provider)
- Roles guard toàn cục: `RolesGuard` (đăng ký qua `APP_GUARD` provider)
- Public route: dùng decorator `@Public()` để bypass guard

### JWT Payload (`AuthenticatedUser`)
```typescript
interface AuthenticatedUser {
  id: string;          // user ID (string vì BigInt serialization)
  email: string;
  user_type: user_type_enum;  // 'customer' | 'partner' | 'admin'
}
```

### Auth Endpoints (`/auth`)

| Method | Path | Guard | Mô tả |
|--------|------|-------|-------|
| POST | `/auth/register` | Public | Tạo tài khoản mới |
| POST | `/auth/login` | Public | Đăng nhập, trả về access + refresh token |
| POST | `/auth/refresh` | Refresh JWT | Lấy access token mới |
| POST | `/auth/logout` | JWT | Huỷ session (revoke refresh token) |

#### RegisterDto
```typescript
{
  email: string;
  password: string;     // min 8 ký tự
  full_name?: string;
  phone?: string;
  user_type?: 'customer' | 'partner';  // default: customer
}
```

#### LoginDto
```typescript
{
  email: string;
  password: string;
}
```

#### Login Response
```typescript
{
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    full_name: string | null;
    user_type: string;
  }
}
```

---

## 9. API Routes & Controllers

### 9.1 `/users` — UsersController

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/users/me` | JWT | Lấy thông tin user hiện tại |

---

### 9.2 `/properties` — PropertiesController (Public read)

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| GET | `/properties/search` | Optional | Tìm kiếm property theo city, ngày, loại |
| GET | `/properties/:slug` | Optional | Xem chi tiết property theo slug |

---

### 9.3 `/bookings` — BookingsController

| Method | Path | Auth | Mô tả |
|--------|------|------|-------|
| POST | `/bookings` | JWT (customer) | Tạo booking mới |

---

### 9.4 `/reviews` — ReviewsController ← NEW MODULE

> Module `reviews/` mới. Xử lý tạo và đọc review cho property. Review yêu cầu booking đã completed. Moderation bởi admin.

---

### 9.5 `/payments` — PaymentsController ← NEW (chưa mount)

> Directory `src/modules/payments/` tồn tại nhưng `PaymentsModule` **chưa được import vào AppModule**. Module đang trong quá trình phát triển.

---

### 9.6 `/admin` — AdminController

> Yêu cầu: `JwtAuthGuard` + `RolesGuard` + `@Roles(Role.ADMIN)`

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/admin/partners/pending` | Danh sách partner chờ duyệt KYC |
| PATCH | `/admin/partners/:id/kyc` | Duyệt/từ chối KYC của partner |
| GET | `/admin/properties/pending` | Danh sách property đang chờ duyệt |
| PATCH | `/admin/properties/:id/status` | Duyệt/từ chối/suspend property |
| GET | `/admin/analytics/revenue` | Thống kê doanh thu |

---

### 9.7 `/partner/*` — Partner Modules

> Yêu cầu: `JwtAuthGuard` + `RolesGuard` + `@Roles(Role.PARTNER)`

#### `/partner/properties` — PartnerPropertiesController

| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/partner/properties` | Tạo property mới (status: draft) |
| PATCH | `/partner/properties/:id` | Cập nhật description, check_in/out time |
| POST | `/partner/properties/:id/policies` | Upsert chính sách của property |
| POST | `/partner/properties/:id/amenities` | Cập nhật amenities của property |
| POST | `/partner/properties/:id/room-types` | Tạo room type mới cho property |

#### `/partner/room-types` — PartnerRoomTypesController

| Method | Path | Mô tả |
|--------|------|-------|
| POST | `/partner/room-types/:roomTypeId/daily-rates/generate` | Generate daily_rates cho room type |

#### `/partner/media` — MediaController

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/partner/media/presigned-url` | Lấy Cloudinary signature để upload ảnh trực tiếp |

---

## 10. DTOs (Data Transfer Objects)

### CreatePropertyDto
```typescript
{
  name: string;               // max 500 ký tự
  property_type: property_type_enum;
  city: string;               // max 100 ký tự
  address: string;
  latitude: number;           // IsLatitude
  longitude: number;          // IsLongitude
}
```

### UpdatePropertyDto
```typescript
{
  description?: string;
  check_in_time?: string;    // format "HH:MM"
  check_out_time?: string;   // format "HH:MM"
}
```

### UpsertPropertyPoliciesDto
Tất cả fields của model `property_policies` (xem Section 7 — PropertyPolicy). Bao gồm đầy đủ: `cancellation_type`, `free_cancel_hours`, `cancel_penalty_percent`, `min_stay_nights`, `max_stay_nights`, `check_in_from`, `check_in_until`, `check_out_from`, `check_out_until`, `early_check_in_allowed`, `early_check_in_fee`, `late_check_out_allowed`, `late_check_out_fee`, `pets_allowed`, `pet_fee`, `pet_max_weight_kg`, `smoking_allowed`, `smoking_penalty`, `children_allowed`, `min_child_age`, `infant_0_4_fee`, `child_5_11_fee`, `free_baby_cot`, `child_5_11_must_use_extra_bed`, `extra_bed_available`, `extra_bed_charge`, `extra_person_fee`, `no_show_penalty_type`, `no_show_penalty_value`, `instant_confirmation`, `deposit_required`, `deposit_type`, `deposit_value`, `deposit_days_before`, `accepted_payment_methods`, `wifi_fee`, `breakfast_included`, `breakfast_fee`, `airport_shuttle_available`, `airport_shuttle_fee`, `parking_type`, `parking_fee`, `parties_allowed`, `quiet_hours_start`, `quiet_hours_end`, `requires_marriage_certificate`, `damage_deposit_required`, `damage_deposit_amount`, `custom_rules`, `liability_waiver`, `force_majeure_policy`.

### UpdatePropertyAmenitiesDto
```typescript
{
  amenity_ids: number[];   // array ID của amenities hợp lệ và is_active=true
}
```

### CreateRoomTypeDto
```typescript
{
  name: string;            // max 255 ký tự
  description?: string;
  area_sqm?: number;       // optional decimal >= 0
  bed_configuration?: string;  // NEW field
  max_occupancy?: number;  // integer >= 1, default 2
  view_type?: string;      // NEW field
  total_rooms?: number;    // integer >= 1, default 1
  base_price: number;      // decimal >= 0
}
```
> Khi tạo room type, một `rate_plan` mặc định tên "Standard Rate" sẽ được tạo kèm.

### GenerateDailyRatesDto
```typescript
{
  start_date: Date;
  end_date: Date;
}
```
> Giới hạn 90 ngày mỗi lần generate. Dùng `skipDuplicates: true` nên gọi nhiều lần không lỗi.

### PresignedMediaUrlQueryDto
```typescript
{
  folder?: string;   // target folder trên Cloudinary, default: "partner-media"
}
```

---

## 11. Business Logic — Key Services

### PartnerService

**`createProperty(user, dto)`**
1. Kiểm tra user có `user_type === 'partner'`
2. Lấy `partner_profiles` theo `user_id`
3. Generate unique slug từ tên property (lowercase, kebab-case, suffix nếu trùng)
4. Tạo `Property` với `status: draft`

**`updateProperty(user, propertyId, dto)`**
1. Assert ownership: property phải thuộc partner đang đăng nhập
2. Update các field được cung cấp (`description`, `check_in_time`, `check_out_time`)
3. Time string "HH:MM" được parse thành DateTime

**`upsertPropertyPolicies(user, propertyId, dto)`**
1. Assert ownership
2. `upsert` record `property_policies` theo `property_id`

**`updatePropertyAmenities(user, propertyId, dto)`**
1. Assert ownership
2. Validate tất cả amenity_ids tồn tại và `is_active=true`
3. Transaction: xoá hết amenities cũ → insert mới

**`createRoomType(user, propertyId, dto)`**
1. Assert ownership
2. Transaction: tạo `RoomType` → tạo `rate_plans` mặc định ("Standard Rate")

**`generateDailyRates(user, roomTypeId, dto)`**
1. Validate range ≤ 90 ngày
2. Assert room type thuộc property của partner
3. Tìm hoặc tạo default rate plan
4. `createMany` với `skipDuplicates: true`

### MediaService

**`createPresignedUpload(user, query)`**
- Yêu cầu env: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Tạo signature HMAC-SHA1 theo spec Cloudinary
- Response: `{ provider, upload_url, cloud_name, api_key, timestamp, signature, folder, public_id }`

### AuthService

- `register`: hash password bằng bcrypt, tạo user với `status: active`, tạo `partner_profiles` nếu `user_type=partner` (bao gồm `businessName` và `businessType`)
- `login`: validate password → tạo `UserSession` → issue access token + refresh token (refresh token hash lưu vào session)
- `refresh`: verify refresh token JWT → tìm matching session bằng bcrypt.compare → rotate token hash → issue new tokens
- `logout(userId, sessionId?)`: revoke session theo sessionId hoặc revoke tất cả active sessions của user

### BookingsService

- `create`: tạo booking với roomTypeId + ratePlanId, trừ `availableQty` trong `daily_rates`. Dùng `FOR UPDATE` lock tránh race condition. Booking code: `NWH-{timestamp_base36}-{random_base36}`.
- `findMine`: lấy danh sách booking của customer hiện tại
- `cancel`: huỷ booking, tính penalty (`free`/`non_refundable`/`partial`), restore `availableQty` qua `booking_rooms`, set `cancellationReason`
- `createReview(user, bookingId, dto: BookingCreateReviewDto)`: raw SQL INSERT vào `reviews` + gọi `updatePropertyReviewStats` trong cùng transaction
- `updatePropertyReviewStats(tx, propertyId)` _(private)_: `AVG(overall_rating)` + `COUNT(*)` raw SQL → cập nhật `property.avgRating` / `property.totalReviews`
- `BookingCreateReviewDto`: `overall_rating` (number), `content` (string, optional)

### ReviewsService (module `reviews`)

- `createReview(user, bookingId, dto: CustomerCreateReviewDto)`: kiểm tra ownership + `checked_out` + không duplicate → transaction tạo review + cập nhật property stats theo running average
- `CustomerCreateReviewDto`: `rating` (number → Decimal), `comment` (string, optional)
- **Hai entry point tạo review**: `POST /bookings/:id/reviews` (BookingsService) và `POST /reviews/:bookingId` (ReviewsService). Cả hai yêu cầu booking `checked_out`.

---

## 12. Common Infrastructure

### Guards

| Guard | File | Mô tả |
|-------|------|-------|
| `JwtAuthGuard` | `common/guards/jwt-auth.guard.ts` | Global via APP_GUARD, kiểm tra Bearer token |
| `RolesGuard` | `common/guards/roles.guard.ts` | Global via APP_GUARD, kiểm tra `user_type` theo `@Roles()` |

Guard bỏ qua nếu route có `@Public()`.

### Exception Filters

| Filter | Mô tả |
|--------|-------|
| `AllExceptionsFilter` | Catch tất cả exception, format thành `{ statusCode, message, error, path, timestamp }` |
| `PrismaClientExceptionFilter` | Xử lý Prisma errors riêng (P2002 → 409, P2025 → 404) |

Đăng ký qua `APP_FILTER` provider (thứ tự: PrismaClientExceptionFilter trước, AllExceptionsFilter sau).

### TransformInterceptor

File: `common/interceptors/transform.interceptor.ts`

Global interceptor xử lý:
1. **BigInt → string**: tự động convert tất cả BigInt fields
2. **Prisma.Decimal → number**: convert Decimal sang number
3. **Response wrapping**: wrap mọi response thành `{ statusCode, message, data }` nếu response chưa theo format đó
4. **Default messages**: POST → "Created successfully", PUT/PATCH → "Updated successfully", DELETE → "Deleted successfully", GET → "Success"

### Decorators

| Decorator | Mô tả |
|-----------|-------|
| `@Public()` | Bypass JwtAuthGuard |
| `@CurrentUser()` | Extract `AuthenticatedUser` từ request |
| `@Roles(...roles)` | Set metadata cho RolesGuard |

### Role Enum
```typescript
enum Role {
  CUSTOMER = 'customer',
  PARTNER  = 'partner',
  ADMIN    = 'admin',
}
```

### PrismaService
- Extends `PrismaClient`
- Implements `OnModuleInit`: gọi `$connect()` khi khởi động
- Export từ `PrismaModule` (global)

---

## 13. Main.ts Bootstrap

```typescript
import 'dotenv/config';
import { writeFileSync } from 'fs';
import { join } from 'path';

const app = await NestFactory.create(AppModule);

// Global interceptor: TransformInterceptor (BigInt + Decimal + response wrapping)
app.useGlobalInterceptors(new TransformInterceptor());

// Validation pipe toàn cục
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}));

// Swagger title: 'NoWayHome API'
const swaggerConfig = new DocumentBuilder()
  .setTitle('NoWayHome API')
  .setVersion('1.0')
  .addBearerAuth()
  .build();
const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

// Ghi swagger-spec.json ra disk khi NODE_ENV !== 'production'
if (process.env.NODE_ENV !== 'production') {
  writeFileSync(
    join(process.cwd(), 'swagger-spec.json'),
    JSON.stringify(swaggerDocument, null, 2),
  );
}

SwaggerModule.setup('api-docs', app, swaggerDocument);

// Không có app.enableCors() hay app.setGlobalPrefix()
await app.listen(process.env.PORT ?? 3000);
```

---

## 14. AppModule Imports

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async (configService) => {
        const ttl = 15 * 60 * 1000;  // 15 phút
        const redisHost = configService.get('REDIS_HOST');
        if (!redisHost) return { ttl };  // in-memory fallback
        return {
          stores: [new KeyvAdapter(await redisStore({
            socket: { host: redisHost, port: configService.getOrThrow('REDIS_PORT') },
            keyPrefix: 'nowayhome:',
          }))],
          ttl,
        };
      },
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    UsersModule,
    AuthModule,
    AdminModule,
    PropertiesModule,
    PartnerModule,
    BookingsModule,
    ReviewsModule,  // ← NEW
    // PaymentsModule  ← CHƯA MOUNT (module đang phát triển)
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: PrismaClientExceptionFilter },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
```

---

## 15. Caching

- `@nestjs/cache-manager` v3 + `cache-manager` v7
- Mặc định: in-memory cache (TTL 15 phút)
- Redis: `cache-manager-redis-yet` + `KeyvAdapter`, `keyPrefix: 'nowayhome:'`
- Config: có `REDIS_HOST` → dùng Redis, không có → in-memory
- Inject: `@Inject(CACHE_MANAGER) private cacheManager: Cache`
- `GET /properties/search` dùng `@UseInterceptors(CacheInterceptor)` + `@CacheTTL(15 * 60 * 1000)`

---

## 16. TypeScript Config

```json
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "target": "ES2023",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "strict": true,
    "noImplicitAny": true
  }
}
```

---

## 17. Known Constraints & Notes

1. **BigInt IDs**: Tất cả primary key dùng `BigInt`. `TransformInterceptor` tự động convert BigInt → string và `Prisma.Decimal` → number trước khi trả JSON. File cũ `bigint.interceptor.ts` vẫn tồn tại trong codebase nhưng không còn dùng.
2. **UUID field**: User có thêm field `uuid` (gen_random_uuid()) dùng cho external references.
3. **User status**: User mới tạo qua `register` có `status: active` (không phải `pending`).
4. **Soft delete**: User, Property, RoomType, Booking, Review, Promotion dùng `deletedAt` (soft delete pattern).
5. **Slug generation**: Slug property được generate từ tên, lowercase + kebab, thêm suffix random nếu trùng.
6. **Daily rates limit**: Tối đa 90 ngày mỗi lần generate (`MAX_DAILY_RATE_DAYS = 90`).
7. **Partner KYC**: Partner mới tạo có `kyc_status = pending`. Chỉ admin mới có thể approve/reject.
8. **Property workflow**: `draft → pending_review → active / rejected / suspended`.
9. **Rate plan**: Mỗi room type có ít nhất một rate plan "Standard Rate" được tạo tự động.
10. **Booking fields**: Booking giờ yêu cầu `roomTypeId`, `ratePlanId`. Có đầy đủ payment breakdown (subtotal, discount, tax, platformFee, partnerPayout).
11. **Review moderation**: Review mới tạo có `moderationStatus: pending`, cần admin approve trước khi hiển thị.
12. **UserSession**: Refresh token được lưu dưới dạng bcrypt hash trong `user_sessions`. Hỗ trợ multi-device. Logout revoke session theo sessionId hoặc tất cả.
13. **Media upload**: Upload ảnh thực hiện trực tiếp từ client lên Cloudinary bằng presigned signature. Backend không lưu binary.
14. **Payments module**: `src/modules/payments/` có `PaymentsController` — `POST /payments/checkout/:bookingId` (JWT protected) và `POST /payments/webhook` (`@Public`). `WebhookDto`: `bookingCode: string` + `transactionStatus: 'SUCCESS' | 'FAILED'` (validated `@IsString`/`@IsEnum`). Module **chưa mount vào AppModule**.
15. **ScheduleModule**: `BookingsCron` (`src/modules/bookings/bookings.cron.ts`) — scheduled task tự động xử lý bookings (ví dụ: auto no-show, auto checkout).
16. **No CORS**: `app.enableCors()` không được gọi trong main.ts hiện tại.
17. **No global prefix**: Không dùng `app.setGlobalPrefix()`.
18. **swagger-spec.json**: Auto-generate và ghi ra disk (`writeFileSync`) khi `NODE_ENV !== 'production'`. Swagger title: `'NoWayHome API'`.
19. **Review DTO naming**: `BookingCreateReviewDto` (BookingsService, field `overall_rating`); `CustomerCreateReviewDto` (ReviewsService, field `rating`). Hai DTO khác nhau cho cùng chức năng.
20. **Booking code format**: `NWH-{timestamp_base36}-{random_base36}` — hàm `generateBookingCode()`.

---

## 18. Startup Log (Route Map)

```
AuthController          /auth
  POST /auth/register   (Public)
  POST /auth/login      (Public)
  POST /auth/refresh    (Public)
  POST /auth/logout     (JWT)

UsersController         /users
  (empty — placeholder)

PropertiesController    /properties
  GET  /properties/search   (Public, cached 15m)
  GET  /properties/:slug    (Public)

BookingsController      /bookings  (CUSTOMER only)
  POST   /bookings
  GET    /bookings/me
  POST   /bookings/:id/cancel
  POST   /bookings/:id/reviews

ReviewsController       /reviews  (CUSTOMER only)
  POST   /reviews/:bookingId

AdminController         /admin  (ADMIN only)
  PATCH  /admin/partners/:partnerProfileId/kyc
  PATCH  /admin/properties/:propertyId/status

PartnerPropertiesController  /partner/properties  (PARTNER only)
  POST   /partner/properties
  PATCH  /partner/properties/:id
  POST   /partner/properties/:id/policies
  POST   /partner/properties/:id/amenities
  POST   /partner/properties/:id/room-types

PartnerRoomTypesController  /partner/room-types  (PARTNER only)
  POST   /partner/room-types/:roomTypeId/daily-rates/generate

MediaController         /partner/media  (PARTNER only)
  GET    /partner/media/presigned-url

PaymentsController      /payments  (NOT MOUNTED — PaymentsModule not in AppModule)
  POST   /payments/checkout/:bookingId
  POST   /payments/webhook  (Public)
```

---

*End of context document.*
