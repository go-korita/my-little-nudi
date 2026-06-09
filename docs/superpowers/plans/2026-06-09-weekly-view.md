# 누디투두 v2 주간 뷰 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** collapsed → expanded → weekly 3단계 상태 흐름 추가. 요일별 투두 관리 + 드래그앤드롭 이동.

**Architecture:** 기존 2-state Electron 위젯에 weekly 상태 추가. 데이터는 `weeklyTodos` (요일 키 `mon`~`sun` 기반 객체)로 교체. UI는 7컬럼 가로 레이아웃 (각 160px, 총 1160px). weekly 창은 오른쪽 끝 고정, 왼쪽으로 확장.

**Tech Stack:** Electron, electron-store, Rive (@rive-app/canvas), HTML5 Drag and Drop API

---

## 파일별 변경 범위

| 파일 | 변경 내용 |
|------|-----------|
| `main.js` | `expandedX/Y` 변수 추가, `window:weekly-expand`, `window:weekly-collapse`, `store:getWeekly`, `store:setWeekly` IPC 핸들러 추가 |
| `index.html` | `#weekly-view` 전체 구조 추가, expanded 헤더에 `#weekly-btn` 추가 |
| `style.css` | 7컬럼 weekly 레이아웃, today 하이라이트, 드래그 피드백 스타일 추가 |
| `renderer.js` | 데이터 모델 교체 (`todos[]` → `weeklyTodos{}`), `expandWeekly/collapseWeekly`, `renderWeekly`, 드래그앤드롭, 마이그레이션 로직 |

---

## Task 1: 브랜치 생성

**Files:**
- 없음 (git 명령만)

- [ ] **Step 1: 브랜치 생성 및 이동**

```bash
git checkout -b feature/weekly-view
```

- [ ] **Step 2: 확인**

```bash
git branch
```
Expected: `* feature/weekly-view` 가 현재 브랜치로 표시됨

---

## Task 2: main.js — weekly IPC 추가

**Files:**
- Modify: `main.js`

- [ ] **Step 1: `expandedX`, `expandedY` 변수 선언 추가**

`main.js` 6번째 줄 (`let collapsedX, collapsedY` 바로 아래)에 추가:

```js
let collapsedX, collapsedY
let expandedX, expandedY   // ← 추가
```

- [ ] **Step 2: `window:expand` 핸들러에서 `expandedX/Y` 저장**

기존 `ipcMain.on('window:expand', ...)` 블록을 아래로 교체:

```js
ipcMain.on('window:expand', () => {
  const [x, y] = win.getPosition()
  collapsedX = x
  collapsedY = y

  const newX = x + 180 - 280
  const newY = y + 180 - 440
  expandedX = newX   // ← 추가
  expandedY = newY   // ← 추가
  win.setBounds({ x: newX, y: newY, width: 280, height: 440 })
})
```

- [ ] **Step 3: weekly IPC 핸들러 추가**

`ipcMain.on('window:collapse', ...)` 블록 바로 아래에 추가:

```js
ipcMain.on('window:weekly-expand', () => {
  const [x, y] = win.getPosition()
  expandedX = x
  expandedY = y
  // 오른쪽 끝(x + 280) 고정, 왼쪽으로 확장
  const newX = x + 280 - 1160
  win.setBounds({ x: newX, y: y, width: 1160, height: 440 })
})

ipcMain.on('window:weekly-collapse', () => {
  win.setBounds({ x: expandedX, y: expandedY, width: 280, height: 440 })
})
```

- [ ] **Step 4: weekly 스토어 IPC 핸들러 추가**

파일 맨 끝에 추가:

```js
// ====== IPC: 주간 투두 저장/불러오기 ======
const DEFAULT_WEEKLY = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] }

ipcMain.handle('store:getWeekly', () => {
  return store.get('weeklyTodos', DEFAULT_WEEKLY)
})

ipcMain.handle('store:setWeekly', (event, weeklyTodos) => {
  store.set('weeklyTodos', weeklyTodos)
})
```

- [ ] **Step 5: 앱 실행해서 에러 없는지 확인**

```bash
npm start
```
Expected: 앱이 정상 실행됨 (이 단계에서는 UI 변화 없음)

- [ ] **Step 6: 커밋**

```bash
git add main.js
git commit -m "feat: weekly IPC 핸들러 추가 (window:weekly-expand/collapse, store:getWeekly/setWeekly)"
```

---

## Task 3: index.html — weekly 뷰 구조 추가

**Files:**
- Modify: `index.html`

- [ ] **Step 1: expanded 헤더에 "이번 주" 버튼 추가**

기존 `#card-header` 내부를 아래로 교체:

```html
<div id="card-header">
  <span id="card-title">오늘 할 일</span>
  <div class="header-btns">
    <button id="weekly-btn" title="이번 주">☰</button>
    <button id="collapse-btn" title="접기">−</button>
  </div>
</div>
```

- [ ] **Step 2: `#expanded-view` 닫는 태그(`</div>`) 바로 뒤에 weekly 뷰 추가**

```html
<!-- ====== WEEKLY 상태 ====== -->
<div id="weekly-view" class="hidden">
  <div id="weekly-columns">
    <!-- renderer.js가 동적으로 생성 -->
  </div>
  <div id="weekly-footer">
    <div id="weekly-char-area">
      <canvas id="weekly-char-canvas" width="64" height="64"></canvas>
      <div id="weekly-bubble">
        <span id="weekly-bubble-text">할 일 없음</span>
      </div>
    </div>
    <button id="weekly-collapse-btn" title="접기">−</button>
  </div>
</div>
```

- [ ] **Step 3: 앱 실행해서 에러 없는지 확인**

```bash
npm start
```
Expected: expanded 헤더에 ☰ 버튼이 보임. weekly 뷰는 아직 hidden이라 안 보임.

- [ ] **Step 4: 커밋**

```bash
git add index.html
git commit -m "feat: index.html에 weekly 뷰 HTML 구조 추가"
```

---

## Task 4: style.css — weekly 레이아웃 스타일

**Files:**
- Modify: `style.css`

- [ ] **Step 1: CSS 변수에 weekly 관련 변수 추가**

`style.css` `:root` 블록 안 맨 끝(뱃지 변수 아래)에 추가:

```css
  /* 위클리 뷰 */
  --weekly-col-border: #E2E2E2;
  --weekly-today-bg: rgba(26, 26, 26, 0.05);
  --weekly-today-border: #1A1A1A;
  --weekly-drag-over-bg: rgba(26, 26, 26, 0.08);
  --weekly-bubble-bg: #FFFFFF;
  --weekly-bubble-border: #D8D8D8;
```

- [ ] **Step 2: 다크모드 블록 안에도 추가**

`@media (prefers-color-scheme: dark)` 블록 안 맨 끝에 추가:

```css
    --weekly-col-border: #48484A;
    --weekly-today-bg: rgba(229, 229, 234, 0.08);
    --weekly-today-border: #E5E5EA;
    --weekly-drag-over-bg: rgba(255, 255, 255, 0.1);
    --weekly-bubble-bg: #2C2C2E;
    --weekly-bubble-border: #48484A;
```

- [ ] **Step 3: weekly 스타일 블록 추가**

`style.css` 맨 끝에 추가:

```css
/* ====== WEEKLY 상태 ====== */
#weekly-view {
  width: 1160px;
  height: 440px;
  display: flex;
  flex-direction: column;
  padding: 10px;
  gap: 6px;
}

#weekly-columns {
  display: flex;
  flex-direction: row;
  flex: 1;
  min-height: 0;
  gap: 0;
  border: 1px solid var(--weekly-col-border);
  border-radius: 14px;
  overflow: hidden;
  background: var(--card-bg);
  background-image: var(--dot-pattern);
  box-shadow: 0 6px 24px var(--card-shadow);
}

.weekly-col {
  width: 160px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--weekly-col-border);
  padding: 10px 8px 8px 8px;
  transition: background 0.15s;
}

.weekly-col:last-child {
  border-right: none;
}

.weekly-col.today {
  background: var(--weekly-today-bg);
}

.weekly-col.drag-over {
  background: var(--weekly-drag-over-bg);
}

.weekly-col-header {
  display: flex;
  align-items: baseline;
  gap: 4px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--weekly-col-border);
  margin-bottom: 6px;
  flex-shrink: 0;
}

.weekly-col.today .weekly-col-header {
  border-bottom-color: var(--weekly-today-border);
}

.day-label {
  font-size: 15px;
  font-weight: 600;
  color: var(--card-title);
}

.weekly-col.today .day-label {
  color: var(--weekly-today-border);
}

.day-date {
  font-size: 12px;
  color: var(--todo-done-text);
}

.weekly-todo-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.weekly-todo-list::-webkit-scrollbar {
  width: 2px;
}

.weekly-todo-list::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 2px;
}

.weekly-todo-item {
  cursor: grab;
}

.weekly-todo-item.dragging {
  opacity: 0.4;
}

.weekly-todo-item .todo-text {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.weekly-input-area {
  border-top: 1px solid var(--divider);
  padding-top: 6px;
  margin-top: 4px;
  flex-shrink: 0;
}

.weekly-todo-input {
  width: 100%;
  border: none;
  background: transparent;
  font-size: 13px;
  color: var(--input-text);
  outline: none;
  font-family: inherit;
  -webkit-user-select: text;
  user-select: text;
}

.weekly-todo-input::placeholder {
  color: var(--input-placeholder);
}

/* 헤더 버튼 그룹 */
.header-btns {
  display: flex;
  align-items: center;
  gap: 2px;
  -webkit-app-region: no-drag;
}

#weekly-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--collapse-color);
  font-size: 17px;
  line-height: 1;
  padding: 0 3px;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
}

#weekly-btn:hover {
  color: var(--collapse-hover-color);
  background: var(--collapse-hover-bg);
}

/* Weekly 푸터: 캐릭터 + 접기 버튼 */
#weekly-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-shrink: 0;
  padding: 0 8px 2px 8px;
}

#weekly-char-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

#weekly-char-canvas {
  display: block;
  width: 52px;
  height: 52px;
  filter: drop-shadow(0px 2px 5px var(--char-shadow));
}

#weekly-bubble {
  position: relative;
  background: var(--weekly-bubble-bg);
  border: 1px solid var(--weekly-bubble-border);
  border-radius: 8px;
  padding: 3px 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--bubble-text);
  white-space: nowrap;
  box-shadow: 0 2px 5px var(--bubble-shadow);
}

#weekly-collapse-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--collapse-color);
  font-size: 23px;
  line-height: 1;
  padding: 0 2px;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
  align-self: flex-end;
}

#weekly-collapse-btn:hover {
  color: var(--collapse-hover-color);
  background: var(--collapse-hover-bg);
}
```

- [ ] **Step 4: 앱 실행해서 스타일 에러 없는지 확인**

```bash
npm start
```
Expected: expanded 뷰 헤더에 ☰ 버튼이 적절한 크기로 보임.

- [ ] **Step 5: 커밋**

```bash
git add style.css
git commit -m "feat: weekly 뷰 CSS 레이아웃 추가 (7컬럼, today 하이라이트, 드래그 피드백)"
```

---

## Task 5: renderer.js — 데이터 모델 교체 + 마이그레이션

**Files:**
- Modify: `renderer.js`

- [ ] **Step 1: 상단 상수/변수 추가**

`renderer.js` 상단(Rive 인스턴스 변수 선언 아래, `let todos = []` 위)에 추가:

```js
// ======================================================
// 요일 키 상수
// ======================================================
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_LABELS = { mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일' }

let weeklyTodos = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] }

function todayKey() {
  return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()]
}
```

- [ ] **Step 2: 기존 `let todos = []` 제거**

기존:
```js
let todos = []
```
삭제 (weeklyTodos가 대신함)

- [ ] **Step 3: DOM 참조 추가**

기존 DOM 참조 블록 맨 끝에 추가:

```js
const weeklyView         = document.getElementById('weekly-view')
const weeklyColumns      = document.getElementById('weekly-columns')
const weeklyBubbleText   = document.getElementById('weekly-bubble-text')
const weeklyBtn          = document.getElementById('weekly-btn')
const weeklyCollapseBtn  = document.getElementById('weekly-collapse-btn')
const weeklyCharCanvas   = document.getElementById('weekly-char-canvas')
```

- [ ] **Step 4: `init()` 함수 수정**

기존 `init()` 전체를 아래로 교체:

```js
async function init() {
  collapsedRive = loadRiveCharacter(characterCanvas, {
    stateMachine: 'State Machine 1'
  })
  expandedRive = loadRiveCharacter(headerCharCanvas, {
    stateMachine: 'State Machine 1'
  })
  expandedRive.pause()

  // 주간 데이터 로드
  weeklyTodos = await ipcRenderer.invoke('store:getWeekly')

  // 마이그레이션: 구버전 todos[] → 오늘 요일 키로 이관
  const oldTodos = await ipcRenderer.invoke('store:get')
  const isWeeklyEmpty = Object.values(weeklyTodos).every(arr => arr.length === 0)
  if (oldTodos.length > 0 && isWeeklyEmpty) {
    weeklyTodos[todayKey()] = oldTodos
    saveWeeklyTodos()
    ipcRenderer.invoke('store:set', [])
  }

  render()
  setInterval(playAttentionAnimation, 180 * 1000)
}
```

- [ ] **Step 5: `render()` 수정**

기존 `render()` 전체를 아래로 교체:

```js
function render() {
  const todayTodos = weeklyTodos[todayKey()] || []
  const incompleteCount = todayTodos.filter(t => !t.done).length

  speechText.textContent = incompleteCount === 0 ? '할 일 없음' : `할 일 ${incompleteCount}개`
  badge.textContent = incompleteCount
  badge.classList.toggle('hidden', incompleteCount === 0)

  todoList.innerHTML = ''
  todayTodos.forEach((todo, index) => {
    todoList.appendChild(createTodoElement(todo, index))
  })
}
```

- [ ] **Step 6: 투두 조작 함수 수정**

기존 `addTodo`, `toggleTodo`, `deleteTodo`, `saveTodos` 전체를 아래로 교체:

```js
function addTodo(text) {
  const trimmed = text.trim()
  if (!trimmed) return
  const key = todayKey()
  weeklyTodos[key].push({ id: Date.now(), text: trimmed, done: false })
  saveWeeklyTodos()
  render()
}

function toggleTodo(index) {
  weeklyTodos[todayKey()][index].done = !weeklyTodos[todayKey()][index].done
  saveWeeklyTodos()
  render()
}

function deleteTodo(index) {
  weeklyTodos[todayKey()].splice(index, 1)
  saveWeeklyTodos()
  render()
}

function saveWeeklyTodos() {
  ipcRenderer.invoke('store:setWeekly', weeklyTodos)
}
```

- [ ] **Step 7: 앱 실행해서 기존 기능 정상 동작 확인**

```bash
npm start
```
Expected: collapsed/expanded 상태 정상 동작. 투두 추가/체크/삭제 동작. ☰ 버튼 클릭 시 아직 아무 일 없음 (다음 Task에서 연결).

- [ ] **Step 8: 커밋**

```bash
git add renderer.js
git commit -m "feat: 데이터 모델을 weeklyTodos 요일 키 구조로 교체, 마이그레이션 로직 추가"
```

---

## Task 6: renderer.js — weekly 상태 전환

**Files:**
- Modify: `renderer.js`

- [ ] **Step 1: `isWeekly` 상태 변수 추가**

기존 `let isExpanded = false` 아래에 추가:

```js
let isExpanded = false
let isWeekly = false   // ← 추가
```

- [ ] **Step 2: `expandWeekly()` 함수 추가**

`collapseWidget()` 함수 아래에 추가:

```js
// ======================================================
// 상태 전환: expanded → weekly
// ======================================================
function expandWeekly() {
  isWeekly = true
  expandedView.classList.add('hidden')
  weeklyView.classList.remove('hidden')
  ipcRenderer.send('window:weekly-expand')

  if (expandedRive) expandedRive.pause()

  renderWeekly()
}

function collapseWeekly() {
  isWeekly = false
  weeklyView.classList.add('hidden')
  expandedView.classList.remove('hidden')
  ipcRenderer.send('window:weekly-collapse')

  if (expandedRive) expandedRive.play()

  render()
}
```

- [ ] **Step 3: "이번 주" 버튼 이벤트 연결**

`collapseBtn.addEventListener('click', collapseWidget)` 아래에 추가:

```js
weeklyBtn.addEventListener('click', expandWeekly)
weeklyCollapseBtn.addEventListener('click', collapseWeekly)
```

- [ ] **Step 4: 바깥 클릭 핸들러 업데이트**

기존 바깥 클릭 핸들러를 아래로 교체:

```js
document.addEventListener('mousedown', (e) => {
  if (isWeekly && !e.target.closest('#weekly-view')) {
    collapseWeekly()
    return
  }
  if (isExpanded && !e.target.closest('#card')) {
    collapseWidget()
  }
})
```

- [ ] **Step 5: interactive 영역에 weekly 요소 추가**

기존:
```js
const interactiveEls = [speechBubble, characterCanvas, cardEl, headerCharCanvas.parentElement]
```
아래로 교체:
```js
const interactiveEls = [speechBubble, characterCanvas, cardEl, headerCharCanvas.parentElement, weeklyView]
```

- [ ] **Step 6: 앱 실행해서 상태 전환 확인**

```bash
npm start
```
Expected:
1. 달팽이 클릭 → expanded 열림
2. ☰ 버튼 클릭 → weekly 뷰 열림 (1160px로 창이 왼쪽으로 확장)
3. `−` 버튼 또는 바깥 클릭 → expanded로 복귀
4. 창 위치가 오른쪽 끝 기준으로 유지됨

- [ ] **Step 7: 커밋**

```bash
git add renderer.js
git commit -m "feat: weekly 상태 전환 (expandWeekly/collapseWeekly) 구현"
```

---

## Task 7: renderer.js — weekly 렌더링 + 투두 조작

**Files:**
- Modify: `renderer.js`

- [ ] **Step 1: `getWeekDates()` 헬퍼 함수 추가**

`collapseWeekly()` 함수 아래에 추가:

```js
// ======================================================
// 주간 뷰 렌더링
// ======================================================
function getWeekDates() {
  const today = new Date()
  const dow = today.getDay() // 0=일, 1=월, ...
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))

  const dates = {}
  DAY_KEYS.forEach((key, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    dates[key] = d.getDate()
  })
  return dates
}
```

- [ ] **Step 2: `createWeeklyTodoElement()` 함수 추가**

`getWeekDates()` 아래에 추가:

```js
function createWeeklyTodoElement(todo, dayKey, index) {
  const item = document.createElement('div')
  item.className = 'todo-item weekly-todo-item'
  item.draggable = true
  item.dataset.day = dayKey
  item.dataset.index = String(index)

  const checkbox = document.createElement('div')
  checkbox.className = `todo-checkbox${todo.done ? ' checked' : ''}`
  checkbox.addEventListener('click', () => toggleWeeklyTodo(dayKey, index))

  const text = document.createElement('span')
  text.className = `todo-text${todo.done ? ' done' : ''}`
  text.textContent = todo.text

  const del = document.createElement('span')
  del.className = 'todo-delete'
  del.textContent = '×'
  del.addEventListener('click', () => deleteWeeklyTodo(dayKey, index))

  item.appendChild(checkbox)
  item.appendChild(text)
  item.appendChild(del)

  item.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ day: dayKey, index }))
    item.classList.add('dragging')
    e.stopPropagation()
  })
  item.addEventListener('dragend', () => {
    item.classList.remove('dragging')
  })

  return item
}
```

- [ ] **Step 3: `setupDropZone()` 함수 추가**

`createWeeklyTodoElement()` 아래에 추가:

```js
function setupDropZone(el, dayKey) {
  el.addEventListener('dragover', (e) => {
    e.preventDefault()
    el.classList.add('drag-over')
  })
  el.addEventListener('dragleave', (e) => {
    if (!el.contains(e.relatedTarget)) {
      el.classList.remove('drag-over')
    }
  })
  el.addEventListener('drop', (e) => {
    e.preventDefault()
    el.classList.remove('drag-over')
    const raw = e.dataTransfer.getData('text/plain')
    if (!raw) return
    const { day: fromDay, index: fromIndex } = JSON.parse(raw)
    if (fromDay === dayKey) return
    moveWeeklyTodo(fromDay, fromIndex, dayKey)
  })
}
```

- [ ] **Step 4: `moveWeeklyTodo()` 함수 추가**

`setupDropZone()` 아래에 추가:

```js
function moveWeeklyTodo(fromDay, fromIndex, toDay) {
  const todo = weeklyTodos[fromDay].splice(fromIndex, 1)[0]
  weeklyTodos[toDay].push(todo)
  saveWeeklyTodos()
  renderWeekly()
  render()
}
```

- [ ] **Step 5: `addWeeklyTodo()`, `toggleWeeklyTodo()`, `deleteWeeklyTodo()` 추가**

`moveWeeklyTodo()` 아래에 추가:

```js
function addWeeklyTodo(dayKey, text) {
  const trimmed = text.trim()
  if (!trimmed) return
  weeklyTodos[dayKey].push({ id: Date.now(), text: trimmed, done: false })
  saveWeeklyTodos()
  renderWeekly()
  if (dayKey === todayKey()) render()
}

function toggleWeeklyTodo(dayKey, index) {
  weeklyTodos[dayKey][index].done = !weeklyTodos[dayKey][index].done
  saveWeeklyTodos()
  renderWeekly()
  if (dayKey === todayKey()) render()
}

function deleteWeeklyTodo(dayKey, index) {
  weeklyTodos[dayKey].splice(index, 1)
  saveWeeklyTodos()
  renderWeekly()
  if (dayKey === todayKey()) render()
}
```

- [ ] **Step 6: `renderWeekly()` 함수 추가**

`deleteWeeklyTodo()` 아래에 추가:

```js
function renderWeekly() {
  const weekDates = getWeekDates()
  const tKey = todayKey()
  const todayTodos = weeklyTodos[tKey] || []
  const incompleteCount = todayTodos.filter(t => !t.done).length

  weeklyBubbleText.textContent = incompleteCount === 0 ? '할 일 없음' : `할 일 ${incompleteCount}개`

  weeklyColumns.innerHTML = ''

  DAY_KEYS.forEach(key => {
    const col = document.createElement('div')
    col.className = `weekly-col${key === tKey ? ' today' : ''}`
    col.dataset.day = key

    const header = document.createElement('div')
    header.className = 'weekly-col-header'
    const labelSpan = document.createElement('span')
    labelSpan.className = 'day-label'
    labelSpan.textContent = DAY_LABELS[key]
    const dateSpan = document.createElement('span')
    dateSpan.className = 'day-date'
    dateSpan.textContent = weekDates[key]
    header.appendChild(labelSpan)
    header.appendChild(dateSpan)

    const list = document.createElement('div')
    list.className = 'weekly-todo-list'
    list.dataset.day = key
    setupDropZone(list, key)

    const dayTodos = weeklyTodos[key] || []
    dayTodos.forEach((todo, index) => {
      list.appendChild(createWeeklyTodoElement(todo, key, index))
    })

    const inputWrap = document.createElement('div')
    inputWrap.className = 'weekly-input-area'
    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'weekly-todo-input'
    input.placeholder = '+ 추가'
    input.dataset.day = key
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing) {
        addWeeklyTodo(key, input.value)
        input.value = ''
      }
      if (e.key === 'Escape') collapseWeekly()
    })
    inputWrap.appendChild(input)

    col.appendChild(header)
    col.appendChild(list)
    col.appendChild(inputWrap)
    weeklyColumns.appendChild(col)
  })
}
```

- [ ] **Step 7: 앱 실행해서 weekly 뷰 렌더링 확인**

```bash
npm start
```
Expected:
1. ☰ 클릭 → 7컬럼 플래너 렌더링됨
2. 오늘 칸이 하이라이트됨
3. 각 칸 헤더에 요일 + 날짜 표시 (예: `목 12`)
4. 각 칸 하단 입력창에 타이핑 후 Enter → 투두 추가됨
5. 체크박스 클릭 → 완료 처리됨
6. × 버튼 클릭 → 삭제됨
7. 투두 드래그 → 다른 요일 칸으로 이동됨 (칸에 드래그 오버 시 하이라이트)

- [ ] **Step 8: 커밋**

```bash
git add renderer.js
git commit -m "feat: weekly 뷰 렌더링, 투두 CRUD, 드래그앤드롭 구현"
```

---

## Task 8: renderer.js — weekly Rive 캐릭터

**Files:**
- Modify: `renderer.js`

- [ ] **Step 1: `weeklyRive` 변수 선언 추가**

기존 `let expandedRive = null` 아래에 추가:

```js
let expandedRive = null
let weeklyRive = null    // ← 추가
```

- [ ] **Step 2: `init()` 안에 weekly Rive 로드 추가**

`init()` 내 `expandedRive.pause()` 바로 아래에 추가:

```js
  weeklyRive = loadRiveCharacter(weeklyCharCanvas, {
    stateMachine: 'State Machine 1'
  })
  weeklyRive.pause()  // weekly도 처음엔 숨겨져 있으니 pause
```

- [ ] **Step 3: `expandWeekly()` 에 Rive play 추가**

기존 `expandWeekly()` 내부를 아래로 교체:

```js
function expandWeekly() {
  isWeekly = true
  expandedView.classList.add('hidden')
  weeklyView.classList.remove('hidden')
  ipcRenderer.send('window:weekly-expand')

  if (expandedRive) expandedRive.pause()
  if (weeklyRive) weeklyRive.play()   // ← 추가

  renderWeekly()
}
```

- [ ] **Step 4: `collapseWeekly()` 에 Rive pause 추가**

기존 `collapseWeekly()` 내부를 아래로 교체:

```js
function collapseWeekly() {
  isWeekly = false
  weeklyView.classList.add('hidden')
  expandedView.classList.remove('hidden')
  ipcRenderer.send('window:weekly-collapse')

  if (weeklyRive) weeklyRive.pause()   // ← 추가
  if (expandedRive) expandedRive.play()

  render()
}
```

- [ ] **Step 5: idle 상태 때 weekly Rive도 교체되도록 `switchRiveFile()` 수정**

기존 `switchRiveFile()` 내부를 아래로 교체:

```js
function switchRiveFile(riveFile) {
  if (currentRiveFile === riveFile) return
  currentRiveFile = riveFile

  if (collapsedRive) {
    collapsedRive.cleanup()
    collapsedRive = loadRiveCharacter(characterCanvas, {
      src: riveFile,
      stateMachine: 'State Machine 1'
    })
    if (isExpanded || isWeekly) collapsedRive.pause()
  }

  if (expandedRive) {
    expandedRive.cleanup()
    expandedRive = loadRiveCharacter(headerCharCanvas, {
      src: riveFile,
      stateMachine: 'State Machine 1'
    })
    if (!isExpanded) expandedRive.pause()
  }

  if (weeklyRive) {
    weeklyRive.cleanup()
    weeklyRive = loadRiveCharacter(weeklyCharCanvas, {
      src: riveFile,
      stateMachine: 'State Machine 1'
    })
    if (!isWeekly) weeklyRive.pause()
  }
}
```

- [ ] **Step 6: 앱 실행해서 캐릭터 동작 확인**

```bash
npm start
```
Expected:
1. weekly 뷰 열면 하단 좌측에 캐릭터 애니메이션 재생됨
2. weekly 닫으면 weekly 캐릭터 pause, expanded 캐릭터 재생됨
3. idle 1시간 후 upset 모드 전환 시 weekly 캐릭터도 교체됨

- [ ] **Step 7: 커밋**

```bash
git add renderer.js
git commit -m "feat: weekly 뷰 Rive 캐릭터 연동 (play/pause, idle 교체)"
```

---

## Task 9: 최종 검증

**Files:**
- 없음 (검증만)

- [ ] **Step 1: 전체 플로우 수동 검증**

```bash
npm start
```

아래 시나리오를 순서대로 테스트:

1. **collapsed → expanded → weekly 전환**
   - 달팽이 클릭 → expanded 열림
   - ☰ 클릭 → weekly 열림, 창이 왼쪽으로 확장됨
   - 오른쪽 끝 위치가 expanded와 동일한지 확인

2. **weekly 닫기 방법 2가지**
   - `−` 버튼 클릭 → expanded로 복귀됨
   - 창 바깥 클릭 → expanded로 복귀됨 (collapsed까지 가지 않음)

3. **weekly 투두 CRUD**
   - 월 칸 입력창에 텍스트 입력 후 Enter → 추가됨
   - 추가된 투두 체크박스 클릭 → 취소선 + 흐려짐
   - × 버튼 클릭 → 삭제됨

4. **드래그앤드롭**
   - 한 칸의 투두를 다른 요일 칸으로 드래그
   - 드래그 오버 중 칸 배경 하이라이트 확인
   - 드롭 후 투두가 해당 요일로 이동됨

5. **데이터 유지**
   - weekly에서 투두 추가 후 앱 종료
   - 앱 재실행 → 투두가 그대로 남아있음

6. **오늘 칸 연동**
   - weekly 오늘 칸에 투두 추가 → collapsed 뱃지 숫자 반영됨
   - weekly 닫고 expanded에서 오늘 투두 체크 → weekly 다시 열면 반영됨

- [ ] **Step 2: 최종 커밋**

```bash
git add -A
git commit -m "feat: 누디투두 v2 주간 뷰 완성"
```
