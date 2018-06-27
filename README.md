# 3D Tune-In Toolkit – JavaScript Wrapper

This is a partial JavaScript port of the [3D Tune-In Toolkit](https://github.com/3DTune-In/3dti_AudioToolkit). The features that have been successfully ported and exposed are:

* Hearing loss simulation
* Hearing aid simulation
* Binaural spatialisation

Note that although these features work, their full APIs are not necessarily provided. If you want to add something to the JavaScript API, please add it to [JsWrapperGlue.cpp](JsWrapperGlue.cpp) and submit a PR.

At the moment, there is no [reverberation](https://github.com/3DTune-In/3dti_AudioToolkit/blob/master/docs/examples/example.md) support.

The library is ported using [Emscripten](https://kripken.github.io/emscripten-site/index.html) sorcery.

To see the port in action, go visit the [3D Tune-In Online Toolkit](http://online-toolkit.3d-tune-in.eu) website.


#### Table of contents

* [Installation](#installation)
* [Usage](#usage)
* [API](#api)
* [Examples](#examples)
* [Development setup](#development-setup)


## Installation

For use directly in the browser, download the appropriate version of `3dti-toolkit.js` (or `3dti-toolkit.debug.js`) from the [Releases page](https://github.com/3DTune-In/3DTI_JavaScript_Wrapper/releases).

For use as a node module, copy `3dti-toolkit.module.js` (or `3dti-toolkit.module.debug.js`) from [one of the releases](https://github.com/3DTune-In/3DTI_JavaScript_Wrapper/releases) into your project. *No, there's sadly no package on npm.* 😥


## Usage

### Via the `script` tag

`3dti-toolkit.js` and `3dti-toolkit.debug.js` (debug version, duh) exposes an `AudioToolkit` function that instantiates the toolkit.

```html
<html>
  <body>
    <script src="3dti-toolkit.js"></script>
    <script>
    const toolkit = AudioToolkit()
    </script>
  </body>
</html>
```

### As a node module

```js
import AudioToolkit from './3dti-toolkit.module.js'

const toolkit = AudioToolkit()
```


## API

The stars are not fully aligned in the documentation kosmos, so you will have to reference [JsWrapperGlue.cpp](JsWrapperGlue.cpp) (the stuff inside `EMSCRIPTEN_BINDINGS(Toolkit) { ... }`) for the full API.


## Examples

The way you generally consume the toolkit is to:

1. create instances of the features you want,
2. create toolkit provided buffers (`CMonoBuffer`, `CStereoBuffer`, or `EarPairBuffers`) to hold your audio, and
3. process audio inside a [`ScriptProcessorNode`](https://developer.mozilla.org/en-US/docs/Web/API/ScriptProcessorNode) and copy the audio data from your toolkit buffers to the browser's buffers.

```js
import AudioToolkit from './3dti-toolkit.module.js'

const toolkit = AudioToolkit()
const audioContext = new AudioContext()

// Instantiate the feature you want to use, here a
// completely imaginary one.
const instance = new toolkit.FicticiousFeature()

// Create buffers to temporarly hold your audio data
const inputBuffers = new CStereoBuffer()
inputBuffers.resize(1024, 0)
const outputBuffers = new CStereoBuffer()
outputBuffers.resize(1024, 0)

// Create a ScriptProcessorNode
const processorNode = audioContext.createScriptProcessor(512, 2, 2)

// Process audio in the processorNode's onaudioprocess
// event callback
processorNode.onaudioprocess = audioProcessingEvent => {
  const { inputBuffer, outputBuffer } = audioProcessingEvent

  // Copy the audio data to your toolkit buffers
  for (let i = 0; i < processorNode.bufferSize; i++) {
    inputBuffers.set(i * 2, inputBuffer.getChannelData(0)[i])
    inputBuffers.set(i * 2 + 1, inputBuffer.getChannelData(1)[i])
  }

  // Let the toolkit do its thang
  instance.Process(inputBuffers, outputBuffers)

  // Copy back the processed audio data to the processor
  // node's buffers
  for (let i = 0; i < processorNode.bufferSize; i++) {
    outputBuffer.getChannelData(0)[i] = outputBuffers.get(i * 2)
    outputBuffer.getChannelData(1)[i] = outputBuffers.get(i * 2 + 1)
  }
}

// Mind your ears!
const masterVolume = audioContext.createGain()
masterVolume.gain.setValueAtTime(0.2, audioContext.currentTime)

// Connect the processor node to your audio chain
audioSourceObtainedSomehow.connect(processorNode)
processorNode.connect(masterVolume)
masterVolume.connect(audioContext.destination)
```

### A note on using the hearing aid and hearing loss simulators

`CHearingLossSim` and `CHearingAidSim` both provide a `Process(...)` method that you would normally use to process your audio. However, due to issues with porting the toolkit's `CEairPair` class, these are not available in this port. Instead, you are provided with `HearingLossSim_Process(...)` and `HearingAidSim_Process(...)`:

```js
import AudioToolkit from './3dti-toolkit.module.js'

const toolkit = AudioToolkit()
const hearingLossSimulator = new toolkit.CHearingLossSim()
const hearingAidSimulator = new toolkit.CHearingAidSim()

// Do code things...

// When it's time to process the audio:
toolkit.HearingLossSim_Process(
  hearingLossSimulator,
  inputBuffers, // An instance of EarPairBuffers
  outputBuffers // An instance of EarPairBuffers
)

// Same for the hearing aid simulator
toolkit.HearingAidSim_Process(
  hearingAidSimulator,
  inputBuffers, // An instance of EarPairBuffers
  outputBuffers // An instance of EarPairBuffers
)
```

### Using the binaural spatialiser

#### Instantiating the spatialiser

Due to severe trickiness in porting the toolkit's core and binaural features directly to JavaScript, a `BinauralAPI` wrapper provides the core functionality.

```js
const binauralApi = new toolkit.BinauralAPI()

// Create a listener (see below how to obtain `hrirsVector`)
const listener = binauralApi.CreateListener(hrirsVector, 0.0875)

// Create a source
const source = binauralApi.CreateSource()
```

#### Setting up the HRTF

The original toolkit accepts `.sofa` or `.3dti-hrtf` files as HRTF inputs. Parsers of these files have not been ported. Instead there is a helper function that gives you a vector that you then use to instantiate your listener:

```js
import AudioToolkit from './3dti-toolkit.module.js'
import { fetchHrirsVector } from '3dti-toolkit/lib/binaural/hrir.js'

const toolkit = AudioToolkit()
const audioContext = new AudioContext()

// Array of URLs to .wav files
const hrirUrls = [/* ... */]

// Fetch, decode and translate the .wav files
fetchHrirsVector(hrirUrls, toolkit, audioContext).then(hrirsVector => {

  // Now create the listener using the loaded HRIRs
  const listener = binauralApi.CreateListener(hrirsVector, 0.0875)
})
```

The only supported HRTF at the moment is [IRC_1032_C_R0195](assets/IRC_1032_C_R0195).


## Development setup

### Prerequisites

#### 1. Install `emcc`

The Emscripten compiler is called `emcc`. You need the `emcc` binary to be executable and globally accessible from the terminal, together with its dependencies. To download, install and setup `emcc`, go to the [Emscripten downloads page](https://kripken.github.io/emscripten-site/docs/getting_started/downloads.html).

#### 2. Install Node

To run the development environment you need `node` and [`npm`](npmjs.com), which you can [install here](https://nodejs.org/en/).

#### 3. Configure Emscripten to use the globally installed `node`

Emscripten ships with its own copy of `node`, but you should configure it to use your globally installed one.

Do that by changing the `NODE_JS` variable in the `.emscripten` configuration file located in your home directory, to the path to your global `node` executable. (Propably `/usr/local/bin/node` or `C:\\Program Files\\nodejs\\node.exe`.)

#### 4. Download submodules and node packages

```sh
# Install the toolkit core submodule
git submodule init
git submodule update

# Install node dependencies
npm install
```

### Compiling the wrappers

```sh
node ./compile.js -h
```


## License and acknowledgements

This library is released under the GNU General Public License v3.0 license. See [LICENSE](https://github.com/3DTune-In/3dti_AudioToolkit_JavaScript/blob/master/LICENSE.md) for details.

This is a partial JavaScript port of the [3D Tune-In Toolkit](https://github.com/3DTune-In/3dti_AudioToolkit). The 3D Tune-In Toolkit and the 3D Tune-In Resource Management Package are both Copyright (c) University of Malaga and Imperial College London – 2018.

![European Union](https://github.com/3DTune-In/3dti_AudioToolkit/blob/master/docs/images/EU_flag.png "European Union")This project has received funding from the European Union’s Horizon 2020 research and innovation programme under grant agreement No 644051.
