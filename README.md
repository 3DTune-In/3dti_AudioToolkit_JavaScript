# 3DTI JavaScript Wrapper

JavaScript wrapper for the 3DTI Toolkit. The wrapper is built using [Emscripten](https://kripken.github.io/emscripten-site/index.html).

## Feature status

**Hearing loss simulator**

* 🦄 Working demo
* 💔 Convenience helpers for easy drop-in replacement
* 💔 Glitch-free playback

**Hearing aid simulator**

* 💔 Working demo
* 💔 Convenience helpers for easy drop-in replacement
* 💔 Glitch-free playback

**Binaural spatialization**

* 🦄 Working demo
* 🦄 Convenience helpers for easy drop-in replacement
* 💔 Glitch-free playback

## Setup

#### Install `emcc`

The Emscripten compiler is called `emcc`. You need the `emcc` binary to be executable and globally accessible from the terminal, together with its dependencies. To download, install and setup `emcc`, go to the [Emscripten downloads page](https://kripken.github.io/emscripten-site/docs/getting_started/downloads.html).

#### Download submodules

```sh
# Install the toolkit core submodule
git submodule init
git submodule update
```

## Usage example

For a full implementation of using the binaural spatialization, check out [example.js](example.js).

Ideas on how this API should look and be consumed by developers are found inside [.idea](.idea).

## Compile the wrapper

To compile a build with source maps and other kinds of debugging sugar:

```sh
./compile-debug.sh
```

For a minimized bundle, run:

```sh
./compile.sh
```

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

Now, open [http://localhost:8080/example.html](http://localhost:8080/example.html) in your browser. When the "Loading..." changes to "Running", you will hear a then 60 year old Swedish man called Herman begin his 1969 christmas speech.

Using the `x`, `y` and `z` controls you can now move Herman around.
