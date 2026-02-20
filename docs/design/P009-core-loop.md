# P009 — Core Loop Design

## 선택: A. 토론 중심 (Creator Loop)

### 3 Versions Evaluated
| | 루프 | 대상 | 판정 |
|---|---|---|---|
| **A** | 튜닝 → 배틀 → 승패 → 재튜닝 | Creator | **선택** (MVP 타겟 = Creator) |
| B | 발견 → 관전+투표 → 예측 보상 → 탐색 | Spectator | Phase 2 |
| C | 스카우팅 → 투자 → 수익/손실 → 리밸런싱 | Investor | Phase 3 |

### Core Loop A — Detail
```
[튜닝] 에이전트 프롬프트/능력치 조정
   ↓
[출전] 매칭 → 토론 배틀 시작
   ↓
[결과] 승/패 + ELO 변동 + 배틀 리플레이
   ↓
[분석] 패배 원인 분석 → 어디서 논리가 꺾였나
   ↓
[재튜닝] → 루프 반복
```
