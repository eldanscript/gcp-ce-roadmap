# gcp-ce-roadmap — GCP AI Customer Engineer 역량 로드맵 체크/진척 추적 PWA

## Project Overview
rainny 개인용 커리어·자기관리 트래커. 총 6개 레이어로 구성된다:
1. "GCP AI Customer Engineer Capability Roadmap" PDF에서 추출한 4개 레이어 — 12주 로드맵
   액션(18), 11개 카테고리 역량 학습 항목(97), CE 주간 반복 루틴(7, 12주 한정), 월간
   성숙도 자가진단(13).
2. 운동 루틴 — routine-jammy를 그대로 이식(운동+약+간식/식사+영양분석), **무기한 반복**.
3. Biz English — 12주 한정, 월~금 요일별 세부 학습(60개, CE 업무 상황 테마).

routine-jammy와 동일한 기술 패턴(정적 PWA + Supabase)을 쓰지만 대상 사용자·데이터 모델은
다르다 — CE 로드맵/역량/Biz English는 기술 사용자(rainny 본인) 개인의 1회성 마일스톤 +
12주 한정 반복인 반면, 운동 루틴은 jammy-routine과 동일하게 무기한 반복이다. 두 반복
모델(`weekly_checkins` vs `routine_checkins`)을 혼동하지 않는다 — 설계 근거는 spec 참고.

원본 PDF·전체 설계 근거는
`docs/superpowers/specs/2026-08-02-gcp-ce-roadmap-design.md`에 남겨둔다.

## Tech Stack
| 항목 | 기술 |
|---|---|
| 프런트엔드 | 정적 HTML + Vanilla JS (빌드 도구 없음), `docs/`가 GitHub Pages 소스 |
| 백엔드 | Supabase (신규 프로젝트 — routine-jammy와 별도, jammy의 건강 데이터와 완전 분리) |
| 배포 | GitHub Pages (public repo) |
| 자동화 파이프라인 | CE 로드맵/역량/Biz English는 **없음**(원격 알림 불필요 결정 유지).
**예외**: 운동 루틴의 영양분석만 주간 배치 Python 크론 존재(`src/gcp-ce-roadmap/
nutrition_lookup.py`+`weekly_nutrition_refresh.py`, routine-jammy 이식, 텔레그램 없이
Supabase에 직접 write). 이 예외를 넘어 다른 레이어에 알림/크론을 추가하려면 재논의 필요. |
| 데이터 시작 기준일 | 2026-08-04(월) = 1주차 시작. 진척률·"이번 주" 계산의 기준. |

## Agent 구성
| Agent | 기능 | 상태 |
|---|---|---|
| architect / design-reviewer | 데이터 모델·화면 구조 설계 검토 | 완료(브레인스토밍 단계에서 오케스트레이터가 직접 사용자와 확정) |
| frontend-developer | PWA 구현(정적 페이지, 진척률 로직, Supabase 연동) | 예정 |
| reviewer / tester | 구현 리뷰·테스트 | 예정 |

## Project Structure
```
gcp-ce-roadmap/
├── CLAUDE.md
├── docs/                              # GitHub Pages 배포 소스 (정적 PWA)
│   ├── data/
│   │   ├── roadmap.json               # 12주 로드맵 18개 액션 (3단계)
│   │   ├── capabilities.json          # 11개 카테고리 × 97개 학습 항목
│   │   ├── weeklyRoutine.json         # CE 주간 반복 루틴 7개 (12주 한정)
│   │   ├── maturity.json              # 5개 그룹 × 13개 성숙도 질문
│   │   ├── routineCatalog.json        # 운동7+약4=11개 (무기한 반복, jammy-routine 구조 이식)
│   │   └── bizEnglish.json            # 12주 × 5요일 = 60개 (무~금 세부 학습)
│   ├── superpowers/specs/             # 브레인스토밍 spec 문서 (설계 근거)
│   ├── app.js
│   ├── js/roadmap-logic.js            # 순수 함수 (진척률/주차 계산 등)
│   └── style.css
├── src/gcp-ce-roadmap/
│   ├── nutrition_lookup.py            # routine-jammy 이식 (식약처 공공DB API)
│   └── weekly_nutrition_refresh.py    # 주간 배치 진입점 (crontab, 텔레그램 없음)
├── tests/                             # node --test + pytest (nutrition_lookup만)
└── .claude/agents/                    # 이 프로젝트 전용 override (현재 없음)
```

## Authentication
Supabase anon key를 클라이언트에 노출(routine-jammy와 동일 패턴) — 1인 개인용 데이터라
민감도가 낮고, RLS로 최소 보호만 건다. GCP/텔레그램 등 외부 서비스 연동 없음(자동화
파이프라인 자체가 없으므로).

---

## Knowledge Base
없음.

---

## 개발 환경 — dev-agent-team

이 프로젝트는 `~/.claude/agents/`의 글로벌 sub-agent 로스터(architect, design-reviewer,
developer, backend-developer, frontend-developer, ui-designer, devops, test-author, tester,
reviewer)와 글로벌 커맨드(`/feature`, `/new-project`)를 그대로 상속한다. 로컬
`.claude/agents/`에는 이 프로젝트만의 override(있다면)만 둔다.

원격(Slack 등)에서 이 프로젝트를 다루려면 `~/dev-agent-team/registry.json`에 짧은 이름 →
이 프로젝트 절대경로를 등록한다.
