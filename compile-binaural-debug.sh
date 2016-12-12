emcc \
  -std=c++11 \
  --bind \
  -I 3DTI_Toolkit_Core \
  -o build/3dti-toolkit-binaural.js \
  -D _3DTI_AXIS_CONVENTION_OPENFRAMEWORK \
  -D SWITCH_ON_3DTI_DEBUGGER \
  -g4 \
  -s DEMANGLE_SUPPORT=1 \
  -s ASSERTIONS=2 \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s ABORTING_MALLOC=0 \
  JsWrapperGlue.cpp \
  3DTI_Toolkit_Core/Common/*.cpp \
  3DTI_Toolkit_Core/BinauralSpatializer/*.cpp \
  3DTI_Toolkit_Core/HAHLSimulation/HearingAidSim.cpp