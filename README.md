# 3DTI JavaScript Wrapper

## Setup

```sh
# Install the toolkit core submodule
git submodule init
git submodule update
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

Now, open [http://localhost:8080](http://localhost:8080) in your browser!
