import { fetchHrirsVector } from '../../src/binaural/hrir.js'
import withBinauralListener from '../../src/binaural/proxy.js'

import hrirUrls from './hrir-urls.js'

const ctx = new AudioContext()

fetchHrirsVector(hrirUrls, ctx).then(hrirs => {
  const proxiedCtx = withBinauralListener(ctx, hrirs)

  console.log(proxiedCtx.listener)
  console.log(proxiedCtx.createPanner)

  window.proxiedCtx = proxiedCtx

  const oscillator = proxiedCtx.createOscillator()
  oscillator.frequency.value = 440
  const gain = proxiedCtx.createGain()

  const panner = proxiedCtx.createPanner()
  panner.positionX.value = -30
  panner.positionZ.value = -20

  window.addEventListener('mousemove', evt => {
    const x = evt.pageX - (window.innerWidth / 2)
    const pannerX = (x / (window.innerWidth / 2)) * 100
    panner.positionX.value = pannerX
  })

  const volume = proxiedCtx.createGain()
  volume.gain.gain = 0.3

  oscillator.connect(panner)
  panner.connect(volume)
  volume.connect(proxiedCtx.destination)

  oscillator.start()

  window.addEventListener('click', () => panner.isRunning = !panner.isRunning)
})
.catch(err => {
  console.error(err)
  console.log(err.stack)
})
