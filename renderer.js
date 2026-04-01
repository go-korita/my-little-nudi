const { ipcRenderer } = require('electron')

// ======================================================
// 갯민숭달팽이 캐릭터 — assets/nudi.svg 사용
// ======================================================
const NUDIBRANCH_SVG = `<img src="assets/nudi.svg" width="73" draggable="false">`
const NUDIBRANCH_SMALL_SVG = `<img src="assets/nudi.svg" width="48" draggable="false">`

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
const cardEl        = document.getElementById('card')

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

  // 카드 등장 애니메이션
  cardEl.classList.remove('appearing')
  void cardEl.offsetWidth
  cardEl.classList.add('appearing')
  setTimeout(() => cardEl.classList.remove('appearing'), 350)

  // 캐릭터 스프링 등장
  headerCharEl.classList.remove('char-appearing')
  void headerCharEl.offsetWidth
  headerCharEl.classList.add('char-appearing')
  setTimeout(() => headerCharEl.classList.remove('char-appearing'), 450)

  setTimeout(() => todoInput.focus(), 50)
}

let isCollapsing = false

function collapseWidget() {
  if (!isExpanded || isCollapsing) return
  isCollapsing = true

  // 카드 퇴장 애니메이션 재생 후 숨기기
  cardEl.classList.add('disappearing')
  headerCharEl.classList.add('char-disappearing')
  setTimeout(() => {
    isExpanded = false
    isCollapsing = false
    expandedView.classList.add('hidden')
    collapsedView.classList.remove('hidden')
    ipcRenderer.send('window:collapse')
    cardEl.classList.remove('disappearing')
    headerCharEl.classList.remove('char-disappearing')
  }, 200)
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
