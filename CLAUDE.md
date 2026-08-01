# gcp-ce-roadmap — GCP AI Customer Engineer 역량 로드맵 체크/진척 추적 PWA

## Project Overview
rainny 개인용 커리어 역량 트래커. "GCP AI Customer Engineer Capability Roadmap" PDF에서
추출한 4개 레이어(12주 로드맵 액션, 11개 카테고리 역량 학습 항목, 월~일 주간 반복 루틴,
월간 성숙도 자가진단)를 체크하고, 목표 대비 진척률과 남은 항목을 확인하는 용도다.
routine-jammy와 동일한 기술 패턴(정적 PWA + Supabase)을 쓰지만 대상 사용자·데이터 모델은
완전히 다르다 — routine-jammy는 비기술 사용자(배우자)를 위한 무한 반복 습관 체크리스트이고,
이 프로젝트는 기술 사용자(rainny 본인) 개인의 1회성 마일스톤 + 12주 한정 반복 루틴 +
주기적 자가진단이 섞인 구조다.

원본 PDF는 `docs/superpowers/specs/2026-08-02-gcp-ce-roadmap-design.md`에 근거로 남겨둔다.

## Tech Stack
| 항목 | 기술 |
|---|---|
| 프런트엔드 | 정적 HTML + Vanilla JS (빌드 도구 없음), `docs/`가 GitHub Pages 소스 |
| 백엔드 | Supabase (신규 프로젝트 — routine-jammy와 별도, jammy의 건강 데이터와 완전 분리) |
| 배포 | GitHub Pages (public repo) |
| 자동화 파이프라인 | **없음** — 원격 알림/리포트 불필요 결정(2026-08-02, 브레인스토밍 세션)에 따라
Python 크론/텔레그램 봇을 의도적으로 두지 않는다. `src/`는 현재 비어 있고, 이 구조를 다시
논의 없이 되살리지 않는다. |
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
│   │   ├── capabilities.json          # 11개 카테고리 × 약 96개 학습 항목
│   │   ├── weeklyRoutine.json         # 월~일 7개 요일 테마
│   │   └── maturity.json              # 5개 그룹 × 13개 성숙도 질문
│   ├── superpowers/specs/             # 브레인스토밍 spec 문서 (설계 근거)
│   ├── app.js
│   ├── js/roadmap-logic.js            # 순수 함수 (진척률/주차 계산 등)
│   └── style.css
├── src/gcp-ce-roadmap/                # 현재 비어 있음 — 백엔드 파이프라인 없음
├── tests/                             # node --test 유닛테스트
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
