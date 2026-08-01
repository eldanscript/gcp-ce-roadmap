# gcp-ce-roadmap 설계 (2026-08-02)

## 배경

rainny가 업로드한 "GCP AI Customer Engineer Capability Roadmap" PDF(13페이지)에서 체크·기록
가능한 항목을 추출해, 목표 대비 진척률과 남은 항목을 확인할 수 있는 개인용 트래커를 만든다.
브레인스토밍 세션에서 사용자와 순차 확인한 결정 사항:

1. 사용 환경: 휴대폰 PWA, routine-jammy와 동일한 기술 패턴(정적 PWA + Supabase).
2. 추적 레이어: PDF의 4개 레이어(로드맵/역량/주간루틴/성숙도) **전부** 포함 + 이후 세션에서
   추가된 운동 루틴·Biz English 2개 레이어(아래 9~14번) — 총 6개 레이어.
3. 프로젝트 구조: routine-jammy와 완전히 분리된 신규 프로젝트(`~/dev-run/gcp-ce-roadmap`).
4. 시작일: 2026-08-04(월) = 1주차 (CE 로드맵·Biz English 등 "12주 한정" 레이어 기준).
5. 백엔드: 신규 Supabase 프로젝트(별도, jammy 데이터와 분리).
6. 저장소: public repo (GitHub Pages 배포 위해 — Free 플랜은 private repo에서 Pages 불가).
7. 자동화 파이프라인: **CE 로드맵 자체는 없음**(텔레그램 등 원격 알림 불필요, 최초 결정
   유지) — 다만 9번 결정(영양분석)으로 **영양분석 전용 주간 배치 크론은 도입**한다(알림
   없이 순수 계산만, 아래 "아키텍처" 절 참고). 최초의 "자동화 파이프라인 없음"은 CE
   로드맵/역량/Biz English 레이어에는 여전히 적용된다.
8. 카테고리 11(Automate yourself) 범위: PDF의 "핵심 학습 범위" 6개 + "상세 가이드" 27개를
   전부 포함해 세분화(다른 카테고리보다 항목이 많은 것은 의도된 비대칭).
9. **운동 루틴 추가**: jammy-routine의 구조(운동+약+기타, **무기한 반복**, 12주 프로그램과
   무관)만 이식하고, 운동 종목 자체는 rainny 전용으로 교체(아래 15번 참고).
15. 운동 기본 항목(7종, 전부 고정 표시·opt-in 구분 없음): 슬로우 조깅(km 기록 유지) /
    러닝 머신 / 실내 사이클링 / 근력 강화 / 허리 강화 스트레칭 / 스쿼트 / 푸쉬업.
    jammy의 원래 목록(슬로우조깅·스쿼트·데드리프트·런지·플랭크 고정 + 캐틀벨스윙 등 6종
    opt-in)은 쓰지 않는다 — "고정 5+opt-in 6" 구조 자체를 버리고 7개를 전부 기본
    표시한다. km 메트릭 입력은 슬로우 조깅에만 유지(나머지 6개는 단순 체크).
10. 약 목록: jammy와 동일한 4종(고지혈증약/코큐텐/비타민C·D/마그네슘) 그대로 사용.
11. 기타 섹션: 간식/식사 텍스트 기록 + **영양분석 포함**.
12. 영양분석: routine-jammy의 `nutrition_lookup.py`(식약처 공공 데이터베이스 API) 방식을
    그대로 이식. API 키는 routine-jammy의 것을 이 프로젝트 자체 `.env`로 **복사**(이동 아님).
    이를 위해 영양분석 전용 주간 배치 Python 크론을 도입(텔레그램 없음, 순수 계산).
13. **Biz English 추가**: 12주 한정(CE 로드맵과 같은 시작일 기준), 월~금 요일별 세부
    학습항목 지정 방식. 요일별 활동 템플릿(어휘/표현패턴/리스닝쉐도잉/롤플레이/리허설)을
    매주 동일하게 적용하고, 주차마다 상황별 테마(아래 "전체 콘텐츠" 참고)가 바뀐다.
14. Biz English 12주 주제 목록은 오케스트레이터가 초안 작성 → 사용자 승인 완료(CE 업무
    흐름 순서로 설계: 스몰토크 → discovery → 기술 심화 → ... → QBR).

## 아키텍처

- 정적 HTML + Vanilla JS (빌드 도구 없음), `docs/`가 GitHub Pages 배포 소스.
- Supabase(신규 프로젝트)를 브라우저에서 anon key로 직접 호출 — routine-jammy와 동일한
  신뢰 모델(1인 개인용 데이터, RLS로 최소 보호).
- **영양분석 전용 배치 파이프라인 1개만 예외적으로 존재**: `src/gcp-ce-roadmap/
  nutrition_lookup.py`(routine-jammy에서 그대로 이식, 식약처 공공DB API) +
  `src/gcp-ce-roadmap/weekly_nutrition_refresh.py`(주간 배치 진입점). crontab에 주 1회
  실행 항목 추가(텔레그램/알림 없음 — routine-jammy처럼 정적 JSON을 커밋·재배포하는 대신,
  **Supabase `nutrition_stats` 테이블에 직접 write**해서 프런트가 즉시 조회하게 한다 —
  git commit+push 왕복 없이 더 단순함). 그 외 레이어(로드맵/역량/Biz English)는 결정
  7번대로 자동화 파이프라인이 없다.
- API 키(`ROUTINE_NUTRITION_API_ENDPOINT`/`ROUTINE_NUTRITION_API_KEY`)는 routine-jammy의
  `.env`에서 값만 복사해 이 프로젝트 자체 `.env`에 둔다(원본은 손대지 않음).

## 데이터 모델

### 정적 콘텐츠 (커밋 파일, PDF에서 추출 — 아래 "전체 콘텐츠" 절이 원본)

- `docs/data/roadmap.json` — `{id, phase(1|2|3), weekRange("1-4"|"5-8"|"9-12"), title}` × 18
- `docs/data/capabilities.json` — `{id, categoryId(1-11), categoryTitle, subgroup?, title}` × 97
  (categoryId=11만 subgroup 필드 사용: "핵심"|"AI-native 개발 환경"|"업무 에이전트 활용"|
  "협업 도구 연계"|"PPT 및 발표자료 자동화"|"멀티모달 기반 개인 생산성")
- `docs/data/weeklyRoutine.json` — `{day("월"~"일"), theme}` × 7 (CE 로드맵용, 12주 한정)
- `docs/data/maturity.json` — `{id, group, question}` × 13
  (group ∈ {"플랫폼","AI/Agent","Multimodal","Production","Automate yourself"})
- `docs/data/routineCatalog.json` — jammy-routine **구조**(무기한 반복) 이식, 종목은 rainny
  전용. `{id, section(exercise|medication|other), title, metric?({key,unit,min,max},
  "슬로우 조깅"만)}`. exercise 7(전부 고정 표시, opt-in 구분 없음: 슬로우 조깅·러닝머신·
  실내 사이클링·근력 강화·허리 강화 스트레칭·스쿼트·푸쉬업) + medication 4(고지혈증약·
  코큐텐·비타민C/D·마그네슘) = 11. 커스텀 추가는 앱에서 localStorage(routine-jammy와
  동일 패턴)로 계속 지원.
- `docs/data/bizEnglish.json` — `{weekNumber(1-12), theme, days:[{day(월~금),
  activityType, id}]}` × 12주 (5요일 고정 템플릿) — 아래 "전체 콘텐츠" 절이 원본, 60개
  리프 항목.

### 진행 상태 (Supabase)

```sql
roadmap_progress(item_id text primary key, checked_at timestamptz)
capability_progress(item_id text primary key, checked_at timestamptz)
weekly_checkins(week_number int, day text, checked_at timestamptz,
                 primary key (week_number, day))
maturity_checkins(question_id text, checkpoint int check (checkpoint in (1,2,3)),
                   checked boolean, checked_at timestamptz,
                   primary key (question_id, checkpoint))
biz_english_progress(item_id text primary key, checked_at timestamptz)

-- 무기한 반복 레이어 (routine-jammy와 동일 신뢰모델, date 기준)
routine_checkins(date date, item_id text, checked boolean, payload jsonb,
                  primary key (date, item_id))
routine_custom_items(name text primary key, section text, created_at timestamptz)
routine_meals(date date, slot text, note text, primary key (date, slot))

-- 영양분석 배치 파이프라인 출력 (주 1회 갱신, 프런트는 읽기만)
nutrition_stats(week_id text primary key, weekly_average jsonb, recommendations jsonb,
                 unmatched_food_items jsonb, updated_at timestamptz)
```

`weekly_checkins`(CE 로드맵)과 `routine_checkins`(운동 루틴)은 **서로 다른 반복 모델**이다
— 전자는 12주 프로그램 범위 내 각 주차가 별개 인스턴스(`week_number`+`day`로 식별), 후자는
routine-jammy처럼 **날짜 자체가 키**라 무기한 반복된다. 둘을 혼동해 하나의 테이블로 합치지
않는다.

### 주차 계산

```js
const PROGRAM_START = new Date("2026-08-04"); // 월요일, 1주차 시작
function currentWeekNumber(today = new Date()) {
  const days = Math.floor((today - PROGRAM_START) / 86400000);
  return Math.min(12, Math.max(1, Math.floor(days / 7) + 1));
}
```

## 화면 구성 (6개 레이어로 확장 — 4-tab 유지, 내용 재배치)

| 탭 | 내용 |
|---|---|
| 홈 | 6개 레이어 진척률 요약(로드맵 x/18, 역량 x/97, Biz English x/60, 성숙도 최근 체크포인트, 운동 루틴 이번주 이행률, 최근 영양 리포트 한 줄) |
| **오늘** | 오늘 해당하는 모든 체크를 한 화면에 — 운동 루틴(매일, 고정 7종 전부 표시), 약 4종, 간식/식사 기록, Biz English 오늘 요일 항목(평일만), CE 주간루틴 오늘 항목. 매일 쓰는 핵심 탭 |
| 로드맵&역량 | CE 12주 로드맵(18, 3단계 아코디언) + 역량체크(97, 11개 카테고리 아코디언, 카테고리11은 6개 소그룹) |
| 리포트 | 성숙도 체크리스트(13문항, 체크포인트 1=4주차/2=8주차/3=12주차), 주간 영양 리포트(nutrition_stats 테이블 조회), 전체 "아직 안 한 것" 통합 목록(로드맵+역량+Biz English 미완료 항목) |

## 오프라인/에러 처리

routine-jammy에서 검증된 패턴 재사용: localStorage 즉시 반영 + Supabase 큐잉 전송,
`flushQueue` 재진입 방지 가드(`isFlushing` 플래그).

## 테스트 계획

- 순수 함수 유닛테스트(node --test): `currentWeekNumber`, 진척률 계산(`x/total` 및 카테고리별
  부분 진척률), "남은 것" 정렬 로직.
- 정적 JSON 일관성 테스트: 6개 JSON 파일의 id 중복 없음, `capabilities.json`의 categoryId가
  1~11 범위, `roadmap.json`의 phase가 1~3 범위, `bizEnglish.json`의 weekNumber가 1~12·
  요일이 월~금 5개 고정, 각 파일의 항목 수가 이 문서에 명시된 개수(로드맵18/역량97/CE
  주간루틴7/성숙도13/Biz English 60/운동카탈로그11)와 정확히 일치.
- `nutrition_lookup.py`: routine-jammy의 `test_nutrition_lookup.py`를 그대로 이식해 재사용
  (같은 API, 같은 계약이므로 테스트도 동일하게 유효).

## Out of scope

- CE 로드맵/역량/Biz English 레이어의 텔레그램·이메일 등 원격 알림·리포트(결정 7번).
- 다른 로드맵 PDF를 업로드해 재사용하는 범용 기능(이번엔 이 PDF 내용만 하드코딩).
- CE 로드맵/역량/Biz English 항목에 커스텀 추가(PDF·초안 고정 콘텐츠만 체크). **운동
  루틴만 예외** — routine-jammy와 동일하게 운동/약 커스텀 추가를 지원한다(결정 9번).
- 영양분석 결과에 대한 텔레그램 알림(순수 배치 계산 + 프런트 조회만, 결정 12번).

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

### 운동 루틴 카탈로그 (jammy-routine 구조 이식·종목은 rainny 전용, 11개, 무기한 반복)

**운동 — 7종** (opt-in 구분 없이 매일 카드에 전부 표시): 슬로우 조깅(km 기록, `metric{
key:"km", unit:"km", min:0.1, max:99}`) / 러닝 머신 / 실내 사이클링 / 근력 강화 / 허리
강화 스트레칭 / 스쿼트 / 푸쉬업 (km 메트릭은 슬로우 조깅에만 있고 나머지 6개는 단순 체크)

**약/영양제 — 고정 4종**: 고지혈증약 / 코큐텐 / 비타민C/D / 마그네슘

**기타**: 간식/식사 텍스트 기록(자유 입력, `routine_meals` 테이블) + 주간 영양분석
(식약처 공공DB 자동 매칭, routine-jammy의 `nutrition_lookup.py` 방식 — 위 "아키텍처"
절 참고)

**커스텀 추가**: 운동·약 모두 routine-jammy와 동일하게 localStorage 기반 커스텀 항목 추가
지원(이 트래커에서 CE 로드맵/역량/Biz English는 커스텀 추가를 지원하지 않는 것과 대비됨 —
Out of scope 절 참고).

### Biz English 12주 커리큘럼 (60개, 월~금 요일별)

**요일별 활동 템플릿** (모든 주차에 동일하게 적용):

| 요일 | 활동 타입 |
|---|---|
| 월 | 핵심 어휘 학습 |
| 화 | 표현 패턴 연습 |
| 수 | 리스닝 & 쉐도잉 |
| 목 | 롤플레이 스크립트 작성 |
| 금 | 리허설 & 녹음 복습 |

**12주 상황별 테마** (CE 업무 흐름 순서 — PDF "10. 고객 커뮤니케이션과 발표 역량"과 연결):

| 주차 | 테마 |
|---|---|
| 1 | Introductions & Small Talk — 첫 미팅 인사·자기소개·스몰토크 |
| 2 | Discovery Call — 고객 요구사항 파악 미팅 |
| 3 | Technical Deep-Dive Meeting — 기술 심화 설명 미팅 |
| 4 | Whiteboarding Session — 실시간 화이트보드 설계 논의 |
| 5 | Demo Presentation — 데모 발표 |
| 6 | Handling Objections & Q&A — 반론 대응 및 질의응답 |
| 7 | Proposal Walkthrough — 제안서 설명 |
| 8 | Architecture Review Meeting — 아키텍처 리뷰 미팅 |
| 9 | Executive Briefing — 경영진 대상 브리핑 |
| 10 | Negotiation & Pricing Discussion — 협상 및 가격 논의 |
| 11 | Workshop Facilitation — 워크숍 진행 |
| 12 | QBR & Wrap-up — 분기 리뷰 및 다음 단계 논의 |

각 리프 항목의 `id`는 `w{주차}-{mon|tue|wed|thu|fri}` 형식(예: `w1-mon` = "1주차 월요일:
Introductions & Small Talk 핵심 어휘 학습"). 12주 × 5요일 = 60개.
