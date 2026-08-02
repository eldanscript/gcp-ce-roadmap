# CE 12주 로드맵 + 역량 체크 (Plan 1/4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 정적 PWA 셸(4-tab 네비)을 만들고, "GCP AI Customer Engineer Capability Roadmap" 12주
로드맵(18개 액션)과 11개 카테고리 역량 체크리스트(97개 항목)를 Supabase에 영속 저장하며
체크·진척률을 확인할 수 있게 한다. 6개 레이어 중 첫 번째 배포 가능한 조각.

**Architecture:** 빌드 도구 없는 정적 HTML+Vanilla JS(`docs/`가 GitHub Pages 소스). 콘텐츠는
커밋된 JSON, 진행 상태는 Supabase 2개 테이블(`roadmap_progress`, `capability_progress`).
localStorage 즉시 반영 + Supabase 큐잉 전송으로 오프라인 대응(routine-jammy와 동일 패턴).

**Tech Stack:** HTML5, Vanilla JS(ES2020+), CSS, Supabase JS client(CDN import), Node.js
`node --test`(순수 함수·데이터 일관성 유닛테스트).

## Global Constraints

- 프로젝트 루트: `/home/rainny/dev-run/gcp-ce-roadmap` (이미 git init, main 브랜치, 첫 커밋 완료)
- 빌드 도구 없음 — `docs/`의 파일이 그대로 GitHub Pages에 서빙된다.
- 콘텐츠(로드맵 18개, 역량 97개)는 `docs/superpowers/specs/2026-08-02-gcp-ce-roadmap-design.md`의
  "전체 콘텐츠" 절이 원본 — 이 계획의 JSON은 그 원문을 그대로 옮긴 것이므로 텍스트를 임의로
  바꾸지 않는다.
- Supabase 프로젝트는 **신규**(routine-jammy와 별도) — 이 계획의 Task 6에서 사용자가 직접
  생성해야 한다(에이전트가 클라우드 계정을 만들 수 없음).
- `weekly_checkins`(주간 반복) 등 다른 레이어의 테이블은 이 계획의 범위가 아니다 — Plan 1은
  `roadmap_progress`/`capability_progress` 2개 테이블만 만든다.

---

## Task 1: 정적 콘텐츠 JSON + 일관성 테스트

**Files:**
- Create: `docs/data/roadmap.json`
- Create: `docs/data/capabilities.json`
- Test: `tests/js/data-schema.test.js`

**Interfaces:**
- Produces: `roadmap.json`은 `{id: string, phase: 1|2|3, weekRange: "1-4"|"5-8"|"9-12", title: string}[]` (18개).
  `capabilities.json`은 `{id: string, categoryId: 1-11, categoryTitle: string, subgroup: string|null, title: string}[]` (97개).
  이후 모든 Task가 이 두 파일의 정확한 필드명을 그대로 쓴다.

- [ ] **Step 1: `docs/data/roadmap.json` 작성**

```json
[
  {"id": "r1", "phase": 1, "weekRange": "1-4", "title": "GCP 핵심 서비스 맵 작성"},
  {"id": "r2", "phase": 1, "weekRange": "1-4", "title": "Gemini, Vertex AI, BigQuery, GKE, Cloud Run 요약 노트 작성"},
  {"id": "r3", "phase": 1, "weekRange": "1-4", "title": "Claude Code 또는 Codex 기반 로컬 개발 워크플로우 정립"},
  {"id": "r4", "phase": 1, "weekRange": "1-4", "title": "Notion 또는 Obsidian 기반 학습 허브 생성"},
  {"id": "r5", "phase": 1, "weekRange": "1-4", "title": "멀티모달 LLM으로 아키텍처 다이어그램 5개 분석 연습"},
  {"id": "r6", "phase": 1, "weekRange": "1-4", "title": "PPT 템플릿과 발표 스토리라인 템플릿 작성"},
  {"id": "r7", "phase": 2, "weekRange": "5-8", "title": "RAG 아키텍처 3개 설계 및 비교"},
  {"id": "r8", "phase": 2, "weekRange": "5-8", "title": "Agent ADK 기반 샘플 agent 1개 구현 또는 설계 문서화"},
  {"id": "r9", "phase": 2, "weekRange": "5-8", "title": "MCP/tool calling 구조 예시 정리"},
  {"id": "r10", "phase": 2, "weekRange": "5-8", "title": "고객 메일 요약, follow-up, action tracker 자동화 루틴 구성"},
  {"id": "r11", "phase": 2, "weekRange": "5-8", "title": "Slack/Notion/Obsidian 워크플로우 연결"},
  {"id": "r12", "phase": 2, "weekRange": "5-8", "title": "고객용 10장 내외 제안서 2개 작성"},
  {"id": "r13", "phase": 3, "weekRange": "9-12", "title": "고객 산업별 reference architecture 3개 작성"},
  {"id": "r14", "phase": 3, "weekRange": "9-12", "title": "멀티모달 use case별 GCP 매핑 문서 작성"},
  {"id": "r15", "phase": 3, "weekRange": "9-12", "title": "비용·보안·운영성 포함한 architecture review 훈련"},
  {"id": "r16", "phase": 3, "weekRange": "9-12", "title": "발표자료 1세트를 완성하고 리허설"},
  {"id": "r17", "phase": 3, "weekRange": "9-12", "title": "AI agent를 활용한 주간 업무 운영체계 정착"},
  {"id": "r18", "phase": 3, "weekRange": "9-12", "title": "월간 성숙도 셀프 리뷰 수행"}
]
```

- [ ] **Step 2: `docs/data/capabilities.json` 작성**

```json
[
  {"id": "c1-1", "categoryId": 1, "categoryTitle": "GCP 플랫폼 전문성", "subgroup": null, "title": "Compute Engine, GKE, Cloud Run, serverless 패턴"},
  {"id": "c1-2", "categoryId": 1, "categoryTitle": "GCP 플랫폼 전문성", "subgroup": null, "title": "Cloud Storage, tiering, backup, lifecycle"},
  {"id": "c1-3", "categoryId": 1, "categoryTitle": "GCP 플랫폼 전문성", "subgroup": null, "title": "VPC, load balancing, private connectivity, Cloud CDN"},
  {"id": "c1-4", "categoryId": 1, "categoryTitle": "GCP 플랫폼 전문성", "subgroup": null, "title": "IAM, Org Policy, VPC Service Controls, CMEK, DLP"},
  {"id": "c1-5", "categoryId": 1, "categoryTitle": "GCP 플랫폼 전문성", "subgroup": null, "title": "Cloud Monitoring, Logging, alerting, 운영 가시성"},
  {"id": "c1-6", "categoryId": 1, "categoryTitle": "GCP 플랫폼 전문성", "subgroup": null, "title": "HA/DR, multi-region, scaling, cost model"},

  {"id": "c2-1", "categoryId": 2, "categoryTitle": "AI/ML 플랫폼 전문성", "subgroup": null, "title": "Gemini 계열 모델과 모델 선택 기준"},
  {"id": "c2-2", "categoryId": 2, "categoryTitle": "AI/ML 플랫폼 전문성", "subgroup": null, "title": "Vertex AI 학습, 평가, 레지스트리, 엔드포인트, 파이프라인"},
  {"id": "c2-3", "categoryId": 2, "categoryTitle": "AI/ML 플랫폼 전문성", "subgroup": null, "title": "Model Garden과 오픈 모델 활용 전략"},
  {"id": "c2-4", "categoryId": 2, "categoryTitle": "AI/ML 플랫폼 전문성", "subgroup": null, "title": "BigQuery ML과 BigQuery-Vertex AI 통합"},
  {"id": "c2-5", "categoryId": 2, "categoryTitle": "AI/ML 플랫폼 전문성", "subgroup": null, "title": "TPU, GPU, AI Hypercomputer 개요와 선택 기준"},
  {"id": "c2-6", "categoryId": 2, "categoryTitle": "AI/ML 플랫폼 전문성", "subgroup": null, "title": "Model Evaluation, Model Armor, 안전성 제어"},

  {"id": "c3-1", "categoryId": 3, "categoryTitle": "Agentic AI 설계 역량", "subgroup": null, "title": "Agent와 chatbot의 차이"},
  {"id": "c3-2", "categoryId": 3, "categoryTitle": "Agentic AI 설계 역량", "subgroup": null, "title": "Tool use, function calling, workflow orchestration"},
  {"id": "c3-3", "categoryId": 3, "categoryTitle": "Agentic AI 설계 역량", "subgroup": null, "title": "ADK 기반 코드 우선 agent 설계"},
  {"id": "c3-4", "categoryId": 3, "categoryTitle": "Agentic AI 설계 역량", "subgroup": null, "title": "Agent Engine 런타임, Sessions, Memory Bank 개념"},
  {"id": "c3-5", "categoryId": 3, "categoryTitle": "Agentic AI 설계 역량", "subgroup": null, "title": "MCP와 A2A 기반 상호운용"},
  {"id": "c3-6", "categoryId": 3, "categoryTitle": "Agentic AI 설계 역량", "subgroup": null, "title": "Human-in-the-loop, approval, audit 설계"},
  {"id": "c3-7", "categoryId": 3, "categoryTitle": "Agentic AI 설계 역량", "subgroup": null, "title": "Model Armor와 agent security"},

  {"id": "c4-1", "categoryId": 4, "categoryTitle": "RAG와 엔터프라이즈 검색", "subgroup": null, "title": "Chunking 전략: fixed-size vs semantic"},
  {"id": "c4-2", "categoryId": 4, "categoryTitle": "RAG와 엔터프라이즈 검색", "subgroup": null, "title": "Metadata 설계와 structured filtering"},
  {"id": "c4-3", "categoryId": 4, "categoryTitle": "RAG와 엔터프라이즈 검색", "subgroup": null, "title": "Hybrid retrieval: keyword + vector"},
  {"id": "c4-4", "categoryId": 4, "categoryTitle": "RAG와 엔터프라이즈 검색", "subgroup": null, "title": "Embedding 모델 선택"},
  {"id": "c4-5", "categoryId": 4, "categoryTitle": "RAG와 엔터프라이즈 검색", "subgroup": null, "title": "Re-ranking, top-k, context window 관리"},
  {"id": "c4-6", "categoryId": 4, "categoryTitle": "RAG와 엔터프라이즈 검색", "subgroup": null, "title": "Grounding, citation, hallucination 감소"},
  {"id": "c4-7", "categoryId": 4, "categoryTitle": "RAG와 엔터프라이즈 검색", "subgroup": null, "title": "RAG 평가 지표와 품질 진단"},

  {"id": "c5-1", "categoryId": 5, "categoryTitle": "Prompt, RAG, Fine-tuning 선택 역량", "subgroup": null, "title": "Prompt engineering 설계 패턴"},
  {"id": "c5-2", "categoryId": 5, "categoryTitle": "Prompt, RAG, Fine-tuning 선택 역량", "subgroup": null, "title": "RAG 적합 시나리오"},
  {"id": "c5-3", "categoryId": 5, "categoryTitle": "Prompt, RAG, Fine-tuning 선택 역량", "subgroup": null, "title": "Fine-tuning 적합 시나리오"},
  {"id": "c5-4", "categoryId": 5, "categoryTitle": "Prompt, RAG, Fine-tuning 선택 역량", "subgroup": null, "title": "Build vs buy vs open model 의사결정"},
  {"id": "c5-5", "categoryId": 5, "categoryTitle": "Prompt, RAG, Fine-tuning 선택 역량", "subgroup": null, "title": "비용, latency, 유지보수 trade-off"},
  {"id": "c5-6", "categoryId": 5, "categoryTitle": "Prompt, RAG, Fine-tuning 선택 역량", "subgroup": null, "title": "데이터 품질과 라벨링 평가"},

  {"id": "c6-1", "categoryId": 6, "categoryTitle": "MLOps/LLMOps 운영 역량", "subgroup": null, "title": "Data pipeline, training pipeline, deployment pipeline"},
  {"id": "c6-2", "categoryId": 6, "categoryTitle": "MLOps/LLMOps 운영 역량", "subgroup": null, "title": "Model registry, versioning, rollback"},
  {"id": "c6-3", "categoryId": 6, "categoryTitle": "MLOps/LLMOps 운영 역량", "subgroup": null, "title": "Feature Store와 training-serving consistency"},
  {"id": "c6-4", "categoryId": 6, "categoryTitle": "MLOps/LLMOps 운영 역량", "subgroup": null, "title": "Drift monitoring, quality monitoring, cost monitoring"},
  {"id": "c6-5", "categoryId": 6, "categoryTitle": "MLOps/LLMOps 운영 역량", "subgroup": null, "title": "Retraining automation"},
  {"id": "c6-6", "categoryId": 6, "categoryTitle": "MLOps/LLMOps 운영 역량", "subgroup": null, "title": "Canary, shadow deployment, A/B test"},
  {"id": "c6-7", "categoryId": 6, "categoryTitle": "MLOps/LLMOps 운영 역량", "subgroup": null, "title": "Observability와 incident 대응"},

  {"id": "c7-1", "categoryId": 7, "categoryTitle": "멀티모달 LLM 역량", "subgroup": null, "title": "OCR, document understanding, chart/table reading"},
  {"id": "c7-2", "categoryId": 7, "categoryTitle": "멀티모달 LLM 역량", "subgroup": null, "title": "UI understanding, screenshot interpretation"},
  {"id": "c7-3", "categoryId": 7, "categoryTitle": "멀티모달 LLM 역량", "subgroup": null, "title": "Diagram review, architecture critique"},
  {"id": "c7-4", "categoryId": 7, "categoryTitle": "멀티모달 LLM 역량", "subgroup": null, "title": "Image + text grounding"},
  {"id": "c7-5", "categoryId": 7, "categoryTitle": "멀티모달 LLM 역량", "subgroup": null, "title": "Video understanding, scene segmentation, metadata extraction"},
  {"id": "c7-6", "categoryId": 7, "categoryTitle": "멀티모달 LLM 역량", "subgroup": null, "title": "Speech-to-text, text-to-speech, multilingual media workflows"},
  {"id": "c7-7", "categoryId": 7, "categoryTitle": "멀티모달 LLM 역량", "subgroup": null, "title": "멀티모달 입력을 활용한 고객 제안서, 데모 개선"},

  {"id": "c8-1", "categoryId": 8, "categoryTitle": "고객 문제 정의와 아키텍처 설계", "subgroup": null, "title": "KPI 중심 discovery"},
  {"id": "c8-2", "categoryId": 8, "categoryTitle": "고객 문제 정의와 아키텍처 설계", "subgroup": null, "title": "ML이 정말 필요한 문제인지 판단"},
  {"id": "c8-3", "categoryId": 8, "categoryTitle": "고객 문제 정의와 아키텍처 설계", "subgroup": null, "title": "데이터 가용성, 품질, 거버넌스 확인"},
  {"id": "c8-4", "categoryId": 8, "categoryTitle": "고객 문제 정의와 아키텍처 설계", "subgroup": null, "title": "Batch vs streaming, online vs offline 서빙 판단"},
  {"id": "c8-5", "categoryId": 8, "categoryTitle": "고객 문제 정의와 아키텍처 설계", "subgroup": null, "title": "보안, 비용, 성능, DR trade-off 설명"},
  {"id": "c8-6", "categoryId": 8, "categoryTitle": "고객 문제 정의와 아키텍처 설계", "subgroup": null, "title": "요구사항 기반 화이트보딩"},

  {"id": "c9-1", "categoryId": 9, "categoryTitle": "비용·보안·거버넌스", "subgroup": null, "title": "TCO, cost per request, cost per user 모델링"},
  {"id": "c9-2", "categoryId": 9, "categoryTitle": "비용·보안·거버넌스", "subgroup": null, "title": "Batch inference vs real-time inference 비용 비교"},
  {"id": "c9-3", "categoryId": 9, "categoryTitle": "비용·보안·거버넌스", "subgroup": null, "title": "GPU vs TPU 선택 시 경제성 판단"},
  {"id": "c9-4", "categoryId": 9, "categoryTitle": "비용·보안·거버넌스", "subgroup": null, "title": "IAM, VPC-SC, CMEK, DLP 기반 통제"},
  {"id": "c9-5", "categoryId": 9, "categoryTitle": "비용·보안·거버넌스", "subgroup": null, "title": "Audit, logging, data boundary 설계"},
  {"id": "c9-6", "categoryId": 9, "categoryTitle": "비용·보안·거버넌스", "subgroup": null, "title": "고위험 업무의 human approval 흐름"},

  {"id": "c10-1", "categoryId": 10, "categoryTitle": "고객 커뮤니케이션과 발표 역량", "subgroup": null, "title": "Discovery workshop 진행"},
  {"id": "c10-2", "categoryId": 10, "categoryTitle": "고객 커뮤니케이션과 발표 역량", "subgroup": null, "title": "Executive summary 작성"},
  {"id": "c10-3", "categoryId": 10, "categoryTitle": "고객 커뮤니케이션과 발표 역량", "subgroup": null, "title": "Demo narrative 설계"},
  {"id": "c10-4", "categoryId": 10, "categoryTitle": "고객 커뮤니케이션과 발표 역량", "subgroup": null, "title": "기술 선택을 비즈니스 효과로 번역"},
  {"id": "c10-5", "categoryId": 10, "categoryTitle": "고객 커뮤니케이션과 발표 역량", "subgroup": null, "title": "고객 objection handling"},
  {"id": "c10-6", "categoryId": 10, "categoryTitle": "고객 커뮤니케이션과 발표 역량", "subgroup": null, "title": "아키텍처 설명과 Q&A 대응"},

  {"id": "c11-1", "categoryId": 11, "categoryTitle": "Automate yourself", "subgroup": "핵심", "title": "Claude Code, Codex, Antigravity 기반 AI-native 개발 환경 구축"},
  {"id": "c11-2", "categoryId": 11, "categoryTitle": "Automate yourself", "subgroup": "핵심", "title": "Hermes, Openclaw 등 agent를 활용한 메일, 검색, 액션아이템 자동화"},
  {"id": "c11-3", "categoryId": 11, "categoryTitle": "Automate yourself", "subgroup": "핵심", "title": "Slack, Notion, Obsidian, Canvas, Figma, Google Docs/Slides 연동"},
  {"id": "c11-4", "categoryId": 11, "categoryTitle": "Automate yourself", "subgroup": "핵심", "title": "PPT 초안, 제안서, 워크숍 자료, QBR 자료 자동화"},
  {"id": "c11-5", "categoryId": 11, "categoryTitle": "Automate yourself", "subgroup": "핵심", "title": "회의록 요약, follow-up 메일, 주간 리포트 자동 생성"},
  {"id": "c11-6", "categoryId": 11, "categoryTitle": "Automate yourself", "subgroup": "핵심", "title": "개인 지식베이스와 재사용 가능한 prompt/template 관리"},

  {"id": "c11-7", "categoryId": 11, "categoryTitle": "Automate yourself", "subgroup": "AI-native 개발 환경", "title": "Claude Code, Codex, Antigravity를 로컬 개발 워크플로우에 통합"},
  {"id": "c11-8", "categoryId": 11, "categoryTitle": "Automate yourself", "subgroup": "AI-native 개발 환경", "title": "저장소 규칙, 테스트 규칙, 문서 형식, 브랜치 전략을 system prompt화"},
  {"id": "c11-9", "categoryId": 11, "categoryTitle": "Automate yourself", "subgroup": "AI-native 개발 환경", "title": "Repo-aware 검색과 수정, diff review, commit message 초안 생성"},
  {"id": "c11-10", "categoryId": 11, "categoryTitle": "Automate yourself", "subgroup": "AI-native 개발 환경", "title": "Unit test, integration test, lint, 보안 점검 자동화"},
  {"id": "c11-11", "categoryId": 11, "categoryTitle": "Automate yourself", "subgroup": "AI-native 개발 환경", "title": "IaC 초안 작성과 리뷰 자동화"},

  {"id": "c11-12", "categoryId": 11, "categoryTitle": "Automate yourself", "subgroup": "업무 에이전트 활용", "title": "받은 메일의 중요도 분류와 회신 초안 작성"},
  {"id": "c11-13", "categoryId": 11, "categoryTitle": "Automate yourself", "subgroup": "업무 에이전트 활용", "title": "회의 초대, 안건, action item 자동 생성"},
  {"id": "c11-14", "categoryId": 11, "categoryTitle": "Automate yourself", "subgroup": "업무 에이전트 활용", "title": "문서/위키/슬랙 기록 검색 후 요약 제공"},
  {"id": "c11-15", "categoryId": 11, "categoryTitle": "Automate yourself", "subgroup": "업무 에이전트 활용", "title": "정기 보고서와 follow-up draft 생성"},
  {"id": "c11-16", "categoryId": 11, "categoryTitle": "Automate yourself", "subgroup": "업무 에이전트 활용", "title": "고객 요청 기반의 조사 작업 kickoff"},

  {"id": "c11-17", "categoryId": 11, "categoryTitle": "Automate yourself", "subgroup": "협업 도구 연계", "title": "Slack: 대화 요약, action item 추출, FAQ 축적"},
  {"id": "c11-18", "categoryId": 11, "categoryTitle": "Automate yourself", "subgroup": "협업 도구 연계", "title": "Notion: 고객 계정 플랜, 회의록, playbook, 프로젝트 허브"},
  {"id": "c11-19", "categoryId": 11, "categoryTitle": "Automate yourself", "subgroup": "협업 도구 연계", "title": "Obsidian: 개인 학습 노트, 영구 메모, 기술 개념 연결"},
  {"id": "c11-20", "categoryId": 11, "categoryTitle": "Automate yourself", "subgroup": "협업 도구 연계", "title": "Canvas/whiteboard: 워크숍 구조화, 아이디어 정리, 고객 문제 시각화"},
  {"id": "c11-21", "categoryId": 11, "categoryTitle": "Automate yourself", "subgroup": "협업 도구 연계", "title": "Figma: 간단한 UX 흐름, 화면 컨셉, 발표용 시각 자산 제작"},
  {"id": "c11-22", "categoryId": 11, "categoryTitle": "Automate yourself", "subgroup": "협업 도구 연계", "title": "Google Slides / PPT: 고객용 제안서와 발표자료 구조화"},

  {"id": "c11-23", "categoryId": 11, "categoryTitle": "Automate yourself", "subgroup": "PPT 및 발표자료 자동화", "title": "문제 정의, 제안 아키텍처, 가치, 다음 단계의 4장 구조 기본화"},
  {"id": "c11-24", "categoryId": 11, "categoryTitle": "Automate yourself", "subgroup": "PPT 및 발표자료 자동화", "title": "텍스트 위주 초안을 받아 슬라이드 메시지 중심 구조로 재작성"},
  {"id": "c11-25", "categoryId": 11, "categoryTitle": "Automate yourself", "subgroup": "PPT 및 발표자료 자동화", "title": "아키텍처 다이어그램 설명 문장 자동 생성"},
  {"id": "c11-26", "categoryId": 11, "categoryTitle": "Automate yourself", "subgroup": "PPT 및 발표자료 자동화", "title": "고객 임원용 1페이지 요약과 실무자용 상세본 분리"},
  {"id": "c11-27", "categoryId": 11, "categoryTitle": "Automate yourself", "subgroup": "PPT 및 발표자료 자동화", "title": "발표 리허설 질문 예상과 답변 초안 자동 생성"},

  {"id": "c11-28", "categoryId": 11, "categoryTitle": "Automate yourself", "subgroup": "멀티모달 기반 개인 생산성", "title": "아키텍처 다이어그램 리뷰"},
  {"id": "c11-29", "categoryId": 11, "categoryTitle": "Automate yourself", "subgroup": "멀티모달 기반 개인 생산성", "title": "스크린샷 오류 해석"},
  {"id": "c11-30", "categoryId": 11, "categoryTitle": "Automate yourself", "subgroup": "멀티모달 기반 개인 생산성", "title": "발표자료 디자인 및 메시지 피드백"},
  {"id": "c11-31", "categoryId": 11, "categoryTitle": "Automate yourself", "subgroup": "멀티모달 기반 개인 생산성", "title": "표와 차트 해석 및 요약"},
  {"id": "c11-32", "categoryId": 11, "categoryTitle": "Automate yourself", "subgroup": "멀티모달 기반 개인 생산성", "title": "제품 콘솔 캡처 기반 기능 설명 생성"},
  {"id": "c11-33", "categoryId": 11, "categoryTitle": "Automate yourself", "subgroup": "멀티모달 기반 개인 생산성", "title": "이미지/문서/도표를 함께 넣는 프롬프트 실험"}
]
```

- [ ] **Step 3: 실패하는 일관성 테스트 작성 — `tests/js/data-schema.test.js`**

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const roadmap = require('../../docs/data/roadmap.json');
const capabilities = require('../../docs/data/capabilities.json');

test('roadmap.json has exactly 18 items', () => {
  assert.equal(roadmap.length, 18);
});

test('roadmap.json ids are unique', () => {
  const ids = roadmap.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('roadmap.json phase is 1, 2, or 3', () => {
  for (const item of roadmap) {
    assert.ok([1, 2, 3].includes(item.phase), `bad phase for ${item.id}`);
  }
});

test('roadmap.json phase counts are 6/6/6', () => {
  const counts = { 1: 0, 2: 0, 3: 0 };
  for (const item of roadmap) counts[item.phase]++;
  assert.deepEqual(counts, { 1: 6, 2: 6, 3: 6 });
});

test('capabilities.json has exactly 97 items', () => {
  assert.equal(capabilities.length, 97);
});

test('capabilities.json ids are unique', () => {
  const ids = capabilities.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('capabilities.json categoryId is 1-11', () => {
  for (const item of capabilities) {
    assert.ok(item.categoryId >= 1 && item.categoryId <= 11, `bad categoryId for ${item.id}`);
  }
});

test('capabilities.json category 11 has 33 items, others do not use subgroup', () => {
  const byCategory = {};
  for (const item of capabilities) {
    byCategory[item.categoryId] = (byCategory[item.categoryId] || 0) + 1;
    if (item.categoryId !== 11) {
      assert.equal(item.subgroup, null, `${item.id} should have null subgroup`);
    } else {
      assert.ok(typeof item.subgroup === 'string' && item.subgroup.length > 0, `${item.id} needs a subgroup`);
    }
  }
  assert.equal(byCategory[11], 33);
});
```

- [ ] **Step 4: 테스트 실행해 통과 확인** (JSON 파일은 이미 Step 1-2에서 만들어졌으므로 바로 통과해야 정상)

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap && node --test tests/js/data-schema.test.js`
Expected: `# pass 8`, `# fail 0`

- [ ] **Step 5: Commit**

```bash
cd /home/rainny/dev-run/gcp-ce-roadmap
git add docs/data/roadmap.json docs/data/capabilities.json tests/js/data-schema.test.js
git commit -m "feat: add roadmap and capabilities content (18+97 items) with schema tests"
```

---

## Task 2: 순수 함수 — 진척률 계산 · 주차 계산 · 정렬

**Files:**
- Create: `docs/js/roadmap-logic.js`
- Test: `tests/js/roadmap-logic.test.js`

**Interfaces:**
- Consumes: Task 1의 `roadmap.json`/`capabilities.json` 항목 형태(`{id, ...}`).
- Produces: `RoadmapLogic.currentWeekNumber(today, programStart)`, `RoadmapLogic.progressSummary(items, checkedIds)`
  → `{done: number, total: number, percent: number}`, `RoadmapLogic.sortRemaining(items, checkedIds, priorityFn?)`
  → 미체크 항목 배열. 이후 Task 4/5/8(및 Plan 2-4)이 이 세 함수를 그대로 가져다 쓴다.

- [ ] **Step 1: 실패하는 테스트 작성 — `tests/js/roadmap-logic.test.js`**

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const RoadmapLogic = require('../../docs/js/roadmap-logic.js');

test('currentWeekNumber: program start day is week 1', () => {
  const start = new Date('2026-08-04T00:00:00');
  assert.equal(RoadmapLogic.currentWeekNumber(new Date('2026-08-04T09:00:00'), start), 1);
});

test('currentWeekNumber: 7 days later is week 2', () => {
  const start = new Date('2026-08-04T00:00:00');
  assert.equal(RoadmapLogic.currentWeekNumber(new Date('2026-08-11T09:00:00'), start), 2);
});

test('currentWeekNumber: before start clamps to 1', () => {
  const start = new Date('2026-08-04T00:00:00');
  assert.equal(RoadmapLogic.currentWeekNumber(new Date('2026-07-20T09:00:00'), start), 1);
});

test('currentWeekNumber: after week 12 clamps to 12', () => {
  const start = new Date('2026-08-04T00:00:00');
  assert.equal(RoadmapLogic.currentWeekNumber(new Date('2027-01-01T09:00:00'), start), 12);
});

test('progressSummary: counts done/total/percent', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const result = RoadmapLogic.progressSummary(items, new Set(['a', 'c']));
  assert.deepEqual(result, { done: 2, total: 4, percent: 50 });
});

test('progressSummary: empty items gives 0 percent, not NaN', () => {
  const result = RoadmapLogic.progressSummary([], new Set());
  assert.deepEqual(result, { done: 0, total: 0, percent: 0 });
});

test('sortRemaining: returns only unchecked items, preserves input order by default', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const result = RoadmapLogic.sortRemaining(items, new Set(['b']));
  assert.deepEqual(result.map((i) => i.id), ['a', 'c']);
});

test('sortRemaining: custom priorityFn sorts ascending', () => {
  const items = [{ id: 'a', phase: 3 }, { id: 'b', phase: 1 }, { id: 'c', phase: 2 }];
  const result = RoadmapLogic.sortRemaining(items, new Set(), (item) => item.phase);
  assert.deepEqual(result.map((i) => i.id), ['b', 'c', 'a']);
});
```

- [ ] **Step 2: 테스트 실행해 실패 확인**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap && node --test tests/js/roadmap-logic.test.js`
Expected: FAIL — `Cannot find module '../../docs/js/roadmap-logic.js'`

- [ ] **Step 3: `docs/js/roadmap-logic.js` 구현**

```js
(function (root) {
  function currentWeekNumber(today, programStart) {
    const msPerDay = 86400000;
    const days = Math.floor((today.getTime() - programStart.getTime()) / msPerDay);
    const week = Math.floor(days / 7) + 1;
    return Math.min(12, Math.max(1, week));
  }

  function progressSummary(items, checkedIds) {
    const total = items.length;
    let done = 0;
    for (const item of items) {
      if (checkedIds.has(item.id)) done++;
    }
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    return { done, total, percent };
  }

  function sortRemaining(items, checkedIds, priorityFn) {
    const remaining = items.filter((item) => !checkedIds.has(item.id));
    if (!priorityFn) return remaining;
    return remaining.slice().sort((a, b) => priorityFn(a) - priorityFn(b));
  }

  const RoadmapLogic = { currentWeekNumber, progressSummary, sortRemaining };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoadmapLogic;
  } else {
    root.RoadmapLogic = RoadmapLogic;
  }
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 4: 테스트 실행해 통과 확인**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap && node --test tests/js/roadmap-logic.test.js`
Expected: `# pass 8`, `# fail 0`

- [ ] **Step 5: Commit**

```bash
git add docs/js/roadmap-logic.js tests/js/roadmap-logic.test.js
git commit -m "feat: add pure logic functions (week calc, progress summary, remaining sort)"
```

---

## Task 3: HTML 셸 + 4-tab 네비게이션

**Files:**
- Create: `docs/index.html`
- Create: `docs/style.css`
- Create: `docs/config.js.example`

**Interfaces:**
- Produces: `<main id="view">` 컨테이너(탭별 렌더 대상), `<nav class="bottom-nav">`의
  `data-tab` 속성(`home`|`today`|`roadmap`|`report`) — Task 4/5/8이 이 탭 이름으로 라우팅한다.

- [ ] **Step 1: `docs/index.html` 작성**

```html
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>GCP CE 역량 로드맵</title>
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-title" content="CE 로드맵">
  <link rel="manifest" href="manifest.webmanifest">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header class="app-header">
    <h1>GCP CE 역량 로드맵</h1>
  </header>

  <main id="view" class="view">로딩 중...</main>

  <nav class="bottom-nav" aria-label="주요 메뉴">
    <a href="#/" data-tab="home">홈</a>
    <a href="#/today" data-tab="today">오늘</a>
    <a href="#/roadmap" data-tab="roadmap">로드맵&amp;역량</a>
    <a href="#/report" data-tab="report">리포트</a>
  </nav>

  <script src="config.js"></script>
  <script src="js/roadmap-logic.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: `docs/style.css` 작성 (최소 동작 스타일)**

```css
:root {
  --bg: #FFF9F1;
  --accent: #DDF3E8;
  --text: #2b2b2b;
  --border: #e5e0d8;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: var(--bg);
  color: var(--text);
  padding-bottom: 64px;
}
.app-header { padding: 16px; }
.app-header h1 { font-size: 18px; margin: 0; }
.view { padding: 0 16px 16px; }
.bottom-nav {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; background: white; border-top: 1px solid var(--border);
}
.bottom-nav a {
  flex: 1; text-align: center; padding: 10px 0; text-decoration: none;
  color: var(--text); font-size: 13px;
}
.bottom-nav a.active { font-weight: bold; background: var(--accent); }
.category-group, .phase-group {
  margin-bottom: 12px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden;
}
.category-group summary, .phase-group summary {
  padding: 12px; font-weight: bold; cursor: pointer; display: flex; justify-content: space-between;
}
.progress-badge { font-weight: normal; color: #666; font-size: 13px; }
.item-row { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-top: 1px solid var(--border); }
.item-row label { flex: 1; }
```

- [ ] **Step 3: `docs/config.js.example` 작성**

```js
window.ROUTINE_CONFIG = {
  supabaseUrl: "https://<project-ref>.supabase.co",
  publishableKey: "<anon-public-key>",
};
```

> **정정 (Plan 1 배포 후 발견, 2026-08-02): `docs/config.js`를 gitignore하지 않는다.**
> 애초 이 계획은 "Supabase anon key는 공개 저장소에 커밋하지 않는다"고 가정해 Step 4에서
> `.gitignore`에 추가했으나, 이는 틀렸다 — routine-jammy의 실제 운영 방식(`docs/config.js`
> 커밋됨, 파일 안에 "publishable 키는 클라이언트 노출을 전제로 설계됨 — 커밋해도 된다,
> 실제 접근 통제는 DB RLS가 한다"는 주석 포함)과 대조해 확인했다. GitHub Pages는 gitignore된
> 파일을 배포하지 않으므로, 이 실수 때문에 Plan 1을 처음 배포했을 때 실제 사이트의
> `config.js`가 404여서 Supabase 연동이 완전히 깨져 있었다(사용자가 배포 확인을 요청해
> 뒤늦게 발견·수정). **Task 6에서 실제 `docs/config.js`를 만들 때는 반드시 커밋한다** —
> 아래 Task 6 Step 3/4도 이에 맞게 정정되어 있다.

- [ ] **Step 4: Commit**

```bash
git add docs/index.html docs/style.css docs/config.js.example
git commit -m "feat: add PWA shell with 4-tab bottom nav"
```

---

## Task 4: 로드맵 탭 렌더링 (로컬 상태만, Supabase 연동 전)

**Files:**
- Create: `docs/app.js`

**Interfaces:**
- Consumes: `roadmap.json`(Task 1), `RoadmapLogic.progressSummary`(Task 2), `#view`/`.bottom-nav`(Task 3).
- Produces: `App.renderRoadmapTab(container, roadmapItems, checkedIds)` — Task 5·7·8이 같은
  파일(`app.js`)에 이어서 함수를 추가하므로, 이후 태스크는 이 함수 시그니처를 그대로 따른다.

- [ ] **Step 1: `docs/app.js` 최초 작성 — 데이터 로드 + 탭 라우팅 + 로드맵 탭만 렌더**

```js
(function () {
  let roadmapItems = [];
  let capabilityItems = [];
  let roadmapChecked = new Set();   // Task 7에서 Supabase로 교체
  let capabilityChecked = new Set();

  async function loadStaticData() {
    const [roadmapRes, capabilitiesRes] = await Promise.all([
      fetch('data/roadmap.json'),
      fetch('data/capabilities.json'),
    ]);
    roadmapItems = await roadmapRes.json();
    capabilityItems = await capabilitiesRes.json();
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderRoadmapTab(container, items, checkedIds) {
    const phases = [
      { phase: 1, label: '1-4주: 기반 구축' },
      { phase: 2, label: '5-8주: 설계와 자동화 확장' },
      { phase: 3, label: '9-12주: 실전 적용' },
    ];
    const html = phases.map(({ phase, label }) => {
      const phaseItems = items.filter((i) => i.phase === phase);
      const summary = RoadmapLogic.progressSummary(phaseItems, checkedIds);
      const rows = phaseItems.map((item) => `
        <div class="item-row">
          <input type="checkbox" id="road-${item.id}" data-roadmap-id="${item.id}" ${checkedIds.has(item.id) ? 'checked' : ''}>
          <label for="road-${item.id}">${escapeHtml(item.title)}</label>
        </div>`).join('');
      return `
        <details class="phase-group" open>
          <summary>${escapeHtml(label)} <span class="progress-badge">${summary.done}/${summary.total}</span></summary>
          ${rows}
        </details>`;
    }).join('');
    container.innerHTML = html;
    container.querySelectorAll('[data-roadmap-id]').forEach((el) => {
      el.addEventListener('change', (e) => {
        const id = e.target.dataset.roadmapId;
        if (e.target.checked) roadmapChecked.add(id); else roadmapChecked.delete(id);
        renderRoadmapTab(container, roadmapItems, roadmapChecked);
      });
    });
  }

  function renderTab(tabName) {
    const view = document.getElementById('view');
    document.querySelectorAll('.bottom-nav a').forEach((a) => {
      a.classList.toggle('active', a.dataset.tab === tabName);
    });
    if (tabName === 'roadmap') {
      renderRoadmapTab(view, roadmapItems, roadmapChecked);
    } else {
      view.innerHTML = `<p>"${escapeHtml(tabName)}" 탭은 다음 계획에서 구현됩니다.</p>`;
    }
  }

  function currentTabFromHash() {
    const hash = location.hash.replace('#/', '') || '';
    if (hash === 'today') return 'today';
    if (hash === 'roadmap') return 'roadmap';
    if (hash === 'report') return 'report';
    return 'home';
  }

  window.addEventListener('hashchange', () => renderTab(currentTabFromHash()));

  (async function init() {
    await loadStaticData();
    renderTab(currentTabFromHash());
  })();

  window.App = { renderRoadmapTab, escapeHtml };
})();
```

- [ ] **Step 2: 수동 스모크 테스트 — 로컬 정적 서버로 확인**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap/docs && python3 -m http.server 8765`

브라우저로 `http://localhost:8765/#/roadmap` 접속 → 3개 단계 아코디언(1-4주/5-8주/9-12주)이
각각 6개 항목과 함께 보이는지, 체크박스를 누르면 진행률 배지(`n/6`)가 바뀌는지 확인.
서버는 확인 후 Ctrl+C로 종료.

- [ ] **Step 3: Commit**

```bash
git add docs/app.js
git commit -m "feat: render roadmap tab with phase accordions (local state only)"
```

---

## Task 5: 역량 체크 탭 렌더링 (로컬 상태만)

**Files:**
- Modify: `docs/app.js`

**Interfaces:**
- Consumes: `capabilities.json`(Task 1), `RoadmapLogic.progressSummary`(Task 2).
- Produces: `App.renderCapabilitiesTab` — Task 7이 Supabase 연동 시 이 함수를 그대로 재사용.

- [ ] **Step 1: `renderCapabilitiesTab` 함수를 `docs/app.js`에 추가** (`renderRoadmapTab` 함수 바로 아래에 삽입)

```js
  function renderCapabilitiesTab(container, items, checkedIds) {
    const categoryIds = [...new Set(items.map((i) => i.categoryId))].sort((a, b) => a - b);
    const html = categoryIds.map((categoryId) => {
      const categoryItems = items.filter((i) => i.categoryId === categoryId);
      const categoryTitle = categoryItems[0].categoryTitle;
      const summary = RoadmapLogic.progressSummary(categoryItems, checkedIds);
      const subgroups = [...new Set(categoryItems.map((i) => i.subgroup))];
      const body = subgroups.map((subgroup) => {
        const groupItems = categoryItems.filter((i) => i.subgroup === subgroup);
        const rows = groupItems.map((item) => `
          <div class="item-row">
            <input type="checkbox" id="cap-${item.id}" data-capability-id="${item.id}" ${checkedIds.has(item.id) ? 'checked' : ''}>
            <label for="cap-${item.id}">${escapeHtml(item.title)}</label>
          </div>`).join('');
        const heading = subgroup ? `<p class="subgroup-title">${escapeHtml(subgroup)}</p>` : '';
        return heading + rows;
      }).join('');
      return `
        <details class="category-group">
          <summary>${escapeHtml(categoryTitle)} <span class="progress-badge">${summary.done}/${summary.total}</span></summary>
          ${body}
        </details>`;
    }).join('');
    container.innerHTML = html;
    container.querySelectorAll('[data-capability-id]').forEach((el) => {
      el.addEventListener('change', (e) => {
        const id = e.target.dataset.capabilityId;
        if (e.target.checked) capabilityChecked.add(id); else capabilityChecked.delete(id);
        renderCapabilitiesTab(container, capabilityItems, capabilityChecked);
      });
    });
  }
```

- [ ] **Step 2: `renderTab`에서 `roadmap` 탭에 역량 체크 섹션도 함께 그리도록 수정** (기존 `if (tabName === 'roadmap') { ... }` 블록을 교체)

```js
    if (tabName === 'roadmap') {
      view.innerHTML = '<div id="roadmap-section"></div><h2>역량 체크</h2><div id="capabilities-section"></div>';
      renderRoadmapTab(document.getElementById('roadmap-section'), roadmapItems, roadmapChecked);
      renderCapabilitiesTab(document.getElementById('capabilities-section'), capabilityItems, capabilityChecked);
    } else {
```

- [ ] **Step 3: `window.App` export에 `renderCapabilitiesTab` 추가**

```js
  window.App = { renderRoadmapTab, renderCapabilitiesTab, escapeHtml };
```

- [ ] **Step 4: 수동 스모크 테스트**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap/docs && python3 -m http.server 8765`

`http://localhost:8765/#/roadmap`에서 로드맵 아코디언 아래 "역량 체크" 제목과 11개 카테고리
아코디언(카테고리11은 소그룹 제목이 6개 나뉘어 보임)이 보이는지 확인. 서버 종료.

- [ ] **Step 5: Commit**

```bash
git add docs/app.js
git commit -m "feat: render capability checklist tab with category/subgroup accordions"
```

---

## Task 6: Supabase 프로젝트 생성 + 스키마 (사용자 수행 필요)

**이 태스크는 코드 작성이 아니라 외부 계정 설정이라 에이전트가 대신 실행할 수 없다 — rainny가
직접 수행해야 한다.**

**Files:**
- Create: `supabase/schema.sql` (에이전트가 작성 — 사용자는 이 SQL을 Supabase 대시보드
  SQL Editor에 붙여넣고 실행만 하면 됨)

- [ ] **Step 1: `supabase/schema.sql` 작성**

```sql
create table roadmap_progress (
  item_id text primary key,
  checked_at timestamptz not null default now()
);

create table capability_progress (
  item_id text primary key,
  checked_at timestamptz not null default now()
);

alter table roadmap_progress enable row level security;
alter table capability_progress enable row level security;

-- 1인 개인용 데이터, anon key로 직접 읽기/쓰기 허용 (routine-jammy와 동일한 신뢰 모델)
create policy "anon full access" on roadmap_progress for all using (true) with check (true);
create policy "anon full access" on capability_progress for all using (true) with check (true);
```

- [ ] **Step 2 (사용자 수행): Supabase 프로젝트 생성**

1. https://supabase.com/dashboard 에서 새 프로젝트 생성 (조직: 기존 것 사용 또는 신규,
   프로젝트명 예: `gcp-ce-roadmap`, 리전: 가까운 곳)
2. 생성 완료까지 대기(수 분)
3. 프로젝트 대시보드 → SQL Editor → 위 `supabase/schema.sql` 내용 붙여넣고 Run
4. 프로젝트 Settings → API에서 **Project URL**과 **anon public key** 확인

- [ ] **Step 3 (사용자 수행): `docs/config.js` 실제 값으로 생성 후 커밋**
  (publishable 키는 클라이언트 노출을 전제로 설계된 키라 커밋해도 된다 — 위 Task 3 정정
  참고. GitHub Pages는 커밋되지 않은 파일을 배포하지 않으므로, 커밋하지 않으면 실제
  배포 사이트의 Supabase 연동이 깨진다.)

```bash
cd /home/rainny/dev-run/gcp-ce-roadmap
cp docs/config.js.example docs/config.js
# docs/config.js를 열어 supabaseUrl과 publishableKey를 Step 2에서 확인한 실제 값으로 교체
```

- [ ] **Step 4: Commit (schema.sql + config.js 둘 다)**

```bash
git add supabase/schema.sql docs/config.js
git commit -m "feat: add Supabase schema for roadmap/capability progress tables"
```

---

## Task 7: Supabase 연동 — 진행 상태 영속화 + 오프라인 큐

**Files:**
- Modify: `docs/app.js`
- Create: `docs/js/supabase-queue.js`
- Test: 수동 스모크 테스트(Supabase는 네트워크 의존이라 node --test 유닛테스트 대상 아님 —
  큐 로직 자체는 순수 함수로 분리해 테스트한다)
- Test: `tests/js/supabase-queue.test.js`

**Interfaces:**
- Consumes: `docs/config.js`의 `window.ROUTINE_CONFIG`(Task 6), Supabase JS client(CDN).
- Produces: `SupabaseQueue.enqueue(op)`, `SupabaseQueue.flush(sendFn)` — 순수 로직이라
  Plan 2-4의 다른 저장 대상(주간루틴, 운동, Biz English)도 이 큐를 재사용한다.

- [ ] **Step 1: 실패하는 큐 테스트 작성 — `tests/js/supabase-queue.test.js`**

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const SupabaseQueue = require('../../docs/js/supabase-queue.js');

test('enqueue adds an operation, flush sends and clears it on success', async () => {
  const queue = new SupabaseQueue.Queue();
  queue.enqueue({ table: 'roadmap_progress', itemId: 'r1', checked: true });
  const sent = [];
  await queue.flush(async (op) => { sent.push(op); return { ok: true }; });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].itemId, 'r1');
  assert.equal(queue.size(), 0);
});

test('flush keeps failed operation in queue and stops (preserve order)', async () => {
  const queue = new SupabaseQueue.Queue();
  queue.enqueue({ table: 'roadmap_progress', itemId: 'r1', checked: true });
  queue.enqueue({ table: 'roadmap_progress', itemId: 'r2', checked: true });
  await queue.flush(async (op) => {
    if (op.itemId === 'r1') throw new Error('network down');
    return { ok: true };
  });
  assert.equal(queue.size(), 2, 'both ops remain — r1 failed, r2 never attempted');
});

test('flush is a no-op when queue is empty', async () => {
  const queue = new SupabaseQueue.Queue();
  let calls = 0;
  await queue.flush(async () => { calls++; });
  assert.equal(calls, 0);
});

test('reentrancy guard: concurrent flush calls do not double-send', async () => {
  const queue = new SupabaseQueue.Queue();
  queue.enqueue({ table: 'roadmap_progress', itemId: 'r1', checked: true });
  let sendCount = 0;
  const slowSend = async (op) => {
    sendCount++;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return { ok: true };
  };
  await Promise.all([queue.flush(slowSend), queue.flush(slowSend)]);
  assert.equal(sendCount, 1, 'second concurrent flush call should be a no-op while first is in-flight');
});
```

- [ ] **Step 2: 테스트 실행해 실패 확인**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap && node --test tests/js/supabase-queue.test.js`
Expected: FAIL — `Cannot find module '../../docs/js/supabase-queue.js'`

- [ ] **Step 3: `docs/js/supabase-queue.js` 구현**

```js
(function (root) {
  class Queue {
    constructor() {
      this._ops = [];
      this._isFlushing = false;
    }

    enqueue(op) {
      this._ops.push(op);
    }

    size() {
      return this._ops.length;
    }

    async flush(sendFn) {
      if (this._isFlushing) return;
      this._isFlushing = true;
      try {
        while (this._ops.length > 0) {
          const op = this._ops[0];
          try {
            await sendFn(op);
            this._ops.shift();
          } catch (err) {
            break; // 네트워크 실패 — 순서 보존을 위해 여기서 멈추고 다음 flush 시도를 기다림
          }
        }
      } finally {
        this._isFlushing = false;
      }
    }
  }

  const SupabaseQueue = { Queue };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SupabaseQueue;
  } else {
    root.SupabaseQueue = SupabaseQueue;
  }
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 4: 테스트 실행해 통과 확인**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap && node --test tests/js/supabase-queue.test.js`
Expected: `# pass 4`, `# fail 0`

- [ ] **Step 5: `docs/index.html`에 Supabase client CDN 스크립트 추가** (`config.js` 로드 줄 바로 위에 삽입)

```html
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="config.js"></script>
  <script src="js/roadmap-logic.js"></script>
  <script src="js/supabase-queue.js"></script>
  <script src="app.js"></script>
```

- [ ] **Step 6: `docs/app.js`를 Supabase 연동으로 교체** — 파일 최상단(`(function () {` 바로 아래)에 client 초기화와 로드/저장 함수 추가, `init()`과 체크박스 핸들러를 아래처럼 수정

```js
  const supabaseClient = window.supabase.createClient(
    window.ROUTINE_CONFIG.supabaseUrl,
    window.ROUTINE_CONFIG.publishableKey
  );
  const roadmapQueue = new SupabaseQueue.Queue();
  const capabilityQueue = new SupabaseQueue.Queue();

  async function loadProgress() {
    const [roadmapRows, capabilityRows] = await Promise.all([
      supabaseClient.from('roadmap_progress').select('item_id'),
      supabaseClient.from('capability_progress').select('item_id'),
    ]);
    // supabase-js v2 never throws on query failure — it resolves {data:null, error}.
    // Must check .error and throw explicitly, or a failed read silently empties
    // state and clobbers the localStorage-restored offline state on re-render.
    if (roadmapRows.error || capabilityRows.error) {
      throw roadmapRows.error || capabilityRows.error;
    }
    roadmapChecked = new Set((roadmapRows.data || []).map((r) => r.item_id));
    capabilityChecked = new Set((capabilityRows.data || []).map((r) => r.item_id));
  }

  async function sendRoadmapCheck(op) {
    if (op.checked) {
      const { error } = await supabaseClient.from('roadmap_progress').upsert({ item_id: op.itemId });
      if (error) throw error;
    } else {
      const { error } = await supabaseClient.from('roadmap_progress').delete().eq('item_id', op.itemId);
      if (error) throw error;
    }
  }

  async function sendCapabilityCheck(op) {
    if (op.checked) {
      const { error } = await supabaseClient.from('capability_progress').upsert({ item_id: op.itemId });
      if (error) throw error;
    } else {
      const { error } = await supabaseClient.from('capability_progress').delete().eq('item_id', op.itemId);
      if (error) throw error;
    }
  }
```

`renderRoadmapTab` 안의 체크박스 change 핸들러를 다음으로 교체:

```js
    container.querySelectorAll('[data-roadmap-id]').forEach((el) => {
      el.addEventListener('change', (e) => {
        const id = e.target.dataset.roadmapId;
        const checked = e.target.checked;
        if (checked) roadmapChecked.add(id); else roadmapChecked.delete(id);
        localStorage.setItem('gcp-ce-roadmap:roadmapChecked', JSON.stringify([...roadmapChecked]));
        roadmapQueue.enqueue({ table: 'roadmap_progress', itemId: id, checked });
        roadmapQueue.flush(sendRoadmapCheck);
        renderRoadmapTab(container, roadmapItems, roadmapChecked);
      });
    });
```

`renderCapabilitiesTab` 안의 체크박스 change 핸들러도 동일 패턴으로 교체:

```js
    container.querySelectorAll('[data-capability-id]').forEach((el) => {
      el.addEventListener('change', (e) => {
        const id = e.target.dataset.capabilityId;
        const checked = e.target.checked;
        if (checked) capabilityChecked.add(id); else capabilityChecked.delete(id);
        localStorage.setItem('gcp-ce-roadmap:capabilityChecked', JSON.stringify([...capabilityChecked]));
        capabilityQueue.enqueue({ table: 'capability_progress', itemId: id, checked });
        capabilityQueue.flush(sendCapabilityCheck);
        renderCapabilitiesTab(container, capabilityItems, capabilityChecked);
      });
    });
```

`init()`을 다음으로 교체 (localStorage 즉시 로드 후 Supabase로 덮어씀 — 오프라인 시작 대응):

```js
  (async function init() {
    await loadStaticData();
    try {
      roadmapChecked = new Set(JSON.parse(localStorage.getItem('gcp-ce-roadmap:roadmapChecked') || '[]'));
      capabilityChecked = new Set(JSON.parse(localStorage.getItem('gcp-ce-roadmap:capabilityChecked') || '[]'));
    } catch (e) { /* localStorage 비어있거나 손상 — 빈 Set으로 시작 */ }
    renderTab(currentTabFromHash());
    try {
      await loadProgress();
      localStorage.setItem('gcp-ce-roadmap:roadmapChecked', JSON.stringify([...roadmapChecked]));
      localStorage.setItem('gcp-ce-roadmap:capabilityChecked', JSON.stringify([...capabilityChecked]));
      renderTab(currentTabFromHash());
    } catch (e) {
      console.warn('Supabase 로드 실패 — localStorage 상태로 계속', e);
    }
  })();
```

- [ ] **Step 7: 수동 통합 테스트** (Task 6에서 실제 `docs/config.js`가 준비되어 있어야 함)

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap/docs && python3 -m http.server 8765`

`http://localhost:8765/#/roadmap`에서 항목 하나 체크 → 브라우저 새로고침 → 체크 상태가
유지되는지 확인(= Supabase에 실제로 저장·조회됨). Supabase 대시보드 Table Editor에서
`roadmap_progress` 테이블에 해당 row가 생겼는지도 확인. 서버 종료.

- [ ] **Step 8: Commit**

```bash
git add docs/index.html docs/app.js docs/js/supabase-queue.js tests/js/supabase-queue.test.js
git commit -m "feat: persist roadmap/capability checks to Supabase with offline queue"
```

---

## Task 8: 홈 탭 — 진척률 요약

**Files:**
- Modify: `docs/app.js`

**Interfaces:**
- Consumes: `RoadmapLogic.progressSummary`(Task 2), `roadmapItems`/`capabilityItems`/
  `roadmapChecked`/`capabilityChecked`(Task 4-7의 모듈 스코프 변수).
- Produces: `App.renderHomeTab` — Plan 2-4가 여기에 자기 레이어의 요약 줄을 추가할 때 이
  함수를 확장한다(현재는 로드맵·역량 2줄만).

- [ ] **Step 1: `renderHomeTab` 함수를 `docs/app.js`에 추가** (`renderCapabilitiesTab` 아래에 삽입)

```js
  function renderHomeTab(container) {
    const roadmapSummary = RoadmapLogic.progressSummary(roadmapItems, roadmapChecked);
    const capabilitySummary = RoadmapLogic.progressSummary(capabilityItems, capabilityChecked);
    const week = RoadmapLogic.currentWeekNumber(new Date(), new Date('2026-08-04T00:00:00'));
    container.innerHTML = `
      <p>현재 ${week}주차 (2026-08-04 시작)</p>
      <div class="item-row"><label>로드맵 진척률</label><span>${roadmapSummary.done}/${roadmapSummary.total} (${roadmapSummary.percent}%)</span></div>
      <div class="item-row"><label>역량 체크 진척률</label><span>${capabilitySummary.done}/${capabilitySummary.total} (${capabilitySummary.percent}%)</span></div>
    `;
  }
```

- [ ] **Step 2: `renderTab`의 `home` 분기를 실제 렌더로 교체** (기존 `else { view.innerHTML = ... }` 블록에서 `home` 케이스만 분리)

```js
  function renderTab(tabName) {
    const view = document.getElementById('view');
    document.querySelectorAll('.bottom-nav a').forEach((a) => {
      a.classList.toggle('active', a.dataset.tab === tabName);
    });
    if (tabName === 'home') {
      renderHomeTab(view);
    } else if (tabName === 'roadmap') {
      view.innerHTML = '<div id="roadmap-section"></div><h2>역량 체크</h2><div id="capabilities-section"></div>';
      renderRoadmapTab(document.getElementById('roadmap-section'), roadmapItems, roadmapChecked);
      renderCapabilitiesTab(document.getElementById('capabilities-section'), capabilityItems, capabilityChecked);
    } else {
      view.innerHTML = `<p>"${escapeHtml(tabName)}" 탭은 다음 계획에서 구현됩니다.</p>`;
    }
  }
```

- [ ] **Step 3: `window.App` export에 `renderHomeTab` 추가**

```js
  window.App = { renderRoadmapTab, renderCapabilitiesTab, renderHomeTab, escapeHtml };
```

- [ ] **Step 4: 수동 스모크 테스트**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap/docs && python3 -m http.server 8765`

`http://localhost:8765/#/`에서 "현재 N주차", 로드맵/역량 진척률 두 줄이 보이는지 확인.
로드맵 탭에서 항목 하나 체크 후 홈으로 돌아와 숫자가 바뀌었는지 확인. 서버 종료.

- [ ] **Step 5: Commit**

```bash
git add docs/app.js
git commit -m "feat: render home tab with roadmap/capability progress summary"
```

---

## Task 9: 전체 테스트 실행 확인 + GitHub 배포

**Files:** 없음(검증 + 배포만)

- [ ] **Step 1: 전체 유닛테스트 실행**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap && node --test tests/js/*.test.js`
Expected: 모든 테스트 pass, 0 fail (Task 1: 8개, Task 2: 8개, Task 7: 4개 = 총 20개)

- [ ] **Step 2 (사용자 수행): GitHub 저장소 생성 + push**

```bash
# github.com에서 eldanscript/gcp-ce-roadmap public repo 생성 후:
cd /home/rainny/dev-run/gcp-ce-roadmap
git remote add origin git@github.com:eldanscript/gcp-ce-roadmap.git
git push -u origin main
```

- [ ] **Step 3 (사용자 수행): GitHub Pages 활성화**

저장소 Settings → Pages → Source를 `main` 브랜치의 `/docs` 폴더로 설정.

- [ ] **Step 4: 배포 확인**

`https://eldanscript.github.io/gcp-ce-roadmap/`에서 실제 배포된 페이지가 로컬 스모크
테스트와 동일하게 동작하는지 확인(로드맵/역량 체크·진척률, 새로고침 후 상태 유지).

- [ ] **Step 5: registry.json 등록 (선택)**

```bash
# ~/dev-agent-team/registry.json에 아래 키 추가 (원격 dispatch용)
"gcp-ce-roadmap": "/home/rainny/dev-run/gcp-ce-roadmap"
```

---

## Plan 1 완료 후 남은 작업

Plan 2(CE 주간루틴 7개 + 성숙도 체크리스트 13개), Plan 3(운동 루틴 11개 + 영양분석 배치
파이프라인), Plan 4(Biz English 12주 60개)는 이 Plan 1이 구현·리뷰된 뒤 실제 `docs/app.js`
구조를 참조해 별도로 작성한다 — spec 문서(`docs/superpowers/specs/2026-08-02-gcp-ce-roadmap-design.md`)에
전체 콘텐츠가 이미 확정되어 있으므로 내용 재작업은 없고, 이 Plan 1이 만든 탭 구조·큐 패턴
위에 이어붙이기만 하면 된다.
