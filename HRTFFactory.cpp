
#include <stdio.h>
#include <vector>
#include <assert.h>
#include <emscripten/bind.h>
#include "3DTI_Toolkit_Core/Common/Buffer.h"
#include "3DTI_Toolkit_Core/Common/Debugger.h"
#include "3DTI_Toolkit_Core/Common/Quaternion.h"
#include "3DTI_Toolkit_Core/Common/Transform.h"
#include "3DTI_Toolkit_Core/BinauralSpatializer/HRTF.h"
#include "3DTI_Toolkit_Core/BinauralSpatializer/Listener.h"
#include "3DTI_Toolkit_Core/BinauralSpatializer/SingleSourceDSP.h"

using namespace emscripten;

class FloatArray {
public:

  FloatArray(std::vector<float> data) {
    _data = data;
  }

  float get(int index) {
    return _data[index];
  }

  int size() {
    return _data.size();
  }

private:
  std::vector<float> _data;
};

class HRIR {
public:
  HRIR( std::vector<float> data, int azimuth, int elevation )
    : azimuth( azimuth ), elevation( elevation )
  {
    // printf("size %i\n", data.size() );
    // printf("azimuth %i\n", azimuth);
    // printf("elevation %i\n", elevation);
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
    hrtf.BeginSetup(hrirs.size(), length, 44100);

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

    hrtf.EndSetup();

    return hrtf;
  }

  static void PrintBuffer(CMonoBuffer<float> & buffer) {
    printf("PrintBuffer()\n");
    for (int i = 0; i < buffer.size(); i++) {
      printf("%i = %f\n", i, buffer[i]);
    }
  }

  static CMonoBuffer<float> CreateMonoBuffer(std::vector<float> data) {
    CMonoBuffer<float> buf(data.size());
    for (int i; i < data.size(); i++) {
      buf[i] = data[i];
    }
    return buf;
  }

  static FloatArray GetSpatializedAudio(Binaural::CSingleSourceDSP & source, Binaural::CListener & listener, CMonoBuffer<float> & inBuffer) {
    std::vector<float> outputData;
    CStereoBuffer<float> outBuffer;

    source.ProcessAnechoic(listener, inBuffer, outBuffer);

    for (int i = 0; i < outBuffer.size(); i++) {
      outputData.push_back(outBuffer[i]);
    }

    FloatArray output(outputData);
    return output;
  }
};

class Logger
{
public:
  static void LogShit() {
    cout << GET_FIRST_ERROR_STRUCT() << std::endl;
    cout << GET_LAST_RESULT_STRUCT() << std::endl;
  }

  static std::string GetLastLogMessage() {
    TDebuggerResultStruct lastLogEntry = GET_LAST_RESULT_STRUCT();
    return lastLogEntry.description + " | " + lastLogEntry.suggestion + " | " + lastLogEntry.filename + " | line number: " + std::to_string(lastLogEntry.linenumber);
  }

  static void SetErrorLogFile(std::string filename) {
    CDebugger::Instance().SetErrorLogFile(filename, true);
  }
};


// Binding code
EMSCRIPTEN_BINDINGS(HRTFModule) {
  CDebugger::Instance().SetVerbosityMode(VERBOSITY_MODE_ALL);
  CDebugger::Instance().SetAssertMode(ASSERT_MODE_PARANOID);

  register_vector<float>("VectorFloat");
  register_vector<HRIR>("VectorHRIR");

  class_<FloatArray>("FloatArray")
    .constructor<std::vector<float>>()
    .function("get", &FloatArray::get)
    .function("size", &FloatArray::size)
    ;

  // value_object<TDebuggerResultStruct>("TDebuggerResultStruct")
  //   .field("id", &TDebuggerResultStruct::id)
  //   .field("description", &TDebuggerResultStruct::description)
  //   .field("suggestion", &TDebuggerResultStruct::suggestion)
  //   .field("filename", &TDebuggerResultStruct::filename)
  //   .field("linenumber", &TDebuggerResultStruct::linenumber);

  class_<Logger>("Logger")
    .class_function("LogShit", &Logger::LogShit)
    .class_function("GetLastLogMessage", &Logger::GetLastLogMessage)
    .class_function("SetErrorLogFile", &Logger::SetErrorLogFile);

  class_<HRIR>("HRIR")
    .constructor<std::vector<float>, int, int>()
    ;

  class_<HRTFFactory>("HRTFFactory")
    .class_function("create", &HRTFFactory::create)
    // .class_function("CreateFrom3dti", &HRTF::CreateFrom3dti)
    // .class_function("CreateFrom3dtiStream", &HRTF::CreateFrom3dtiStream)
    .class_function("PrintBuffer", &HRTFFactory::PrintBuffer)
    .class_function("CreateMonoBuffer", &HRTFFactory::CreateMonoBuffer)
    .class_function("GetSpatializedAudio", &HRTFFactory::GetSpatializedAudio)
    ;

  // emscripten::function("CreateFrom3dti", &HRTF::CreateFrom3dti);

  // Buffers
  class_<CBuffer<1, float>>("CMonoBuffer")
    .constructor<int>()
    .property("size", &CBuffer<1, float>::size)
    ;

  class_<CBuffer<2, float>>("CStereoBuffer")
    .constructor<int>()
    .property("size", &CBuffer<2, float>::size)
    ;

  // CHRTF
  class_<CHRTF>("CHRTF")
    .function("GetHRIR_left_frequency", &CHRTF::GetHRIR_left_frequency)
    .function("GetHRIR_right_frequency", &CHRTF::GetHRIR_right_frequency)
    ;

  // value_object<HRIR_struct>("HRIR_struct")
  //   .field("leftDelay", &HRIR_struct::leftDelay)
  //   .field("leftHRIR", &HRIR_struct::leftHRIR)
  //   .field("rightDelay", &HRIR_struct::rightDelay)
  //   .field("rightHRIR", &HRIR_struct::rightHRIR)
  //   ;

  value_object<oneEarHRIR_struct>("oneEarHRIR_struct")
    .field("delay", &oneEarHRIR_struct::delay)
    .field("HRIR", &oneEarHRIR_struct::HRIR)
    ;

  // value_object<orientation>("orientation")
  //   .field("azimuth", &orientation::azimuth)
  //   .field("elevation", &orientation::elevation)
  //   ;

  // enum_<T_ear>("T_ear")
  //   .value("LEFT", LEFT)
  //   .value("RIGHT", RIGHT)
  //   ;

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
    .function("GetHRTF", &Binaural::CListener::GetHRTF)
    .function("LoadHRTF", &Binaural::CListener::LoadHRTF)
    .function("GetListenerTransform", &Binaural::CListener::GetListenerTransform)
    .function("SetListenerTransform", &Binaural::CListener::SetListenerTransform)
    ;

  // CSingleSourceDSP
  class_<Binaural::CSingleSourceDSP>("CSingleSourceDSP")
    .smart_ptr<std::shared_ptr<Binaural::CSingleSourceDSP>>("CSingleSourceDSPPtr")
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

