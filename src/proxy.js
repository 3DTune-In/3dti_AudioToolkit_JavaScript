import {
  Core, HRTF, Listener, SingleSourceDSP, Transform, Quaternion, AnechoicOutput,
  AXIS_X, AXIS_Y, AXIS_Z,
} from '3dti-toolkit/hrtf'

const definePositionForAxis = (listenerTraget, propName, axis) => {
  class AudioParamProxy extends AudioParam {
    get value() {
      return listenerTarget.GetListenerTransform().position[axis]
    }

    set value() {
      const transform = listenerTarget.GetListenerTransform()
      const newTransform = new Transform()
      newTransform.SetOrientation(transform.getOrientation())
      const position = .GetPosition()
      position.SetAxis(axis, value)
    }
  }
  
  const param = new AudioParamProxy()

  Object.defineProperty(param, 'value', {
    configurable: false,
    enumerable: true,
    writable: true,
    get() {
      
    },
    set(value) {
      
    },
  })

  Object.defineProperty(listenerTarget, propName, {
    configurable: false,
    enumerable: true,
    writable: false,
    get() {
      return param
    },
  })
}

const defineForwardForAxis = (listenerTraget, propName, axis) => {
  const param = {}

  Object.defineProperty(param, 'value', {
    configurable: false,
    enumerable: true,
    writable: true,
    get() {
      return listenerTarget.GetListenerTransform().position[axis]
    },
    set(value) {
      const transform = listenerTarget.GetListenerTransform()
      const newTransform = new Transform()
      newTransform.SetOrientation(transform.getOrientation())
      const position = .GetPosition()
      position.SetAxis(axis, value)
    },
  })

  Object.defineProperty(listenerTarget, propName, {
    enumerable: true,
    writable: false,
    get() {
      return param
    }
  })
}

const createListenerProxy = () => {
  const listener = core.createListener()

  definePositionForAxis(listener, 'positionX', AXIS_X)
  definePositionForAxis(listener, 'positionY', AXIS_Y)
  definePositionForAxis(listener, 'positionZ', AXIS_Z)

  defineForwardForAxis(listener, 'forwardX', AXIS_X)
  defineForwardForAxis(listener, 'forwardY', AXIS_Y)
  defineForwardForAxis(listener, 'forwardZ', AXIS_Z)

  // defineAxisGetterAndSetter(listener, 'upX', AXIS_X)
  // defineAxisGetterAndSetter(listener, 'upY', AXIS_Y)
  // defineAxisGetterAndSetter(listener, 'upZ', AXIS_Z)

  /**
   * @deprecated
   */
  listener.setPosition = (x, y, z) => {}

  listener.setOrientation = (frontX, frontY, frontZ, upX, upY, upZ) => {
    const position = listener.GetListenerTransform().GetPosition()
    const orientation = new Quaternion(1, frontX, frontY, frontZ)
    const transform = new Transform()
    transform.SetPosition(position)
    transform.SetOrientation(orientation)
    listener.SetListenerTransform(transform)
  }

  return listener
}

/**
 * Proxies an instance of `AudioContext`, overriding its `listener` and
 * `createPanner()` properties.
 * 
 * @param  {AudioContext} context An AudioContext instance
 * @return {AudioContext}         A proxied AudioContext instance
 */
export const withBinauralListener = (context, hrtf = null) => {
  const sources = []

  const core = new Core()

  const listener = core.createListener()
  listener.loadHRTF(hrtf)
  
  /**
   * Returns a new SingleSourceDSP instance.
   * 
   * @return {[type]} [description]
   */
  const createPanner = () => {
    const panner = core.createSingleSourceDSP()

    panner.connect = (destination) => {
      sources.push(panner)
      // ...
    }
  }

  return {
    ...context,
    listener,
    createPanner,
  } 
  
}