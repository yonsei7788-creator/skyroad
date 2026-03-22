# Referral & Coupon System Architecture

## Overview

The referral code system allows users to apply partner codes and receive discount coupons. Admins can manage referral codes, track usages, and monitor revenue/commissions.

## Directory Structure

### Admin Pages

- **`app/admin/referral-codes/page.tsx`** — Main referral code management dashboard
- **`app/admin/referral-codes/_components/CreateCodeModal.tsx`** — Modal for creating/editing codes

### User Pages

- **`app/profile/referral/page.tsx`** — Server component that loads existing coupon data
- **`app/profile/referral/_components/ReferralCodeForm.tsx`** — Client component for code input & validation

### API Routes

- **`app/api/admin/referral-codes/route.ts`** — Admin GET (list/search/filter) & POST (create code)
- **`app/api/admin/referral-codes/[id]/route.ts`** — Admin GET/PATCH/DELETE single code
- **`app/api/admin/referral-codes/[id]/usages/route.ts`** — Admin GET referral usages by code
- **`app/api/referral-codes/validate/route.ts`** — User POST validate code before applying
- **`app/api/referral-codes/apply/route.ts`** — User POST apply code (RPC call)
- **`app/api/user-coupons/route.ts`** — User GET active coupons

---

## Database Tables

### `referral_codes` (Admin-managed)

| Column            | Type        | Notes                                                     |
| ----------------- | ----------- | --------------------------------------------------------- |
| `id`              | uuid        | Primary key                                               |
| `code`            | text        | Unique alphanumeric code (4-20 chars, uppercase + digits) |
| `partner_name`    | text        | Partner/influencer name                                   |
| `partner_type`    | text        | Enum: `influencer`, `affiliate`, `internal`, `other`      |
| `max_usages`      | integer     | Usage limit (0 = unlimited)                               |
| `current_usages`  | integer     | Current count of usages                                   |
| `discount_amount` | integer     | Won discount in ₩ (e.g., 5000)                            |
| `commission_rate` | numeric     | Commission % for partner (0-1)                            |
| `valid_from`      | timestamptz | Code start date                                           |
| `valid_until`     | timestamptz | Code expiration date (nullable = no expiry)               |
| `is_active`       | boolean     | Activation toggle                                         |
| `memo`            | text        | Internal notes                                            |
| `created_at`      | timestamptz | Created timestamp                                         |
| `updated_at`      | timestamptz | Updated timestamp                                         |

### `user_coupons` (Generated per user)

| Column             | Type        | Notes                          |
| ------------------ | ----------- | ------------------------------ |
| `id`               | uuid        | Primary key                    |
| `user_id`          | uuid        | Foreign key to auth.users      |
| `referral_code_id` | uuid        | Foreign key to referral_codes  |
| `discount_amount`  | integer     | Discount value in ₩            |
| `source`           | text        | Source type (e.g., `referral`) |
| `expires_at`       | timestamptz | Coupon expiration              |
| `is_used`          | boolean     | Whether coupon was redeemed    |
| `used_at`          | timestamptz | Timestamp of usage             |
| `created_at`       | timestamptz | Created timestamp              |

### `referral_usages` (Tracks code application & payment)

| Column             | Type        | Notes                                 |
| ------------------ | ----------- | ------------------------------------- |
| `id`               | uuid        | Primary key                           |
| `user_id`          | uuid        | User who applied code                 |
| `referral_code_id` | uuid        | Code that was applied                 |
| `coupon_id`        | uuid        | Generated coupon ID                   |
| `order_id`         | uuid        | Order after payment (populated later) |
| `plan_name`        | text        | Plan purchased (populated at payment) |
| `paid_amount`      | integer     | Amount paid (populated at payment)    |
| `created_at`       | timestamptz | When code was applied                 |

---

## User Flow (Referral Code → Coupon → Payment)

### 1. **Code Validation** (`/api/referral-codes/validate`)

- Input: `code` (string, trimmed & uppercased)
- Checks:
  - Duplicate usage (1 per user — checks `referral_usages` table)
  - Code exists in `referral_codes`
  - Code is active (`is_active = true`)
  - Start date passed (`valid_from ≤ now`)
  - Not expired (`valid_until` is null OR `valid_until > now`)
  - Usage limit not exceeded (`current_usages < max_usages` OR `max_usages = 0`)
- Returns: `{ valid: boolean, discountAmount?: number, message?: string, code?: string }`

### 2. **Code Application** (`/api/referral-codes/apply`)

- **Requires authentication**
- Calls RPC function: `apply_referral_code(p_user_id, p_code)`
- RPC logic (assumed):
  - ✓ Validate same checks as `/validate`
  - ✓ Insert into `referral_usages(user_id, referral_code_id, coupon_id, created_at)`
  - ✓ Create `user_coupons` entry with discount amount & expiration
  - ✓ Increment `referral_codes.current_usages`
  - ✓ Return `{ success, coupon: { id, discountAmount, expiresAt } }`
- Returns: `{ success: boolean, coupon?: CouponData, message?: string }`

### 3. **Coupon List** (`/api/user-coupons`)

- GET user's active coupons (not used, not expired)
- Returns: Array of `{ id, discountAmount, expiresAt, source }`

### 4. **Payment & Coupon Usage** (`/api/payments/confirm`)

- After Toss payment confirmation:
  1. Mark coupon as used: `user_coupons.update({ is_used: true, used_at: now() })`
  2. Update referral usage with order & payment details:
     - `referral_usages.update({ order_id, plan_name, paid_amount })`
  3. Create report record

---

## Admin Features

### Referral Code Management

- **CREATE** — Generate code with partner details, usage limits, commission rate, validity period
  - Endpoint: `POST /api/admin/referral-codes`
  - Code auto-validation (4-20 uppercase alphanumeric)
  - Default: `discountAmount = 5000`, `partnerType = influencer`, `maxUsages = 0` (unlimited)

- **READ (LIST)** — Get all codes with pagination, search, filters
  - Endpoint: `GET /api/admin/referral-codes`
  - Params: `page`, `limit` (max 50), `search` (code/partner name), `partnerType`, `status`
  - Response includes:
    - Code list with `total_paid_amount` (aggregated from usages)
    - Stats: `total`, `active` count, `totalUsages`, `totalPaidAmount`

- **READ (DETAIL)** — View single code
  - Endpoint: `GET /api/admin/referral-codes/[id]`

- **UPDATE** — Modify code details
  - Endpoint: `PATCH /api/admin/referral-codes/[id]`
  - Updatable: `partnerName`, `partnerType`, `maxUsages`, `validFrom`, `validUntil`, `memo`, `isActive`
  - Note: Code itself cannot be changed after creation

- **DELETE** — Remove code
  - Endpoint: `DELETE /api/admin/referral-codes/[id]`

### Referral Usage Tracking

- **VIEW USAGES** — Detailed list of who used each code
  - Endpoint: `GET /api/admin/referral-codes/[id]/usages`
  - Displays: User email, whether coupon was redeemed, plan purchased, amount paid, timestamp
  - Joins with `user_coupons` to check coupon status

### Dashboard Stats

- Total codes created
- Active codes count
- Total usages across all codes
- Total revenue paid via referral codes

---

## Admin UI Components (`/app/admin/referral-codes/`)

### Page Layout

- **Header** — Title "추천인 코드 관리"
- **Stats Cards** — 4 stat boxes (total, active, usages, paid amount)
- **Toolbar**
  - Search input (code + partner name)
  - Filter dropdowns (partner type, status)
  - "Create Code" button
- **Table/Cards** — Responsive table (desktop) + card list (mobile)
  - Columns: Code, Partner, Type badge, Usages, Validity period, Paid amount/commission, Status badge, Toggle action
  - Row click opens detail drawer

### Detail Drawer (Right sidebar)

- Shows full code info
- **Actions**: Edit button, Toggle (activate/deactivate) button
- **Info Section**: Usages, validity, discount, total paid, commission, creation date, memo
- **Usage History** — List of users who applied code
  - Shows email, timestamp, plan, amount, coupon status

### Create/Edit Modal

- **Fields**:
  - Code (auto-generate or manual) — disabled in edit mode
  - Partner Name \*
  - Partner Type dropdown
  - Max Usages (0 = unlimited)
  - Valid From date \*
  - Valid Until date (optional)
  - Memo (optional)
- **Validation**: Code format, required fields, date range

---

## User UI Components (`/app/profile/referral/`)

### Flow 1: Already Used

- Shows badge "이미 추천인 코드를 사용했습니다"
- Displays existing coupon details (discount amount, status, expiration)

### Flow 2: Success

- Shows success icon + message "쿠폰이 발급되었습니다!"
- Displays discount amount & expiration
- Link to pricing page

### Flow 3: Input Form

- **Input section**:
  - Label: "추천인 코드"
  - Input field + validation status indicator
  - Status feedback: checking → valid (green) / invalid (red)
  - Shows discount amount if valid
- **Submit button** — Disabled until status = "valid", shows discount
- **Footnote** — "1인 1회만 사용 가능"

### Validation Behavior (Client-side)

- Debounced validation (500ms) on input change
- Shows real-time status: `idle` → `checking` → `valid`/`invalid`

---

## Data Consistency & Implementation Notes

### Referral Code Uniqueness

- `code` column has UNIQUE constraint
- Case-insensitive validation (code uppercased before insert/query)

### 1-User-1-Code Rule

- Enforced in `/validate` endpoint: query `referral_usages.user_id = current_user_id`
- If exists, return `{ valid: false, code: "ALREADY_USED" }`

### Usage Counter Maintenance

- `referral_codes.current_usages` incremented when `referral_usages` record inserted
- Must be kept in sync (may need periodic audit)

### Commission Calculation (Admin View)

- `commission_rate` \* `total_paid_amount` = Commission earned
- Displayed as "수수료" in table columns

### Coupon Expiration

- Set at code application time
- Formula: likely `valid_until` date of referral code OR fixed duration from creation
- Checked in `/user-coupons` endpoint: `expires_at >= now()`

### Order-Coupon Linkage

- `orders` table has `coupon_id` column (not in initial migration — added separately)
- Used in payment confirm to mark coupon as `is_used`

---

## API Error Codes

### Validation Errors

| Code                  | Message                               | Cause                                                  |
| --------------------- | ------------------------------------- | ------------------------------------------------------ |
| `ALREADY_USED`        | "이미 추천인 코드를 사용하셨습니다."  | User already has referral usage record                 |
| `INVALID_CODE`        | "유효하지 않은 추천인 코드입니다."    | Code doesn't exist                                     |
| `CODE_INACTIVE`       | "유효하지 않은 추천인 코드입니다."    | Code is deactivated (`is_active = false`)              |
| `CODE_NOT_YET_ACTIVE` | "아직 사용할 수 없는 코드입니다."     | Current date < `valid_from`                            |
| `CODE_EXPIRED`        | "유효기간이 만료된 코드입니다."       | Current date > `valid_until`                           |
| `CODE_EXHAUSTED`      | "사용 가능 횟수가 초과된 코드입니다." | `current_usages >= max_usages` (when `max_usages > 0`) |

---

## Key Files Summary

| File                                                   | Purpose              | Key Functions                                          |
| ------------------------------------------------------ | -------------------- | ------------------------------------------------------ |
| `admin/referral-codes/page.tsx`                        | Admin dashboard      | List, search, filter, toggle codes; view usage details |
| `admin/referral-codes/_components/CreateCodeModal.tsx` | Code creation/edit   | Form validation, random code generation                |
| `profile/referral/page.tsx`                            | User page (server)   | Load existing coupon data via admin client             |
| `profile/referral/_components/ReferralCodeForm.tsx`    | User form (client)   | Code input, validation, apply flow                     |
| `api/admin/referral-codes/route.ts`                    | Admin GET/POST       | List codes with stats, create new code                 |
| `api/admin/referral-codes/[id]/route.ts`               | Admin CRUD single    | Get, update, delete code                               |
| `api/admin/referral-codes/[id]/usages/route.ts`        | Admin usage tracking | Get users who applied a code                           |
| `api/referral-codes/validate/route.ts`                 | User validate        | Check code validity & return discount                  |
| `api/referral-codes/apply/route.ts`                    | User apply           | RPC call to atomic apply logic                         |
| `api/user-coupons/route.ts`                            | User coupons         | Get active coupons for user                            |
| `api/payments/confirm/route.ts`                        | Payment handler      | Mark coupon used, update referral usage                |

---

## Missing Pieces / TODO

1. **RPC Function** — `apply_referral_code` not found in migrations
   - Must be created separately or exists in Supabase cloud
   - Handles atomicity of coupon generation + usage tracking

2. **Table Definitions** — `referral_codes`, `user_coupons`, `referral_usages` not in initial migration
   - May be in separate migration file or Supabase UI
   - Need to verify schema precisely

3. **Commission Rate Logic** — How/when is commission calculated for payments to partners?
   - Displayed in admin but no backend logic found

4. **Coupon Expiration Duration** — How is `user_coupons.expires_at` calculated?
   - Assumption: Based on referral code's `valid_until` date

5. **Coupon Discount Type** — Only flat amount (₩) supported?
   - No percentage discount logic found

---

## Integration Points

- **Orders table**: needs `coupon_id` column to link applied coupons
- **Auth**: Uses Supabase auth for user identification
- **Admin verification**: Uses `verifyAdmin()` helper from reports module
- **Admin client**: `createAdminClient()` for RLS bypass on sensitive queries
