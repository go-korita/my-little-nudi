const { ipcRenderer } = require('electron')

// ======================================================
// Nudi Todo 캐릭터 — Rive 애니메이션
// ======================================================
const RIVE_FILE_DEFAULT = 'assets/nudi-motion.riv'
const RIVE_FILE_UPSET = 'assets/nudi-motion-upset.riv'

// Rive 인스턴스 관리 (나중에 모션 2~3가지로 확장 예정)
let collapsedRive = null  // collapsed 상태 캐릭터
let expandedRive = null   // expanded 상태 캐릭터
let weeklyRive = null     // weekly 상태 캐릭터
let currentRiveFile = RIVE_FILE_DEFAULT  // 현재 적용 중인 .riv 파일

// ======================================================
// 요일 키 상수
// ======================================================
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_LABELS = { mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일' }

let weeklyTodos = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] }

function todayKey() {
  return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()]
}

// ======================================================
// Idle 감지 — 오래 안 누르면 upset 모션으로 교체
// ======================================================
const IDLE_TIMEOUT = 60 * 60 * 1000  // 1시간
let idleTimer = null
let upsetBounceInterval = null
let isIdle = false

/**
 * Rive 캐릭터를 캔버스에 로드
 * @param {HTMLCanvasElement} canvas - 렌더링할 캔버스
 * @param {object} options - { stateMachine, animation } 등 나중에 모션 분기용
 * @returns {rive.Rive} Rive 인스턴스
 */
function loadRiveCharacter(canvas, options = {}) {
  const config = {
    src: options.src || currentRiveFile,
    canvas: canvas,
    autoplay: true,
    fit: rive.Fit.Contain,
    alignment: rive.Alignment.Center,
  }

  // 스테이트 머신이 있으면 스테이트 머신으로, 없으면 기본 재생
  if (options.stateMachine) {
    config.stateMachines = options.stateMachine
  }

  return new rive.Rive(config)
}

// ======================================================
// 상태
// ======================================================
let isExpanded = false
let isWeekly = false

// ======================================================
// DOM 참조
// ======================================================
const collapsedView      = document.getElementById('collapsed-view')
const expandedView       = document.getElementById('expanded-view')
const speechBubble       = document.getElementById('speech-bubble')
const speechText         = document.getElementById('speech-text')
const badge              = document.getElementById('badge')
const characterCanvas    = document.getElementById('character-canvas')
const headerCharCanvas   = document.getElementById('header-char-canvas')
const todoList           = document.getElementById('todo-list')
const todoInput          = document.getElementById('todo-input')
const collapseBtn        = document.getElementById('collapse-btn')
const cardEl             = document.getElementById('card')
const weeklyView         = document.getElementById('weekly-view')
const weeklyColumns      = document.getElementById('weekly-columns')
const weeklyBtn          = document.getElementById('weekly-btn')
const weeklyCharCanvas   = document.getElementById('weekly-char-canvas')

// ======================================================
// 초기화
// ======================================================
async function init() {
  collapsedRive = loadRiveCharacter(characterCanvas, {
    stateMachine: 'State Machine 1'
  })
  expandedRive = loadRiveCharacter(headerCharCanvas, {
    stateMachine: 'State Machine 1'
  })
  expandedRive.pause()

  weeklyRive = loadRiveCharacter(weeklyCharCanvas, {
    stateMachine: 'State Machine 1'
  })
  weeklyRive.pause()

  // 주간 데이터 로드
  weeklyTodos = await ipcRenderer.invoke('store:getWeekly')
  const DEFAULT = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] }
  weeklyTodos = { ...DEFAULT, ...weeklyTodos }

  // 마이그레이션: 구버전 todos[] → 오늘 요일 키로 이관
  const oldTodos = await ipcRenderer.invoke('store:get')
  const isWeeklyEmpty = Object.values(weeklyTodos).every(arr => arr.length === 0)
  if (oldTodos.length > 0 && isWeeklyEmpty) {
    weeklyTodos[todayKey()] = oldTodos
    saveWeeklyTodos()
    await ipcRenderer.invoke('store:set', [])
  }

  render()
  setInterval(playAttentionAnimation, 180 * 1000)
}

// ======================================================
// 렌더링
// ======================================================
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

function createTodoElement(todo, index) {
  const item = document.createElement('div')
  item.className = 'todo-item'

  const checkbox = document.createElement('div')
  checkbox.className = `todo-checkbox${todo.done ? ' checked' : ''}`
  checkbox.addEventListener('click', () => toggleTodo(index))

  const text = document.createElement('span')
  text.className = `todo-text${todo.done ? ' done' : ''}`
  text.textContent = todo.text

  const del = document.createElement('span')
  del.className = 'todo-delete'
  del.textContent = '×'
  del.title = '삭제'
  del.addEventListener('click', () => deleteTodo(index))

  item.appendChild(checkbox)
  item.appendChild(text)
  item.appendChild(del)
  return item
}

// ======================================================
// 투두 조작
// ======================================================
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

// ======================================================
// 상태 전환: collapsed ↔ expanded
// ======================================================
function expandWidget() {
  isExpanded = true
  collapsedView.classList.add('hidden')
  expandedView.classList.remove('hidden')
  ipcRenderer.send('window:expand')

  // Rive 전환
  if (collapsedRive) collapsedRive.pause()
  if (expandedRive) expandedRive.play()

  // 카드 등장 애니메이션
  cardEl.classList.remove('appearing')
  void cardEl.offsetWidth
  cardEl.classList.add('appearing')
  setTimeout(() => cardEl.classList.remove('appearing'), 350)

  // 캐릭터 스프링 등장
  const headerCharWrap = headerCharCanvas.parentElement
  headerCharWrap.classList.remove('char-appearing')
  void headerCharWrap.offsetWidth
  headerCharWrap.classList.add('char-appearing')
  setTimeout(() => headerCharWrap.classList.remove('char-appearing'), 450)

  setTimeout(() => todoInput.focus(), 50)
}

let isCollapsing = false

function collapseWidget() {
  if (!isExpanded || isCollapsing) return
  isCollapsing = true

  // 카드 퇴장 애니메이션
  cardEl.classList.add('disappearing')
  headerCharCanvas.parentElement.classList.add('char-disappearing')

  setTimeout(() => {
    isExpanded = false
    isCollapsing = false
    expandedView.classList.add('hidden')
    collapsedView.classList.remove('hidden')
    ipcRenderer.send('window:collapse')
    cardEl.classList.remove('disappearing')
    headerCharCanvas.parentElement.classList.remove('char-disappearing')

    // Rive 전환
    if (expandedRive) expandedRive.pause()
    if (collapsedRive) collapsedRive.play()
  }, 200)
}

// ======================================================
// 상태 전환: expanded → weekly
// ======================================================
function expandWeekly() {
  isWeekly = true
  expandedView.classList.add('hidden')
  weeklyView.classList.remove('hidden')
  ipcRenderer.send('window:weekly-expand')
  ipcRenderer.send('mouse:enter-interactive')

  if (expandedRive) expandedRive.pause()
  if (weeklyRive) weeklyRive.play()

  renderWeekly()
}

function collapseWeekly() {
  isWeekly = false
  isExpanded = true
  weeklyView.classList.add('hidden')
  expandedView.classList.remove('hidden')
  ipcRenderer.send('window:weekly-collapse')
  ipcRenderer.send('mouse:enter-interactive')

  if (weeklyRive) weeklyRive.pause()
  if (expandedRive) expandedRive.play()

  render()
}

// weekly → collapsed 직행 (캐릭터 탭 시)
function collapseWeeklyToCollapsed() {
  isWeekly = false
  isExpanded = false
  weeklyView.classList.add('hidden')
  collapsedView.classList.remove('hidden')
  // weekly 창 크기 → collapsed 창 크기로 직접 전환
  ipcRenderer.send('window:weekly-to-collapsed')
  ipcRenderer.send('mouse:leave-interactive')

  if (weeklyRive) weeklyRive.pause()
  if (collapsedRive) collapsedRive.play()

  render()
}

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
  del.title = '삭제'
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

function moveWeeklyTodo(fromDay, fromIndex, toDay) {
  const todo = weeklyTodos[fromDay].splice(fromIndex, 1)[0]
  weeklyTodos[toDay].push(todo)
  saveWeeklyTodos()
  renderWeekly()
  const today = todayKey()
  if (fromDay === today || toDay === today) render()
}

function addWeeklyTodo(dayKey, text) {
  const trimmed = text.trim()
  if (!trimmed) return
  weeklyTodos[dayKey].push({ id: Date.now(), text: trimmed, done: false })
  saveWeeklyTodos()
  renderWeekly()
  if (dayKey === todayKey()) render()
  const input = weeklyColumns.querySelector(`.weekly-todo-input[data-day="${dayKey}"]`)
  if (input) input.focus()
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

function renderWeekly() {
  const weekDates = getWeekDates()
  const tKey = todayKey()

  weeklyColumns.innerHTML = ''

  DAY_KEYS.forEach((key, idx) => {
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

    // 일요일 칼럼: 헤더 우측에 접기(−) 버튼 삽입
    if (key === 'sun') {
      const btn = document.createElement('button')
      btn.className = 'weekly-col-collapse-btn'
      btn.title = '접기'
      btn.textContent = '−'
      btn.addEventListener('click', collapseWeekly)
      header.appendChild(btn)
    }

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

    // 오늘 칼럼 아래에 캐릭터 절대 위치 설정 (카드 밖 #weekly-char-row 기준)
    if (key === tKey) {
      // view padding: 10px, 각 칼럼 160px
      // char-row는 view padding 안에 있으므로 columns와 같은 기준
      const colW = 160
      const canvasW = 48
      const leftOffset = idx * colW + (colW - canvasW) / 2
      weeklyCharCanvas.style.left = `${leftOffset}px`
    }
  })
}

// ======================================================
// Collapsed 상태 드래그 (클릭과 구분)
// 캐릭터 캔버스 + 말풍선만 터치 영역
// ======================================================
function setupDragAndClick(el) {
  el.addEventListener('mousedown', (e) => {
    const startX = e.screenX
    const startY = e.screenY
    let hasMoved = false

    ipcRenderer.send('drag:start', { mouseX: startX, mouseY: startY })

    function onMouseMove(e) {
      if (Math.abs(e.screenX - startX) > 4 || Math.abs(e.screenY - startY) > 4) {
        hasMoved = true
        ipcRenderer.send('drag:move', { mouseX: e.screenX, mouseY: e.screenY })
      }
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      if (!hasMoved) expandWidget()
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  })
}

setupDragAndClick(characterCanvas)
setupDragAndClick(speechBubble)

// ======================================================
// 접기 버튼 + 바깥 클릭 → collapse
// ======================================================
collapseBtn.addEventListener('click', collapseWidget)
weeklyBtn.addEventListener('click', expandWeekly)

// 위클리 캐릭터 클릭 → collapsed 상태로 완전히 접기
weeklyCharCanvas.addEventListener('mousedown', (e) => {
  e.stopPropagation()
  if (isWeekly) collapseWeeklyToCollapsed()
})

// 위클리 헤더 드래그: CSS -webkit-app-region: drag 로 처리 (JS 불필요)

document.addEventListener('mousedown', (e) => {
  if (isWeekly) {
    if (!e.target.closest('#weekly-view')) collapseWeekly()
    return
  }
  if (isExpanded && !e.target.closest('#card')) {
    collapseWidget()
  }
})

// ======================================================
// 입력창 이벤트
// ======================================================
todoInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.isComposing) {
    addTodo(todoInput.value)
    todoInput.value = ''
  }
  if (e.key === 'Escape') {
    collapseWidget()
  }
})

// ======================================================
// 1시간 어텐션 모션
// ======================================================
function playAttentionAnimation() {
  if (isExpanded || isWeekly) return // expanded 또는 weekly 상태엔 모션 안 함

  collapsedView.classList.add('attention-bounce')
  badge.classList.add('badge-flashing')

  // 애니메이션 끝나면 클래스 제거 (다음에 다시 재생되도록)
  setTimeout(() => {
    collapsedView.classList.remove('attention-bounce')
    badge.classList.remove('badge-flashing')
  }, 2500)
}

// ======================================================
// 클릭 통과: 보이는 요소 위에서만 클릭 가능
// ======================================================
const interactiveEls = [speechBubble, characterCanvas, cardEl, headerCharCanvas.parentElement, weeklyView]

interactiveEls.forEach(el => {
  el.addEventListener('mouseenter', () => {
    ipcRenderer.send('mouse:enter-interactive')
  })
  el.addEventListener('mouseleave', () => {
    ipcRenderer.send('mouse:leave-interactive')
  })
})

// ======================================================
// Idle 감지 — .riv 파일 교체
// ======================================================
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
    if (!isExpanded || isWeekly) expandedRive.pause()
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

function playUpsetBounce() {
  if (isExpanded || isWeekly) return
  collapsedView.classList.remove('upset-bounce')
  void collapsedView.offsetWidth  // 애니메이션 리셋용
  collapsedView.classList.add('upset-bounce')
}

function goIdle() {
  if (isIdle) return
  isIdle = true
  switchRiveFile(RIVE_FILE_UPSET)
  playUpsetBounce()
  upsetBounceInterval = setInterval(playUpsetBounce, 15 * 1000)  // 15초마다 1회
}

function resetIdleTimer() {
  if (isIdle) {
    isIdle = false
    switchRiveFile(RIVE_FILE_DEFAULT)
    collapsedView.classList.remove('upset-bounce')
    clearInterval(upsetBounceInterval)
  }
  clearTimeout(idleTimer)
  idleTimer = setTimeout(goIdle, IDLE_TIMEOUT)
}

// 사용자 상호작용 감지 → idle 타이머 리셋
document.addEventListener('click', resetIdleTimer)
document.addEventListener('keydown', resetIdleTimer)

// 최초 타이머 시작
resetIdleTimer()

// ======================================================
// 시작
// ======================================================
init()
