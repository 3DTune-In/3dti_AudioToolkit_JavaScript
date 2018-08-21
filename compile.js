const spawn = require('cross-spawn')
const globby = require('globby')
const yargs = require('yargs')

/**
 * Spawns a command and returns a promise resolving with the
 * closing code
 */
function exec(command, args, options) {
  return new Promise(resolve => {
    const child = spawn(command, args, options)
    child.stdout.on('data', data => process.stdout.write(data.toString()))
    child.stderr.on('data', err => process.stdout.write(err.toString()))
    child.on('close', code => resolve(code))
  })
}

const inputArgs = yargs
  .option('module', {
    alias: 'm',
    type: 'boolean',
    description: 'Exports library as a CommonJS module',
  })
  .option('worklet', {
    alias: 'w',
    type: 'boolean',
    description: 'Exports library as an AudioWorkletProcessor',
  })
  .option('debug', {
    type: 'boolean',
    description:
      'Enables internal debugging, memory growth and other helpful things',
  })
  .help('help')
  .alias('help', 'h')
  .argv

// Filenames
let outputFilename = '3dti-toolkit.js'
let preJsFilename = 'pre.js'
let postJsFilename = 'post-browser.js'

if (inputArgs.module === true) {
  outputFilename = '3dti-toolkit.module.js'
  postJsFilename = 'post-module.js'
} else if (inputArgs.worklet === true) {
  outputFilename = '3dti-toolkit.worklet.js'
  preJsFilename = 'pre-worklet.js'
  postJsFilename = 'post-worklet.js'
}

if (inputArgs.debug === true) {
  outputFilename = outputFilename.replace(/\.js$/, '.debug.js')
}

// Common args
let args = [
  '-std=c++11',
  '--bind',
  '-I', './3dti_AudioToolkit/3dti_Toolkit',
  '-o', `./build/${outputFilename}`,
  '-D', '_3DTI_AXIS_CONVENTION_BINAURAL_TEST_APP',
  '-D', '_3DTI_AXIS_CONVENTION_WEBAUDIOAPI',
  '-D', 'SWITCH_ON_3DTI_DEBUGGER',
  '--memory-init-file', '0',
  '-s', 'DEMANGLE_SUPPORT=1',
  '-s', 'ASSERTIONS=0',
  '-s', 'ABORTING_MALLOC=0',
  // '-s', 'NO_FILESYSTEM=1',
  '-s', `ALLOW_MEMORY_GROWTH=${inputArgs.worklet === true ? '0' : '1'}`,
  '--pre-js', './emscripten/pre.js',
  '--post-js', `./emscripten/${postJsFilename}`,
]

// Worklet options
if (inputArgs.worklet === true) {
  args = [
    ...args,
    '-s', 'WASM=1',
    // '-s', 'ENVIRONMENT="worker"',
    '-s', 'SINGLE_FILE=1',
    '-s', 'BINARYEN_ASYNC_COMPILATION=0',
  ]
}

// Code optimisation args
if (inputArgs.debug === true) {
  args = [
    ...args,
    '-g4',
    '-O2',
  ]
}
else {
  args = [
    ...args,
    '-s', 'TOTAL_MEMORY=33554432',
    '-g0',
    '-Oz',
  ]
}

// All source files are eventually added to the list of args
const globPatterns = ['Common', 'BinauralSpatializer', 'HAHLSimulation']
  .map(x => `./3dti_AudioToolkit/3dti_Toolkit/${x}/*.cpp`)

console.log(`\nBuilding ./build/${outputFilename}...\n`)

globby(globPatterns)
  .then(filePaths => ([
    ...args,
    './JsWrapperGlue.cpp',
    ...filePaths,
  ]))
  .then(finalArgs => {
    console.log(finalArgs)
    // return false
    return exec('emcc', finalArgs, {})
  })
  .then(() => console.log('Done!'))
  .catch(err => console.error(err))
