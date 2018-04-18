import { getConfigs, subscribeToConfigChanges } from './common/configs.js'
import { fetchAudio } from './common/fetch.js'

const {
  CHearingAidSim,
  EarPairBuffers,
  FloatVector,
  HearingAidSim_Process,
  T_ear,
} = window.Module

const dBs_SPL_for_0_dBs_fs = 100

// Configs
let configs = getConfigs()
subscribeToConfigChanges((name, value, newConfigs) => {
  configs = newConfigs
  console.log({ configs })
  updateFilters()
})

// DOM elements
const $start = document.querySelector('.start')

// Create simulator
const has = new CHearingAidSim()

has.Setup(
  44100, // Sample rate
  3, // Number of levels
  125, // Start frequency
  9, // Number of bands
  1, // Octave band step
  parseFloat(configs['filter.lpf.freq']),
  parseFloat(configs['filter.hpf.freq']),
  parseFloat(configs['filter.lpf.q']),
  0.7, // BPF Q
  parseFloat(configs['filter.hpf.q'])
)

function updateFilters() {
  // Enable/disable
  if (configs.processLeft) {
    has.EnableHearingAidSimulation(T_ear.LEFT)
  } else {
    has.DisableHearingAidSimulation(T_ear.LEFT)
  }
  if (configs.processRight) {
    has.EnableHearingAidSimulation(T_ear.RIGHT)
  } else {
    has.DisableHearingAidSimulation(T_ear.RIGHT)
  }

  // Audiogram
  const audiogram = [
    'audiogram.62',
    'audiogram.125',
    'audiogram.250',
    'audiogram.500',
    'audiogram.1000',
    'audiogram.2000',
    'audiogram.4000',
    'audiogram.8000',
    'audiogram.16000',
  ]
    .map(configKey => configs[configKey])
    .map(loss => parseFloat(loss))
  const audiogramVector = new FloatVector()
  audiogramVector.resize(audiogram.length, 0)
  audiogram.forEach((loss, i) => audiogramVector.set(i, loss))

  has.SetDynamicEqualizerUsingFig6(T_ear.BOTH, audiogramVector, dBs_SPL_for_0_dBs_fs)

  // LPF and HPF
  has.SetLowPassFilter(parseFloat(configs['filter.lpf.freq']), parseFloat(configs['filter.lpf.q']))
  has.SetHighPassFilter(parseFloat(configs['filter.hpf.freq']), parseFloat(configs['filter.hpf.q']))
}

updateFilters()

// Audio context
const ctx = new AudioContext()

// Go
fetchAudio('/assets/audio/stranger-things.wav', ctx).then(audioBuffer => {
  const sourceNode = ctx.createBufferSource()
  sourceNode.buffer = audioBuffer
  sourceNode.loop = true

  const inputBuffers = new EarPairBuffers()
  inputBuffers.Resize(512, 0)
  const outputBuffers = new EarPairBuffers()
  outputBuffers.Resize(512, 0)

  const scriptNode = ctx.createScriptProcessor(512, 2, 2)
  scriptNode.onaudioprocess = (audioProcessingEvent) => {
    const { inputBuffer, outputBuffer } = audioProcessingEvent

    for (let i = 0; i < inputBuffer.getChannelData(0).length; i++) {
      inputBuffers.Set(T_ear.LEFT, i, inputBuffer.getChannelData(0)[i])
      inputBuffers.Set(T_ear.RIGHT, i, inputBuffer.getChannelData(1)[i])
    }

    HearingAidSim_Process(has, inputBuffers, outputBuffers)

    for (let i = 0; i < outputBuffer.getChannelData(0).length; i++) {
      outputBuffer.getChannelData(0)[i] = outputBuffers.Get(T_ear.LEFT, i)
      outputBuffer.getChannelData(1)[i] = outputBuffers.Get(T_ear.RIGHT, i)
    }
  }

  const volume = ctx.createGain()
  volume.gain.value = 0.1

  sourceNode.connect(scriptNode)
  scriptNode.connect(volume)
  volume.connect(ctx.destination)

  $start.addEventListener('click', () => {
    sourceNode.start(0)
    $start.setAttribute('disabled', true)
    $start.innerHTML = 'Playing...'
  })
})
