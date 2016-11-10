import { Core, HRTF, Listener, SingleSourceDSP, Transform, Quaternion, AnechoicOutput } from '3dti-toolkit/hrtf'

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