import logCppErrors from './common/logger.js'
import { getConfigs, subscribeToConfigChanges } from './common/configs.js'
import { fetchAudio } from './common/fetch.js'

const { CHearingLossSim, CStereoBuffer, CCompressor } = window.Module

// Setup logger
logCppErrors()

// Configs
let configs = getConfigs()
subscribeToConfigChanges((name, value, newConfigs) => {
  configs = newConfigs
  console.log(newConfigs)

  updateFilters()
  updateCompressors()
})

// Hearing Loss Simulator
const hls = new CHearingLossSim()
hls.Setup(125, 7, 1, 0.7)

function updateFilters() {
  hls.SetBandGain_dB(0, parseFloat(configs['filter.left.125']), true)
  hls.SetBandGain_dB(1, parseFloat(configs['filter.left.250']), true)
  hls.SetBandGain_dB(2, parseFloat(configs['filter.left.500']), true)
  hls.SetBandGain_dB(3, parseFloat(configs['filter.left.1000']), true)
  hls.SetBandGain_dB(4, parseFloat(configs['filter.left.2000']), true)
  hls.SetBandGain_dB(5, parseFloat(configs['filter.left.4000']), true)
  hls.SetBandGain_dB(6, parseFloat(configs['filter.left.8000']), true)

  hls.SetBandGain_dB(0, parseFloat(configs['filter.right.125']), false)
  hls.SetBandGain_dB(1, parseFloat(configs['filter.right.250']), false)
  hls.SetBandGain_dB(2, parseFloat(configs['filter.right.500']), false)
  hls.SetBandGain_dB(3, parseFloat(configs['filter.right.1000']), false)
  hls.SetBandGain_dB(4, parseFloat(configs['filter.right.2000']), false)
  hls.SetBandGain_dB(5, parseFloat(configs['filter.right.4000']), false)
  hls.SetBandGain_dB(6, parseFloat(configs['filter.right.8000']), false)
}

function updateCompressors() {
  const compL = new CCompressor()
  compL.threshold = parseFloat(configs['compress.left.threshold'])
  compL.ratio = parseFloat(configs['compress.left.ratio'])
  hls.Compr_L = compL

  const compR = new CCompressor()
  compR.threshold = parseFloat(configs['compress.right.threshold'])
  compR.ratio = parseFloat(configs['compress.right.ratio'])
  hls.Compr_R = compR

  compL.delete()
  compR.delete()
}

updateFilters()
updateCompressors()

const ctx = new AudioContext()

fetchAudio('/assets/ElectronicMusic.wav', ctx).then(audioBuffer => {
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

    // console.log(hls.Compr_L.threshold, hls.Compr_L.ratio)

    hls.Process(
      inputStereoBuffer,
      outputStereoBuffer,
      configs['filter.left.enabled'],
      configs['filter.right.enabled'],
      configs['compress.entry'] === 'before',
      configs['compress.left.enabled'],
      configs['compress.right.enabled']
    )

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

  document.querySelector('.start').addEventListener('click', () => sourceNode.start(0))
})
