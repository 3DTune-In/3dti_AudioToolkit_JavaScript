# 3DTI JavaScript Wrapper

JavaScript wrapper(s) for the 3DTI Toolkit. The wrapper is built using [Emscripten](https://kripken.github.io/emscripten-site/index.html).

* [Feature status](#feature-status)
* [Setup](#setup)
* [Compiling the wrappers](#compiling-the-wrappers)
* [Usage](#usage)
* [Running examples in the browser](#running-examples-in-the-browser)


## Feature status

🦄 = Works, 🤖 = Kinda works, 💔 = Doesn't work

**Hearing loss simulator**

* 🦄 Working demo
* 💔 Convenience helpers for easy drop-in replacement
* 🤖 Glitch-free playback

**Hearing aid simulator**

* 🦄 Working demo
* 💔 Convenience helpers for easy drop-in replacement
* 🤖 Glitch-free playback

**Binaural spatialization**

* 🤖 Working demo
* 🦄 Convenience helpers for easy drop-in replacement
* 🤖 Glitch-free playback


## Setup

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


## Compiling the wrappers

To build the three wrappers separately:

```sh
# For *nix users:
./compile-binaural-debug.sh
./compile-has-debug.sh
./compile-hls-debug.sh

# For Windows users:
compile-binaural-debug.bat
compile-has-debug.bat
compile-hls-debug.bat
```

To build all the things in one swift command:

```sh
# For *nix users:
npm run build:toolkit:nix

# For Windows users (yes, you guessed it):
npm run build:toolkit:win
```


## Usage

Ideas, new and old, on how this API should look and be consumed by developers are found inside [.idea](.idea).

For example implementations, look in the examples' JavaScript files.


## Running examples in the browser

```sh
# For *nix users:
npm run start:nix

# For Windows users (yes, you guessed it):
npm run start:win
```

If you have already the wrappers compiled, you can simply run:

```sh
npm run examples
```
