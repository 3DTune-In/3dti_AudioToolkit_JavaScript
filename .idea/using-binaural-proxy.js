/**
 * This file examplifies usage of the binaural spatialization, using a
 * proxy approach. Instead of consuming the core API as is, a layer
 * of smartness simply replaces the Web Audio API spatialization with
 * the 3DTI toolkit one.
 *
 * This might be an addition to the JavaScript wrapper apart from the
 * core API. That way, the convenience of the proxy approach would be
 * available for those who prefer it, and the control of using the core
 * API for those who instead want that.
 */

import { withBinauralListener, createHRTFFromSofa } from '3dti-toolkit/hrtf'

/* - - - - - Loading HRIRs - - - - - */

/**
 * The API for loading HRIRs is a question for another file, but let's
 * assume we have a `createHRTFFromSofa` method that does synchronous HTTP
 * requests à la 2002.
 */
const hrtf = createHRTFFromSofa('https://example.com/hrirs.sofa')

/* - - - - - Proxying context - - - - - */

/**
 * `withBinauralListener` proxies the Web Audio API's `AudioContext`.
 * A script processor is set up to process any `BinauralPannerNode`s
 * in the audio chain.
 */
const ctx = withBinauralListener(new AudioContext())

/* - - - - - Binaural listener - - - - - */

/**
 * `withBinauralListener` proxies the `AudioContext.listener` property,
 * which now is an instance of `BinauralListener`, which has a superset
 * of the `AudioListener` node's API.
 */
ctx.listener.positionX = 150

// 3DTI specific
ctx.listener.loadHRTF(hrtf)

/* - - - - - Binaural panner - - - - - */

/**
 * `withBinauralListener` also proxies the `createPanner()` method
 * which now returns a `BinauralPannerNode` instead of the Web Audio
 * API `PannerNode`.
 *
 * The `BinauralPannerNode` works by adding a `ScriptProcessorNode`
 * that transforms the audio of its source(s).
 */
const panner = ctx.createPanner()
panner.setPosition(x, y, z)
panner.setOrientation(a1, a2, a3, b1, b2, b3)

/**
 * Configures the panner's HRIR interpolation method; true to activate
 * interpolation on run-time.
 */
panner.setInterpolation(true)

/**
 * Configures the convolution method; true to activate convolution in
 * frequency domain, false to activate convolution in time domain.
 */
panner.setFrequencyConvolution(true)

/* - - - - - Audio chain - - - - - */

// Create some kind of audio source
const sound = ctx.createAudioBuffer() // etc

/**
 * Connecting a source to the panner and the panner to the main output
 * looks and behaves just like it would with the core Web Audio API
 * nodes.
 */
sound.connect(panner)
panner.connect(ctx.destination)