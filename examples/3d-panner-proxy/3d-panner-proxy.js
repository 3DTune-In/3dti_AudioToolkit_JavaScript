import { fetchHrirsVector } from '../../src/binaural/hrir.js'
import withBinauralListener from '../../src/binaural/proxy.js'
import { fetchAudio } from '../fetch.js'
import { getConfigs, subscribeToConfigChanges } from '../configs.js'

import hrirUrls from './hrir-urls.js'

let configs = getConfigs()
subscribeToConfigChanges((configName, newValue, newConfigs) => {
  configs = newConfigs
})

const ctx = new AudioContext()

const $start = document.querySelector('.start')
$start.addEventListener('click', function() {
  start()
  $start.setAttribute('disabled', true)
})

function start() {
  Promise.all([
    fetchHrirsVector(hrirUrls, ctx),
    fetchAudio('/assets/hermans-jultal.wav', ctx),
  ]).then(([hrirs, audioBuffer]) => {
    const proxiedCtx = withBinauralListener(ctx, hrirs)

    const oscillator = proxiedCtx.createOscillator()
    oscillator.frequency.value = 440

    const sourceNode = proxiedCtx.createBufferSource()
    sourceNode.buffer = audioBuffer
    sourceNode.loop = true

    const panner = proxiedCtx.createPanner()
    panner.positionX.value = configs.x
    panner.positionY.value = configs.y
    panner.positionZ.value = configs.z

    const volume = proxiedCtx.createGain()
    volume.gain.gain = 0.3

    oscillator.connect(panner)
    panner.connect(volume)
    volume.connect(proxiedCtx.destination)

    oscillator.start()
  })
  .catch(err => {
    console.error(err)
    console.log(err.stack)
  })
}
