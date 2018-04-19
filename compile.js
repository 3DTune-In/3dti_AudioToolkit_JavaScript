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

const outputFilename = inputArgs.debug === true
  ? '3dti-toolkit.js'
  : '3dti-toolkit.min.js'

let args = [
  '-std=c++11',
  '--bind',
  '-I', './3dti_AudioToolkit/3dti_Toolkit',
  '-s', 'EXPORT_NAME=\'AudioToolkit\'',
  '-s', 'MODULARIZE=1',
  '-o', `./build/${outputFilename}`,
  '-D', '_3DTI_AXIS_CONVENTION_BINAURAL_TEST_APP',
  '-D', '_3DTI_AXIS_CONVENTION_WEBAUDIOAPI',
  '-D', 'SWITCH_ON_3DTI_DEBUGGER',
  '--memory-init-file', '0',
  '-s', 'DEMANGLE_SUPPORT=1',
  '-s', 'ASSERTIONS=0',
  '-s', 'ABORTING_MALLOC=0',
  // '-s', 'NO_FILESYSTEM=1',
  '-s', 'ALLOW_MEMORY_GROWTH=1',
]

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
    return exec('emcc', finalArgs, {})
  })
  .then(() => console.log('Done!'))
  .catch(err => console.error(err))
