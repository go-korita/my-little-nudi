# 갯민숭달팽이 위젯

INFP-todo의 스핀오프 앱. 같은 세계관, 별개 Electron 프로젝트. 데이터 공유 없음.
디자인 스펙은 @DESIGN.md 참고.

---

## 프로젝트 개요

- macOS 전용 Electron 플로팅 투두 위젯
- 오늘 급하게 해야 할 일을 즉흥적으로 적고 체크하는 초경량 앱
- 항상 화면 위에 떠있는 포스트잇 같은 존재

## 파일 구조

```
nudibranch-widget/
├── CLAUDE.md
├── DESIGN.md
├── package.json
├── main.js        ← Electron 메인 (창 설정)
├── index.html     ← 위젯 UI
├── style.css
└── renderer.js    ← 투두 로직, 모션, 데이터
```

---

## 창 설정 (main.js)

- `alwaysOnTop: true`
- `frame: false` (frameless)
- 투명 배경
- 기본 위치: 화면 우측 하단
- 드래그로 위치 이동 가능

---

## 위젯 동작

### collapsed 상태 (기본)
- 갯민숭달팽이 SVG + 머리 위 말풍선
- 말풍선: "할 일 N개" 텍스트
- 빨간 뱃지: 미완료 개수
- 클릭 → expanded 전환

### expanded 상태
- 260×380px
- 투두 추가 / 체크 / 삭제
- 체크 시: 취소선 + 흐려지는 애니메이션
- 바깥 클릭 → collapsed 복귀

---

## 1시간 어텐션 모션

- `setInterval` 60분마다 트리거
- 달팽이 + 말풍선 함께 위아래 바운스 2~3회
  - `translateY: 0 → -8px → 0`, easing: `ease-in-out`
  - 방정맞지 않게, 부드럽게
- 동시에 빨간 뱃지 opacity 반짝 (1 → 0.3 → 1, 2회)
- 총 모션 길이: 약 1.5초
- CSS keyframe 기반으로 구현 (JS 애니메이션 루프 지양)

---

## 데이터

- `electron-store` 사용
- 앱 껐다 켜도 투두 유지

---

## 개발 규칙

- 캐릭터 SVG는 별도 변수로 분리할 것 (추후 피그마 애셋으로 교체 예정)
- 새 기능 추가 시 이 파일도 업데이트
