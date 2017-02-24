import { fetchHrirsVector } from './src/binaural/hrir.js'
import withBinauralListener from './src/binaural/proxy.js'
import { fetchAudio } from './common/fetch.js'
import { getConfigs, subscribeToConfigChanges } from './common/configs.js'

import hrirUrls from './binaural-hrir-urls.js'

let configs = getConfigs()

const ctx = new AudioContext()

const $start = document.querySelector('.start')
$start.addEventListener('click', function() {
  start()
  $start.setAttribute('disabled', true)
  $start.innerHTML = 'Loading...'
})

function ensureDistance(position, minDistance = 1) {
  if (position > 0 && position < minDistance) {
    return minDistance
  }
  else if (position < 0 && position > minDistance) {
    return -minDistance
  }
  else {
    return position
  }
}

function start() {
  Promise.all([
    fetchHrirsVector(hrirUrls, ctx),
    fetchAudio('/assets/audio/hermans-jultal.wav', ctx),
  ]).then(([hrirs, audioBuffer]) => {
    const proxiedCtx = withBinauralListener(ctx, hrirs)

    const oscillator = proxiedCtx.createOscillator()
    oscillator.frequency.value = 440

    const sourceNode = proxiedCtx.createBufferSource()
    sourceNode.buffer = audioBuffer
    sourceNode.loop = true

    const panner = proxiedCtx.createPanner()
    panner.positionX.value = parseFloat(configs.x)
    panner.positionY.value = parseFloat(configs.y)
    panner.positionZ.value = parseFloat(configs.z)

    const volume = proxiedCtx.createGain()
    volume.gain.gain = 0.3

    // oscillator.connect(panner)
    sourceNode.connect(panner)
    panner.connect(volume)
    volume.connect(proxiedCtx.destination)

    // oscillator.start()
    sourceNode.start()

    $start.innerHTML = 'Playing...'

    // Update position params when the user changes them
    subscribeToConfigChanges((configName, newValue, newConfigs) => {
      configs = newConfigs

      panner.positionX.value = ensureDistance(parseFloat(configs.x))
      panner.positionY.value = ensureDistance(parseFloat(configs.y))
      panner.positionZ.value = ensureDistance(parseFloat(configs.z))
    })
  })
  .catch(err => {
    console.error(err)
    console.log(err.stack)
  })
}
