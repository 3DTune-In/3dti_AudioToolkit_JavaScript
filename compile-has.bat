emcc ^
  -std=c++11 ^
  --bind ^
  -I 3DTI_Toolkit_Core ^
  -o build/3dti-toolkit-has.min.js ^
  -D _3DTI_AXIS_CONVENTION_OPENFRAMEWORK ^
  -D SWITCH_ON_3DTI_DEBUGGER ^
  -g0 ^
  -Oz ^
  --memory-init-file 0 ^
  -s DEMANGLE_SUPPORT=1 ^
  -s ASSERTIONS=2 ^
  -s ABORTING_MALLOC=0 ^
  JsWrapperGlue_HAS.cpp ^
  3DTI_Toolkit_Core/Common/AIR.cpp ^
  3DTI_Toolkit_Core/Common/AudioState.cpp ^
  3DTI_Toolkit_Core/Common/BiquadFilter.cpp ^
  3DTI_Toolkit_Core/Common/Buffer.cpp ^
  3DTI_Toolkit_Core/Common/Debugger.cpp ^
  3DTI_Toolkit_Core/Common/DistanceAttenuator.cpp ^
  3DTI_Toolkit_Core/Common/FarDistanceEffects.cpp ^
  3DTI_Toolkit_Core/Common/Fconvolver.cpp ^
  3DTI_Toolkit_Core/Common/Fig6Algorithm.cpp ^
  3DTI_Toolkit_Core/Common/FiltersChain.cpp ^
  3DTI_Toolkit_Core/Common/Magnitudes.cpp ^
  3DTI_Toolkit_Core/Common/Profiler.cpp ^
  3DTI_Toolkit_Core/Common/Quaternion.cpp ^
  3DTI_Toolkit_Core/Common/Transform.cpp ^
  3DTI_Toolkit_Core/Common/Vector3.cpp ^
  3DTI_Toolkit_Core/Common/fftsg.cpp ^
  3DTI_Toolkit_Core/HAHLSimulation/DynamicEqualizer.cpp ^
  3DTI_Toolkit_Core/HAHLSimulation/EnvelopeDetector.cpp ^
  3DTI_Toolkit_Core/HAHLSimulation/FiltersBank.cpp ^
  3DTI_Toolkit_Core/HAHLSimulation/HearingAidSim.cpp
