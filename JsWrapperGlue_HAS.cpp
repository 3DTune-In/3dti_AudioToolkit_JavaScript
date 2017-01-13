#include <stdio.h>
#include <vector>
#include <emscripten/bind.h>
#include "glue/Logger.hpp"
#include "3DTI_Toolkit_Core/Common/Buffer.h"
#include "3DTI_Toolkit_Core/Common/Debugger.h"
#include "3DTI_Toolkit_Core/HAHLSimulation/Compressor.h"
#include "3DTI_Toolkit_Core/HAHLSimulation/HearingAidSim.h"

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
   * CHearingAidSim
   */
  class_<CHearingAidSim>("CHearingAidSim")
  	.constructor<>()
  	.function("Setup", &CHearingAidSim::Setup)
  	.function("SetGains_dB", &CHearingAidSim::SetGains_dB)
  	.function("SetBandGain_dB", &CHearingAidSim::SetBandGain_dB)
  	.function("ConfigLPF", &CHearingAidSim::ConfigLPF)
  	.function("ConfigHPF", &CHearingAidSim::ConfigHPF)
  	.function("Process", &CHearingAidSim::Process)
  	.function("ProcessDirectionality", &CHearingAidSim::ProcessDirectionality)
  	;
}
