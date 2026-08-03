export default (x) => {

  let interval

  const btn = document.createElement('div')
  btn.className = 'btn btn-xs'
  btn.innerHTML = 'stop'
  btn.onclick = () => {
    if (btn.innerHTML === 'start') {
      startInterval()
      btn.innerHTML = 'stop'
      return
    }
    clearInterval(interval)
    btn.innerHTML = 'start'
  }
  x.append(btn)

  const list = document.createElement('div')
  x.append(list)

  const startInterval = () => {
    interval = setInterval(() => {
      const i = document.createElement('div')
      i.innerHTML = `x: ${new Date().toLocaleTimeString()}`

      list.children.length > 10 && list.removeChild(list.firstChild)
      list.append(i)
    }, 1000)
  }

  const stopInterval = () => {
    clearInterval(interval)
  }

  startInterval()
}
