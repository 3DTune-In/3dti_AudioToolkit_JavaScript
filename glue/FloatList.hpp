#include <vector>

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
