#include <stdio.h>
#include <vector>
#include <emscripten/bind.h>
#include "glue/Logger.hpp"
#include "glue/FloatList.hpp"
#include "3DTI_Toolkit_Core/Common/Buffer.h"
#include "3DTI_Toolkit_Core/Common/Debugger.h"
#include "3DTI_Toolkit_Core/HAHLSimulation/Compressor.h"
#include "3DTI_Toolkit_Core/HAHLSimulation/HearingAidSim.h"

using namespace emscripten;

/**
 * Processor
 */
class HASProcessor
{
public:
	HASProcessor();

	static FloatList Process(
		CHearingAidSim & simulator,
		FloatList & inputData,
		bool processLeft,
		bool processRight)
	{
		CStereoBuffer<float> inputBuffer;
    CStereoBuffer<float> outputBuffer;

    for (int i = 0; i < inputData.Size(); i++)
    {
      inputBuffer.push_back(inputData.Get(i));

      // FiltersBank::Process asserts the passed output buffer to have the
      // same size as the input buffer
      outputBuffer.push_back(inputData.Get(i));
    }

    simulator.Process(inputBuffer, outputBuffer, processLeft, processRight);

    FloatList outputData(outputBuffer);
    return outputData;
	}
};


// Bindings
EMSCRIPTEN_BINDINGS(Toolkit) {

  /**
   * Logger
   */
  class_<Logger>("Logger")
    .class_function("GetLastLogMessage", &Logger::GetLastLogMessage)
    .class_function("GetLastErrorMessage", &Logger::GetLastErrorMessage);

  /**
   * FloatList bindings
   */
  class_<FloatList>("FloatList")
    .constructor<>()
    .function("Size", &FloatList::Size)
    .function("Add", &FloatList::Add)
    .function("Get", &FloatList::Get);

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

  /**
   * Custom processor wrapper
   */
 	class_<HASProcessor>("HASProcessor")
 		.class_function("Process", &HASProcessor::Process)
 		;
}
