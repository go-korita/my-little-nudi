const { ipcRenderer } = require('electron')

let selectedId = null

const cards = document.querySelectorAll('.char-card')
const startBtn = document.getElementById('start-btn')

cards.forEach(card => {
  card.addEventListener('click', () => {
    cards.forEach(c => c.classList.remove('selected'))
    card.classList.add('selected')
    selectedId = card.dataset.id
    startBtn.disabled = false
    document.documentElement.dataset.theme = selectedId
  })
})

startBtn.addEventListener('click', () => {
  if (!selectedId) return
  ipcRenderer.send('onboarding:complete', selectedId)
})

document.getElementById('close-btn').addEventListener('click', () => {
  ipcRenderer.send('onboarding:close')
})
