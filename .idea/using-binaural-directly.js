/**
 * This file contains example code to show how implementing the toolkit's
 * binaural spatialization would look like using a direct port of the API,
 * without any opiniated convenience layers in between the C++ library
 * transpilation output and the consumable JavaScript library.
 *
 * An opiniated layer would be something similar to the using-binaural-proxy.js
 * example, where the Web Audio API is proxied, leaving the developer able to
 * switch to the toolkit with very little effort.
 *
 * The example explored here would mean more implementational work for
 * developers, but on the other hand directly reflect the C++ library's API,
 * meaning less maintenance of the JavaScript wrapper.
 */

/**
 * NOTE: There are some basic type notations à la http://flowtype.org to
 * distinguish what types the different methods return.
 */

import { Core, HRTF, Listener, SingleSourceDSP, Transform, Quaternion, AnechoicOutput } from '3dti-toolkit/hrtf'

const fileUrl = 'http://example.com/IRC_1008_R_HRIR_128.3dti-hrtf'
const bufferSize = 1024
const sampleRate = 44100

// A Web Audio API context instance
const ctx = new AudioContext()

/* - - - - - Core - - - - - */

const core: Core = new Core()

/* - - - - - HRTF - - - - - */

const humanHead: HRTF = HRTF.createFrom3dti(fileUrl, bufferSize, sampleRate)

/* - - - - - Listener - - - - - */

const listener: Listner = core.createListener()
listener.loadHRTF(humanHead)

/* - - - - - Source - - - - - */

const source: SingleSourceDSP = core.createSingleSourceDSP()
source.setInterpolation(true)
source.setFrequencyConvolution(true)

/* - - - - - Positioning - - - - - */

const sourceTransform: Transform = new Transform()
sourceTransform.setPosition(new Quaternion(qw, qx, qy, qz))
source.setSourceTransform(sourceTransform)

const listenerTransform: Transform = new Transform()
listenerTransform.setOrientation(new Quaternion(qw, qx, qy, qz))
listener.setListenerTransfrom(listenerTransform)

/* - - - - - Processing - - - - - */

const audioSourceNode: AudioBufferSourceNode = ctx.createBufferSource()
// Assign it an audio buffer somehow ...

// Create a script processor node which receives audio processing
// events from its audio source
const scriptNode: ScriptProcessorNode = ctx.createScriptProcessor(bufferSize, 2, 2)
scriptNode.onaudioprocess = (audioProcessingEvent) => {
  const { inputBuffer, outputBuffer } = audioProcessingEvent

  // SingleSourceDSP.ProcessAnechoic expects a mono input buffer and 
  // a stereo output buffer
  const inputData = inputBuffer.getChannelData(0)
  const transformedOutputData = new Float32Array(bufferSize * 2)

  // Process the input audio and populate `transformedOutputData`
  // with the spatialized audio
  source.processAnechoic(listener, inputData, transformedOutputData)

  // Make the spatialized audio the output
  for (let channel = 0; channel < 2; channel++) {
    const outputData = outputBuffer.getChannelData(channel)
    for (let i = 0; i < outputData.length; i++) {

      // `transformedOutputData` will be interlaced
      outputData[i] = transformedOutputData[i * (channel + 1)]
    }
  }
}

audioSourceNode.connect(scriptNode)
scriptNode.connect(ctx.destination)

