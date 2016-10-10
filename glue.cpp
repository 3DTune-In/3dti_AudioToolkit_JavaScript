
#include <emscripten.h>

extern "C" {

// Not using size_t for array indices as the values used by the javascript code are signed.
void array_bounds_check(const int array_size, const int array_idx) {
  if (array_idx < 0 || array_idx >= array_size) {
    EM_ASM_INT({
      throw 'Array index ' + $0 + ' out of bounds: [0,' + $1 + ')';
    }, array_idx, array_size);
  }
}

// HRTFFactory

CHRTF* EMSCRIPTEN_KEEPALIVE emscripten_bind_HRTFFactory_create_1(HRTFFactory* self, HRIR* arg0) {
  static CHRTF temp;
  return (temp = self->create(arg0), &temp);
}

void EMSCRIPTEN_KEEPALIVE emscripten_bind_HRTFFactory___destroy___0(HRTFFactory* self) {
  delete self;
}

// VoidPtr

void EMSCRIPTEN_KEEPALIVE emscripten_bind_VoidPtr___destroy___0(void** self) {
  delete self;
}

// HRIR

HRIR* EMSCRIPTEN_KEEPALIVE emscripten_bind_HRIR_HRIR_3(float arg0, int arg1, int arg2) {
  return new HRIR(arg0, arg1, arg2);
}

void EMSCRIPTEN_KEEPALIVE emscripten_bind_HRIR___destroy___0(HRIR* self) {
  delete self;
}

// CHRTF

CHRTF* EMSCRIPTEN_KEEPALIVE emscripten_bind_CHRTF_CHRTF_0() {
  return new CHRTF();
}

void EMSCRIPTEN_KEEPALIVE emscripten_bind_CHRTF___destroy___0(CHRTF* self) {
  delete self;
}

}

