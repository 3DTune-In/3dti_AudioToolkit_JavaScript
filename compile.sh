emcc \
  -std=c++11 \
  --bind \
  -I 3DTI_Toolkit_Core \
  -o HRTFFactory.js \
  HRTFFactory.cpp 3DTI_Toolkit_Core/*.cpp