export function fetchAudio(url, ctx) {
  return new Promise(resolve => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', url, true)
    xhr.responseType = 'arraybuffer'
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        ctx.decodeAudioData(xhr.response).then(audioBuffer => {
          resolve(audioBuffer)
        })
      }
    }
    xhr.send()
  })
}
