
// Bindings utilities

function WrapperObject() {
}
WrapperObject.prototype = Object.create(WrapperObject.prototype);
WrapperObject.prototype.constructor = WrapperObject;
WrapperObject.prototype.__class__ = WrapperObject;
WrapperObject.__cache__ = {};
Module['WrapperObject'] = WrapperObject;

function getCache(__class__) {
  return (__class__ || WrapperObject).__cache__;
}
Module['getCache'] = getCache;

function wrapPointer(ptr, __class__) {
  var cache = getCache(__class__);
  var ret = cache[ptr];
  if (ret) return ret;
  ret = Object.create((__class__ || WrapperObject).prototype);
  ret.ptr = ptr;
  return cache[ptr] = ret;
}
Module['wrapPointer'] = wrapPointer;

function castObject(obj, __class__) {
  return wrapPointer(obj.ptr, __class__);
}
Module['castObject'] = castObject;

Module['NULL'] = wrapPointer(0);

function destroy(obj) {
  if (!obj['__destroy__']) throw 'Error: Cannot destroy object. (Did you create it yourself?)';
  obj['__destroy__']();
  // Remove from cache, so the object can be GC'd and refs added onto it released
  delete getCache(obj.__class__)[obj.ptr];
}
Module['destroy'] = destroy;

function compare(obj1, obj2) {
  return obj1.ptr === obj2.ptr;
}
Module['compare'] = compare;

function getPointer(obj) {
  return obj.ptr;
}
Module['getPointer'] = getPointer;

function getClass(obj) {
  return obj.__class__;
}
Module['getClass'] = getClass;

// Converts a value into a C-style string, storing it in temporary space

var ensureStringCache = {
  buffer: 0,  // the main buffer of temporary storage
  size: 0,   // the size of buffer
  pos: 0,    // the next free offset in buffer
  temps: [], // extra allocations
  needed: 0, // the total size we need next time

  prepare: function() {
    if (this.needed) {
      // clear the temps
      for (var i = 0; i < this.temps.length; i++) {
        Module['_free'](this.temps[i]);
      }
      this.temps.length = 0;
      // prepare to allocate a bigger buffer
      Module['_free'](this.buffer);
      this.buffer = 0;
      this.size += this.needed;
      // clean up
      this.needed = 0;
    }
    if (!this.buffer) { // happens first time, or when we need to grow
      this.size += 100; // heuristic, avoid many small grow events
      this.buffer = Module['_malloc'](this.size);
      assert(this.buffer);
    }
    this.pos = 0;
  },
  alloc: function(value) {
    assert(this.buffer);
    var array = intArrayFromString(value);
    var len = array.length;
    var ret;
    if (this.pos + len >= this.size) {
      // we failed to allocate in the buffer, this time around :(
      assert(len > 0); // null terminator, at least
      this.needed += len;
      ret = Module['_malloc'](len);
      this.temps.push(ret);
    } else {
      // we can allocate in the buffer
      ret = this.buffer + this.pos;
      this.pos += len;
    }
    writeArrayToMemory(array, ret);
    return ret;
  },
};

function ensureString(value) {
  if (typeof value === 'string') return ensureStringCache.alloc(value);
  return value;
}


// HRTFFactory
function HRTFFactory() { throw "cannot construct a HRTFFactory, no constructor in IDL" }
HRTFFactory.prototype = Object.create(WrapperObject.prototype);
HRTFFactory.prototype.constructor = HRTFFactory;
HRTFFactory.prototype.__class__ = HRTFFactory;
HRTFFactory.__cache__ = {};
Module['HRTFFactory'] = HRTFFactory;

HRTFFactory.prototype['create'] = HRTFFactory.prototype.create = function(arg0) {
  var self = this.ptr;
  if (arg0 && typeof arg0 === 'object') arg0 = arg0.ptr;
  return wrapPointer(_emscripten_bind_HRTFFactory_create_1(self, arg0), CHRTF);
};;

  HRTFFactory.prototype['__destroy__'] = HRTFFactory.prototype.__destroy__ = function() {
  var self = this.ptr;
  _emscripten_bind_HRTFFactory___destroy___0(self);
};
// VoidPtr
function VoidPtr() { throw "cannot construct a VoidPtr, no constructor in IDL" }
VoidPtr.prototype = Object.create(WrapperObject.prototype);
VoidPtr.prototype.constructor = VoidPtr;
VoidPtr.prototype.__class__ = VoidPtr;
VoidPtr.__cache__ = {};
Module['VoidPtr'] = VoidPtr;

  VoidPtr.prototype['__destroy__'] = VoidPtr.prototype.__destroy__ = function() {
  var self = this.ptr;
  _emscripten_bind_VoidPtr___destroy___0(self);
};
// HRIR
function HRIR(arg0, arg1, arg2) {
  if (arg0 && typeof arg0 === 'object') arg0 = arg0.ptr;
  if (arg1 && typeof arg1 === 'object') arg1 = arg1.ptr;
  if (arg2 && typeof arg2 === 'object') arg2 = arg2.ptr;
  this.ptr = _emscripten_bind_HRIR_HRIR_3(arg0, arg1, arg2);
  getCache(HRIR)[this.ptr] = this;
};;
HRIR.prototype = Object.create(WrapperObject.prototype);
HRIR.prototype.constructor = HRIR;
HRIR.prototype.__class__ = HRIR;
HRIR.__cache__ = {};
Module['HRIR'] = HRIR;

  HRIR.prototype['__destroy__'] = HRIR.prototype.__destroy__ = function() {
  var self = this.ptr;
  _emscripten_bind_HRIR___destroy___0(self);
};
// CHRTF
function CHRTF() {
  this.ptr = _emscripten_bind_CHRTF_CHRTF_0();
  getCache(CHRTF)[this.ptr] = this;
};;
CHRTF.prototype = Object.create(WrapperObject.prototype);
CHRTF.prototype.constructor = CHRTF;
CHRTF.prototype.__class__ = CHRTF;
CHRTF.__cache__ = {};
Module['CHRTF'] = CHRTF;

  CHRTF.prototype['__destroy__'] = CHRTF.prototype.__destroy__ = function() {
  var self = this.ptr;
  _emscripten_bind_CHRTF___destroy___0(self);
};
(function() {
  function setupEnums() {
    
  }
  if (Module['calledRun']) setupEnums();
  else addOnPreMain(setupEnums);
})();
