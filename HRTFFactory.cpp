
#include <stdio.h>
#include <vector>
#include <assert.h>
#include <emscripten/bind.h>
#include "3DTI_Toolkit_Core/Common/Buffer.h"
#include "3DTI_Toolkit_Core/Common/Quaternion.h"
#include "3DTI_Toolkit_Core/Common/Transform.h"
#include "3DTI_Toolkit_Core/BinauralSpatializer/HRTF.h"
#include "3DTI_Toolkit_Core/BinauralSpatializer/Listener.h"
#include "3DTI_Toolkit_Core/BinauralSpatializer/SingleSourceDSP.h"

using namespace emscripten;

class HRIR {
public:
  HRIR( std::vector<float> data, int azimuth, int elevation )
    : azimuth( azimuth ), elevation( elevation )
  {
    printf("Size %i\n", data.size() );
    // assert(data.size() == 512);
    for ( int i = 0; i < data.size(); i++ ) {
      buffer[i] = data[i];
      // printf("i = %f\n", buffer[i]);
    }
  }
  ~HRIR() {};

  float buffer[1024];
  int azimuth, elevation;
};


class HRTFFactory
{
public:
  static CHRTF create( std::vector<HRIR> hrirs ) {

    const int length = 512;

    CHRTF hrtf;
    for ( int i = 0; i < hrirs.size(); ++i )
    {
      HRIR &h = hrirs[i];

      // Create a HRIR struct
      HRIR_struct hrir_value;
      hrir_value.leftHRIR.resize(length);
      hrir_value.rightHRIR.resize(length);
      
      // For wav files the delay is incorporated in the HRIR, so the variable delay is zero
      hrir_value.leftDelay  = 0;
      hrir_value.rightDelay = 0;

      for ( int j = 0; j < length; j++ )
      {
        hrir_value.leftHRIR[j]  = h.buffer[j];
        hrir_value.rightHRIR[j] = h.buffer[j + length];
      }
 
      hrtf.AddHRIR( h.azimuth, h.elevation, std::move(hrir_value) );
    }

    return hrtf;
  }
};


// Binding code
EMSCRIPTEN_BINDINGS(HRTFModule) {
  register_vector<float>("VectorFloat");
  register_vector<HRIR>("VectorHRIR");

  class_<HRIR>("HRIR")
    .constructor<std::vector<float>, int, int>()
    ;

  class_<HRTFFactory>("HRTFFactory")
    .class_function("create", &HRTFFactory::create)
    ;

  // Buffers
  class_<CMonoBuffer<unsigned int>>("CMonoBuffer");
  class_<CStereoBuffer<unsigned int>>("CStereoBuffer");

  // CHRTF
  class_<CHRTF>("CHRTF")
    ;

  // CVector3
  class_<CVector3>("CVector3")
    .constructor<float, float, float>()
    .property("x", &CVector3::x)
    .property("y", &CVector3::y)
    .property("z", &CVector3::z)
    ;

  // CQuaternion
  class_<CQuaternion>("CQuaternion")
    .class_function("FromAxisAngle", &CQuaternion::FromAxisAngle)
    .constructor<float, float, float, float>()
    // ToAxisAngle takes a float reference argument, which is a bit tricky.
    // One solution is to wrap it in a proxy function.
    // @link https://github.com/kripken/emscripten/issues/611
    // .function("toAxisAngle", &CQuaternion::ToAxisAngle)
    ;

  // CTransform
  class_<CTransform>("CTransform")
    .constructor<>()
    .function("GetPosition", &CTransform::GetPosition)
    .function("SetPosition", &CTransform::SetPosition)
    .function("GetOrientation", &CTransform::GetOrientation)
    .function("SetOrientation", &CTransform::SetOrientation)
    ;

  // CListener
  class_<Binaural::CListener>("CListener")
    .constructor<Binaural::CCore*, float>()
    .smart_ptr<std::shared_ptr<Binaural::CListener>>("CListenerPtr")
    .function("LoadHRTF", &Binaural::CListener::LoadHRTF)
    .function("GetListenerTransform", &Binaural::CListener::GetListenerTransform)
    .function("SetListenerTransform", &Binaural::CListener::SetListenerTransform)
    ;

  // CSingleSourceDSP
  class_<Binaural::CSingleSourceDSP>("CSingleSourceDSP")
    .function("SetInterpolation", &Binaural::CSingleSourceDSP::SetInterpolation)
    .function("SetFrequencyConvolution", &Binaural::CSingleSourceDSP::SetFrequencyConvolution)
    .function("GetSourceTransform", &Binaural::CSingleSourceDSP::GetSourceTransform)
    .function("SetSourceTransform", &Binaural::CSingleSourceDSP::SetSourceTransform)
    .function("ProcessAnechoic", select_overload<void(const Binaural::CListener &, const CMonoBuffer<float> &, CStereoBuffer<float> &)>(&Binaural::CSingleSourceDSP::ProcessAnechoic))
    ;

  // CCore
  class_<Binaural::CCore>("CCore")
    .constructor<>()
    .function("CreateListener", &Binaural::CCore::CreateListener)
    .function("RemoveListener", &Binaural::CCore::RemoveListener)
    .function("CreateSingleSourceDSP", &Binaural::CCore::CreateSingleSourceDSP)
    .function("RemoveSingleSourceDSP", &Binaural::CCore::RemoveSingleSourceDSP)
    ;
}

