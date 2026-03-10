# 구매 플로우 설정 가이드

구매 플로우(가격표 → 체크아웃 → 결제 → 리포트 생성)를 활성화하기 위한 설정 가이드입니다.

---

## 1. 환경변수 설정

`.env.local`에 아래 두 개의 환경변수를 추가해야 합니다.

```bash
# TossPayments
TOSS_SECRET_KEY=test_sk_xxxxxxxxxxxxxxxx
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_xxxxxxxxxxxxxxxx
```

### TossPayments 키 발급 방법

1. [TossPayments 개발자센터](https://developers.tosspayments.com/)에 가입/로그인
2. **내 개발정보** → **API 키** 확인
3. **테스트** 키와 **라이브** 키가 각각 있음

| 구분          | 환경변수                      | 접두사                  | 용도                     |
| ------------- | ----------------------------- | ----------------------- | ------------------------ |
| 클라이언트 키 | `NEXT_PUBLIC_TOSS_CLIENT_KEY` | `test_ck_` / `live_ck_` | 브라우저에서 결제창 호출 |
| 시크릿 키     | `TOSS_SECRET_KEY`             | `test_sk_` / `live_sk_` | 서버에서 결제 승인       |

> **테스트 모드**: `test_` 접두사 키를 사용하면 실제 결제 없이 플로우를 테스트할 수 있습니다. 테스트 카드번호는 TossPayments 문서를 참고하세요.

### 현재 `.env.local` 상태

| 환경변수                        | 상태                   |
| ------------------------------- | ---------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | 설정됨                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 설정됨                 |
| `SUPABASE_SERVICE_ROLE_KEY`     | 설정됨                 |
| `GEMINI_API_KEY`                | 설정됨                 |
| `TOSS_SECRET_KEY`               | **미설정 (추가 필요)** |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY`   | **미설정 (추가 필요)** |

---

## 2. Vercel 환경변수 설정

프로덕션 배포를 위해 Vercel에도 환경변수를 설정해야 합니다.

**Vercel 대시보드** → **Settings** → **Environment Variables**

| 환경변수                        | 환경                | 비고                  |
| ------------------------------- | ------------------- | --------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | All                 | 이미 설정되어 있을 것 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All                 | 이미 설정되어 있을 것 |
| `SUPABASE_SERVICE_ROLE_KEY`     | Production, Preview | 이미 설정되어 있을 것 |
| `GEMINI_API_KEY`                | Production, Preview | 이미 설정되어 있을 것 |
| `TOSS_SECRET_KEY`               | Production, Preview | **추가 필요**         |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY`   | All                 | **추가 필요**         |

> **라이브 배포 시**: `test_` 접두사 키를 `live_` 접두사 키로 교체하세요.

---

## 4. DB 상태 확인

구매 플로우에 필요한 테이블은 이미 생성되어 있습니다:

| 테이블     | 상태                                  | RLS  |
| ---------- | ------------------------------------- | ---- |
| `plans`    | 생성됨 (3행: lite, standard, premium) | 활성 |
| `orders`   | 생성됨 (0행)                          | 활성 |
| `payments` | 생성됨 (0행)                          | 활성 |
| `reports`  | 생성됨 (0행)                          | 활성 |

추가 마이그레이션이나 테이블 생성은 필요하지 않습니다.

---

## 5. 전체 플로우 테스트

### 테스트 순서

1. **개발 서버 실행**: `pnpm dev`
2. **회원가입 → 온보딩 → 생기부 등록** 완료
3. **가격표 페이지** (`/pricing`) 에서 플랜 선택
4. **체크아웃 페이지** (`/checkout?plan=standard`) 로 이동 확인
5. **결제하기** 클릭 → TossPayments 결제창 표시
6. **테스트 결제** 진행 (테스트 카드 사용)
7. **결제 성공** → `/checkout/success` → 결제 확인 → 리포트 생성 트리거
8. **리포트 생성 중** 페이지 (`/report/[id]/generating`) 로 이동
9. **컨설팅 내역** (`/profile/consulting`) 에서 주문 상태 확인

### TossPayments 테스트 결제

테스트 모드에서는 아무 카드 정보나 입력해도 결제가 승인됩니다.

- 카드번호: `4330000000000` 등 아무 번호
- 유효기간, CVC: 아무 값

### 실패 시나리오 확인

| 시나리오                      | 예상 동작                           |
| ----------------------------- | ----------------------------------- |
| 미로그인 상태로 플랜 클릭     | 로그인 모달 표시                    |
| 생기부 미등록 상태로 체크아웃 | `/record`로 리다이렉트              |
| 결제 취소 (결제창에서 닫기)   | 체크아웃 페이지로 복귀              |
| 결제 실패                     | `/checkout/fail`에 에러 메시지 표시 |

---

## 6. 체크리스트

- [ ] `.env.local`에 `TOSS_SECRET_KEY` 추가
- [ ] `.env.local`에 `NEXT_PUBLIC_TOSS_CLIENT_KEY` 추가
- [ ] 개발 환경에서 전체 플로우 테스트
- [ ] Vercel에 `TOSS_SECRET_KEY` 환경변수 추가
- [ ] Vercel에 `NEXT_PUBLIC_TOSS_CLIENT_KEY` 환경변수 추가
- [ ] 프로덕션 배포 시 라이브 키로 교체
