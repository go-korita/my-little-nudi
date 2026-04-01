const { ipcRenderer } = require('electron')

// ======================================================
// 갯민숭달팽이 SVG — 나중에 피그마 애셋으로 교체 예정
// ======================================================
const NUDIBRANCH_SVG = `
<svg width="56" height="52" viewBox="0 0 56 52" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- 더듬이 (rhinophores) -->
  <line x1="15" y1="22" x2="11" y2="10" stroke="#2A2A2A" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="20" y1="19" x2="17" y2="7" stroke="#2A2A2A" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="11" cy="8.5" r="2.8" fill="#2A2A2A"/>
  <circle cx="17" cy="6" r="2.8" fill="#2A2A2A"/>
  <!-- 몸통 -->
  <path d="M 7 36 C 3 28 5 20 14 18 C 21 16 36 16 45 22 C 53 27 53 36 45 41 C 37 45 14 45 7 36 Z"
        fill="#E6E6E6" stroke="#2A2A2A" stroke-width="1.5" stroke-linejoin="round"/>
  <!-- 등 지느러미 (cerata) -->
  <ellipse cx="28" cy="14" rx="4.5" ry="7.5" fill="#CECECE" stroke="#2A2A2A" stroke-width="1.2" transform="rotate(-5 28 14)"/>
  <ellipse cx="37" cy="16" rx="4" ry="7" fill="#CECECE" stroke="#2A2A2A" stroke-width="1.2" transform="rotate(10 37 16)"/>
  <ellipse cx="44" cy="22" rx="3.5" ry="6" fill="#CECECE" stroke="#2A2A2A" stroke-width="1.2" transform="rotate(28 44 22)"/>
  <!-- 눈 -->
  <circle cx="16" cy="30" r="3.8" fill="#2A2A2A"/>
  <circle cx="17.6" cy="28.4" r="1.3" fill="white"/>
  <!-- 입 -->
  <path d="M 11.5 34.5 Q 15.5 38 20 34.5" stroke="#2A2A2A" stroke-width="1.3" fill="none" stroke-linecap="round"/>
</svg>`

// 헤더용 소형 SVG (같은 viewBox, 크기만 줄임)
const NUDIBRANCH_SMALL_SVG = `
<svg width="28" height="26" viewBox="0 0 56 52" fill="none" xmlns="http://www.w3.org/2000/svg">
  <line x1="15" y1="22" x2="11" y2="10" stroke="#2A2A2A" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="20" y1="19" x2="17" y2="7" stroke="#2A2A2A" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="11" cy="8.5" r="2.8" fill="#2A2A2A"/>
  <circle cx="17" cy="6" r="2.8" fill="#2A2A2A"/>
  <path d="M 7 36 C 3 28 5 20 14 18 C 21 16 36 16 45 22 C 53 27 53 36 45 41 C 37 45 14 45 7 36 Z"
        fill="#E6E6E6" stroke="#2A2A2A" stroke-width="1.5" stroke-linejoin="round"/>
  <ellipse cx="28" cy="14" rx="4.5" ry="7.5" fill="#CECECE" stroke="#2A2A2A" stroke-width="1.2" transform="rotate(-5 28 14)"/>
  <ellipse cx="37" cy="16" rx="4" ry="7" fill="#CECECE" stroke="#2A2A2A" stroke-width="1.2" transform="rotate(10 37 16)"/>
  <ellipse cx="44" cy="22" rx="3.5" ry="6" fill="#CECECE" stroke="#2A2A2A" stroke-width="1.2" transform="rotate(28 44 22)"/>
  <circle cx="16" cy="30" r="3.8" fill="#2A2A2A"/>
  <circle cx="17.6" cy="28.4" r="1.3" fill="white"/>
  <path d="M 11.5 34.5 Q 15.5 38 20 34.5" stroke="#2A2A2A" stroke-width="1.3" fill="none" stroke-linecap="round"/>
</svg>`

// ======================================================
// 상태
// ======================================================
let todos = []
let isExpanded = false

// ======================================================
// DOM 참조
// ======================================================
const collapsedView = document.getElementById('collapsed-view')
const expandedView  = document.getElementById('expanded-view')
const speechText    = document.getElementById('speech-text')
const badge         = document.getElementById('badge')
const characterEl   = document.getElementById('character')
const headerCharEl  = document.getElementById('header-char')
const todoList      = document.getElementById('todo-list')
const todoInput     = document.getElementById('todo-input')
const collapseBtn   = document.getElementById('collapse-btn')

// ======================================================
// 초기화
// ======================================================
async function init() {
  // SVG 삽입
  characterEl.innerHTML = NUDIBRANCH_SVG
  headerCharEl.innerHTML = NUDIBRANCH_SMALL_SVG

  // 저장된 투두 불러오기
  todos = await ipcRenderer.invoke('store:get')
  render()

  // 1시간마다 어텐션 모션 (테스트: 5초)
  setInterval(playAttentionAnimation, 5 * 1000)
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
  setTimeout(() => todoInput.focus(), 50)
}

function collapseWidget() {
  isExpanded = false
  expandedView.classList.add('hidden')
  collapsedView.classList.remove('hidden')
  ipcRenderer.send('window:collapse')
}

// ======================================================
// Collapsed 상태 드래그 (클릭과 구분)
// ======================================================
collapsedView.addEventListener('mousedown', (e) => {
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
    if (!hasMoved) expandWidget() // 드래그 아닌 클릭 → 펼치기
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
})

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
  if (e.key === 'Enter') {
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
// 시작
// ======================================================
init()
