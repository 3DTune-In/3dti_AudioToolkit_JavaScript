import createAudioParam from 'audio-param-shim'
import enableCustomConnects from 'custom-audio-node-connect'
import { fetchHrirsVector, hrirUrls } from './hrir.js'

// TODO: Don't depend on window.Module, use import instead
const {
  VectorFloat,
  FloatList,
  CVector3,
  CTransform,
  HRIR,
  HRIRVector,
  BinauralAPI,
} = window.Module

const AxisPositionParam = createAudioParam('axisPosition', 0, -1000, 1000)

/**
 * Returns a property descriptor that will throw an error when trying
 * to assign the property a new value.
 */
function readOnlyPropertyDescriptor(name, value) {
  return {
    configurable: false,
    enumerable: true,
    get: () => value,
    set: () => { throw new TypeError(`${name} is read-only`) },
  }
}

/**
 * Adds position{X,Y,Z} audio param (shims) to an object.
 */
function addPositionParams(audioCtx, target) {
  const positionX = new AxisPositionParam(audioCtx)
  const positionY = new AxisPositionParam(audioCtx)
  const positionZ = new AxisPositionParam(audioCtx)

  Object.defineProperty(target, 'positionX', readOnlyPropertyDescriptor('positionX', positionX))
  Object.defineProperty(target, 'positionY', readOnlyPropertyDescriptor('positionY', positionY))
  Object.defineProperty(target, 'positionZ', readOnlyPropertyDescriptor('positionZ', positionZ))

  Object.defineProperty(target, 'setPosition', {
    value: function(x, y, z) {
      target.positionX.value = x
      target.positionY.value = y
      target.positionZ.value = z
    }
  })
}

/**
 * Updates a CListener's position using its position{X,Y,Z} audio
 * params' values.
 */
function updateListenerPosition(listener) {
  const position = new CVector3(listener.positionX.value, listener.positionY.value, listener.positionZ.value)
  const sourceTransform = new CTransform()
  sourceTransform.SetPosition(position)
  listener.SetListenerTransform(sourceTransform)
}

/**
 * Updates a CSingleSourceDSP's position using its position{X,Y,Z}
 * audio params' values.
 */
function updateSourcePosition(source, panner) {
  const position = new CVector3(panner.positionX.value, panner.positionY.value, panner.positionZ.value)
  const sourceTransform = new CTransform()
  sourceTransform.SetPosition(position)
  source.SetSourceTransform(sourceTransform)
}

/**
 * Creates a CListener that has the same API as AudioListener.
 */
function createListener(audioCtx, hrirs) {
  const listener = api.CreateListener(hrirs, 0.0875)

  // Listener position params
  addPositionParams(audioCtx, listener)

  // TODO: This will effectively cause `setPosition(x, y, z)` to trigger
  // three updates to the listener's position. Ideally, we should commit
  // everything in one single update.
  listener.positionX.subscribe(value => updateListenerPosition(listener))
  listener.positionY.subscribe(value => updateListenerPosition(listener))
  listener.positionZ.subscribe(value => updateListenerPosition(listener))

  listener.positionX.value = listener.positionX.defaultValue
  listener.positionY.value = listener.positionY.defaultValue
  listener.positionZ.value = listener.positionZ.defaultValue

  return listener
}

// An instance of the 3DTI toolkit factory
const api = new BinauralAPI()

/**
 * Proxies everything binaural on the given AudioContext instance.
 *
 * @param  {AudioContext} audioCtx An AudioContext instance
 * @return {AudioContext}          A proxied AudioContext instance
 */
export default function withBinauralListener(audioCtx, hrirs) {

  /**
   * AudioListener shim
   */
  let listener = null

  // Override the `AudioContext`'s connect method, allowing arbitrary nodes,
  // in our case a custom panner, to be added to chains.
  enableCustomConnects(audioCtx, node => node.input || node)

  /**
   * Proxy the `listener` property on the audio context.
   */
  const audioCtxProxy = new Proxy(audioCtx, {
    get(target, name) {
      if (name === 'listener') {
        if (listener === null) {
          listener = createListener(target, hrirs)
        }
        return listener
      }
      else if (name in target) {
        if (typeof target[name] === 'function') {
          return target[name].bind(target)
        }

        return target[name]
      }

      return undefined
    },
  })

  /**
   * createPanner() override that returns an object that uses the
   * toolkit spatialization.
   */
  audioCtxProxy.createPanner = function create3dtiPanner() {
    const panner =  {
      input: this.createGain()
    }

    const source = api.CreateSource()
    const scriptNode = this.createScriptProcessor(512, 2, 2)

    scriptNode.onaudioprocess = (audioProcessingEvent) => {
      const { inputBuffer, outputBuffer } = audioProcessingEvent

      const inputData = inputBuffer.getChannelData(0)
      const inputMonoBuffer = new FloatList()
      for (let i = 0; i < inputData.length; i++) {
        inputMonoBuffer.Add(inputData[i])
      }

      const outputFloats = api.Spatialize(this.listener, source, inputMonoBuffer)

      const outputDataLeft = outputBuffer.getChannelData(0)
      const outputDataRight = outputBuffer.getChannelData(1)

      for (let i = 0; i < outputDataLeft.length; i++) {
        outputDataLeft[i] = outputFloats.Get((i * 2))
        outputDataRight[i] = outputFloats.Get((i * 2) + 1)
      }
    }

    function connect(output) {
      panner.input.connect(scriptNode)
      scriptNode.connect(output)
    }

    function disconnect(output) {
      panner.input.disconnect(scriptNode)
      scriptNode.disconnect(output)
    }

    Object.defineProperty(panner, 'connect', readOnlyPropertyDescriptor('connect', connect))
    Object.defineProperty(panner, 'disconnect', readOnlyPropertyDescriptor('disconnect', disconnect))

    addPositionParams(this, panner)
    panner.positionX.subscribe(value => updateSourcePosition(source, panner))
    panner.positionY.subscribe(value => updateSourcePosition(source, panner))
    panner.positionZ.subscribe(value => updateSourcePosition(source, panner))

    panner.positionX.value = panner.positionX.defaultValue
    panner.positionY.value = panner.positionY.defaultValue
    panner.positionZ.value = panner.positionZ.defaultValue

    return panner
  }.bind(audioCtxProxy)

  return audioCtxProxy
}
