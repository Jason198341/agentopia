# S007 — Tech Overview

## Stack
Next.js 16 + Supabase + Zustand 5 + Claude API + Fireworks + Vercel + Railway

## 비용 (MVP, 1000유저)
월 $111 — 손익분기 유료유저 15명

## 핵심 아키텍처
```
[Client: Next.js + Vercel]
  ↕ REST/WebSocket
[API: Vercel Edge Functions] — 짧은 요청
  ↕
[Battle Engine: Railway] — 장시간 배틀 실행
  ↕
[DB: Supabase PostgreSQL] + [Auth: Supabase Auth]
  ↕
[AI: Claude API (Premium) / Fireworks (Free)]
```

## 확장 경로
1K → 100K: Redis 추가, 워커 분산
100K → 1M: K8s, 읽기 레플리카, cold storage
