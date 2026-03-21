# 추천인 코드 (Referral Code)

> 한 줄 요약: 인플루언서/파트너를 통해 유입된 신규 유저에게 회원가입 시 추천인 코드를 입력하면 5,000원 할인 쿠폰을 제공하는 시스템

## 개요

### 배경

인플루언서 마케팅을 진행하면서, 특정 인플루언서를 통해 유입된 신규 유저를 추적하고 인센티브를 제공할 수 있는 구조가 필요하다. 현재는 유입 경로를 추적할 수 없고, 신규 유저에게 가입 동기를 부여할 할인 수단도 없다.

### 목표

1. 어드민에서 추천인 코드를 생성하고 파트너(인플루언서 등)에게 배포
2. 신규 유저가 회원가입 시 추천인 코드를 입력하면 5,000원 할인 쿠폰 자동 발급
3. 코드별 사용 현황을 추적하여 파트너 성과를 측정
4. 파트너에게 수수료(결제액의 17%)를 정산할 수 있는 데이터 기반 마련

## 핵심 용어

| 용어                        | 설명                                                    |
| --------------------------- | ------------------------------------------------------- |
| 추천인 코드 (Referral Code) | 파트너에게 배포하는 고유 코드                           |
| 파트너 (Partner)            | 코드를 배포받는 주체 (인플루언서, 제휴사, 내부 직원 등) |
| 쿠폰 (Coupon)               | 코드 입력 시 유저에게 발급되는 5,000원 할인권           |
| 수수료 (Commission)         | 코드를 통한 결제액의 17%를 파트너에게 지급              |

> "인플루언서"로 한정하지 않고 **파트너(Partner)**로 추상화하여 향후 제휴사, 내부 직원, 기업 고객 등으로 확장 가능하게 설계한다.

## 사용자 시나리오

### 시나리오 1: 어드민 — 추천인 코드 생성

```
1. 어드민이 [추천인 코드 관리] 메뉴에 진입
2. [코드 생성] 버튼 클릭
3. 코드 생성 모달에서 다음을 입력:
   - 코드: 직접 입력 또는 [랜덤 생성] 버튼으로 난수 생성
   - 파트너명: 코드를 제공할 파트너 이름
   - 파트너 유형: 인플루언서 / 제휴사 / 내부 / 기타
   - 사용 횟수 제한: 최대 사용 가능 횟수 (0 = 무제한)
   - 유효기간: 시작일 ~ 종료일
   - 메모: 자유 기입 (선택)
4. [생성] 클릭 → 코드 생성 완료
5. 목록에서 생성된 코드 확인 가능
```

### 시나리오 2: 어드민 — 코드 현황 조회

```
1. 어드민이 [추천인 코드 관리] 목록에서 코드별 현황 확인
   - 코드, 파트너명, 파트너 유형, 사용횟수/제한, 유효기간, 상태
2. 특정 코드 클릭 → 상세 페이지
   - 코드 사용 내역 (사용 유저, 사용일시, 결제 플랜, 결제액, 쿠폰 사용 여부)
   - 총 수수료 = 코드 경유 총 결제액 x 17%
3. 코드 비활성화/활성화 토글 가능
```

### 시나리오 3: 유저 — 추천인 코드 입력 (로그인 후)

```
1. 로그인된 유저가 추천인 코드 입력 진입점 확인
   - 프로필 메뉴, 결제 페이지 내 배너, 또는 별도 페이지 등
2. 추천인 코드 입력란에 코드 입력
3. 시스템이 코드 유효성 검증:
   - 코드 존재 여부
   - 유효기간 내 여부
   - 사용 횟수 초과 여부
   - 활성 상태 여부
   - 해당 유저의 기존 사용 여부 (1인 1회 제한)
4. 유효한 경우: 5,000원 할인 쿠폰 자동 발급 + 사용 이력 기록
5. 유효하지 않은 경우: 에러 메시지 안내
6. 이미 사용한 유저: "이미 추천인 코드를 사용하셨습니다." 안내
```

> **변경 사항**: 회원가입 시점이 아닌 로그인 후 언제든 입력 가능. 회원가입과 코드 입력을 분리하여 가입 전환율 저하를 방지하고, 기존 유저에게도 코드 사용 기회를 제공한다. 인당 1회 제한은 `referral_usages.UNIQUE(user_id)`로 보장.

### 시나리오 4: 유저 — 쿠폰 사용

```
1. 유저가 리포트 결제 페이지에서 보유 쿠폰 확인
2. 5,000원 할인 쿠폰 선택 → 결제 금액에서 차감
3. 모든 플랜(Lite/Standard/Premium)에서 사용 가능
```

## 요구사항

### 기능 요구사항

우선순위: 🔴 필수 | 🟡 권장 | 🟢 선택

**어드민**

- [ ] 🔴 추천인 코드 생성 (직접 입력 / 난수 생성)
- [ ] 🔴 파트너 정보 입력 (파트너명, 파트너 유형)
- [ ] 🔴 코드별 설정: 사용 횟수 제한, 유효기간(시작일~종료일)
- [ ] 🔴 코드 목록 조회 (상태, 사용횟수, 파트너 정보)
- [ ] 🔴 코드 활성화/비활성화 토글
- [ ] 🟡 코드 상세: 사용 내역 목록 (유저, 일시, 쿠폰 사용 여부)
- [ ] 🟡 코드 수정 (유효기간, 사용 횟수 제한 변경)
- [ ] 🟡 코드별 총 결제액 / 수수료(17%) 자동 계산 표시 (코드 경유 결제액 x 17%)
- [ ] 🟢 코드 목록 CSV 다운로드
- [ ] 🟢 파트너별 필터링/검색

**추천인 코드 입력 (유저)**

- [ ] 🔴 로그인 후 추천인 코드 입력 UI (프로필 메뉴 또는 결제 페이지 배너)
- [ ] 🔴 코드 유효성 실시간 검증 (존재, 유효기간, 횟수, 활성 상태)
- [ ] 🔴 유효 코드 입력 시 5,000원 쿠폰 자동 발급
- [ ] 🔴 1인 1회 제한 (이미 추천인 코드를 사용한 유저는 재사용 불가)
- [ ] 🔴 코드 검증/적용 API는 인증 필수 (로그인된 유저만 호출 가능)

**쿠폰/결제**

- [ ] 🔴 발급된 쿠폰을 결제 시 적용 가능
- [ ] 🔴 모든 플랜(Lite/Standard/Premium)에서 사용 가능
- [ ] 🟡 쿠폰 만료 기한 설정 (발급일로부터 N일, 기본 30일)

### 비기능 요구사항

- **보안**: 코드 검증/적용 API는 인증 필수 + rate limit 적용 (브루트포스 방지)
- **성능**: 코드 검증 응답 200ms 이내
- **데이터 무결성**: 사용 횟수 증가는 트랜잭션으로 처리 (동시 사용 시 race condition 방지)

## 구현 가이드

### 구현 위치

```
신규 테이블:
├── referral_codes        # 추천인 코드
├── referral_usages       # 코드 사용 이력
└── user_coupons          # 유저 쿠폰 (추천인 외 확장 가능)

신규 API:
└── app/api/
    ├── admin/referral-codes/
    │   ├── route.ts              # GET(목록) / POST(생성)
    │   └── [id]/
    │       ├── route.ts          # GET(상세) / PATCH(수정) / DELETE
    │       └── usages/route.ts   # GET(사용 내역)
    └── referral-codes/
        ├── validate/route.ts     # POST(코드 검증 — 로그인 유저, 인증 필수)
        └── apply/route.ts        # POST(코드 적용 + 쿠폰 발급 — 인증 필수)

신규 페이지:
├── app/admin/referral-codes/
│   ├── page.tsx                  # 코드 목록
│   └── [id]/page.tsx             # 코드 상세 (사용 내역)
└── app/profile/referral/
    └── page.tsx                  # 유저: 추천인 코드 입력 페이지

기존 파일 수정:
└── (해당 없음 — 회원가입 폼 수정 불필요)
```

### 기존 코드 활용

| 모듈                    | 용도                          | 참고                          |
| ----------------------- | ----------------------------- | ----------------------------- |
| `libs/supabase`         | DB 연동                       | 기존 Supabase 클라이언트 사용 |
| `app/admin/_components` | DataTable, Badge, StatCard 등 | 어드민 공통 컴포넌트 재사용   |
| `app/profile/`          | 프로필 메뉴                   | 추천인 코드 입력 페이지 추가  |

## 상세 스펙

### DB 스키마

```sql
-- 추천인 코드
CREATE TABLE referral_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,               -- 추천인 코드 (대소문자 구분 없이 저장: UPPER)
  partner_name TEXT NOT NULL,              -- 파트너명
  partner_type TEXT NOT NULL DEFAULT 'influencer',  -- influencer | affiliate | internal | other
  max_usages INT NOT NULL DEFAULT 0,       -- 최대 사용 횟수 (0 = 무제한)
  current_usages INT NOT NULL DEFAULT 0,   -- 현재 사용 횟수
  commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.17, -- 수수료율 (기본 17%)
  discount_amount INT NOT NULL DEFAULT 5000, -- 쿠폰 할인 금액 (원)
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,                 -- NULL이면 무기한
  is_active BOOLEAN NOT NULL DEFAULT true,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 코드 사용 이력
CREATE TABLE referral_usages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_code_id UUID NOT NULL REFERENCES referral_codes(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  coupon_id UUID REFERENCES user_coupons(id),
  order_id UUID,                            -- 결제 주문 ID (결제 시 연결)
  plan_name TEXT,                           -- 결제 플랜 (lite/standard/premium)
  paid_amount INT DEFAULT 0,                -- 실제 결제 금액 (원)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)  -- 1인 1회 제한
);

-- 유저 쿠폰
CREATE TABLE user_coupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  source TEXT NOT NULL DEFAULT 'referral',  -- referral | promotion | admin 등 확장 가능
  source_id UUID,                           -- referral_code_id 등 원본 참조
  discount_amount INT NOT NULL,             -- 할인 금액 (원)
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  used_for_report_id UUID,                  -- 사용된 리포트 ID
  expires_at TIMESTAMPTZ NOT NULL,          -- 만료일
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_referral_usages_code_id ON referral_usages(referral_code_id);
CREATE INDEX idx_referral_usages_user_id ON referral_usages(user_id);
CREATE INDEX idx_user_coupons_user_id ON user_coupons(user_id);
```

### 타입 정의

```typescript
// 파트너 유형
type PartnerType = "influencer" | "affiliate" | "internal" | "other";

// 추천인 코드
interface ReferralCode {
  id: string;
  code: string;
  partnerName: string;
  partnerType: PartnerType;
  maxUsages: number; // 0 = 무제한
  currentUsages: number;
  commissionRate: number; // 수수료율 (0.17 = 17%)
  discountAmount: number; // 원
  validFrom: string;
  validUntil: string | null;
  isActive: boolean;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

// 코드 생성 요청
interface CreateReferralCodeRequest {
  code?: string; // 미입력 시 난수 생성
  partnerName: string;
  partnerType: PartnerType;
  maxUsages: number;
  discountAmount?: number; // 기본 5000
  validFrom: string;
  validUntil?: string;
  memo?: string;
}

// 코드 검증 응답
interface ValidateReferralCodeResponse {
  valid: boolean;
  discountAmount?: number;
  message?: string; // 에러 시 사유
}

// 사용 이력
interface ReferralUsage {
  id: string;
  referralCodeId: string;
  userId: string;
  userEmail: string;
  couponId: string;
  couponUsed: boolean;
  orderId: string | null; // 결제 주문 ID
  planName: string | null; // 결제 플랜
  paidAmount: number; // 실제 결제 금액
  createdAt: string;
}

// 유저 쿠폰
interface UserCoupon {
  id: string;
  userId: string;
  source: "referral" | "promotion" | "admin";
  sourceId: string | null;
  discountAmount: number;
  isUsed: boolean;
  usedAt: string | null;
  expiresAt: string;
  createdAt: string;
}
```

### API 설계

| 엔드포인트                              | 메서드 | 설명                  | 인증        |
| --------------------------------------- | ------ | --------------------- | ----------- |
| `/api/admin/referral-codes`             | GET    | 코드 목록 조회        | 어드민      |
| `/api/admin/referral-codes`             | POST   | 코드 생성             | 어드민      |
| `/api/admin/referral-codes/[id]`        | GET    | 코드 상세             | 어드민      |
| `/api/admin/referral-codes/[id]`        | PATCH  | 코드 수정             | 어드민      |
| `/api/admin/referral-codes/[id]`        | DELETE | 코드 삭제             | 어드민      |
| `/api/admin/referral-codes/[id]/usages` | GET    | 사용 내역             | 어드민      |
| `/api/referral-codes/validate`          | POST   | 코드 검증             | 로그인 유저 |
| `/api/referral-codes/apply`             | POST   | 코드 적용 + 쿠폰 발급 | 로그인 유저 |

#### 코드 생성 — POST /api/admin/referral-codes

```json
// Request
{
  "code": "JAKE2026",
  "partnerName": "제이크",
  "partnerType": "influencer",
  "maxUsages": 100,
  "validFrom": "2026-04-01T00:00:00Z",
  "validUntil": "2026-06-30T23:59:59Z",
  "memo": "유튜브 캠페인"
}

// Response (성공)
{
  "data": { "id": "...", "code": "JAKE2026", ... }
}
```

#### 코드 검증 — POST /api/referral-codes/validate (인증 필수)

```json
// Request (Authorization: Bearer 토큰 필요)
{ "code": "JAKE2026" }

// Response (유효)
{ "valid": true, "discountAmount": 5000 }

// Response (무효)
{ "valid": false, "message": "유효기간이 만료된 코드입니다." }

// Response (이미 사용)
{ "valid": false, "message": "이미 추천인 코드를 사용하셨습니다.", "code": "ALREADY_USED" }
```

#### 코드 적용 — POST /api/referral-codes/apply (인증 필수)

```json
// Request
{ "code": "JAKE2026" }

// Response (성공)
{ "success": true, "coupon": { "id": "...", "discountAmount": 5000, "expiresAt": "..." } }

// Response (실패)
{ "success": false, "message": "이미 추천인 코드를 사용하셨습니다." }
```

### 코드 적용 플로우 (로그인 후)

```
1. 로그인된 유저가 추천인 코드 입력 페이지 진입
2. 코드 입력 → POST /api/referral-codes/validate 실시간 검증
3. 유효한 코드 확인 후 [적용] 버튼 클릭
4. POST /api/referral-codes/apply 호출:
   a. 유저 인증 확인
   b. 1인 1회 제한 확인 (referral_usages에 user_id 존재 여부)
   c. 코드 유효성 재검증
   d. 트랜잭션으로 처리:
      - user_coupons 레코드 생성 (5,000원, 만료 30일)
      - referral_usages 레코드 생성
      - referral_codes.current_usages +1
5. 성공 시 쿠폰 발급 안내 표시
```

### 난수 코드 생성 규칙

- 형식: 영문 대문자 + 숫자 조합, 8자리
- 예시: `SPL3K9MX`, `R7FW2NAQ`
- 혼동 문자 제외: `0/O`, `1/I/L`
- 중복 체크 후 저장

### UI/UX

#### 어드민 — 코드 목록

```
┌──────────────────────────────────────────────────────────────┐
│  추천인 코드 관리                              [+ 코드 생성] │
├──────────────────────────────────────────────────────────────┤
│  코드       │ 파트너    │ 유형       │ 사용   │ 유효기간           │ 결제액    │ 상태 │
│  JAKE2026  │ 제이크    │ 인플루언서  │ 23/100 │ 04.01 ~ 06.30     │ 460,000원│ 활성 │
│  SUMMER26  │ 여름이    │ 인플루언서  │ 5/50   │ 04.15 ~ 05.31     │ 100,000원│ 활성 │
│  PARTNER01 │ A 제휴사  │ 제휴사     │ 102/∞  │ 03.01 ~ 무기한     │ 2,040,000원│ 비활성│
└──────────────────────────────────────────────────────────────┘
```

#### 어드민 — 코드 생성 모달

```
┌──────────────────────────────────────┐
│  추천인 코드 생성                     │
├──────────────────────────────────────┤
│  코드     [           ] [랜덤 생성]  │
│  파트너명  [           ]             │
│  파트너 유형  [인플루언서 ▾]          │
│                                      │
│  사용 횟수 제한  [100    ] (0=무제한) │
│  유효기간       [04/01] ~ [06/30]    │
│  메모          [                  ]  │
│                                      │
│            [취소]  [생성]             │
└──────────────────────────────────────┘
```

#### 유저 — 추천인 코드 입력 페이지

```
┌──────────────────────────────────────┐
│  추천인 코드 입력                     │
│  추천인 코드가 있다면 입력하고        │
│  5,000원 할인 쿠폰을 받으세요!       │
├──────────────────────────────────────┤
│                                      │
│  추천인 코드                         │
│  [               ] [확인]            │
│  ✅ 유효한 코드입니다.               │
│     5,000원 할인 쿠폰이 발급됩니다.  │
│                                      │
│          [쿠폰 받기]                 │
│                                      │
│  ※ 추천인 코드는 1인 1회만           │
│    사용 가능합니다.                   │
└──────────────────────────────────────┘

[이미 사용한 유저의 경우]
┌──────────────────────────────────────┐
│  추천인 코드 입력                     │
├──────────────────────────────────────┤
│                                      │
│  ✅ 이미 추천인 코드를 사용했습니다.  │
│  발급된 쿠폰: 5,000원 할인           │
│  만료일: 2026.04.20                  │
│                                      │
└──────────────────────────────────────┘
```

## 에러 처리

### 예상 에러 케이스

| 에러 상황               | 에러 코드        | 사용자 메시지                         | 처리 방법        |
| ----------------------- | ---------------- | ------------------------------------- | ---------------- |
| 존재하지 않는 코드      | `INVALID_CODE`   | "유효하지 않은 추천인 코드입니다."    | 인라인 에러      |
| 유효기간 만료           | `CODE_EXPIRED`   | "유효기간이 만료된 코드입니다."       | 인라인 에러      |
| 사용 횟수 초과          | `CODE_EXHAUSTED` | "사용 가능 횟수가 초과된 코드입니다." | 인라인 에러      |
| 비활성 코드             | `CODE_INACTIVE`  | "유효하지 않은 추천인 코드입니다."    | 인라인 에러      |
| 이미 사용한 유저        | `ALREADY_USED`   | "이미 추천인 코드를 사용하셨습니다."  | 인라인 에러      |
| 코드 중복 생성 (어드민) | `DUPLICATE_CODE` | "이미 존재하는 코드입니다."           | 모달 인라인 에러 |

## 성공 기준

### 완료 조건

- [ ] 어드민에서 추천인 코드 CRUD 가능
- [ ] 로그인 후 추천인 코드 입력 및 검증 동작
- [ ] 유효 코드 적용 시 쿠폰 자동 발급
- [ ] 1인 1회 제한 정상 동작 (이미 사용한 유저에게 안내 표시)
- [ ] 코드 사용 현황/내역 어드민에서 조회 가능
- [ ] 타입 체크 통과 (`pnpm build`)
- [ ] 린트 통과 (`pnpm lint`)

## 구현 단계

### Phase 1: MVP

- [ ] DB 테이블 생성 (referral_codes, referral_usages, user_coupons)
- [ ] 어드민: 코드 생성/목록/활성화 토글
- [ ] 유저: 추천인 코드 입력 페이지 + 실시간 검증 + 적용 API
- [ ] 코드 적용 로직: 쿠폰 발급 + 사용 이력 기록
- [ ] 결제 시 쿠폰 적용 (5,000원 차감)

### Phase 2: 관리 강화

- [ ] 어드민: 코드 상세 페이지 (사용 내역 목록)
- [ ] 어드민: 코드 수정 기능
- [ ] 코드별 총 결제액 / 수수료(17%) 자동 계산 표시
- [ ] 파트너별 필터링/검색

### Phase 3: 확장 (선택)

- [ ] CSV 다운로드
- [ ] 파트너 대시보드 (파트너 본인이 성과 조회)
- [ ] 쿠폰 유형 확장 (정률 할인, 무료 체험 등)
- [ ] URL 파라미터 자동 적용 (`?ref=JAKE2026`으로 접속 시 코드 자동 입력)

## 제약사항

- 쿠폰은 현재 결제 플로우에 통합 필요 (토스페이먼츠 연동 시 금액 차감 반영)
- 추천인 코드 검증/적용 API는 인증 필수 (로그인된 유저만 호출 가능) + rate limit 적용
- 수수료(결제액의 17%)는 referral_usages.paid_amount 기반 자동 계산이며, 실제 정산은 별도 프로세스 (이 스펙 범위 외)
- paid_amount는 결제 완료 시 주문 정보에서 referral_usages에 업데이트 (결제 플로우에서 연결 필요)
