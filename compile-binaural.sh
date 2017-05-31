# https://kripken.github.io/emscripten-site/docs/tools_reference/emcc.html
emcc \
  -std=c++11 \
  --bind \
  -I 3DTI_Toolkit_Core \
  -o build/3dti-toolkit-binaural.min.js \
  -D _3DTI_AXIS_CONVENTION_WEBAUDIOAPI \
  -D SWITCH_ON_3DTI_DEBUGGER \
  -g0 \
  -Oz \
  --memory-init-file 0 \
  -s ASSERTIONS=0 \
  -s ABORTING_MALLOC=0 \
  -s TOTAL_MEMORY=67108864 \
  JsWrapperGlue_Binaural.cpp \
  3DTI_Toolkit_Core/Common/*.cpp \
  3DTI_Toolkit_Core/BinauralSpatializer/*.cpp \
  3DTI_Toolkit_Core/HAHLSimulation/DynamicEqualizer.cpp \
  3DTI_Toolkit_Core/Common/EnvelopeDetector.cpp \
  3DTI_Toolkit_Core/HAHLSimulation/FiltersBank.cpp \
  3DTI_Toolkit_Core/HAHLSimulation/HearingAidSim.cpp
