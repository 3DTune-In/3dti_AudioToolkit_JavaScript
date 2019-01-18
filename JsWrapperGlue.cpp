#include <stdio.h>
#include <vector>
#include <emscripten/bind.h>
#include "3dti_AudioToolkit/3dti_Toolkit/Common/Buffer.h"
#include "3dti_AudioToolkit/3dti_Toolkit/Common/CommonDefinitions.h"
#include "3dti_AudioToolkit/3dti_Toolkit/Common/DynamicCompressorMono.h"
#include "3dti_AudioToolkit/3dti_Toolkit/Common/DynamicExpanderMono.h"
#include "3dti_AudioToolkit/3dti_Toolkit/Common/Quaternion.h"
#include "3dti_AudioToolkit/3dti_Toolkit/Common/Transform.h"
#include "3dti_AudioToolkit/3dti_Toolkit/HAHLSimulation/ClassificationScaleHL.h"
#include "3dti_AudioToolkit/3dti_Toolkit/HAHLSimulation/DynamicEqualizer.h"
#include "3dti_AudioToolkit/3dti_Toolkit/HAHLSimulation/HearingAidSim.h"
#include "3dti_AudioToolkit/3dti_Toolkit/HAHLSimulation/HearingLossSim.h"
#include "3dti_AudioToolkit/3dti_Toolkit/HAHLSimulation/FrequencySmearing.h"
#include "3dti_AudioToolkit/3dti_Toolkit/HAHLSimulation/MultibandExpander.h"
#include "3dti_AudioToolkit/3dti_Toolkit/HAHLSimulation/TemporalDistortionSimulator.h"
#include "3dti_AudioToolkit/3dti_Toolkit/BinauralSpatializer/HRTF.h"
#include "3dti_AudioToolkit/3dti_Toolkit/BinauralSpatializer/Listener.h"
#include "3dti_AudioToolkit/3dti_Toolkit/BinauralSpatializer/SingleSourceDSP.h"
#include "3dti_AudioToolkit/3dti_ResourceManager/HRTF/HRTFCereal.h"

// No need to import this since virtually every other class
// imports it already.
// #include "3dti_AudioToolkit/3dti_Toolkit/Common/ErrorHandler.h"

using namespace emscripten;

/**
 * HRIR wrapper
 */
class HRIR
{
public:
  HRIR(CMonoBuffer<float> leftBuffer, CMonoBuffer<float> rightBuffer, int azimuth, int elevation)
    : leftBuffer(leftBuffer), rightBuffer(rightBuffer), azimuth(azimuth), elevation(elevation)
  {}

  CMonoBuffer<float> leftBuffer;
  CMonoBuffer<float> rightBuffer;
  int azimuth;
  int elevation;
};

/**
 * Main API
 */
class BinauralAPI
{
public:
  BinauralAPI()
  {
    core = Binaural::CCore();
  }

  ~BinauralAPI() {}

  /**
   * Returns a CSingleSourceDSP instance
   */
  shared_ptr<Binaural::CSingleSourceDSP> CreateSource()
  {
    return core.CreateSingleSourceDSP();
  }

  /**
   * Returns a CHRTF instance populated with all the data from
   * the provided HRIR instances.
   */
  void CreateHRTF(shared_ptr<Binaural::CListener> listener, std::vector<HRIR> hrirs)
  {
    const int length = 512;

    Binaural::CHRTF hrtf;

    // TODO: Make frame rate into a parameter/variable
    listener->GetHRTF()->BeginSetup(hrirs.size(), DEFAULT_HRTF_MEASURED_DISTANCE);

    for (int i = 0; i < hrirs.size(); ++i)
    {
      HRIR &h = hrirs[i];

      // Create a HRIR struct
      THRIRStruct hrir_value;
      hrir_value.leftHRIR.resize(length);
      hrir_value.rightHRIR.resize(length);

      // For wav files the delay is incorporated in the HRIR, so the variable delay is zero
      hrir_value.leftDelay  = 0;
      hrir_value.rightDelay = 0;

      for (int j = 0; j < length; j++)
      {
        hrir_value.leftHRIR[j] = h.leftBuffer[j];
        hrir_value.rightHRIR[j] = h.rightBuffer[j];
      }

      listener->GetHRTF()->AddHRIR(h.azimuth, h.elevation, std::move(hrir_value));
    }

    listener->GetHRTF()->EndSetup();
  }

  /**
   * Returns a binaural listener
   *
   * @param  listenerHeadRadius  The listener's head radius in meters
   * @return                     A listener
   */
  shared_ptr<Binaural::CListener> CreateListener(float listenerHeadRadius = 0.0875f)
  {
    shared_ptr<Binaural::CListener> listener = core.CreateListener(listenerHeadRadius);
    return listener;
  }

  /**
   * Returns a binaural listener
   *
   * @param  hrirs               A vector of HRIRs
   * @param  listenerHeadRadius  The listener's head radius in meters
   * @return                     A listener
   */
  shared_ptr<Binaural::CListener> CreateListener(std::vector<HRIR> hrirs, float listenerHeadRadius = 0.0875f)
  {
    shared_ptr<Binaural::CListener> listener = core.CreateListener(listenerHeadRadius);

    CreateHRTF(listener, hrirs);

    return listener;
  }

private:
  Binaural::CCore core;
};

/**
 * This wrapper class is used to get around the issue of pointers
 * for class properties are not passed properly through embind,
 * i.e.:
 * 
 * 	earPair.left.resize(512, 0)
 * 	earPair.left.size() === 0
 */
using EarPair_Mono = Common::CEarPair<CMonoBuffer<float>>;

class EarPairBuffers : public EarPair_Mono {
public:
	CMonoBuffer<float>& GetLeft() {
		return left;
	}

	CMonoBuffer<float>& GetRight() {
		return right;
	}

	float Get(Common::T_ear ear, size_t n) {
		if (ear == Common::T_ear::LEFT) {
			return left[n];
		}
		else if (ear == Common::T_ear::RIGHT) {
			return right[n];
		}
	}

	void Set(Common::T_ear ear, size_t n, const float& val) {
		if (ear == Common::T_ear::LEFT) {
			left[n] = val;
		}
		else if (ear == Common::T_ear::RIGHT) {
			right[n] = val;
		}
	}

	void Resize(size_t n, const float& val) {
		left.resize(n, val);
		right.resize(n, val);
	}

	EarPair_Mono& GetAsParent() {
		return *this;
	}
};

void HearingLossSim_Process(HAHLSimulation::CHearingLossSim &simulator, EarPairBuffers &inputBuffers, EarPairBuffers &outputBuffers) {
	simulator.Process(inputBuffers, outputBuffers);
}

void HearingAidSim_Process(HAHLSimulation::CHearingAidSim &simulator, EarPairBuffers &inputBuffers, EarPairBuffers &outputBuffers) {
	simulator.Process(inputBuffers, outputBuffers);
}

/**
 * None of these seem to help the problem described below.
 */
// CMonoBuffer<float>& getLeftEarBuffer(Common::CEarPair<CMonoBuffer<float>> &earPair) {
//   printf("ear left size: %d\n", earPair.left.size());
//   return earPair.left;
// }

// void setLeftEarBuffer(const Common::CEarPair<CMonoBuffer<float>> &earPair, const CMonoBuffer<float> &buffer) {
// 	earPair.left = buffer;
// }

/**
 * Debugger interface
 *
 * NOTE(alexanderwallin): Couldn't find to port Common::ErrorHandler directly
 * 												due to its protected constructor.
 */
class Debugger 
{
public:
	Debugger() {}

	~Debugger() {}

	TResultID GetLastResult() {
		Common::CErrorHandler &errorHandler = Common::CErrorHandler::Instance();
		return errorHandler.GetLastResult();
	}

	TResultStruct GetLastResultStruct() {
		Common::CErrorHandler &errorHandler = Common::CErrorHandler::Instance();
		return errorHandler.GetLastResultStruct();
	}

	TResultID GetFirstError() {
		Common::CErrorHandler &errorHandler = Common::CErrorHandler::Instance();
		return errorHandler.GetFirstError();
	}

	TResultStruct GetFirstErrorStruct() {
		Common::CErrorHandler &errorHandler = Common::CErrorHandler::Instance();
		return errorHandler.GetFirstErrorStruct();
	}

	void SetVerbosityMode(TVerbosityMode verbosityMode) {
		Common::CErrorHandler &errorHandler = Common::CErrorHandler::Instance();
		return errorHandler.SetVerbosityMode(verbosityMode);
	}

	void SetAssertMode(TAssertMode assertMode) {
		Common::CErrorHandler &errorHandler = Common::CErrorHandler::Instance();
		return errorHandler.SetAssertMode(assertMode);
	}

};

// Bindings
EMSCRIPTEN_BINDINGS(Toolkit) {

  /**
   * HRIR wrapper bindings
   */
  class_<HRIR>("HRIR")
    .constructor<CMonoBuffer<float>, CMonoBuffer<float>, int, int>()
    ;

  // List of HRIRs
  register_vector<HRIR>("HRIRVector");

  /* Native types */

  register_vector<float>("FloatVector");

  /* Toolkit API */

  /**
   * CMonoBuffer
   */
	using MonoBufferVecType = CMonoBuffer<float>;
	void (MonoBufferVecType::*resizeMono)(const size_t, const float&) = &MonoBufferVecType::resize;
	size_t (MonoBufferVecType::*sizeMono)() const = &MonoBufferVecType::size;
	class_<MonoBufferVecType>("CMonoBuffer")
		.template constructor<>()
		.function("resize", resizeMono)
		.function("size", sizeMono)
		.function("get", &internal::VectorAccess<MonoBufferVecType>::get)
		.function("set", &internal::VectorAccess<MonoBufferVecType>::set)
		;

  /**
   * CStereoBuffer
   */
	using StereoBufferVecType = CStereoBuffer<float>;
	void (StereoBufferVecType::*resizeStereo)(const size_t, const float&) = &StereoBufferVecType::resize;
	size_t (StereoBufferVecType::*sizeStereo)() const = &StereoBufferVecType::size;
	class_<StereoBufferVecType>("CStereoBuffer")
		.template constructor<>()
		.function("resize", resizeStereo)
		.function("size", sizeStereo)
		.function("get", &internal::VectorAccess<StereoBufferVecType>::get)
		.function("set", &internal::VectorAccess<StereoBufferVecType>::set)
		;

	/**
	 * T_ear
	 */
	enum_<Common::T_ear>("T_ear")
		.value("LEFT", Common::T_ear::LEFT)
		.value("RIGHT", Common::T_ear::RIGHT)
		.value("BOTH", Common::T_ear::BOTH)
		;

	/**
	 * I have not figured out how to keep references/pointers to member
	 * variables. I.e., this happens:
	 *
	 *   earPair.left.resize(512, 0);
	 *   earPair.left.size() === 0;
	 *
	 * Using the EarPairBuffers proxy class instead.
	 */
	class_<EarPair_Mono>("CEarPair_Mono")
		.constructor<>()
		// .smart_ptr<std::shared_ptr<EarPair_Mono>>("EarPair_Mono_ptr")
		// .property("left", &getLeftEarBuffer)
		// .property("right", &EarPair_Mono::right)
		;

	emscripten::function("HearingLossSim_Process", &HearingLossSim_Process);
	emscripten::function("HearingAidSim_Process", &HearingAidSim_Process);

	class_<EarPairBuffers>("EarPairBuffers")
		.constructor<>()
		.function("GetLeft", &EarPairBuffers::GetLeft)
		.function("GetRight", &EarPairBuffers::GetRight)
		.function("Resize", &EarPairBuffers::Resize)
		.function("Get", &EarPairBuffers::Get)
		.function("Set", &EarPairBuffers::Set)
		.function("GetAsParent", &EarPairBuffers::GetAsParent)
		;

	/**
   * Dynamic Compressor
   */
  class_<Common::CDynamicCompressorMono>("CDynamicCompressorMono")
  	.constructor<>()
  	.function("Setup", &Common::CDynamicCompressorMono::Setup)
  	.function("GetAttack", &Common::CDynamicCompressorMono::GetAttack)
  	.function("GetRelease", &Common::CDynamicCompressorMono::GetRelease)
  	;

	/**
   * Hearing loss simulator
   */
  class_<HAHLSimulation::CHearingLossSim>("CHearingLossSim")
  	.constructor<>()
  	.function("Setup", &HAHLSimulation::CHearingLossSim::Setup)
  	.function("SetFromAudiometry_dBHL", &HAHLSimulation::CHearingLossSim::SetFromAudiometry_dBHL)
  	.function("SetHearingLevel_dBHL", &HAHLSimulation::CHearingLossSim::SetHearingLevel_dBHL)
  	.function("GetHearingLevel_dBHL", &HAHLSimulation::CHearingLossSim::GetHearingLevel_dBHL)
  	.function("GetNumberOfBands", &HAHLSimulation::CHearingLossSim::GetNumberOfBands)
  	.function("GetBandFrequency", &HAHLSimulation::CHearingLossSim::GetBandFrequency)
  	.function("Process", &HAHLSimulation::CHearingLossSim::Process)
  	.function("GetBandExpander", &HAHLSimulation::CHearingLossSim::GetBandExpander, allow_raw_pointers())
  	.function("GetTemporalDistortionSimulator", &HAHLSimulation::CHearingLossSim::GetTemporalDistortionSimulator, allow_raw_pointers())
  	.function("GetFrequencySmearingSimulator", &HAHLSimulation::CHearingLossSim::GetFrequencySmearingSimulator, allow_raw_pointers())
  	.function("EnableHearingLossSimulation", &HAHLSimulation::CHearingLossSim::EnableHearingLossSimulation)
  	.function("DisableHearingLossSimulation", &HAHLSimulation::CHearingLossSim::DisableHearingLossSimulation)
  	.function("EnableMultibandExpander", &HAHLSimulation::CHearingLossSim::EnableMultibandExpander)
  	.function("DisableMultibandExpander", &HAHLSimulation::CHearingLossSim::DisableMultibandExpander)
  	.function("EnableTemporalDistortion", &HAHLSimulation::CHearingLossSim::EnableTemporalDistortion)
  	.function("DisableTemporalDistortion", &HAHLSimulation::CHearingLossSim::DisableTemporalDistortion)
  	.function("EnableFrequencySmearing", &HAHLSimulation::CHearingLossSim::EnableFrequencySmearing)
  	.function("DisableFrequencySmearing", &HAHLSimulation::CHearingLossSim::DisableFrequencySmearing)
  	;

  /**
   * Frequency smearing
   */
  class_<HAHLSimulation::CFrequencySmearing>("CFrequencySmearing")
  	.function("SetDownwardSmearingBufferSize", &HAHLSimulation::CFrequencySmearing::SetDownwardSmearingBufferSize)
		.function("SetUpwardSmearingBufferSize", &HAHLSimulation::CFrequencySmearing::SetUpwardSmearingBufferSize)
		.function("SetDownwardSmearing_Hz", &HAHLSimulation::CFrequencySmearing::SetDownwardSmearing_Hz)
		.function("SetUpwardSmearing_Hz", &HAHLSimulation::CFrequencySmearing::SetUpwardSmearing_Hz)
  	;

  /**
   * Temporal distortion
   */
  class_<HAHLSimulation::CTemporalDistortionSimulator>("CTemporalDistortionSimulator")
  	.function("SetLeftRightNoiseSynchronicity", &HAHLSimulation::CTemporalDistortionSimulator::SetLeftRightNoiseSynchronicity)
		.function("SetWhiteNoisePower", &HAHLSimulation::CTemporalDistortionSimulator::SetWhiteNoisePower)
		.function("SetNoiseAutocorrelationFilterCutoffFrequency", &HAHLSimulation::CTemporalDistortionSimulator::SetNoiseAutocorrelationFilterCutoffFrequency)
		.function("SetBandUpperLimit", &HAHLSimulation::CTemporalDistortionSimulator::SetBandUpperLimit)
  	;

	/**
	 * Hearing Aid Simulator
	 */
	class_<HAHLSimulation::CHearingAidSim>("CHearingAidSim")
  	.constructor<>()
  	.function("Setup", &HAHLSimulation::CHearingAidSim::Setup)
  	.function("Reset", &HAHLSimulation::CHearingAidSim::Reset)
  	.function("SetDynamicEqualizerBandGain_dB", &HAHLSimulation::CHearingAidSim::SetDynamicEqualizerBandGain_dB)
  	.function("SetDynamicEqualizerLevelThreshold", &HAHLSimulation::CHearingAidSim::SetDynamicEqualizerLevelThreshold)
  	.function("SetLowPassFilter", &HAHLSimulation::CHearingAidSim::SetLowPassFilter)
  	.function("SetHighPassFilter", &HAHLSimulation::CHearingAidSim::SetHighPassFilter)
  	.function("Process", &HAHLSimulation::CHearingAidSim::Process)
  	.function("SetDynamicEqualizerUsingFig6", &HAHLSimulation::CHearingAidSim::SetDynamicEqualizerUsingFig6)
  	.function("SetNormalizationLevel", &HAHLSimulation::CHearingAidSim::SetNormalizationLevel)
  	.function("EnableNormalization", &HAHLSimulation::CHearingAidSim::EnableNormalization)
  	.function("DisableNormalization", &HAHLSimulation::CHearingAidSim::DisableNormalization)
  	.function("GetDynamicEqualizer", &HAHLSimulation::CHearingAidSim::GetDynamicEqualizer, allow_raw_pointers())
  	.function("EnableQuantizationBeforeEqualizer", &HAHLSimulation::CHearingAidSim::EnableQuantizationBeforeEqualizer)
		.function("DisableQuantizationBeforeEqualizer", &HAHLSimulation::CHearingAidSim::DisableQuantizationBeforeEqualizer)
		.function("EnableQuantizationAfterEqualizer", &HAHLSimulation::CHearingAidSim::EnableQuantizationAfterEqualizer)
		.function("DisableQuantizationAfterEqualizer", &HAHLSimulation::CHearingAidSim::DisableQuantizationAfterEqualizer)
  	.function("SetQuantizationBits", &HAHLSimulation::CHearingAidSim::SetQuantizationBits)
  	.function("EnableHearingAidSimulation", &HAHLSimulation::CHearingAidSim::EnableHearingAidSimulation)
  	.function("DisableHearingAidSimulation", &HAHLSimulation::CHearingAidSim::DisableHearingAidSimulation)
  	;

  /**
   * Dynamic equalizer
   */
  class_<HAHLSimulation::CDynamicEqualizer>("CDynamicEqualizer")
  	.function("GetLevelThreshold", &HAHLSimulation::CDynamicEqualizer::GetLevelThreshold)
  	.function("GetCompressionPercentage", &HAHLSimulation::CDynamicEqualizer::GetCompressionPercentage)
  	.function("EnableLevelsInterpolation", &HAHLSimulation::CDynamicEqualizer::EnableLevelsInterpolation)
		.function("DisableLevelsInterpolation", &HAHLSimulation::CDynamicEqualizer::DisableLevelsInterpolation)
		.function("GetLevel_db", &HAHLSimulation::CDynamicEqualizer::GetLevel_db)
  	;

  /**
   * Multiband expander
   */
 	class_<HAHLSimulation::CMultibandExpander>("CMultibandExpander")
 		.function("GetBandExpander", &HAHLSimulation::CMultibandExpander::GetBandExpander, allow_raw_pointers())
 		.function("GetAttenuationForBand", &HAHLSimulation::CMultibandExpander::GetAttenuationForBand)
 		;

  /**
   * Dynamic expander
   */
 	class_<Common::CDynamicExpanderMono>("CDynamicExpanderMono")
 		.function("GetAttack", &Common::CDynamicExpanderMono::GetAttack)
		.function("GetRelease", &Common::CDynamicExpanderMono::GetRelease)
		.function("GetSlope", &Common::CDynamicExpanderMono::GetSlope)
 		;

  /**
   * Classification scale
   */
	emscripten::function("GetClassificationScaleHL", &HAHLSimulation::GetClassificationScaleHL);

  /**
   * Binaural lib
   */
  class_<Binaural::CListener>("CListener")
    .smart_ptr<std::shared_ptr<Binaural::CListener>>("CListener_ptr")
    .function("GetListenerTransform", &Binaural::CListener::GetListenerTransform)
    .function("SetListenerTransform", &Binaural::CListener::SetListenerTransform)
    .function("EnableCustomizedITD", &Binaural::CListener::EnableCustomizedITD)
    .function("EnableDirectionality", &Binaural::CListener::EnableDirectionality)
    .function("DisableDirectionality", &Binaural::CListener::DisableDirectionality)
    .function("IsDirectionalityEnabled", &Binaural::CListener::IsDirectionalityEnabled)
    .function("SetDirectionality_dB", &Binaural::CListener::SetDirectionality_dB)
    .function("GetHeadRadius", &Binaural::CListener::GetHeadRadius)
    .function("SetHeadRadius", &Binaural::CListener::SetHeadRadius)
    ;

  enum_<Binaural::TSpatializationMode>("TSpatializationMode")
  	.value("None", Binaural::TSpatializationMode::NoSpatialization)
  	.value("HighPerformance", Binaural::TSpatializationMode::HighPerformance)
  	.value("HighQuality", Binaural::TSpatializationMode::HighQuality)
  	;

  class_<Binaural::CSingleSourceDSP>("CSingleSourceDSP")
    .smart_ptr<std::shared_ptr<Binaural::CSingleSourceDSP>>("CSingleSourceDSP_ptr")
    .function("SetSourceTransform", &Binaural::CSingleSourceDSP::SetSourceTransform)
		.function("EnableInterpolation", &Binaural::CSingleSourceDSP::EnableInterpolation)
		.function("DisableInterpolation", &Binaural::CSingleSourceDSP::DisableInterpolation)
		.function("IsInterpolationEnabled", &Binaural::CSingleSourceDSP::IsInterpolationEnabled)
		.function("EnableAnechoicProcess", &Binaural::CSingleSourceDSP::EnableAnechoicProcess)
		.function("DisableAnechoicProcess", &Binaural::CSingleSourceDSP::DisableAnechoicProcess)
		.function("IsAnechoicProcessEnabled", &Binaural::CSingleSourceDSP::IsAnechoicProcessEnabled)
		.function("EnableReverbProcess", &Binaural::CSingleSourceDSP::EnableReverbProcess)
		.function("DisableReverbProcess", &Binaural::CSingleSourceDSP::DisableReverbProcess)
		.function("IsReverbProcessEnabled", &Binaural::CSingleSourceDSP::IsReverbProcessEnabled)
		.function("EnableFarDistanceEffect", &Binaural::CSingleSourceDSP::EnableFarDistanceEffect)
		.function("DisableFarDistanceEffect", &Binaural::CSingleSourceDSP::DisableFarDistanceEffect)
		.function("IsFarDistanceEffectEnabled", &Binaural::CSingleSourceDSP::IsFarDistanceEffectEnabled)
		.function("EnableDistanceAttenuationAnechoic", &Binaural::CSingleSourceDSP::EnableDistanceAttenuationAnechoic)
		.function("DisableDistanceAttenuationAnechoic", &Binaural::CSingleSourceDSP::DisableDistanceAttenuationAnechoic)
		.function("IsDistanceAttenuationEnabledAnechoic", &Binaural::CSingleSourceDSP::IsDistanceAttenuationEnabledAnechoic)
		.function("EnableDistanceAttenuationReverb", &Binaural::CSingleSourceDSP::EnableDistanceAttenuationReverb)
		.function("DisableDistanceAttenuationReverb", &Binaural::CSingleSourceDSP::DisableDistanceAttenuationReverb)
		.function("IsDistanceAttenuationEnabledReverb", &Binaural::CSingleSourceDSP::IsDistanceAttenuationEnabledReverb)
		.function("EnableNearFieldEffect", &Binaural::CSingleSourceDSP::EnableNearFieldEffect)
		.function("DisableNearFieldEffect", &Binaural::CSingleSourceDSP::DisableNearFieldEffect)
		.function("IsNearFieldEffectEnabled", &Binaural::CSingleSourceDSP::IsNearFieldEffectEnabled)
		.function("ResetSourceBuffers", &Binaural::CSingleSourceDSP::ResetSourceBuffers)
		.function("SetSpatializationMode", &Binaural::CSingleSourceDSP::SetSpatializationMode)
		.function("GetSpatializationMode", &Binaural::CSingleSourceDSP::GetSpatializationMode)
    .function("ProcessAnechoic", select_overload<void(
    	const CMonoBuffer<float> &, 
    	CStereoBuffer<float> &
    )>(&Binaural::CSingleSourceDSP::ProcessAnechoic))
    ;

  class_<Common::CTransform>("CTransform")
    .constructor<>()
    .function("GetPosition", &Common::CTransform::GetPosition)
    .function("SetPosition", &Common::CTransform::SetPosition)
    .function("GetOrientation", &Common::CTransform::GetOrientation)
    .function("SetOrientation", &Common::CTransform::SetOrientation)
    .function("Rotate", &Common::CTransform::Rotate)
    ;

  class_<Common::CVector3>("CVector3")
    .constructor<float, float, float>()
  	.property("x", &Common::CVector3::x)
  	.property("y", &Common::CVector3::y)
  	.property("z", &Common::CVector3::z)
    .function("CrossProduct", &Common::CVector3::CrossProduct)
    ;

  class_<Common::CQuaternion>("CQuaternion")
  	.class_function("FromAxisAngle", &Common::CQuaternion::FromAxisAngle)
  	.constructor<float, Common::CVector3>()
  	.property("x", &Common::CQuaternion::x)
  	.property("y", &Common::CQuaternion::y)
  	.property("z", &Common::CQuaternion::z)
  	.property("w", &Common::CQuaternion::w)
  	;

  /**
   * BinauralAPI bindings
   */
  class_<BinauralAPI>("BinauralAPI")
    .constructor<>()
    .function("CreateSource", &BinauralAPI::CreateSource)
    .function("CreateListener", select_overload<
    	shared_ptr<Binaural::CListener>(float listenerHeadRadius)
    >(&BinauralAPI::CreateListener))
	  .function("CreateListenerWithHRIRs", select_overload<
	  	shared_ptr<Binaural::CListener>(
	  		std::vector<HRIR> hrirs, 
	  		float listenerHeadRadius
	  	)
	  >(&BinauralAPI::CreateListener))
    ;

  /**
   * ----------------------------------------------------------------
   * HRTF loading (using cereal)
   * ----------------------------------------------------------------
   */
  emscripten::function("HRTF_CreateFrom3dti", &HRTF::CreateFrom3dti);

  /**
   * ----------------------------------------------------------------
   * Debugging
   * ----------------------------------------------------------------
   */
  value_object<TVerbosityMode>("TVerbosityMode")
  	.field("showErrors", &TVerbosityMode::showErrors)
		.field("showWarnings", &TVerbosityMode::showWarnings)
		.field("showOk", &TVerbosityMode::showOk)
		.field("showID", &TVerbosityMode::showID)
		.field("showDescription", &TVerbosityMode::showDescription)
		.field("showSuggestion", &TVerbosityMode::showSuggestion)
		.field("showFilename", &TVerbosityMode::showFilename)
		.field("showLinenumber", &TVerbosityMode::showLinenumber)
  	;

  enum_<TAssertMode>("TAssertMode")
  	.value("ASSERT_MODE_EMPTY", TAssertMode::ASSERT_MODE_EMPTY)
		.value("ASSERT_MODE_CONTINUE", TAssertMode::ASSERT_MODE_CONTINUE)
		.value("ASSERT_MODE_ABORT", TAssertMode::ASSERT_MODE_ABORT)
		.value("ASSERT_MODE_PARANOID", TAssertMode::ASSERT_MODE_PARANOID)
  	;

  enum_<TResultID>("TResultID")
  	.value("RESULT_OK", TResultID::RESULT_OK)
		.value("RESULT_ERROR_UNKNOWN", TResultID::RESULT_ERROR_UNKNOWN)
		.value("RESULT_ERROR_NOTSET", TResultID::RESULT_ERROR_NOTSET)
		.value("RESULT_ERROR_BADALLOC", TResultID::RESULT_ERROR_BADALLOC)
		.value("RESULT_ERROR_NULLPOINTER", TResultID::RESULT_ERROR_NULLPOINTER)
		.value("RESULT_ERROR_DIVBYZERO", TResultID::RESULT_ERROR_DIVBYZERO)
		.value("RESULT_ERROR_CASENOTDEFINED", TResultID::RESULT_ERROR_CASENOTDEFINED)
		.value("RESULT_ERROR_PHYSICS", TResultID::RESULT_ERROR_PHYSICS)
		.value("RESULT_ERROR_INVALID_PARAM", TResultID::RESULT_ERROR_INVALID_PARAM)
		.value("RESULT_ERROR_OUTOFRANGE", TResultID::RESULT_ERROR_OUTOFRANGE)
		.value("RESULT_ERROR_BADSIZE", TResultID::RESULT_ERROR_BADSIZE)
		.value("RESULT_ERROR_NOTINITIALIZED", TResultID::RESULT_ERROR_NOTINITIALIZED)
		.value("RESULT_ERROR_SYSTEMCALL", TResultID::RESULT_ERROR_SYSTEMCALL)
		.value("RESULT_ERROR_NOTALLOWED", TResultID::RESULT_ERROR_NOTALLOWED)
		.value("RESULT_ERROR_NOTIMPLEMENTED", TResultID::RESULT_ERROR_NOTIMPLEMENTED)
		.value("RESULT_ERROR_FILE", TResultID::RESULT_ERROR_FILE)
		.value("RESULT_ERROR_EXCEPTION", TResultID::RESULT_ERROR_EXCEPTION)
		.value("RESULT_WARNING", TResultID::RESULT_WARNING)
  	;

  value_object<TResultStruct>("TResultStruct")
  	.field("id", &TResultStruct::id)
		.field("description", &TResultStruct::description)
		.field("suggestion", &TResultStruct::suggestion)
		.field("filename", &TResultStruct::filename)
		.field("linenumber", &TResultStruct::linenumber)
		;
	
	class_<Debugger>("Debugger")
		.constructor<>()
		.function("GetLastResult", &Debugger::GetLastResult)
		.function("GetLastResultStruct", &Debugger::GetLastResultStruct)
		.function("GetFirstError", &Debugger::GetFirstError)
		.function("GetFirstErrorStruct", &Debugger::GetFirstErrorStruct)
		.function("SetVerbosityMode", &Debugger::SetVerbosityMode)
		.function("SetAssertMode", &Debugger::SetAssertMode)
		;
}