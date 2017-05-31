emcc \
  -std=c++11 \
  --bind \
  -I 3DTI_Toolkit_Core \
  -o build/3dti-toolkit-hls.min.js \
  -D _3DTI_AXIS_CONVENTION_WEBAUDIOAPI \
  -D SWITCH_ON_3DTI_DEBUGGER \
  -O2 \
  -s DEMANGLE_SUPPORT=1 \
  -s ASSERTIONS=2 \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s ABORTING_MALLOC=0 \
  JsWrapperGlue_HLS.cpp \
  3DTI_Toolkit_Core/Common/*.cpp \
  3DTI_Toolkit_Core/HAHLSimulation/FiltersBank.cpp \
  3DTI_Toolkit_Core/HAHLSimulation/HearingLossSim.cpp
