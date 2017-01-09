#include <stdio.h>
#include <vector>
#include <emscripten/bind.h>
#include "glue/Logger.hpp"
#include "glue/FloatList.hpp"
#include "3DTI_Toolkit_Core/Common/Buffer.h"
#include "3DTI_Toolkit_Core/Common/Debugger.h"
// #include "3DTI_Toolkit_Core/Common/Quaternion.h"
// #include "3DTI_Toolkit_Core/Common/Transform.h"
#include "3DTI_Toolkit_Core/HAHLSimulation/Compressor.h"
#include "3DTI_Toolkit_Core/HAHLSimulation/HearingLossSim.h"

using namespace emscripten;

/**
 * Processor
 */
class HLSProcessor
{
public:
	HLSProcessor();

	static void Process(
		CHearingLossSim & simulator,
		FloatList & inputData,
		FloatList & outputData,
		bool fbProcessLeft,
		bool fbProcessRight,
		bool compressorFirst,
		bool compressL,
		bool compressR)
	{
		CStereoBuffer<float> inputBuffer;
    CStereoBuffer<float> outputBuffer;

    for (int i = 0; i < inputData.Size(); i++)
    {
      inputBuffer.push_back(inputData.Get(i));

      // FiltersBank::Process asserts the passed output buffer to have the
      // same size as the input buffer
      outputBuffer.push_back(0);
    }

    // outputBuffer.reserve(inputBuffer.size());

    // printf("%d %d %d %d \n", inputBuffer.size(), outputBuffer.size(), inputData.Size(), outputData.Size());

    // This ought to be done client side
    simulator.Compr_L.threshold = -20.f;
		simulator.Compr_L.ratio = 4.f;
		simulator.Compr_R.threshold = -20.f;
		simulator.Compr_R.ratio = 4.f;

		// printf("simulator.Process(..., ..., %i, %i, %i, %i, %i)\n", fbProcessLeft, fbProcessRight, compressorFirst, compressL, compressR);

    simulator.Process(inputBuffer, outputBuffer, fbProcessLeft, fbProcessRight, compressorFirst, compressL, compressR);

    for (int i = 0; i < outputBuffer.size(); ++i)
    {
    	outputData.Set(i, outputBuffer[i]);
    }
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
    .function("Get", &FloatList::Get)
    .function("Set", &FloatList::Set)
    ;

  /**
   * CHearingLossSim
   */
  class_<CHearingLossSim>("CHearingLossSim")
  	.constructor<>()
  	.function("Setup", &CHearingLossSim::Setup)
  	.function("SetGains_dB", &CHearingLossSim::SetGains_dB)
  	.function("SetBandGain_dB", &CHearingLossSim::SetBandGain_dB)
  	.function("Process", &CHearingLossSim::Process)
  	.property("Compr_L", &CHearingLossSim::Compr_L)
  	.property("Compr_R", &CHearingLossSim::Compr_R)
  	;

  /**
   * Compressor
   */
  class_<CCompressor>("CCompressor")
  	.property("knee", &CCompressor::knee)
  	.property("ratio", &CCompressor::ratio)
  	.property("threshold", &CCompressor::threshold)
  	;

  /**
   * Custom processor wrapper
   */
 	class_<HLSProcessor>("HLSProcessor")
 		.class_function("Process", &HLSProcessor::Process)
 		;
}
