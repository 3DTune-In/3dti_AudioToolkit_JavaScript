import createAudioParam from 'audio-param-shim'
import enableCustomConnects from 'custom-audio-node-connect'

// TODO: Don't depend on window.Module, use import instead
const {
  CVector3,
  CQuaternion,
  CTransform,
  CMonoBuffer,
  CStereoBuffer,
  BinauralAPI,
} = window.Module

const MAX_SAFE_INTEGER = Math.pow(2, 53) - 1

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
 * Adds a property that merely stores and returns a value, and
 * logs an unimplemented warning to the console.
 */
function unimplementedPropertyDescriptor(name) {
  let value

  return {
    configurable: false,
    enumerable: true,
    get: () => {
      console.warn(`${name} is not yet implemented.`)
      return value
    },
    set: (newValue) => {
      console.warn(`${name} is not yet implemented.`)
      value = newValue
    },
  }
}

/**
 * Adds position{X,Y,Z} audio param (shims) to an object.
 */
function addPositionParams(audioCtx, target) {
  const AxisPosition = createAudioParam('AxisPosition', 0, -MAX_SAFE_INTEGER, MAX_SAFE_INTEGER)
  const positionX = new AxisPosition(audioCtx)
  const positionY = new AxisPosition(audioCtx)
  const positionZ = new AxisPosition(audioCtx)

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
 * Adds orientation params to an object
 */
function addOrientationParams(audioCtx, target) {
  const forwardX = new (createAudioParam('OrientationComponent', 0, -MAX_SAFE_INTEGER, MAX_SAFE_INTEGER))(audioCtx)
  const forwardY = new (createAudioParam('OrientationComponent', 0, -MAX_SAFE_INTEGER, MAX_SAFE_INTEGER))(audioCtx)
  const forwardZ = new (createAudioParam('OrientationComponent', -1, -MAX_SAFE_INTEGER, MAX_SAFE_INTEGER))(audioCtx)
  const upX = new (createAudioParam('OrientationComponent', 0, -MAX_SAFE_INTEGER, MAX_SAFE_INTEGER))(audioCtx)
  const upY = new (createAudioParam('OrientationComponent', 1, -MAX_SAFE_INTEGER, MAX_SAFE_INTEGER))(audioCtx)
  const upZ = new (createAudioParam('OrientationComponent', 0, -MAX_SAFE_INTEGER, MAX_SAFE_INTEGER))(audioCtx)

  Object.defineProperty(target, 'forwardX', readOnlyPropertyDescriptor('forwardX', forwardX))
  Object.defineProperty(target, 'forwardY', readOnlyPropertyDescriptor('forwardY', forwardY))
  Object.defineProperty(target, 'forwardZ', readOnlyPropertyDescriptor('forwardZ', forwardZ))
  Object.defineProperty(target, 'upX', readOnlyPropertyDescriptor('upX', upX))
  Object.defineProperty(target, 'upY', readOnlyPropertyDescriptor('upY', upY))
  Object.defineProperty(target, 'upZ', readOnlyPropertyDescriptor('upZ', upZ))

  Object.defineProperty(target, 'setOrientation', {
    value: function(fX, fY, fZ, uX, uY, uZ) {
      target.forwardX.value = fX
      target.forwardY.value = fY
      target.forwardZ.value = fZ
      target.upX.value = uX
      target.upY.value = uY
      target.upZ.value = uZ
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
 * Returns a CQuaternion given an forward and up vector for a listener
 */
function getQuaternionFromOrientationVectors(forward, up) {
  const yaw = Math.atan2(forward.x, forward.z) - Math.atan2(0, -1)
  const quaternion = CQuaternion.FromAxisAngle(new CVector3(0, 1, 0), yaw)
  // const pitch = Math.atan2(forward.y, forward.z) - Math.atan2(0, -1)
  // const roll = Math.atan2(forward.x, forward.y) - Math.atan2(0, -1)
  // const quaternion = CQuaternion.FromYawPitchRoll(yaw, pitch, roll)
  return quaternion
}

/**
 * Updates a CListener's orientation by converting its forward*
 * and up* params into a quaternion rotation and applying that
 * as a CTransform.
 */
function updateListenerOrientation(listener) {
  const transform = new CTransform()
  transform.SetPosition(listener.GetListenerTransform().GetPosition())

  const forward = new CVector3(listener.forwardX.value, listener.forwardY.value, listener.forwardZ.value)
  const up = new CVector3(listener.upX.value, listener.upY.value, listener.upZ.value)
  const quaternion = getQuaternionFromOrientationVectors(forward, up)
  transform.SetOrientation(quaternion)

  listener.SetListenerTransform(transform)

  forward.delete()
  up.delete()
  transform.delete()
  quaternion.delete()
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

  const updateListener = () => {
    updateListenerPosition(listener)
    updateListenerOrientation(listener)
  }

  // Listener position params
  addPositionParams(audioCtx, listener)

  listener.positionX.subscribe(updateListener)
  listener.positionY.subscribe(updateListener)
  listener.positionZ.subscribe(updateListener)

  listener.positionX.value = listener.positionX.defaultValue
  listener.positionY.value = listener.positionY.defaultValue
  listener.positionZ.value = listener.positionZ.defaultValue

  // Listener orientation params
  addOrientationParams(audioCtx, listener)

  listener.forwardX.value = listener.forwardX.defaultValue
  listener.forwardY.value = listener.forwardY.defaultValue
  listener.forwardZ.value = listener.forwardZ.defaultValue
  listener.upX.value = listener.upX.defaultValue
  listener.upY.value = listener.upY.defaultValue
  listener.upZ.value = listener.upZ.defaultValue

  listener.forwardX.subscribe(updateListener)
  listener.forwardY.subscribe(updateListener)
  listener.forwardZ.subscribe(updateListener)
  listener.upX.subscribe(updateListener)
  listener.upY.subscribe(updateListener)
  listener.upZ.subscribe(updateListener)

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

      source.ProcessAnechoic(inputMonoBuffer, outputStereoBuffer)

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

    addPositionParams(this, panner)
    panner.positionX.subscribe(() => updateSourcePosition(source, panner))
    panner.positionY.subscribe(() => updateSourcePosition(source, panner))
    panner.positionZ.subscribe(() => updateSourcePosition(source, panner))

    panner.positionX.value = panner.positionX.defaultValue
    panner.positionY.value = panner.positionY.defaultValue
    panner.positionZ.value = panner.positionZ.defaultValue

    // Adds useless setOrientation() method, for compatibility
    addOrientationParams(this, panner)

    return panner
  }.bind(audioCtxProxy)

  return audioCtxProxy
}
