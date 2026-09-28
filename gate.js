// Заглушка доступа к стенду: спрашивает пароль до показа страницы.
// Это НЕ защита: код и данные стенда лежат в публичном репозитории и видны в исходнике страницы.
// Цель — чтобы случайный посетитель по ссылке не видел стенд.
// Локально (file:, localhost, 127.0.0.1) заглушка не включается.
// Сменить пароль: python3 -c "import hashlib;print(hashlib.sha256(('pi-constructor:'+'НОВЫЙ-ПАРОЛЬ').encode()).hexdigest())"
// и подставить результат в HASH. Все, кто уже входил, будут спрошены заново.
(function () {
  var HASH = '72a1e91805bea4c0f58a171a25ae33d00b38e1dc63d460ddc29c4a64ccdb9d9e'
  var KEY = 'pi-gate'
  var loc = window.location
  if (loc.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(loc.hostname)) return
  try { if (window.localStorage.getItem(KEY) === HASH) return } catch (e) { /* хранилище недоступно — спросим пароль */ }

  var root = document.documentElement
  root.classList.add('pi-locked')
  var style = document.createElement('style')
  // visibility, а не display: страница под заглушкой раскладывается как обычно, замеры при загрузке не ломаются.
  style.textContent =
    'html.pi-locked body>*:not(#pi-gate){visibility:hidden!important}' +
    '#pi-gate{position:fixed;top:0;right:0;bottom:0;left:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;' +
    'background:#F5F7FB;font:14px/1.4 "IBM Plex Sans",system-ui,sans-serif;color:#141A29}' +
    '#pi-gate form{display:flex;flex-direction:column;gap:10px;width:280px;padding:24px;background:#fff;border:1px solid #DCE1EA;border-radius:8px}' +
    '#pi-gate b{font-size:15px}' +
    '#pi-gate input{height:32px;padding:0 10px;border:1px solid #DCE1EA;border-radius:4px;font:inherit}' +
    '#pi-gate button{height:32px;border:0;border-radius:4px;background:#3A6EA5;color:#fff;font:inherit;cursor:pointer}' +
    '#pi-gate .err{min-height:18px;color:#B42318;font-size:12.5px}'
  document.head.appendChild(style)

  function sha256(text) {
    return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2) }).join('')
    })
  }

  function mount() {
    var gate = document.createElement('div')
    gate.id = 'pi-gate'
    gate.innerHTML =
      '<form autocomplete="on"><b>Стенд закрыт</b>' +
      '<label for="pi-gate-pw">Пароль</label>' +
      '<input id="pi-gate-pw" type="password" autocomplete="current-password" required>' +
      '<button type="submit">Войти</button><div class="err" role="alert"></div></form>'
    document.body.appendChild(gate)
    var form = gate.querySelector('form')
    var input = gate.querySelector('input')
    var err = gate.querySelector('.err')
    // Клавиши в поле пароля не должны доходить до обработчиков стенда (Esc, горячие клавиши).
    form.addEventListener('keydown', function (e) { e.stopPropagation() })
    form.addEventListener('submit', function (e) {
      e.preventDefault()
      sha256('pi-constructor:' + input.value).then(function (h) {
        if (h !== HASH) { err.textContent = 'Неверный пароль'; input.select(); return }
        try { window.localStorage.setItem(KEY, HASH) } catch (x) { /* не запомним — спросим в следующий раз */ }
        gate.remove()
        style.remove()
        root.classList.remove('pi-locked')
      })
    })
    input.focus()
  }

  if (document.body) mount()
  else document.addEventListener('DOMContentLoaded', mount)
})()
