const configs = {}
let subscribers = []

const $configs = document.querySelectorAll('.config')

for (let i = 0; i < $configs.length; i++) {
  const node = $configs[i]
  configs[node.getAttribute('name')] = node.checked
  node.addEventListener('click', handleConfigChange)
}

function handleConfigChange(evt) {
  const configName = evt.target.getAttribute('name')
  const type = evt.target.getAttribute('type')

  if (type === 'checkbox') {
    configs[configName] = evt.target.checked
  }
  else {
    configs[configName] = evt.target.value
  }

  subscribers.forEach(s => s(configName, evt.target.checked, configs))
}

export function getConfigs() {
  return configs
}

export function subscribeToConfigChanges(fn) {
  subscribers = [...subscribers, fn]
}
