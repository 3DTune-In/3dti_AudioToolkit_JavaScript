#include <stdio.h>
#include <vector>
#include <emscripten/bind.h>
#include "3DTI_Toolkit_Core/Common/Buffer.h"
#include "3DTI_Toolkit_Core/Common/Debugger.h"
#include "3DTI_Toolkit_Core/Common/Quaternion.h"
#include "3DTI_Toolkit_Core/Common/Transform.h"
#include "3DTI_Toolkit_Core/BinauralSpatializer/HRTF.h"
#include "3DTI_Toolkit_Core/BinauralSpatializer/Listener.h"
#include "3DTI_Toolkit_Core/BinauralSpatializer/SingleSourceDSP.h"

using namespace emscripten;

/**
 * The most important stuff first: logging.
 */
class Logger
{
public:
  static std::string GetLastLogMessage() {
    TDebuggerResultStruct lastLogEntry = GET_LAST_RESULT_STRUCT();
    return lastLogEntry.description + " | " + lastLogEntry.suggestion + " | " + lastLogEntry.filename + " | line number: " + std::to_string(lastLogEntry.linenumber);
  }

  static std::string GetLastErrorMessage() {
    TDebuggerResultStruct lastLogEntry = GET_FIRST_ERROR_STRUCT();
    return lastLogEntry.description + " | " + lastLogEntry.suggestion + " | " + lastLogEntry.filename + " | line number: " + std::to_string(lastLogEntry.linenumber);
  }
};

/**
 * Basically a wrapper around std::vector<float>
 */
class FloatList
{
public:
  FloatList()
  {
    data = std::vector<float>();
  }

  FloatList(std::vector<float> data)
    : data(data)
  {}

  ~FloatList() {}

  int Size()
  {
    return data.size();
  }

  void Add(float value)
  {
    data.push_back(value);
  }

  void Set(int index, float value)
  {
    data[index] = value;
  }

  float Get(int index)
  {
    return data[index];
  }

private:
  std::vector<float> data;
};

/**
 * HRIR wrapper
 */
class HRIR
{
public:
  HRIR(FloatList buffer, int azimuth, int elevation)
    : buffer(buffer), azimuth(azimuth), elevation(elevation)
  {}

  FloatList buffer;
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
        hrir_value.leftHRIR[j] = h.buffer.Get(j);
        hrir_value.rightHRIR[j] = h.buffer.Get(j + length);
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

  /**
   * Spatializes `inputBuffer` being located at `source`, with the `listener`
   * as reference.
   *
   * @param source      [description]
   * @param listener    [description]
   * @param inputBuffer [description]
   */
  FloatList Spatialize(Binaural::CListener & listener, Binaural::CSingleSourceDSP & source, FloatList & inputData)
  {
    CMonoBuffer<float> inputBuffer;
    CStereoBuffer<float> outputBuffer;

    for (int i = 0; i < inputData.Size(); i++)
    {
      inputBuffer.push_back(inputData.Get(i));
    }

    source.ProcessAnechoic(listener, inputBuffer, outputBuffer);

    // for (auto v : outputBuffer)
    // {
    //   printf("v = %f \n", v);
    // }

    FloatList outputData(outputBuffer);
    return outputData;
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

  // List of HRIRs
  register_vector<HRIR>("HRIRVector");

  /**
   * FloatList bindings
   */
  class_<FloatList>("FloatList")
    .constructor<>()
    .function("Size", &FloatList::Size)
    .function("Add", &FloatList::Add)
    .function("Get", &FloatList::Get);

  /**
   * HRIR wrapper bindings
   */
  class_<HRIR>("HRIR")
    .constructor<FloatList, int, int>();

  /**
   * Binaural lib
   */
  class_<Binaural::CListener>("CListener")
    .smart_ptr<std::shared_ptr<Binaural::CListener>>("CListener_ptr");

  class_<Binaural::CSingleSourceDSP>("CSingleSourceDSP")
    .smart_ptr<std::shared_ptr<Binaural::CSingleSourceDSP>>("CSingleSourceDSP_ptr")
    .function("SetSourceTransform", &Binaural::CSingleSourceDSP::SetSourceTransform);

  class_<CTransform>("CTransform")
    .constructor<>()
    .function("SetPosition", &CTransform::SetPosition);

  class_<CVector3>("CVector3")
    .constructor<float, float, float>();

  /**
   * BinauralAPI bindings
   */
  class_<BinauralAPI>("BinauralAPI")
    .constructor<>()
    .function("CreateSource", &BinauralAPI::CreateSource)
    .function("CreateListener", &BinauralAPI::CreateListener)
    .function("Spatialize", &BinauralAPI::Spatialize)
    ;
}
