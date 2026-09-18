import '../stylesheets/application.scss'

// Bulma ships no JavaScript, so the responsive navbar toggle is wired up manually.
function initNavbarBurgers () {
  const burgers = document.querySelectorAll('.navbar-burger')

  burgers.forEach((burger) => {
    burger.addEventListener('click', () => {
      const target = document.getElementById(burger.dataset.target)

      if (!target) {
        return
      }

      burger.classList.toggle('is-active')
      target.classList.toggle('is-active')
    })
  })
}

initNavbarBurgers()
