#include <stdio.h>
#include <vector>
#include <emscripten/bind.h>
#include "glue/Logger.hpp"
#include "3DTI_Toolkit_Core/Common/Buffer.h"
#include "3DTI_Toolkit_Core/Common/Debugger.h"
// #include "3DTI_Toolkit_Core/Common/Quaternion.h"
// #include "3DTI_Toolkit_Core/Common/Transform.h"
#include "3DTI_Toolkit_Core/HAHLSimulation/Compressor.h"
#include "3DTI_Toolkit_Core/HAHLSimulation/HearingLossSim.h"

using namespace emscripten;

// Bindings
EMSCRIPTEN_BINDINGS(Toolkit) {

  /**
   * Logger
   */
  class_<Logger>("Logger")
    .class_function("GetLastLogMessage", &Logger::GetLastLogMessage)
    .class_function("GetLastErrorMessage", &Logger::GetLastErrorMessage);

  /**
   * CStereoBuffer
   */
	typedef CStereoBuffer<float> VecType;
	void (VecType::*resize)(const size_t, const float&) = &VecType::resize;
	class_<CStereoBuffer<float>>("CStereoBuffer")
		.template constructor<>()
		.function("resize", resize)
		.function("get", &internal::VectorAccess<VecType>::get)
		.function("set", &internal::VectorAccess<VecType>::set)
		;

  /**
   * CHearingLossSim
   */
  class_<CHearingLossSim>("CHearingLossSim")
  	.constructor<>()
  	.function("Setup", &CHearingLossSim::Setup)
  	.function("SetGains_dB", &CHearingLossSim::SetGains_dB)
  	.function("SetBandGain_dB", &CHearingLossSim::SetBandGain_dB)
  	.function("Process", select_overload<void(
  		CStereoBuffer<float> &inputBuffer, CStereoBuffer<float> &outputBuffer,
			bool fbProcessLeft, bool fbProcessRight,
			bool compressorFirst,
			bool compressL, bool compressR
		)>(&CHearingLossSim::Process))
  	.property("Compr_L", &CHearingLossSim::Compr_L)
  	.property("Compr_R", &CHearingLossSim::Compr_R)
  	;

  /**
   * Compressor
   */
  class_<CCompressor>("CCompressor")
  	.constructor<>()
  	.property("knee", &CCompressor::knee)
  	.property("ratio", &CCompressor::ratio)
  	.property("threshold", &CCompressor::threshold)
  	;
}
