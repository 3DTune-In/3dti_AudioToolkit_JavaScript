/**
 * Fetches an HRTF file and returns it as an array buffer.
 *
 * @param  {String} url  The URL to the HRTF file
 * @return               An array buffer
 */
export const fetchHrtfFile = url => {
  return new Promise(resolve => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', url, true)
    xhr.responseType = 'arraybuffer'
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        resolve(xhr.response)
      }
    }
    xhr.send()
  })
}

/**
 * Registers an HRTF file with the toolkit and returns its
 * virtual file path.
 *
 * More specifically, it creates a file on emscripten's virtual
 * file system, where it will then be accessible internally
 * by the toolkit.
 *
 * @param  {String}      filename  The HRTF file's filename
 * @param  {ArrayBuffer} data      The HRTF file data
 * @return {String}                A (virtual) file path
 */
export const registerHrtf = (toolkit, filename, data) => {
  toolkit.FS_createDataFile('/', filename, data, true, true, true)
  return `/${filename}`
}
