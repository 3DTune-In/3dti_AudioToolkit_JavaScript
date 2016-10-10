
#include <stdio.h>
#include <vector>
#include "3DTI_Toolkit_Core/HRTF.h"

class HRIR {
public:
  HRIR( void* data, int azimuth, int elevation )
    : azimuth( azimuth ), elevation( elevation )
  {
    for ( int i = 0; i < 1024; i++ ) {
      buffer[i] = (float)data[i];
    }
  }
  ~HRIR() {};
private:
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

    return hrft;
  }
};
