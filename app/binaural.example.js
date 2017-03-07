// import aframe from 'aframe'

import { fetchHrirsVector } from './src/binaural/hrir.js'
import withBinauralListener from './src/binaural/proxy.js'
import { fetchAudio } from './common/fetch.js'
import { getConfigs, subscribeToConfigChanges } from './common/configs.js'

import hrirUrls from './binaural-hrir-urls.js'

const { Vector3 } = window.AFRAME.THREE

const X = new Vector3(1, 0, 0)
const Y = new Vector3(0, 1, 0)
const Z = new Vector3(0, 0, 1)

let configs = getConfigs()

const ctx = new AudioContext()

const $start = document.querySelector('.start')
const $box = document.querySelector('.box')
const $look = document.querySelector('.look')

$start.removeAttribute('disabled')
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

  return position
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

    proxiedCtx.listener.positionY.value = 1.6

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

      // panner.positionX.value = ensureDistance(parseFloat(configs.x))
      panner.positionY.value = ensureDistance(parseFloat(configs.y))
      panner.positionZ.value = ensureDistance(parseFloat(configs.z))
    })

    function updateX() {
      panner.positionX.value = 5 * Math.sin(proxiedCtx.currentTime)
      window.requestAnimationFrame(updateX)
    }

    function update3d() {
      const newBoxPosition = {
        x: panner.positionX.value,
        y: panner.positionY.value,
        z: panner.positionZ.value,
      }
      $box.setAttribute('position', newBoxPosition)
      $box.setAttribute('rotation', `0 45 ${proxiedCtx.currentTime}`)
      window.requestAnimationFrame(update3d)
    }

    updateX()
    update3d()

    setupLookControlsUpdates(proxiedCtx.listener)
  })
  .catch(err => {
    console.error(err)
    console.log(err.stack)
  })
}

function updateListenerFromLookControls(listener, { x, y, z }) {
  console.log('updateListenerFromLookControls', x, y, z)
  const rotation = new Vector3(
    x * Math.PI / 180,
    y * Math.PI / 180,
    z * Math.PI / 180,
  )
  // console.log(rotation)

  const forward = new Vector3(0, 0, -1)
  forward.applyAxisAngle(X, rotation.x)
  forward.applyAxisAngle(Y, rotation.y)
  forward.applyAxisAngle(Z, rotation.z)
  console.log(forward.x, forward.y, forward.z)

  const up = new Vector3(0, 1, 0)
  up.applyAxisAngle(X, rotation.x)
  up.applyAxisAngle(Y, rotation.y)
  up.applyAxisAngle(Z, rotation.z)
  // console.log(up.x, up.y, up.z)

  listener.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z)
}

function setupLookControlsUpdates(listener) {
  $look.addEventListener('componentchanged', evt => {
    const { name, newData } = evt.detail

    if (name === 'rotation') {
      console.log(evt.detail)
      updateListenerFromLookControls(listener, newData)
    }
  })
}
