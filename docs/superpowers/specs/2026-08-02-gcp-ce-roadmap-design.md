# gcp-ce-roadmap 설계 (2026-08-02)

## 배경

rainny가 업로드한 "GCP AI Customer Engineer Capability Roadmap" PDF(13페이지)에서 체크·기록
가능한 항목을 추출해, 목표 대비 진척률과 남은 항목을 확인할 수 있는 개인용 트래커를 만든다.
브레인스토밍 세션에서 사용자와 순차 확인한 결정 사항:

1. 사용 환경: 휴대폰 PWA, routine-jammy와 동일한 기술 패턴(정적 PWA + Supabase).
2. 추적 레이어: PDF의 4개 레이어(로드맵/역량/주간루틴/성숙도) **전부** 포함.
3. 프로젝트 구조: routine-jammy와 완전히 분리된 신규 프로젝트(`~/dev-run/gcp-ce-roadmap`).
4. 시작일: 2026-08-04(월) = 1주차.
5. 백엔드: 신규 Supabase 프로젝트(별도, jammy 데이터와 분리).
6. 저장소: public repo (GitHub Pages 배포 위해 — Free 플랜은 private repo에서 Pages 불가).
7. 자동화 파이프라인: **없음** — routine-jammy의 일요일크론+텔레그램 리포트 같은 원격 모니터링
   기능은 만들지 않는다(본인이 직접 쓰는 도구라 불필요하다고 명시적으로 결정). 이 결정을
   뒤집으려면 사용자 재확인 필요.
8. 카테고리 11(Automate yourself) 범위: PDF의 "핵심 학습 범위" 6개 + "상세 가이드" 27개를
   전부 포함해 세분화(다른 카테고리보다 항목이 많은 것은 의도된 비대칭).

## 아키텍처

- 정적 HTML + Vanilla JS (빌드 도구 없음), `docs/`가 GitHub Pages 배포 소스.
- Supabase(신규 프로젝트)를 브라우저에서 anon key로 직접 호출 — routine-jammy와 동일한
  신뢰 모델(1인 개인용 데이터, RLS로 최소 보호).
- Python 백엔드/크론/텔레그램 없음. `src/`는 현재 비어 있다.

## 데이터 모델

### 정적 콘텐츠 (커밋 파일, PDF에서 추출 — 아래 "전체 콘텐츠" 절이 원본)

- `docs/data/roadmap.json` — `{id, phase(1|2|3), weekRange("1-4"|"5-8"|"9-12"), title}` × 18
- `docs/data/capabilities.json` — `{id, categoryId(1-11), categoryTitle, subgroup?, title}` × 97
  (categoryId=11만 subgroup 필드 사용: "핵심"|"AI-native 개발 환경"|"업무 에이전트 활용"|
  "협업 도구 연계"|"PPT 및 발표자료 자동화"|"멀티모달 기반 개인 생산성")
- `docs/data/weeklyRoutine.json` — `{day("월"~"일"), theme}` × 7
- `docs/data/maturity.json` — `{id, group, question}` × 13
  (group ∈ {"플랫폼","AI/Agent","Multimodal","Production","Automate yourself"})

### 진행 상태 (Supabase)

```sql
roadmap_progress(item_id text primary key, checked_at timestamptz)
capability_progress(item_id text primary key, checked_at timestamptz)
weekly_checkins(week_number int, day text, checked_at timestamptz,
                 primary key (week_number, day))
maturity_checkins(question_id text, checkpoint int check (checkpoint in (1,2,3)),
                   checked boolean, checked_at timestamptz,
                   primary key (question_id, checkpoint))
```

`weekly_checkins`은 routine-jammy와 달리 **무한 반복이 아니라 12주 프로그램 범위 내 각
주차가 별개 인스턴스**다 — `week_number`(1~12) + `day`로 유일하게 식별.

### 주차 계산

```js
const PROGRAM_START = new Date("2026-08-04"); // 월요일, 1주차 시작
function currentWeekNumber(today = new Date()) {
  const days = Math.floor((today - PROGRAM_START) / 86400000);
  return Math.min(12, Math.max(1, Math.floor(days / 7) + 1));
}
```

## 화면 구성 (routine-jammy와 동일한 4-tab 하단 네비)

| 탭 | 내용 |
|---|---|
| 홈 | 로드맵 진척률(x/18), 역량 진척률(x/97), 현재 주차 + 이번 주 루틴(x/7), 최근 성숙도 체크포인트 요약 |
| 로드맵 | 3단계(1-4주/5-8주/9-12주) 아코디언, 18개 액션 체크박스, 현재 주차에 해당하는 단계 자동 펼침 |
| 역량 체크 | 11개 카테고리 아코디언(카테고리별 진행률 배지), 97개 항목 체크 (카테고리11은 6개 소그룹으로 재분할) |
| 루틴·리포트 | 주차 선택(기본값=현재 주차)의 월~일 7개 체크, "아직 안 한 것" 통합 목록(로드맵+역량 미완료 항목, 로드맵 우선순위 상위 배치), 성숙도 체크리스트(체크포인트 1=4주차/2=8주차/3=12주차 선택, 13문항) |

## 오프라인/에러 처리

routine-jammy에서 검증된 패턴 재사용: localStorage 즉시 반영 + Supabase 큐잉 전송,
`flushQueue` 재진입 방지 가드(`isFlushing` 플래그).

## 테스트 계획

- 순수 함수 유닛테스트(node --test): `currentWeekNumber`, 진척률 계산(`x/total` 및 카테고리별
  부분 진척률), "남은 것" 정렬 로직.
- 정적 JSON 일관성 테스트: 4개 JSON 파일의 id 중복 없음, `capabilities.json`의 categoryId가
  1~11 범위, `roadmap.json`의 phase가 1~3 범위, 각 파일의 항목 수가 이 문서에 명시된 개수
  (18/97/7/13)와 정확히 일치.

## Out of scope

- Python 자동 알림/리포트 파이프라인(명시적으로 배제, 위 결정 6번 참고).
- 다른 로드맵 PDF를 업로드해 재사용하는 범용 기능(이번엔 이 PDF 내용만 하드코딩).
- 커스텀 항목 추가(routine-jammy의 스폰서/커스텀 운동 기능과 달리, 이 트래커는 PDF 고정
  콘텐츠만 체크 — 필요해지면 별도 요청으로 확장).

---

## 전체 콘텐츠 (PDF 원문 추출, 구현 시 JSON으로 그대로 옮길 것)

### 12주 로드맵 (18개, 3단계)

**1-4주: 기반 구축**
1. GCP 핵심 서비스 맵 작성
2. Gemini, Vertex AI, BigQuery, GKE, Cloud Run 요약 노트 작성
3. Claude Code 또는 Codex 기반 로컬 개발 워크플로우 정립
4. Notion 또는 Obsidian 기반 학습 허브 생성
5. 멀티모달 LLM으로 아키텍처 다이어그램 5개 분석 연습
6. PPT 템플릿과 발표 스토리라인 템플릿 작성

**5-8주: 설계와 자동화 확장**
7. RAG 아키텍처 3개 설계 및 비교
8. Agent ADK 기반 샘플 agent 1개 구현 또는 설계 문서화
9. MCP/tool calling 구조 예시 정리
10. 고객 메일 요약, follow-up, action tracker 자동화 루틴 구성
11. Slack/Notion/Obsidian 워크플로우 연결
12. 고객용 10장 내외 제안서 2개 작성

**9-12주: 실전 적용**
13. 고객 산업별 reference architecture 3개 작성
14. 멀티모달 use case별 GCP 매핑 문서 작성
15. 비용·보안·운영성 포함한 architecture review 훈련
16. 발표자료 1세트를 완성하고 리허설
17. AI agent를 활용한 주간 업무 운영체계 정착
18. 월간 성숙도 셀프 리뷰 수행

### 역량 카테고리 (11개, 97개 항목)

**1. GCP 플랫폼 전문성**
Compute Engine·GKE·Cloud Run·serverless 패턴 / Cloud Storage·tiering·backup·lifecycle /
VPC·load balancing·private connectivity·Cloud CDN / IAM·Org Policy·VPC Service Controls·
CMEK·DLP / Cloud Monitoring·Logging·alerting·운영 가시성 / HA/DR·multi-region·scaling·cost model

**2. AI/ML 플랫폼 전문성**
Gemini 계열 모델과 모델 선택 기준 / Vertex AI 학습·평가·레지스트리·엔드포인트·파이프라인 /
Model Garden과 오픈 모델 활용 전략 / BigQuery ML과 BigQuery-Vertex AI 통합 / TPU·GPU·
AI Hypercomputer 개요와 선택 기준 / Model Evaluation·Model Armor·안전성 제어

**3. Agentic AI 설계 역량**
Agent와 chatbot의 차이 / Tool use·function calling·workflow orchestration / ADK 기반 코드
우선 agent 설계 / Agent Engine 런타임·Sessions·Memory Bank 개념 / MCP와 A2A 기반 상호운용 /
Human-in-the-loop·approval·audit 설계 / Model Armor와 agent security

**4. RAG와 엔터프라이즈 검색**
Chunking 전략: fixed-size vs semantic / Metadata 설계와 structured filtering / Hybrid
retrieval: keyword + vector / Embedding 모델 선택 / Re-ranking·top-k·context window 관리 /
Grounding·citation·hallucination 감소 / RAG 평가 지표와 품질 진단

**5. Prompt, RAG, Fine-tuning 선택 역량**
Prompt engineering 설계 패턴 / RAG 적합 시나리오 / Fine-tuning 적합 시나리오 / Build vs buy
vs open model 의사결정 / 비용·latency·유지보수 trade-off / 데이터 품질과 라벨링 평가

**6. MLOps/LLMOps 운영 역량**
Data pipeline·training pipeline·deployment pipeline / Model registry·versioning·rollback /
Feature Store와 training-serving consistency / Drift monitoring·quality monitoring·cost
monitoring / Retraining automation / Canary·shadow deployment·A/B test / Observability와
incident 대응

**7. 멀티모달 LLM 역량**
OCR·document understanding·chart/table reading / UI understanding·screenshot interpretation /
Diagram review·architecture critique / Image + text grounding / Video understanding·scene
segmentation·metadata extraction / Speech-to-text·text-to-speech·multilingual media
workflows / 멀티모달 입력을 활용한 고객 제안서·데모 개선

**8. 고객 문제 정의와 아키텍처 설계**
KPI 중심 discovery / ML이 정말 필요한 문제인지 판단 / 데이터 가용성·품질·거버넌스 확인 /
Batch vs streaming, online vs offline 서빙 판단 / 보안·비용·성능·DR trade-off 설명 / 요구사항
기반 화이트보딩

**9. 비용·보안·거버넌스**
TCO·cost per request·cost per user 모델링 / Batch inference vs real-time inference 비용
비교 / GPU vs TPU 선택 시 경제성 판단 / IAM·VPC-SC·CMEK·DLP 기반 통제 / Audit·logging·data
boundary 설계 / 고위험 업무의 human approval 흐름

**10. 고객 커뮤니케이션과 발표 역량**
Discovery workshop 진행 / Executive summary 작성 / Demo narrative 설계 / 기술 선택을
비즈니스 효과로 번역 / 고객 objection handling / 아키텍처 설명과 Q&A 대응

**11. Automate yourself** (핵심 6 + 상세가이드 27 = 33)

*핵심*: Claude Code·Codex·Antigravity 기반 AI-native 개발 환경 구축 / Hermes·Openclaw 등
agent를 활용한 메일·검색·액션아이템 자동화 / Slack·Notion·Obsidian·Canvas·Figma·Google
Docs/Slides 연동 / PPT 초안·제안서·워크숍 자료·QBR 자료 자동화 / 회의록 요약·follow-up
메일·주간 리포트 자동 생성 / 개인 지식베이스와 재사용 가능한 prompt/template 관리

*AI-native 개발 환경*: Claude Code·Codex·Antigravity를 로컬 개발 워크플로우에 통합 / 저장소
규칙·테스트 규칙·문서 형식·브랜치 전략을 system prompt화 / Repo-aware 검색과 수정·diff
review·commit message 초안 생성 / Unit test·integration test·lint·보안 점검 자동화 / IaC
초안 작성과 리뷰 자동화

*업무 에이전트 활용*: 받은 메일의 중요도 분류와 회신 초안 작성 / 회의 초대·안건·action item
자동 생성 / 문서/위키/슬랙 기록 검색 후 요약 제공 / 정기 보고서와 follow-up draft 생성 /
고객 요청 기반의 조사 작업 kickoff

*협업 도구 연계*: Slack(대화 요약·action item 추출·FAQ 축적) / Notion(고객 계정 플랜·회의록·
playbook·프로젝트 허브) / Obsidian(개인 학습 노트·영구 메모·기술 개념 연결) /
Canvas/whiteboard(워크숍 구조화·아이디어 정리·고객 문제 시각화) / Figma(간단한 UX 흐름·화면
컨셉·발표용 시각 자산 제작) / Google Slides/PPT(고객용 제안서와 발표자료 구조화)

*PPT 및 발표자료 자동화*: 문제 정의·제안 아키텍처·가치·다음 단계의 4장 구조 기본화 / 텍스트
위주 초안을 받아 슬라이드 메시지 중심 구조로 재작성 / 아키텍처 다이어그램 설명 문장 자동
생성 / 고객 임원용 1페이지 요약과 실무자용 상세본 분리 / 발표 리허설 질문 예상과 답변 초안
자동 생성

*멀티모달 기반 개인 생산성*: 아키텍처 다이어그램 리뷰 / 스크린샷 오류 해석 / 발표자료
디자인 및 메시지 피드백 / 표와 차트 해석 및 요약 / 제품 콘솔 캡처 기반 기능 설명 생성 /
이미지/문서/도표를 함께 넣는 프롬프트 실험

### 주간 반복 루틴 (7개, 월~일)

월요일: 학습 목표 설정, 고객 시나리오 1개 선택 / 화요일: GCP 서비스/아키텍처 학습 / 수요일:
Agentic AI 또는 RAG 실습 / 목요일: Multimodal LLM 실습과 문서화 / 금요일: 발표자료 또는
고객 설명자료 작성 / 토요일: 3시간 집중 블록으로 데모/문서/코드 산출물 완성 / 일요일: 회고,
노트 정리, 다음 주 task 생성

### 성숙도 체크리스트 (5그룹, 13문항)

**플랫폼**: GCP 핵심 서비스 간 관계를 설명할 수 있는가 / AWS 경험을 GCP로 자연스럽게 매핑할
수 있는가 / 고객 워크로드에 맞는 서비스 선택 이유를 말할 수 있는가

**AI/Agent**: Prompt·RAG·fine-tuning의 선택 기준을 설명할 수 있는가 / ADK·MCP·A2A의 역할을
설명할 수 있는가 / Agent와 chatbot의 차이를 실무 시나리오로 말할 수 있는가

**Multimodal**: 이미지·다이어그램·스크린샷을 보고 기술적 판단을 내릴 수 있는가 / 비디오/문서/
오디오 use case를 GCP 아키텍처로 변환할 수 있는가

**Production**: 비용·보안·운영성·모니터링까지 포함한 설계를 설명할 수 있는가 / 프로덕션
전환 장벽을 기술 외 요소까지 포함해 설명할 수 있는가

**Automate yourself**: 메일·검색·문서화·발표자료 작성 중 2개 이상을 AI로 자동화했는가 /
개인 지식베이스와 일정 관리가 AI 기반으로 연결되어 있는가 / 반복 학습 루틴이 템플릿과
agent로 재사용 가능하게 구성되어 있는가
