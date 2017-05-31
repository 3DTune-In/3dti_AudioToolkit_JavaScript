import logCppErrors from './common/logger.js'
import { getConfigs, subscribeToConfigChanges } from './common/configs.js'
import { fetchAudio } from './common/fetch.js'

const { CHearingAidSim, CStereoBuffer } = window.Module

// Setup logger
logCppErrors()

// Configs
let configs = getConfigs()
subscribeToConfigChanges((name, value, newConfigs) => {
  configs = newConfigs
  updateFilters()
})

// DOM elements
const $start = document.querySelector('.start')

// Create simulator
const has = new CHearingAidSim()

has.Setup(
  44100,
  1, // TODO: Implement multiple levels
  125,
  7,
  1,
  parseFloat(configs['filter.lpf.freq']),
  parseFloat(configs['filter.hpf.freq']),
  parseFloat(configs['filter.lpf.q']),
  0.7,
  parseFloat(configs['filter.hpf.q'])
)

has.addNoiseBefore = true
has.addNoiseAfter = true
has.noiseNumBits = 8

function updateFilters() {
  has.SetLevelBandGain_dB(0, 0, parseFloat(configs['filter.left.125']), true)
  has.SetLevelBandGain_dB(0, 1, parseFloat(configs['filter.left.250']), true)
  has.SetLevelBandGain_dB(0, 2, parseFloat(configs['filter.left.500']), true)
  has.SetLevelBandGain_dB(0, 3, parseFloat(configs['filter.left.1000']), true)
  has.SetLevelBandGain_dB(0, 4, parseFloat(configs['filter.left.2000']), true)
  has.SetLevelBandGain_dB(0, 5, parseFloat(configs['filter.left.4000']), true)
  has.SetLevelBandGain_dB(0, 6, parseFloat(configs['filter.left.8000']), true)

  has.SetLevelBandGain_dB(0, 0, parseFloat(configs['filter.right.125']), false)
  has.SetLevelBandGain_dB(0, 1, parseFloat(configs['filter.right.250']), false)
  has.SetLevelBandGain_dB(0, 2, parseFloat(configs['filter.right.500']), false)
  has.SetLevelBandGain_dB(0, 3, parseFloat(configs['filter.right.1000']), false)
  has.SetLevelBandGain_dB(0, 4, parseFloat(configs['filter.right.2000']), false)
  has.SetLevelBandGain_dB(0, 5, parseFloat(configs['filter.right.4000']), false)
  has.SetLevelBandGain_dB(0, 6, parseFloat(configs['filter.right.8000']), false)

  has.ConfigLPF(parseFloat(configs['filter.lpf.freq']), parseFloat(configs['filter.lpf.q']))
  has.ConfigHPF(parseFloat(configs['filter.hpf.freq']), parseFloat(configs['filter.hpf.q']))
}

updateFilters()

// Audio context
const ctx = new AudioContext()

// Go
fetchAudio('/assets/audio/stranger-things.wav', ctx).then(audioBuffer => {
  const sourceNode = ctx.createBufferSource()
  sourceNode.buffer = audioBuffer
  sourceNode.loop = true

  const inputStereoBuffer = new CStereoBuffer()
  const outputStereoBuffer = new CStereoBuffer()
  inputStereoBuffer.resize(1024, 0)
  outputStereoBuffer.resize(1024, 0)

  const scriptNode = ctx.createScriptProcessor(512, 2, 2)
  scriptNode.onaudioprocess = (audioProcessingEvent) => {
    const { inputBuffer, outputBuffer } = audioProcessingEvent

    const inputDataL = inputBuffer.getChannelData(0)
    const inputDataR = inputBuffer.getChannelData(1)

    for (let i = 0; i < inputDataL.length; i++) {
      inputStereoBuffer.set((i * 2), inputDataL[i])
      inputStereoBuffer.set((i * 2) + 1, inputDataR[i])
    }

    has.Process(inputStereoBuffer, outputStereoBuffer, configs.processLeft, configs.processRight)

    if (configs['directionality.enabled']) {
      has.ProcessDirectionality(outputStereoBuffer, parseFloat(configs['directionality.angle']))
    }

    const outputDataLeft = outputBuffer.getChannelData(0)
    const outputDataRight = outputBuffer.getChannelData(1)

    for (let i = 0; i < outputDataLeft.length; i++) {
      outputDataLeft[i] = outputStereoBuffer.get((i * 2))
      outputDataRight[i] = outputStereoBuffer.get((i * 2) + 1)
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
