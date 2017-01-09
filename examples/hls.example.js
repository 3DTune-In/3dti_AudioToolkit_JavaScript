import logCppErrors from './common/logger.js'
import { getConfigs, subscribeToConfigChanges } from './common/configs.js'
import { fetchAudio } from './common/fetch.js'

const { CHearingLossSim, HLSProcessor, FloatVector } = window.Module

// Setup logger
logCppErrors()

// Configs
let configs = getConfigs()
subscribeToConfigChanges((name, value, newConfigs) => {
  configs = newConfigs
})

const hls = new CHearingLossSim()

// TODO: Assigned float values are not retained, check how to do this
//       in emscripten
// hls.Compr_L.threshold = -40
// hls.Compr_L.ratio = 20
// hls.Compr_R.threshold = -40
// hls.Compr_R.ratio = 20

hls.Setup(125, 7, 1, 0.7)

hls.SetBandGain_dB(0, -60, true)
hls.SetBandGain_dB(1, -50, true)
hls.SetBandGain_dB(2, -40, true)
hls.SetBandGain_dB(3, -30, true)
hls.SetBandGain_dB(4, 0, true)
hls.SetBandGain_dB(5, 0, true)
hls.SetBandGain_dB(6, 0, true)

hls.SetBandGain_dB(0, 10, false)
hls.SetBandGain_dB(1, 10, false)
hls.SetBandGain_dB(2, 10, false)
hls.SetBandGain_dB(3, 0, false)
hls.SetBandGain_dB(4, -20, false)
hls.SetBandGain_dB(5, -30, false)
hls.SetBandGain_dB(6, -40, false)

const ctx = new AudioContext()

fetchAudio('/assets/ElectronicMusic.wav', ctx).then(audioBuffer => {
  const sourceNode = ctx.createBufferSource()
  sourceNode.buffer = audioBuffer
  sourceNode.loop = true

  const inputStereoBuffer = new FloatVector()
  inputStereoBuffer.resize(1024, 0)
  const outputStereoBuffer = new FloatVector()
  outputStereoBuffer.resize(1024, 0)

  // for (let i = 0; i < 1024; i++) {
  //   inputStereoBuffer.push_back(0)
  //   outputStereoBuffer.push_back(0)
  // }

  const scriptNode = ctx.createScriptProcessor(512, 2, 2)
  scriptNode.onaudioprocess = (audioProcessingEvent) => {
    const { inputBuffer, outputBuffer } = audioProcessingEvent

    const inputDataL = inputBuffer.getChannelData(0)
    const inputDataR = inputBuffer.getChannelData(1)

    for (let i = 0; i < inputDataL.length; i++) {
      inputStereoBuffer.set((i * 2), inputDataL[i])
      inputStereoBuffer.set((i * 2) + 1, inputDataR[i])
    }

    HLSProcessor.Process(
      hls,
      inputStereoBuffer,
      outputStereoBuffer,
      configs.filter,
      configs.filter,
      configs.compressAfter,
      configs.compress,
      configs.compress
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

  sourceNode.start(0)
})
