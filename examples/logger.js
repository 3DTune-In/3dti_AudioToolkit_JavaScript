const { Logger } = window.Module

let lastResultMessage = ''
let lastErrorMessage = ''

function logIfChanged() {
  const resultMessage = Logger.GetLastErrorMessage()
  if (resultMessage !== lastResultMessage) {
    console.log(resultMessage)
    lastResultMessage = resultMessage
  }

  const errorMessage = Logger.GetLastErrorMessage()
  if (errorMessage !== lastErrorMessage) {
    console.warn(errorMessage)
    lastErrorMessage = errorMessage
  }

  window.requestAnimationFrame(logIfChanged)
}

export default logIfChanged
