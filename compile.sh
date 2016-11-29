emcc \
  -std=c++11 \
  --bind \
  -Oz \
  -I 3DTI_Toolkit_Core \
  -o build/3dti-toolkit.min.js \
  -D SWITCH_ON_3DTI_DEBUGGER \
  -D _3DTI_AXIS_CONVENTION_OPENFRAMEWORK \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s ABORTING_MALLOC=0 \
  JsWrapperGlue.cpp \
  3DTI_Toolkit_Core/Common/*.cpp \
  3DTI_Toolkit_Core/BinauralSpatializer/*.cpp
