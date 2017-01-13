// TODO: Don't depend on window.Module, use import instead
const { HRIR, CMonoBuffer, HRIRVector } = window.Module

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
  return new Promise((resolve) => {
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
const decodeBuffer = (buffer, audioCtx) => {
  return audioCtx.decodeAudioData(buffer)
}

/**
 * Returns an array of HRIR-looking objects from a set of HRIR
 * wav URLs
 */
const fetchHrirFiles = (urls, audioCtx) => {
  return Promise.all(urls.map(fetchWavFile))
    .then(buffers => Promise.all(buffers.map(buffer => decodeBuffer(buffer, audioCtx))))
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
 *
 */
export const fetchHrirsVector = (urls, audioCtx) => {
  return fetchHrirFiles(urls, audioCtx).then(results => {
    const hrirs = results.map(({ buffer, azimuth, elevation }) => {
      const leftBuffer = new CMonoBuffer()
      const rightBuffer = new CMonoBuffer()
      const leftAudio = buffer.getChannelData(0)
      const rightAudio = buffer.getChannelData(1)

      for (let i = 0; i < leftAudio.length; i++) {
        leftBuffer.set(i, leftAudio[i])
        rightBuffer.set(i, rightAudio[i])
      }

      return new HRIR(leftBuffer, rightBuffer, azimuth, elevation)
    })

    const hrirsVector = new HRIRVector()
    for (const hrir of hrirs) {
      hrirsVector.push_back(hrir)
    }

    return hrirsVector
  })
}
