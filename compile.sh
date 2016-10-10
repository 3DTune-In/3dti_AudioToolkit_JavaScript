
emcc -std=c++11 \
HRTFFactory.h \
3DTI_Toolkit_Core/*.cpp \
-o hello.html --preload-file tests/hello_world_file.txt \
-I 3DTI_Toolkit_Core/