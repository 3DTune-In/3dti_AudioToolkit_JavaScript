#include <stdio.h>
#include <vector>
#include <emscripten/bind.h>
#include "glue/Logger.hpp"
#include "3DTI_Toolkit_Core/Common/Buffer.h"
#include "3DTI_Toolkit_Core/Common/Debugger.h"
#include "3DTI_Toolkit_Core/Common/Quaternion.h"
#include "3DTI_Toolkit_Core/Common/Transform.h"
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
  CHRTF CreateHRTF(std::vector<HRIR> hrirs)
  {
    const int length = 512;

    CHRTF hrtf;

    // TODO: Make frame rate into a parameter/variable
    hrtf.BeginSetup(hrirs.size(), length, 44100);

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

      hrtf.AddHRIR(h.azimuth, h.elevation, std::move(hrir_value));
    }

    hrtf.EndSetup();

    return hrtf;
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

    CHRTF myHead = CreateHRTF(hrirs);
    listener->LoadHRTF(std::move(myHead));

    return listener;
  }

private:
  Binaural::CCore core;
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
   * HRIR wrapper bindings
   */
  class_<HRIR>("HRIR")
    .constructor<CMonoBuffer<float>, CMonoBuffer<float>, int, int>()
    ;

  // List of HRIRs
  register_vector<HRIR>("HRIRVector");

  /**
   * Binaural lib
   */
  class_<Binaural::CListener>("CListener")
    .smart_ptr<std::shared_ptr<Binaural::CListener>>("CListener_ptr")
    .function("GetListenerTransform", &Binaural::CListener::GetListenerTransform)
    .function("SetListenerTransform", &Binaural::CListener::SetListenerTransform);

  class_<Binaural::CSingleSourceDSP>("CSingleSourceDSP")
    .smart_ptr<std::shared_ptr<Binaural::CSingleSourceDSP>>("CSingleSourceDSP_ptr")
    .function("SetSourceTransform", &Binaural::CSingleSourceDSP::SetSourceTransform)
    .function("ProcessAnechoic", select_overload<void(const Binaural::CListener &, const CMonoBuffer<float> &, CStereoBuffer<float> &)>(&Binaural::CSingleSourceDSP::ProcessAnechoic))
    ;

  class_<CTransform>("CTransform")
    .constructor<>()
    .function("GetPosition", &CTransform::GetPosition)
    .function("SetPosition", &CTransform::SetPosition)
    .function("GetOrientation", &CTransform::GetOrientation)
    .function("SetOrientation", &CTransform::SetOrientation)
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
