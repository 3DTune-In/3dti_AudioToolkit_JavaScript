# 3DTI JavaScript Wrapper

JavaScript wrapper for the 3DTI Toolkit. Currently it only exposes an `HRTFFactory` that can be populated with IIR sample data.

## Setup

```sh
# Install the toolkit core submodule
git submodule init
git submodule update
```

## Usage example

For a full implementation, check out [hrtf.js](hrt.js).

Ideas on how this API should look and be consumed by developers are found inside [.idea](.idea).

```js
// Returns an array of objects with the shape { buffer, azimuth, elevation }
function fetchWavFiles(urls) { ... }

// Load the samples and populate the HRTFFactory
fetchWavFiles(hrirUrls)
  .then(results => {
  
    // Create an array of Module.HRIR instances containing a buffer
    // of a compatible format
    const hrirs = results.map(hrir => {
      const { buffer, azimuth, elevation } = hrir

      const bufferVec = new Module.VectorFloat
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        for (let i = 0; i < buffer.length; i++) {
          bufferVec.push_back(buffer.getChannelData(channel)[i])
        }
      }
      return new Module.HRIR(bufferVec, azimuth, elevation)
    })

    // Transform that array into a vector
    const hrirsVec = new Module.VectorHRIR()
    hrirs.forEach(hrir => {
      hrirsVec.push_back(hrir)
    })

    // Create an HRTF instance using the factory
    const hrtf = Module.HRTFFactory.create(hrirsVec)
  })
```

## Compile the wrapper

(This is not a wrapper yet, but a w.i.p. bundle for testing.)

```sh
emcc \
  -std=c++11 \
  --bind \
  -I 3DTI_Toolkit_Core \
  -o HRTFFactory.js \
  HRTFFactory.cpp 3DTI_Toolkit_Core/*.cpp
```

If you're feeling lazy, you can run this harangue by executing

```sh
bash ./compile.sh
```

The output of the compilation is `HRTFFactory.js`.

## Run the thing in the browser

You need a tool for running a web server locally on your computer.

If you are a python kinda person:

```sh
pip install SimpleHTTPServer
python -m SimpleHTTPServer 8080
```

If JavaScript is more your thang:

```sh
npm i -g http-server
http-server --port 8080 .
```

Now, open [http://localhost:8080](http://localhost:8080) in your browser. If you see something like

```
pre-main prep time: 794 ms
(187) Size 1024
```

it means 187 IIR samples have been loaded and added to the `HRTFFactory`.
