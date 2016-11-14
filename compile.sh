emcc \
  -std=c++11 \
  --bind \
  -I 3DTI_Toolkit_Core \
  -o HRTFFactory.js \
  -D _3DTI_AXIS_CONVENTION_OPENFRAMEWORK \
  -D SWITCH_ON_3DTI_DEBUGGER \
  HRTFFactory.cpp \
  3DTI_Toolkit_Core/Common/*.cpp \
  3DTI_Toolkit_Core/BinauralSpatializer/*.cpp
