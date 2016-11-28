const {
  HRIR,
  HRTFFactory,
  CMonoBuffer,
  CStereoBuffer,
  CHRTF,
  CVector3,
  CQuaternion,
  CTransform,
  CListener,
  CSingleSourceDSP,
  CCore,
} = window.Module

Module.Logger.SetErrorLogFile("errors.txt")

let lastLogMessage = '';
function printAnyNewLogs() {
  const message = Module.Logger.GetLastLogMessage()
  if (message !== lastLogMessage) {
    console.log('- - - Logger - - -', message)
    lastLogMessage = message
  }

  requestAnimationFrame(printAnyNewLogs)
}
printAnyNewLogs()

const ctx = new AudioContext()

const assetsUrl = '/assets'

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

let quit = false

window.addEventListener('click', () => quit = false)

const loadHrtfFrom3dti = (url) => {
  return new Promise((resolve, reject) => {
    FS.mount(MEMFS)

    fetchWavFile(url)
      .then(contents => {
        // return Module.HRTFFactory.CreateFrom3dti(url, 512, 44100)
        const [dir, filename] = url.replace(/^\//, '').split('/')
        console.log({ dir, filename })
        FS.mkdir(dir)
        FS.writeFile(url, contents, { encoding: 'utf8' })
        const stream = FS.readFile(url)
        console.log({ stream })
        resolve(Module.HRTFFactory.CreateFrom3dtiStream(stream, 512, 44100))
        // resolve(contents)
      })
      .catch(reject)
  })
}

// Just do it
fetchWavFiles(hrirUrls)
  .then(results => {

    // Create an array of Module.HRIR instances containing a buffer
    // of a compatible format
    const hrirs = results.map(hrir => {
      const { buffer, azimuth, elevation } = hrir

      const bufferVec = new Module.VectorFloat
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        for (let i = 0; i < buffer.length; i++) {
          bufferVec.push_back(buffer.getChannelData(channel)[i])
        }
      }
      return new Module.HRIR(bufferVec, azimuth, elevation)
    })

    // Transform that array into a vector
    const hrirsVec = new Module.VectorHRIR()
    hrirs.forEach(hrir => {
      hrirsVec.push_back(hrir)
    })

    // Create an HRTF instance using the factory
    const hrtf = Module.HRTFFactory.create(hrirsVec)
    return hrtf
  })
// loadHrtfFrom3dti('/assets/IRC_1013_R_HRIR_512.3dti-hrtf')
  .then(hrtf => {
    const core = new CCore()
    const listener = core.CreateListener(0.09)
    listener.LoadHRTF(hrtf)

    window.yo = {}
    yo.listener = listener
    yo.core = core
    yo.hrtf = hrtf

    const source = core.CreateSingleSourceDSP()
    const sourceTransform = new CTransform()
    sourceTransform.SetPosition(new CVector3(-20, 0, -10))
    source.SetSourceTransform(sourceTransform)

    // Synth
    const oscillator = ctx.createOscillator()
    oscillator.frequency.value = 440
    const gain = ctx.createGain()
    gain.gain.value = 0.3

    let hasErrored = false
    let frame = 0

    // Script processor
    const scriptNode = ctx.createScriptProcessor(512, 2, 2)

    console.log('Audio processing is currently WIP...')
    scriptNode.onaudioprocess = (audioProcessingEvent) => {
      if (quit || hasErrored) {
        return
      }

      console.log('onaudioprocess')

      try {
        const { inputBuffer, outputBuffer } = audioProcessingEvent

        const inputVec = new Module.VectorFloat()
        const inputData = inputBuffer.getChannelData(0)

        for (let n = 0; n < inputData.length; n++) {
          inputVec.push_back(inputData[n])
          // console.log(' -> added ', inputVec[n], 'to input buffer')
        }

        const input = HRTFFactory.CreateMonoBuffer(inputVec)
        // let spatializedOutput = new CStereoBuffer(512 * 2)

        // console.log('printing buffer:')
        // HRTFFactory.PrintBuffer(input)

        // source.ProcessAnechoic(listener, input, spatializedOutput);
        const spatializedOutput = HRTFFactory.GetSpatializedAudio(source, listener, input)

        // for (let k = 0; k < spatializedOutput.size; k++) {
          debugger;
          console.log('spatialized', spatializedOutput)
        // }

        // for (let channel = 0; channel < 2; channel++) {
        //   const outputData = outputBuffer.getChannelData(channel)

        //   for (let i = 0; i < outputData.length; i++) {
        //     outputData[i] = spatializedOutput[(channel * outputData.length) + i] || 0
        //   }
        // }
      }
      catch (err) {
        if (hasErrored === false) {
          console.log('errored')
          console.error(err)
          console.log(Module.stackTrace())
          hasErrored = true
        }
      }

      frame++
      if (true || frame > 10) {
        quit = true
      }
    }

    oscillator.connect(scriptNode)
    scriptNode.connect(gain)
    gain.connect(ctx.destination)

    oscillator.start(0)
  })
  // TODO: Send hrtf to a core instance etc.
  .catch(err => console.log({ err }))

