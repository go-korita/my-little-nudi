const { ipcRenderer } = require('electron')

// ======================================================
// Nudi Todo 캐릭터 — Rive 애니메이션
// ======================================================
const RIVE_FILE_DEFAULT = 'assets/nudi-motion.riv'
const RIVE_FILE_UPSET = 'assets/nudi-motion-upset.riv'

// Rive 인스턴스 관리 (나중에 모션 2~3가지로 확장 예정)
let collapsedRive = null  // collapsed 상태 캐릭터
let expandedRive = null   // expanded 상태 캐릭터
let currentRiveFile = RIVE_FILE_DEFAULT  // 현재 적용 중인 .riv 파일

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
let todos = []
let isExpanded = false

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

// ======================================================
// 초기화
// ======================================================
async function init() {
  // Rive 캐릭터 로드 (collapsed + expanded 둘 다 미리 로드)
  collapsedRive = loadRiveCharacter(characterCanvas, {
    stateMachine: 'State Machine 1'
  })
  expandedRive = loadRiveCharacter(headerCharCanvas, {
    stateMachine: 'State Machine 1'
  })
  // expanded는 처음엔 숨겨져 있으니 pause
  expandedRive.pause()

  // 저장된 투두 불러오기
  todos = await ipcRenderer.invoke('store:get')
  render()

  // 15초마다 어텐션 모션
  setInterval(playAttentionAnimation, 180 * 1000)
}

// ======================================================
// 렌더링
// ======================================================
function render() {
  const incompleteCount = todos.filter(t => !t.done).length

  // 말풍선 텍스트
  speechText.textContent = incompleteCount === 0 ? '할 일 없음' : `할 일 ${incompleteCount}개`

  // 뱃지
  badge.textContent = incompleteCount
  badge.classList.toggle('hidden', incompleteCount === 0)

  // 투두 목록
  todoList.innerHTML = ''
  todos.forEach((todo, index) => {
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
  todos.push({ id: Date.now(), text: trimmed, done: false })
  saveTodos()
  render()
}

function toggleTodo(index) {
  todos[index].done = !todos[index].done
  saveTodos()
  render()
}

function deleteTodo(index) {
  todos.splice(index, 1)
  saveTodos()
  render()
}

function saveTodos() {
  ipcRenderer.invoke('store:set', todos)
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

document.addEventListener('mousedown', (e) => {
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
  if (isExpanded) return // expanded 상태엔 모션 안 함

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
const interactiveEls = [speechBubble, characterCanvas, cardEl, headerCharCanvas.parentElement]

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

  // collapsed 캐릭터 교체
  if (collapsedRive) {
    collapsedRive.cleanup()
    collapsedRive = loadRiveCharacter(characterCanvas, {
      src: riveFile,
      stateMachine: 'State Machine 1'
    })
    if (isExpanded) collapsedRive.pause()
  }

  // expanded 캐릭터 교체
  if (expandedRive) {
    expandedRive.cleanup()
    expandedRive = loadRiveCharacter(headerCharCanvas, {
      src: riveFile,
      stateMachine: 'State Machine 1'
    })
    if (!isExpanded) expandedRive.pause()
  }
}

function playUpsetBounce() {
  if (isExpanded) return
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
