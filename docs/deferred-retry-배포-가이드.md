# Deferred Retry 배포 가이드

Gemini 503 과부하로 리포트 생성이 실패했을 때, 자동으로 재생성하는 기능입니다.

## 전체 흐름

```
사용자 결제 → 리포트 생성 → Gemini 과부하로 실패
                                    ↓
                            deferred 상태로 저장 (사용자에게는 성공으로 보임)
                                    ↓
                            GitHub Actions (매 정시) → retry-deferred.ts 실행
                                    ↓
                            Gemini 재호출 → 성공 시 completed / 실패 시 다음 정시 재시도
```

---

## 해야 할 일

### 1. GitHub Secrets 설정

GitHub 레포 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

아래 3개를 추가해 주세요:

| Secret 이름                 | 값                         | 어디서 찾나요?                                             |
| --------------------------- | -------------------------- | ---------------------------------------------------------- |
| `SUPABASE_URL`              | `https://xxxx.supabase.co` | Supabase 대시보드 → Settings → API → Project URL           |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...`                   | Supabase 대시보드 → Settings → API → service_role (secret) |
| `GEMINI_API_KEY`            | 기존에 사용 중인 키        | Vercel 환경변수에 있는 것과 동일                           |

### 2. 코드 푸시

main/master 브랜치에 푸시하면 자동으로:

- Vercel 배포 (deferred 분기 코드 반영)
- GitHub Actions 워크플로우 등록 (매 정시 cron)

### 3. 끝!

추가 설정 없습니다. pg_cron, Edge Function, Vault 설정 전부 불필요합니다.

---

## 동작 확인

### 수동으로 워크플로우 실행해보기

1. GitHub 레포 → **Actions** 탭
2. 좌측 메뉴에서 **"Retry Deferred Reports"** 선택
3. 우측 상단 **"Run workflow"** 버튼 클릭
4. 로그에서 결과 확인

### 테스트 시나리오

1. Supabase SQL Editor에서 리포트 하나를 deferred로 변경:

```sql
UPDATE reports
SET ai_status = 'deferred', ai_deferred_at = now()
WHERE id = '<테스트할-리포트-id>';

-- order도 analyzing 상태로 (실제 deferred 시 유지되는 상태)
UPDATE orders
SET status = 'analyzing'
WHERE id = (SELECT order_id FROM reports WHERE id = '<테스트할-리포트-id>');
```

2. GitHub Actions에서 수동 실행 (Run workflow)

3. 실행 완료 후 확인:

```sql
SELECT id, ai_status, ai_retry_count, ai_error
FROM reports
WHERE id = '<테스트할-리포트-id>';
```

### cron 실행 이력 확인

GitHub 레포 → Actions 탭에서 "Retry Deferred Reports" 워크플로우의 실행 이력을 볼 수 있습니다. 각 실행의 로그에서 상세 내용 확인 가능합니다.

---

## 문제가 생겼을 때

### "deferred 리포트 없음. 종료." 로그만 나올 때

정상입니다. deferred 상태인 리포트가 없으면 아무것도 안 하고 종료됩니다.

### "필수 환경변수 누락" 에러

GitHub Secrets가 제대로 설정되었는지 확인해 주세요 (위 1번 참고).

### 재시도해도 계속 실패할 때

```sql
-- 현재 deferred 리포트 목록과 재시도 횟수 확인
SELECT id, ai_retry_count, ai_error, ai_deferred_at
FROM reports
WHERE ai_status = 'deferred'
ORDER BY ai_deferred_at;
```

`ai_error` 메시지를 확인해서 Gemini 측 문제인지 판단합니다. Gemini 서비스가 장시간 장애 중이면 복구될 때까지 매 정시 재시도가 계속됩니다.

### cron을 중지하고 싶을 때

GitHub 레포 → Actions → "Retry Deferred Reports" → 우측 상단 `...` 메뉴 → **Disable workflow**

다시 활성화하려면 같은 위치에서 **Enable workflow**.

---

## 참고: 변경된 파일 목록

| 파일                                                         | 설명                            |
| ------------------------------------------------------------ | ------------------------------- |
| `scripts/retry-deferred.ts`                                  | 재시도 스크립트 (핵심)          |
| `.github/workflows/retry-deferred.yml`                       | GitHub Actions cron 워크플로우  |
| `app/api/reports/run-pipeline/route.ts`                      | 과부하 시 deferred 분기         |
| `app/api/reports/[id]/run-task/route.ts`                     | 동일                            |
| `app/report/generating/page.tsx`                             | deferred 시 성공 화면           |
| `app/profile/consulting/page.tsx`                            | deferred → "전문가 검토중" 표시 |
| `app/admin/reports/[id]/page.tsx`                            | 어드민 deferred 재생성 가능     |
| `app/admin/types.ts`                                         | AiStatus 타입 추가              |
| `supabase/migrations/20260416120000_add_deferred_status.sql` | DB 스키마 (이미 적용됨)         |
