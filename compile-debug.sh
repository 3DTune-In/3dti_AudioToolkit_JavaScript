emcc \
  -std=c++11 \
  --bind \
  -I 3DTI_Toolkit_Core \
  -o build/3dti-toolkit.js \
  -D _3DTI_AXIS_CONVENTION_WEBAUDIOAPI \
  -D SWITCH_ON_3DTI_DEBUGGER \
  -g4 \
  -O2 \
  --memory-init-file 0 \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s DEMANGLE_SUPPORT=1 \
  -s ASSERTIONS=0 \
  -s ABORTING_MALLOC=0 \
  -s NO_FILESYSTEM=1 \
  -s TOTAL_MEMORY=33554432 \
  JsWrapperGlue_All.cpp \
  3DTI_Toolkit_Core/Common/*.cpp \
  3DTI_Toolkit_Core/BinauralSpatializer/*.cpp \
  3DTI_Toolkit_Core/HAHLSimulation/DynamicEqualizer.cpp \
  3DTI_Toolkit_Core/HAHLSimulation/Fig6Algorithm.cpp \
  3DTI_Toolkit_Core/HAHLSimulation/FiltersBank.cpp \
  3DTI_Toolkit_Core/HAHLSimulation/HearingAidSim.cpp \
  3DTI_Toolkit_Core/HAHLSimulation/HearingLossSim.cpp
