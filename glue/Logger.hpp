#include <stdio.h>
#include "../3DTI_Toolkit_Core/Common/Debugger.h"

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
