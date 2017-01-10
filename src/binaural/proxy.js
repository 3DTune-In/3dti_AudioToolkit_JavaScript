import createAudioParam from 'audio-param-shim'
import enableCustomConnects from 'custom-audio-node-connect'

// TODO: Don't depend on window.Module, use import instead
const {
  CVector3,
  CTransform,
  CMonoBuffer,
  CStereoBuffer,
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
    set: () => {
      throw new TypeError(`${name} is read-only`)
    },
  }
}

/**
 * Adds a property that throws a TypeError when invoked.
 */
function unimplementedPropertyDescriptor(name) {
  const accessor = () => {
    throw new TypeError(`${name} is not yet implemented.`)
  }

  return {
    configurable: false,
    enumerable: true,
    get: accessor,
    set: accessor,
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
    },
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

  position.delete()
  sourceTransform.delete()
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

  position.delete()
  sourceTransform.delete()
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
  listener.positionX.subscribe(() => updateListenerPosition(listener))
  listener.positionY.subscribe(() => updateListenerPosition(listener))
  listener.positionZ.subscribe(() => updateListenerPosition(listener))

  listener.positionX.value = listener.positionX.defaultValue
  listener.positionY.value = listener.positionY.defaultValue
  listener.positionZ.value = listener.positionZ.defaultValue

  // Add properties that are not yet implemented
  Object.defineProperty(listener, 'forwardX', unimplementedPropertyDescriptor('forwardX'))
  Object.defineProperty(listener, 'forwardY', unimplementedPropertyDescriptor('forwardY'))
  Object.defineProperty(listener, 'forwardZ', unimplementedPropertyDescriptor('forwardZ'))
  Object.defineProperty(listener, 'upX', unimplementedPropertyDescriptor('upX'))
  Object.defineProperty(listener, 'upY', unimplementedPropertyDescriptor('upY'))
  Object.defineProperty(listener, 'upZ', unimplementedPropertyDescriptor('upZ'))
  Object.defineProperty(listener, 'setOrientation', unimplementedPropertyDescriptor('setOrientation'))

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
  let listener = createListener(audioCtx, hrirs)

  // Override the `AudioContext`'s connect method, allowing arbitrary nodes,
  // in our case a custom panner, to be added to chains.
  enableCustomConnects(audioCtx, node => node.input || node)

  /**
   * Proxy the `listener` property on the audio context.
   */
  const audioCtxProxy = new Proxy(audioCtx, {
    get(target, name) {
      if (name === 'listener') {
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
  audioCtxProxy.createPanner = function() {
    const panner = {
      input: this.createGain(),
    }

    const source = api.CreateSource()
    const scriptNode = this.createScriptProcessor(512, 2, 2)

    const inputMonoBuffer = new CMonoBuffer()
    inputMonoBuffer.resize(512, 0)

    const outputStereoBuffer = new CStereoBuffer()
    outputStereoBuffer.resize(1024, 0)

    scriptNode.onaudioprocess = (audioProcessingEvent) => {
      const { inputBuffer, outputBuffer } = audioProcessingEvent

      const inputData = inputBuffer.getChannelData(0)

      for (let i = 0; i < inputData.length; i++) {
        inputMonoBuffer.set(i, inputData[i])
      }

      source.ProcessAnechoic(this.listener, inputMonoBuffer, outputStereoBuffer)

      const outputDataLeft = outputBuffer.getChannelData(0)
      const outputDataRight = outputBuffer.getChannelData(1)

      for (let i = 0; i < outputDataLeft.length; i++) {
        outputDataLeft[i] = outputStereoBuffer.get((i * 2))
        outputDataRight[i] = outputStereoBuffer.get((i * 2) + 1)
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

    // Add properties that are not yet implemented
    Object.defineProperty(panner, 'coneInnerAngle', unimplementedPropertyDescriptor('coneInnerAngle'))
    Object.defineProperty(panner, 'coneOuterAngle', unimplementedPropertyDescriptor('coneOuterAngle'))
    Object.defineProperty(panner, 'coneOuterGain', unimplementedPropertyDescriptor('coneOuterGain'))
    Object.defineProperty(panner, 'distanceModel', unimplementedPropertyDescriptor('distanceModel'))
    Object.defineProperty(panner, 'maxDistance', unimplementedPropertyDescriptor('maxDistance'))
    Object.defineProperty(panner, 'orientationX', unimplementedPropertyDescriptor('orientationX'))
    Object.defineProperty(panner, 'orientationY', unimplementedPropertyDescriptor('orientationY'))
    Object.defineProperty(panner, 'orientationZ', unimplementedPropertyDescriptor('orientationZ'))
    Object.defineProperty(panner, 'panningModel', unimplementedPropertyDescriptor('panningModel'))
    Object.defineProperty(panner, 'refDistance', unimplementedPropertyDescriptor('refDistance'))
    Object.defineProperty(panner, 'rolloffFactor', unimplementedPropertyDescriptor('rolloffFactor'))
    Object.defineProperty(panner, 'setOrientation', unimplementedPropertyDescriptor('setOrientation'))

    addPositionParams(this, panner)
    panner.positionX.subscribe(() => updateSourcePosition(source, panner))
    panner.positionY.subscribe(() => updateSourcePosition(source, panner))
    panner.positionZ.subscribe(() => updateSourcePosition(source, panner))

    panner.positionX.value = panner.positionX.defaultValue
    panner.positionY.value = panner.positionY.defaultValue
    panner.positionZ.value = panner.positionZ.defaultValue

    return panner
  }.bind(audioCtxProxy)

  return audioCtxProxy
}
