#include <stdio.h>
#include <vector>
#include <emscripten/bind.h>
#include "glue/Logger.hpp"
#include "3DTI_Toolkit_Core/Common/Buffer.h"
#include "3DTI_Toolkit_Core/Common/CommonDefinitions.h"
#include "3DTI_Toolkit_Core/Common/Debugger.h"
#include "3DTI_Toolkit_Core/Common/DynamicCompressorMono.h"
#include "3DTI_Toolkit_Core/Common/Quaternion.h"
#include "3DTI_Toolkit_Core/Common/Transform.h"
#include "3DTI_Toolkit_Core/HAHLSimulation/ClassificationScaleHL.h"
#include "3DTI_Toolkit_Core/HAHLSimulation/DynamicEqualizer.h"
#include "3DTI_Toolkit_Core/HAHLSimulation/HearingAidSim.h"
#include "3DTI_Toolkit_Core/HAHLSimulation/HearingLossSim.h"
#include "3DTI_Toolkit_Core/HAHLSimulation/FrequencySmearing.h"
#include "3DTI_Toolkit_Core/HAHLSimulation/TemporalDistortionSimulator.h"
#include "3DTI_Toolkit_Core/BinauralSpatializer/HRTF.h"
#include "3DTI_Toolkit_Core/BinauralSpatializer/Listener.h"
#include "3DTI_Toolkit_Core/BinauralSpatializer/SingleSourceDSP.h"

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
    listener->GetHRTF()->BeginSetup(hrirs.size());

    for (int i = 0; i < hrirs.size(); ++i)
    {
      HRIR &h = hrirs[i];

      // Create a HRIR struct
      HRIR_struct hrir_value;
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
   * @param  listenerHeadRadius [description]
   * @return                    [description]
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

void ProcessHLS(HAHLSimulation::CHearingLossSim &simulator, EarPairBuffers &inputBuffers, EarPairBuffers &outputBuffers) {
	simulator.Process(inputBuffers, outputBuffers);
}

void ProcessHAS(HAHLSimulation::CHearingAidSim &simulator, EarPairBuffers &inputBuffers, EarPairBuffers &outputBuffers) {
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

// Bindings
EMSCRIPTEN_BINDINGS(Toolkit) {

	/* Custom glue/binding interface */

  /**
   * Logger
   */
  class_<Logger>("Logger")
    .class_function("GetLastLogMessage", &Logger::GetLastLogMessage)
    .class_function("GetLastErrorMessage", &Logger::GetLastErrorMessage);

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

	emscripten::function("ProcessHLS", &ProcessHLS);
	emscripten::function("ProcessHAS", &ProcessHAS);

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
  	.function("SetDynamicEqualizerBandGain_dB", &HAHLSimulation::CHearingAidSim::SetDynamicEqualizerBandGain_dB)
  	.function("SetDynamicEqualizerLevelThreshold", &HAHLSimulation::CHearingAidSim::SetDynamicEqualizerLevelThreshold)
  	.function("SetLowPassFilter", &HAHLSimulation::CHearingAidSim::SetLowPassFilter)
  	.function("SetHighPassFilter", &HAHLSimulation::CHearingAidSim::SetHighPassFilter)
  	.function("Process", &HAHLSimulation::CHearingAidSim::Process)
  	.function("SetDynamicEqualizerUsingFig6", &HAHLSimulation::CHearingAidSim::SetDynamicEqualizerUsingFig6)
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
  	.function("EnableLevelsInterpolation", &HAHLSimulation::CDynamicEqualizer::EnableLevelsInterpolation)
		.function("DisableLevelsInterpolation", &HAHLSimulation::CDynamicEqualizer::DisableLevelsInterpolation)
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
    .function("GetDirectionalityEnabled", &Binaural::CListener::GetDirectionalityEnabled)
    .function("SetDirectionality_dB", &Binaural::CListener::SetDirectionality_dB)
    .function("SetHeadRadius", &Binaural::CListener::SetHeadRadius)
    .function("GetHeadRadius", &Binaural::CListener::SetHeadRadius)
    ;

  enum_<Binaural::TSpatializationMode>("TSpatializationMode")
  	.value("None", Binaural::TSpatializationMode::None)
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
    .function("CreateListener", &BinauralAPI::CreateListener)
    ;
}
