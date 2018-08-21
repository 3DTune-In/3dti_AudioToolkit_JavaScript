  return Module
}

const Toolkit = AudioToolkit()

/* global AudioWorkletProcessor */
/* eslint camelcase: 0 */
/* eslint new-cap: 0 */
/* eslint no-param-reassign: 0 */

function getFloatVectorFromArray(arr) {
  const vector = new Toolkit.FloatVector()
  for (let i = 0; i < arr.length; i++) {
    vector.push_back(arr[i])
  }
  return vector
}

const SAMPLING_RATE = 44100
const NUM_EQ_LEVELS = 3
const INITIAL_FREQ = 125
const NUM_EQ_BANDS = 7
const OCTAVE_BAND_STEP = 1
const LPF_FREQ = 20000
const HPF_FREQ = 0
const Q_LPF = 0.707
const Q_BPF = 1.4142
const Q_HPF = 0.707
const dBs_SPL_for_0_dBs_fs = 100

class HearingAidProcessor extends AudioWorkletProcessor {
  constructor() {
    super()

    // Set up the hearing aid simulator
    this.has = new Toolkit.CHearingAidSim()
    this.has.Setup(
      SAMPLING_RATE,
      NUM_EQ_LEVELS,
      INITIAL_FREQ,
      NUM_EQ_BANDS,
      OCTAVE_BAND_STEP,
      LPF_FREQ,
      HPF_FREQ,
      Q_LPF,
      Q_BPF,
      Q_HPF
    )
    this.has.GetDynamicEqualizer(Toolkit.T_ear.LEFT).EnableLevelsInterpolation()
    this.has.GetDynamicEqualizer(Toolkit.T_ear.RIGHT).EnableLevelsInterpolation()
    this.has.EnableHearingAidSimulation(Toolkit.T_ear.BOTH)

    // Create buffers with a buffer size of 2 * 128 (AudioWorkletProcessor
    // use a fixed "render quantum", or block size, of 128 bytes).
    this.inputStereoBuffer = new Toolkit.EarPairBuffers()
    this.outputStereoBuffer = new Toolkit.EarPairBuffers()
    this.inputStereoBuffer.Resize(128, 0)
    this.outputStereoBuffer.Resize(128, 0)

    // Allow audiograms to be set over port messaging
    this.port.addEventListener('message', this.handleMessage.bind(this))
    this.port.start()

    console.log('HearingAidProcessor')
  }

  handleMessage(evt) {
    const { data } = evt

    console.log(evt)

    if (data.key === 'leftEarAudiogram') {
      this.has.SetDynamicEqualizerUsingFig6(
        Toolkit.T_ear.LEFT,
        getFloatVectorFromArray(data.value),
        dBs_SPL_for_0_dBs_fs
      )
    }
    if (data.key === 'rightEarAudiogram') {
      this.has.SetDynamicEqualizerUsingFig6(
        Toolkit.T_ear.RIGHT,
        getFloatVectorFromArray(data.value),
        dBs_SPL_for_0_dBs_fs
      )
    }
  }

  process(inputs, outputs) {
    if (this.has === null) {
      return true
    }

    for (let i = 0; i < 128; i++) {
      this.inputStereoBuffer.Set(Toolkit.T_ear.LEFT, i, inputs[0][0][i])
      this.inputStereoBuffer.Set(Toolkit.T_ear.RIGHT, i, inputs[0][1][i])
    }

    Toolkit.HearingAidSim_Process(this.has, this.inputStereoBuffer, this.outputStereoBuffer)

    for (let i = 0; i < 128; i++) {
      outputs[0][0][i] = this.outputStereoBuffer.Get(Toolkit.T_ear.LEFT, i)
      outputs[0][1][i] = this.outputStereoBuffer.Get(Toolkit.T_ear.RIGHT, i)
    }

    return true
  }
}

registerProcessor('HearingAidProcessor', HearingAidProcessor)
