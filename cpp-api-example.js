const {
  VectorFloat,
  FloatList,
  CVector3,
  CTransform,
  HRIR,
  HRIRVector,
  BinauralAPI,
} = window.Module

const ctx = new AudioContext()

const assetsUrl = '/assets'
const audioSourceUrl = '/assets/hermans-jultal.wav'

const hrirUrls = [
  'IRC_1032_C_R0195_T000_P000.wav',
  'IRC_1032_C_R0195_T000_P015.wav',
  'IRC_1032_C_R0195_T000_P030.wav',
  'IRC_1032_C_R0195_T000_P045.wav',
  'IRC_1032_C_R0195_T000_P060.wav',
  'IRC_1032_C_R0195_T000_P075.wav',
  'IRC_1032_C_R0195_T000_P090.wav',
  'IRC_1032_C_R0195_T000_P315.wav',
  'IRC_1032_C_R0195_T000_P330.wav',
  'IRC_1032_C_R0195_T000_P345.wav',
  'IRC_1032_C_R0195_T015_P000.wav',
  'IRC_1032_C_R0195_T015_P015.wav',
  'IRC_1032_C_R0195_T015_P030.wav',
  'IRC_1032_C_R0195_T015_P045.wav',
  'IRC_1032_C_R0195_T015_P315.wav',
  'IRC_1032_C_R0195_T015_P330.wav',
  'IRC_1032_C_R0195_T015_P345.wav',
  'IRC_1032_C_R0195_T030_P000.wav',
  'IRC_1032_C_R0195_T030_P015.wav',
  'IRC_1032_C_R0195_T030_P030.wav',
  'IRC_1032_C_R0195_T030_P045.wav',
  'IRC_1032_C_R0195_T030_P060.wav',
  'IRC_1032_C_R0195_T030_P315.wav',
  'IRC_1032_C_R0195_T030_P330.wav',
  'IRC_1032_C_R0195_T030_P345.wav',
  'IRC_1032_C_R0195_T045_P000.wav',
  'IRC_1032_C_R0195_T045_P015.wav',
  'IRC_1032_C_R0195_T045_P030.wav',
  'IRC_1032_C_R0195_T045_P045.wav',
  'IRC_1032_C_R0195_T045_P315.wav',
  'IRC_1032_C_R0195_T045_P330.wav',
  'IRC_1032_C_R0195_T045_P345.wav',
  'IRC_1032_C_R0195_T060_P000.wav',
  'IRC_1032_C_R0195_T060_P015.wav',
  'IRC_1032_C_R0195_T060_P030.wav',
  'IRC_1032_C_R0195_T060_P045.wav',
  'IRC_1032_C_R0195_T060_P060.wav',
  'IRC_1032_C_R0195_T060_P075.wav',
  'IRC_1032_C_R0195_T060_P315.wav',
  'IRC_1032_C_R0195_T060_P330.wav',
  'IRC_1032_C_R0195_T060_P345.wav',
  'IRC_1032_C_R0195_T075_P000.wav',
  'IRC_1032_C_R0195_T075_P015.wav',
  'IRC_1032_C_R0195_T075_P030.wav',
  'IRC_1032_C_R0195_T075_P045.wav',
  'IRC_1032_C_R0195_T075_P315.wav',
  'IRC_1032_C_R0195_T075_P330.wav',
  'IRC_1032_C_R0195_T075_P345.wav',
  'IRC_1032_C_R0195_T090_P000.wav',
  'IRC_1032_C_R0195_T090_P015.wav',
  'IRC_1032_C_R0195_T090_P030.wav',
  'IRC_1032_C_R0195_T090_P045.wav',
  'IRC_1032_C_R0195_T090_P060.wav',
  'IRC_1032_C_R0195_T090_P315.wav',
  'IRC_1032_C_R0195_T090_P330.wav',
  'IRC_1032_C_R0195_T090_P345.wav',
  'IRC_1032_C_R0195_T105_P000.wav',
  'IRC_1032_C_R0195_T105_P015.wav',
  'IRC_1032_C_R0195_T105_P030.wav',
  'IRC_1032_C_R0195_T105_P045.wav',
  'IRC_1032_C_R0195_T105_P315.wav',
  'IRC_1032_C_R0195_T105_P330.wav',
  'IRC_1032_C_R0195_T105_P345.wav',
  'IRC_1032_C_R0195_T120_P000.wav',
  'IRC_1032_C_R0195_T120_P015.wav',
  'IRC_1032_C_R0195_T120_P030.wav',
  'IRC_1032_C_R0195_T120_P045.wav',
  'IRC_1032_C_R0195_T120_P060.wav',
  'IRC_1032_C_R0195_T120_P075.wav',
  'IRC_1032_C_R0195_T120_P315.wav',
  'IRC_1032_C_R0195_T120_P330.wav',
  'IRC_1032_C_R0195_T120_P345.wav',
  'IRC_1032_C_R0195_T135_P000.wav',
  'IRC_1032_C_R0195_T135_P015.wav',
  'IRC_1032_C_R0195_T135_P030.wav',
  'IRC_1032_C_R0195_T135_P045.wav',
  'IRC_1032_C_R0195_T135_P315.wav',
  'IRC_1032_C_R0195_T135_P330.wav',
  'IRC_1032_C_R0195_T135_P345.wav',
  'IRC_1032_C_R0195_T150_P000.wav',
  'IRC_1032_C_R0195_T150_P015.wav',
  'IRC_1032_C_R0195_T150_P030.wav',
  'IRC_1032_C_R0195_T150_P045.wav',
  'IRC_1032_C_R0195_T150_P060.wav',
  'IRC_1032_C_R0195_T150_P315.wav',
  'IRC_1032_C_R0195_T150_P330.wav',
  'IRC_1032_C_R0195_T150_P345.wav',
  'IRC_1032_C_R0195_T165_P000.wav',
  'IRC_1032_C_R0195_T165_P015.wav',
  'IRC_1032_C_R0195_T165_P030.wav',
  'IRC_1032_C_R0195_T165_P045.wav',
  'IRC_1032_C_R0195_T165_P315.wav',
  'IRC_1032_C_R0195_T165_P330.wav',
  'IRC_1032_C_R0195_T165_P345.wav',
  'IRC_1032_C_R0195_T180_P000.wav',
  'IRC_1032_C_R0195_T180_P015.wav',
  'IRC_1032_C_R0195_T180_P030.wav',
  'IRC_1032_C_R0195_T180_P045.wav',
  'IRC_1032_C_R0195_T180_P060.wav',
  'IRC_1032_C_R0195_T180_P075.wav',
  'IRC_1032_C_R0195_T180_P315.wav',
  'IRC_1032_C_R0195_T180_P330.wav',
  'IRC_1032_C_R0195_T180_P345.wav',
  'IRC_1032_C_R0195_T195_P000.wav',
  'IRC_1032_C_R0195_T195_P015.wav',
  'IRC_1032_C_R0195_T195_P030.wav',
  'IRC_1032_C_R0195_T195_P045.wav',
  'IRC_1032_C_R0195_T195_P315.wav',
  'IRC_1032_C_R0195_T195_P330.wav',
  'IRC_1032_C_R0195_T195_P345.wav',
  'IRC_1032_C_R0195_T210_P000.wav',
  'IRC_1032_C_R0195_T210_P015.wav',
  'IRC_1032_C_R0195_T210_P030.wav',
  'IRC_1032_C_R0195_T210_P045.wav',
  'IRC_1032_C_R0195_T210_P060.wav',
  'IRC_1032_C_R0195_T210_P315.wav',
  'IRC_1032_C_R0195_T210_P330.wav',
  'IRC_1032_C_R0195_T210_P345.wav',
  'IRC_1032_C_R0195_T225_P000.wav',
  'IRC_1032_C_R0195_T225_P015.wav',
  'IRC_1032_C_R0195_T225_P030.wav',
  'IRC_1032_C_R0195_T225_P045.wav',
  'IRC_1032_C_R0195_T225_P315.wav',
  'IRC_1032_C_R0195_T225_P330.wav',
  'IRC_1032_C_R0195_T225_P345.wav',
  'IRC_1032_C_R0195_T240_P000.wav',
  'IRC_1032_C_R0195_T240_P015.wav',
  'IRC_1032_C_R0195_T240_P030.wav',
  'IRC_1032_C_R0195_T240_P045.wav',
  'IRC_1032_C_R0195_T240_P060.wav',
  'IRC_1032_C_R0195_T240_P075.wav',
  'IRC_1032_C_R0195_T240_P315.wav',
  'IRC_1032_C_R0195_T240_P330.wav',
  'IRC_1032_C_R0195_T240_P345.wav',
  'IRC_1032_C_R0195_T255_P000.wav',
  'IRC_1032_C_R0195_T255_P015.wav',
  'IRC_1032_C_R0195_T255_P030.wav',
  'IRC_1032_C_R0195_T255_P045.wav',
  'IRC_1032_C_R0195_T255_P315.wav',
  'IRC_1032_C_R0195_T255_P330.wav',
  'IRC_1032_C_R0195_T255_P345.wav',
  'IRC_1032_C_R0195_T270_P000.wav',
  'IRC_1032_C_R0195_T270_P015.wav',
  'IRC_1032_C_R0195_T270_P030.wav',
  'IRC_1032_C_R0195_T270_P045.wav',
  'IRC_1032_C_R0195_T270_P060.wav',
  'IRC_1032_C_R0195_T270_P315.wav',
  'IRC_1032_C_R0195_T270_P330.wav',
  'IRC_1032_C_R0195_T270_P345.wav',
  'IRC_1032_C_R0195_T285_P000.wav',
  'IRC_1032_C_R0195_T285_P015.wav',
  'IRC_1032_C_R0195_T285_P030.wav',
  'IRC_1032_C_R0195_T285_P045.wav',
  'IRC_1032_C_R0195_T285_P315.wav',
  'IRC_1032_C_R0195_T285_P330.wav',
  'IRC_1032_C_R0195_T285_P345.wav',
  'IRC_1032_C_R0195_T300_P000.wav',
  'IRC_1032_C_R0195_T300_P015.wav',
  'IRC_1032_C_R0195_T300_P030.wav',
  'IRC_1032_C_R0195_T300_P045.wav',
  'IRC_1032_C_R0195_T300_P060.wav',
  'IRC_1032_C_R0195_T300_P075.wav',
  'IRC_1032_C_R0195_T300_P315.wav',
  'IRC_1032_C_R0195_T300_P330.wav',
  'IRC_1032_C_R0195_T300_P345.wav',
  'IRC_1032_C_R0195_T315_P000.wav',
  'IRC_1032_C_R0195_T315_P015.wav',
  'IRC_1032_C_R0195_T315_P030.wav',
  'IRC_1032_C_R0195_T315_P045.wav',
  'IRC_1032_C_R0195_T315_P315.wav',
  'IRC_1032_C_R0195_T315_P330.wav',
  'IRC_1032_C_R0195_T315_P345.wav',
  'IRC_1032_C_R0195_T330_P000.wav',
  'IRC_1032_C_R0195_T330_P015.wav',
  'IRC_1032_C_R0195_T330_P030.wav',
  'IRC_1032_C_R0195_T330_P045.wav',
  'IRC_1032_C_R0195_T330_P060.wav',
  'IRC_1032_C_R0195_T330_P315.wav',
  'IRC_1032_C_R0195_T330_P330.wav',
  'IRC_1032_C_R0195_T330_P345.wav',
  'IRC_1032_C_R0195_T345_P000.wav',
  'IRC_1032_C_R0195_T345_P015.wav',
  'IRC_1032_C_R0195_T345_P030.wav',
  'IRC_1032_C_R0195_T345_P045.wav',
  'IRC_1032_C_R0195_T345_P315.wav',
  'IRC_1032_C_R0195_T345_P330.wav',
  'IRC_1032_C_R0195_T345_P345.wav',
].map(filename => `${assetsUrl}/${filename}`)

/**
 * Returns an object with azimuth and elevation angles extracted
 * from a URL.
 */
const getAnglesFromUrl = url => {
  const [, azimuth, elevation] = url.split(/.+T(\d{3})_P(\d{3})/).map(x => parseInt(x))
  return { azimuth, elevation }
}

/**
 * Fetches a wav file and returns it as an array buffer.
 */
const fetchWavFile = url => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', url, true)
    xhr.responseType = 'arraybuffer'
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        resolve(xhr.response)
      }
    }
    xhr.send()
  })
}

/**
 * Returns a Promise resolving with an AudioBuffer decoded from
 * an ArrayBuffer.
 */
const decodeBuffer = buffer => {
  return ctx.decodeAudioData(buffer)
}

/**
 * Returns an array of HRIR-looking objects from a set of HRIR
 * wav URLs
 */
const fetchWavFiles = urls => {
  return Promise.all(urls.map(fetchWavFile))
    .then(buffers => Promise.all(buffers.map(decodeBuffer)))
    .then(buffers => {
      return buffers.map((x, i) => {
        return Object.assign(
          {},
          getAnglesFromUrl(urls[i]),
          { buffer: x }
        )
      })
    })
}

/**
 * Fetches an audio source to spatialize
 */
const fetchSourceAudio = url => {
  return fetchWavFile(url).then(response => decodeBuffer(response))
}

/**
 * Returns a number that ensure to not be within a given range
 */
function outsideRange(value, lower, upper) {
  if (value > lower && value < upper) {
    const distToLower = Math.abs(value - lower)
    const distToUpper = Math.abs(upper - value)

    return distToUpper > distToLower
      ? upper
      : lower
  }

  return value
}

/**
 * UI
 */
let isRunning = true

const $state = document.querySelector('.state')
const $stateToggle = document.querySelector('.playback-toggle')

const $controlX = document.querySelector('#control-x')
const $controlY = document.querySelector('#control-y')
const $controlZ = document.querySelector('#control-z')

const $valueX = document.querySelector('.value-x')
const $valueY = document.querySelector('.value-y')
const $valueZ = document.querySelector('.value-z')

$controlX.value = -5
$controlY.value = -10
$controlZ.value = 15

$stateToggle.addEventListener('click', () => {
  isRunning = !isRunning
  $state.innerHTML = isRunning ? 'Running' : 'Stopped'
})

/**
 * API
 */
const api = new BinauralAPI()

// Just do it
Promise.all([
  fetchWavFiles(hrirUrls),
  fetchSourceAudio(audioSourceUrl),
])
  .then(([results, audioSource]) => {
    const hrirs = results.map(({ buffer, azimuth, elevation }) => {
      data = new FloatList()
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        for (let i = 0; i < buffer.length; i++) {
          data.Add(buffer.getChannelData(channel)[i])
        }
      }

      return new HRIR(data, azimuth, elevation)
    })

    const hrirsVector = new HRIRVector()
    for (const hrir of hrirs) {
      hrirsVector.push_back(hrir)
    }

    const listener = api.CreateListener(hrirsVector, 0.09)

    const source = api.CreateSource()

    // Source position controls
    const updateSourcePosition = () => {
      const x = $controlX.value
      const y = $controlY.value
      const z = outsideRange($controlZ.value, -1, 1)

      const sourceTransform = new CTransform()
      sourceTransform.SetPosition(new CVector3(
        parseFloat(x),
        parseFloat(y),
        parseFloat(z)
      ))
      source.SetSourceTransform(sourceTransform)

      $controlX.value = x
      $controlY.value = y
      $controlZ.value = z

      $valueX.innerHTML = x
      $valueY.innerHTML = y
      $valueZ.innerHTML = z
    }

    $controlX.addEventListener('change', updateSourcePosition)
    $controlY.addEventListener('change', updateSourcePosition)
    $controlZ.addEventListener('change', updateSourcePosition)

    updateSourcePosition()

    // Audio source
    const sourceNode = ctx.createBufferSource()
    sourceNode.buffer = audioSource
    sourceNode.loop = true

    const gain = ctx.createGain()
    gain.gain.value = 0.3

    // Script processor
    const scriptNode = ctx.createScriptProcessor(512, 2, 2)
    scriptNode.onaudioprocess = (audioProcessingEvent) => {
      if (!isRunning) {
        return
      }

      const { inputBuffer, outputBuffer } = audioProcessingEvent

      const inputData = inputBuffer.getChannelData(0)
      const inputMonoBuffer = new FloatList()
      for (let i = 0; i < inputData.length; i++) {
        inputMonoBuffer.Add(inputData[i])
      }

      const outputFloats = api.Spatialize(listener, source, inputMonoBuffer)

      const outputDataLeft = outputBuffer.getChannelData(0)
      const outputDataRight = outputBuffer.getChannelData(1)

      for (let i = 0; i < outputDataLeft.length; i++) {
        outputDataLeft[i] = outputFloats.Get((i * 2))
        outputDataRight[i] = outputFloats.Get((i * 2) + 1)
      }
    }

    sourceNode.connect(scriptNode)
    scriptNode.connect(gain)
    gain.connect(ctx.destination)

    sourceNode.start(0)

    $state.innerHTML = 'Running'
  })
  .catch(err => console.error(err))
