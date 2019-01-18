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
  .option('debug', {
    type: 'boolean',
    description:
      'Enables internal debugging, memory growth and other helpful things',
  })
  .help('help')
  .alias('help', 'h')
  .argv

// Filename
let outputFilename = inputArgs.debug === true
  ? '3dti-toolkit.debug.js'
  : '3dti-toolkit.js'

// Common args
let args = [
  '-std=c++11',
  '--bind',
  '-I', './3dti_AudioToolkit/3dti_Toolkit',
  '-I', './3dti_AudioToolkit/3dti_ResourceManager/third_party_libraries/cereal/include',
  '-o', `./build/${outputFilename}`,
  '-D', '_3DTI_AXIS_CONVENTION_BINAURAL_TEST_APP',
  '-D', '_3DTI_AXIS_CONVENTION_WEBAUDIOAPI',
  '--memory-init-file', '0',
  '-s', 'DEMANGLE_SUPPORT=1',
  '-s', 'ABORTING_MALLOC=0',
  // '-s', 'NO_FILESYSTEM=1',
  '-s', 'ALLOW_MEMORY_GROWTH=1',
  '-s', 'WASM=0',
  '-s', 'EXPORT_NAME="AudioToolkit"',
  '-s', 'MODULARIZE=1',
  '-s', 'FORCE_FILESYSTEM=1',
]

// Code optimisation args
if (inputArgs.debug === true) {
  args = [
    ...args,
    '-s', 'ASSERTIONS=1',
    '-s', 'DISABLE_EXCEPTION_CATCHING=0',
    '-g4',
    '-O2',
  ]
}
else {
  args = [
    ...args,
    '-s', 'TOTAL_MEMORY=33554432',
    '-s', 'ASSERTIONS=0',
    '-g0',
    '-Oz',
  ]
}

// All source files are eventually added to the list of args
const globPatterns = ['Common', 'BinauralSpatializer', 'HAHLSimulation']
  .map(x => `./3dti_AudioToolkit/3dti_Toolkit/${x}/*.cpp`)
  // Plus cereal HRTF stuff
  .concat('./3dti_AudioToolkit/3dti_ResourceManager/HRTF/HRTFCereal.cpp')

console.log(`\nBuilding ./build/${outputFilename}...\n`)

globby(globPatterns)
  .then(filePaths => ([
    ...args,
    './JsWrapperGlue.cpp',
    ...filePaths,
  ]))
  .then(finalArgs => {
    return exec('emcc', finalArgs, {})
  })
  .then(() => console.log('Done!'))
  .catch(err => console.error(err))
