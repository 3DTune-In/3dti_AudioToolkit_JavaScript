import logCppErrors from '../logger.js'

logCppErrors()

const { CHearingLossSim, HLSProcessor, FloatList } = window.Module

const $compress = document.querySelector('[name="compress"]')
$compress.addEventListener('click', evt => {
  config.compress = evt.target.checked
  console.log(config)
})

const $compressAfter = document.querySelector('[name="compressAfter"]')
$compressAfter.addEventListener('click', evt => {
  config.compressAfter = evt.target.checked
  console.log(config)
})

const $filter = document.querySelector('[name="filter"]')
$filter.addEventListener('click', evt => {
  config.filter = evt.target.checked
  console.log(config)
})

const config = {
  compress: $compress.checked,
  compressAfter: $compressAfter.checked,
  filter: $filter.checked,
}

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

function loadSourceAudio() {
  return new Promise(resolve => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', '/assets/ElectronicMusic.wav', true)
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

loadSourceAudio().then(audioBuffer => {
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

    const outputFloats = HLSProcessor.Process(
      hls,
      inputStereoBuffer,
      config.filter,
      config.filter,
      config.compressAfter,
      config.compress,
      config.compress
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
