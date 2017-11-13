#include <stdio.h>
#include <vector>
#include <emscripten/bind.h>
#include "glue/Logger.hpp"
#include "3DTI_Toolkit_Core/Common/Buffer.h"
#include "3DTI_Toolkit_Core/Common/Debugger.h"
#include "3DTI_Toolkit_Core/Common/DynamicCompressorMono.h"
#include "3DTI_Toolkit_Core/Common/Quaternion.h"
#include "3DTI_Toolkit_Core/Common/Transform.h"
#include "3DTI_Toolkit_Core/HAHLSimulation/HearingAidSim.h"
#include "3DTI_Toolkit_Core/HAHLSimulation/HearingLossSim.h"
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
	class_<MonoBufferVecType>("CMonoBuffer")
		.template constructor<>()
		.function("resize", resizeMono)
		.function("get", &internal::VectorAccess<MonoBufferVecType>::get)
		.function("set", &internal::VectorAccess<MonoBufferVecType>::set)
		;

  /**
   * CStereoBuffer
   */
	using StereoBufferVecType = CStereoBuffer<float>;
	void (StereoBufferVecType::*resizeStereo)(const size_t, const float&) = &StereoBufferVecType::resize;
	class_<StereoBufferVecType>("CStereoBuffer")
		.template constructor<>()
		.function("resize", resizeStereo)
		.function("get", &internal::VectorAccess<StereoBufferVecType>::get)
		.function("set", &internal::VectorAccess<StereoBufferVecType>::set)
		;

	/**
	 * T_ear
	 */
	enum_<T_ear>("T_ear")
		.value("LEFT", T_ear::LEFT)
		.value("RIGHT", T_ear::RIGHT)
		;

	/**
   * Dynamic Compressor
   */
  class_<CDynamicCompressorMono>("CDynamicCompressorMono")
  	.constructor<>()
  	.function("Setup", &CDynamicCompressorMono::Setup)
  	.function("GetAttack", &CDynamicCompressorMono::GetAttack)
  	.function("GetRelease", &CDynamicCompressorMono::GetRelease)
  	;

	/**
   * Hearing loss simulator
   */
  class_<CHearingLossSim>("CHearingLossSim")
  	.constructor<>()
  	.function("Setup", &CHearingLossSim::Setup)
  	.function("SetHearingLevel_dBHL", &CHearingLossSim::SetHearingLevel_dBHL)
  	.function("ProcessMono", select_overload<void(
  		T_ear ear,
  		CMonoBuffer<float> &inputBuffer,
  		CMonoBuffer<float> &outputBuffer
		)>(&CHearingLossSim::Process))
		.function("ProcessStereo", select_overload<void(
  		T_ear ear,
  		CStereoBuffer<float> &inputBuffer,
  		CStereoBuffer<float> &outputBuffer
		)>(&CHearingLossSim::Process))
  	;

	/**
	 * Hearing Aid Simulator
	 */
	class_<CHearingAidSim>("CHearingAidSim")
  	.constructor<>()
  	.function("Setup", &CHearingAidSim::Setup)
  	.function("SetGains_dB", &CHearingAidSim::SetGains_dB)
  	.function("SetLevelBandGain_dB", &CHearingAidSim::SetLevelBandGain_dB)
  	.function("SetLevelThreshold", &CHearingAidSim::SetLevelThreshold)
  	.function("ConfigLPF", &CHearingAidSim::ConfigLPF)
  	.function("ConfigHPF", &CHearingAidSim::ConfigHPF)
  	.function("Process", &CHearingAidSim::Process)
  	// .function("ProcessDirectionality", &CHearingAidSim::ProcessDirectionality)
  	// .function("GetDirectionalityAtt", &CHearingAidSim::GetDirectionalityAtt)
  	// .function("SetDirectionalityExtendL_dB", &CHearingAidSim::SetDirectionalityExtendL_dB)
  	// .function("SetDirectionalityExtendR_dB", &CHearingAidSim::SetDirectionalityExtendR_dB)
  	.function("ApplyFig6Alg", &CHearingAidSim::ApplyFig6Alg)
  	.property("addNoiseBefore", &CHearingAidSim::addNoiseBefore)
  	.property("addNoiseAfter", &CHearingAidSim::addNoiseAfter)
  	.property("noiseNumBits", &CHearingAidSim::noiseNumBits)
  	;

  /**
   * Binaural lib
   */
  class_<Binaural::CListener>("CListener")
    .smart_ptr<std::shared_ptr<Binaural::CListener>>("CListener_ptr")
    .function("GetListenerTransform", &Binaural::CListener::GetListenerTransform)
    .function("SetListenerTransform", &Binaural::CListener::SetListenerTransform)
    .function("SetHeadRadius", &Binaural::CListener::SetHeadRadius)
    .function("GetHeadRadius", &Binaural::CListener::SetHeadRadius)
    .function("EnableCustomizedITD", &Binaural::CListener::EnableCustomizedITD)
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

  class_<CTransform>("CTransform")
    .constructor<>()
    .function("GetPosition", &CTransform::GetPosition)
    .function("SetPosition", &CTransform::SetPosition)
    .function("GetOrientation", &CTransform::GetOrientation)
    .function("SetOrientation", &CTransform::SetOrientation)
    .function("Rotate", &CTransform::Rotate)
    ;

  class_<CVector3>("CVector3")
    .constructor<float, float, float>()
  	.property("x", &CVector3::x)
  	.property("y", &CVector3::y)
  	.property("z", &CVector3::z)
    .function("CrossProduct", &CVector3::CrossProduct)
    ;

  class_<CQuaternion>("CQuaternion")
  	.class_function("FromAxisAngle", &CQuaternion::FromAxisAngle)
  	.constructor<float, CVector3>()
  	.property("x", &CQuaternion::x)
  	.property("y", &CQuaternion::y)
  	.property("z", &CQuaternion::z)
  	.property("w", &CQuaternion::w)
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
