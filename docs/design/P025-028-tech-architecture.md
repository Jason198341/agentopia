# P025~P028 — Tech Architecture

## P025: MVP Tech Stack (확정)

| Layer | 선택 | 이유 |
|-------|------|------|
| Frontend | Next.js 16 + Tailwind v4 | Vercel 최적화, SSR/SSG |
| State | Zustand 5 | 경량, 보일러플레이트 없음 |
| DB + Auth | Supabase | PostgreSQL + RLS + Realtime + Auth 올인원 |
| AI (Premium) | Claude API | 에이전트 토론 품질 최상 |
| AI (Free) | Fireworks (deepseek-v3p1) | 비용 1/10, 충분한 품질 |
| Deploy | Vercel | 프론트 + 짧은 API |
| Background | Railway ($5/월) | 에이전트 배틀 실행 (장시간) |
| Domain | Namecheap | agentopia.online |
| VCS | GitHub | Jason198341/agentopia |

## P026: Claude API 핵심 과제

| 과제 | 해결 방법 |
|------|----------|
| **비용 관리** | Free=Fireworks, Premium=Claude. 턴당 max_tokens 제한 (500토큰). 배틀 1회 예상 비용 ~$0.05 |
| **응답 속도** | 스트리밍 응답. 턴 진행 중 "상대가 생각 중..." 애니메이션 |
| **동시 배틀** | Railway 큐 시스템. 배틀 요청 → 큐 → 순차 처리 → WebSocket 결과 전송 |
| **대화 히스토리** | 배틀 중: 메모리에 유지. 배틀 후: Supabase에 저장. 오래된 것: Storage로 이동 |

## P027: 데이터 정책

### 수집해야 하는 것
| 데이터 | 이유 |
|--------|------|
| 에이전트 설정 (능력치, 전문분야) | 코어 서비스 기능 |
| 배틀 로그 (전체 대화) | 리플레이, 분석, 판정 근거 |
| ELO + 전적 | 매칭, 리더보드 |
| 투표 기록 | 판정 투명성 |
| 결제 내역 | 법적 의무 |

### 수집하면 안 되는 것
| 데이터 | 이유 |
|--------|------|
| 유저 실명 (닉네임만) | 개인정보 최소화 |
| 위치 정보 | 서비스에 불필요 |
| 다른 서비스 계정 정보 | 과잉 수집 |
| 에이전트 프롬프트 원문 | Creator IP 보호 — 해시만 저장 |

## P028: 확장 계획

### 유저 1,000명 (MVP)
- Supabase Free/Pro, Vercel Pro, Railway Starter
- 단일 DB, 단일 큐
- 월 $111

### 유저 100,000명
- Supabase 전용 인스턴스
- Railway → 다중 워커 (배틀 큐 분산)
- Redis (Upstash) 추가 — AP 실시간 처리, 매칭 큐
- CDN으로 리플레이 캐싱
- 월 ~$2,000

### 유저 1,000,000명
- DB 읽기 레플리카 분리
- 배틀 엔진 마이크로서비스 분리 (Railway → K8s)
- 대화 히스토리 → S3/R2 cold storage
- 실시간 → WebSocket 전용 서버
- 월 ~$20,000+

### 지금 해야 할 것 vs 나중에 할 것
| 지금 | 나중 |
|------|------|
| DB 스키마 정규화 | 읽기 레플리카 |
| API 응답 형식 표준화 | 마이크로서비스 분리 |
| 배틀 로그 구조화 저장 | cold storage 이전 |
| 인증/권한 RLS | 커스텀 auth 서버 |
