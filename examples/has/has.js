import logCppErrors from '../logger.js'
import { getConfigs, subscribeToConfigChanges } from '../configs.js'
import { fetchAudio } from '../fetch.js'

const { CHearingAidSim, HASProcessor, FloatList } = window.Module

// Setup logger
logCppErrors()

// Configs
let configs = getConfigs()
subscribeToConfigChanges((name, value, newConfigs) => {
  configs = newConfigs
})

// Create simulator
const hls = new CHearingAidSim()

hls.Setup(7, 125, 7, 1, 8000, 500, 1, 1, 1)

// hls.SetBandGain_dB(0, -60, true)
// hls.SetBandGain_dB(1, -50, true)
// hls.SetBandGain_dB(2, -40, true)
// hls.SetBandGain_dB(3, -30, true)
// hls.SetBandGain_dB(4, 0, true)
// hls.SetBandGain_dB(5, 0, true)
// hls.SetBandGain_dB(6, 0, true)

// hls.SetBandGain_dB(0, 10, false)
// hls.SetBandGain_dB(1, 10, false)
// hls.SetBandGain_dB(2, 10, false)
// hls.SetBandGain_dB(3, 0, false)
// hls.SetBandGain_dB(4, -20, false)
// hls.SetBandGain_dB(5, -30, false)
// hls.SetBandGain_dB(6, -40, false)

// Audio context
const ctx = new AudioContext()

// Go
fetchAudio('/assets/ElectronicMusic.wav', ctx).then(audioBuffer => {
  const sourceNode = ctx.createBufferSource()
  sourceNode.buffer = audioBuffer
  sourceNode.loop = true

  const scriptNode = ctx.createScriptProcessor(512, 2, 2)
  scriptNode.onaudioprocess = (audioProcessingEvent) => {
    const { inputBuffer, outputBuffer } = audioProcessingEvent

    const inputDataL = inputBuffer.getChannelData(0)
    const inputDataR = inputBuffer.getChannelData(1)

    const inputStereoBuffer = new FloatList()
    for (let i = 0; i < inputDataL.length; i++) {
      inputStereoBuffer.Add(inputDataL[i])
      inputStereoBuffer.Add(inputDataR[i])
    }

    const outputFloats = HASProcessor.Process(
      hls,
      inputStereoBuffer,
      configs.processLeft,
      configs.processRight
    )

    const outputDataLeft = outputBuffer.getChannelData(0)
    const outputDataRight = outputBuffer.getChannelData(1)

    for (let i = 0; i < outputDataLeft.length; i++) {
      outputDataLeft[i] = outputFloats.Get((i * 2))
      outputDataRight[i] = outputFloats.Get((i * 2) + 1)
    }
  }

  const volume = ctx.createGain()
  volume.gain.value = 0.1

  sourceNode.connect(scriptNode)
  scriptNode.connect(volume)
  volume.connect(ctx.destination)

  sourceNode.start(0)
})
