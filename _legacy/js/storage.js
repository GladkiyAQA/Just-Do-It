export const storage = {
  saveTasks:            tasks => chrome.storage.local.set({ tasks }),
  saveCurrentTaskIndex: index => chrome.storage.local.set({ currentTaskIndex: index }),
  saveDurations:        d     => chrome.storage.local.set({ durations: d }),
  saveTheme:            theme => chrome.storage.local.set({ theme }),
  saveCrystalHue:       hue   => chrome.storage.local.set({ crystalHue: hue }),
  saveTimerState:       s     => chrome.storage.local.set({ timerState: s }),
  load: cb => chrome.storage.local.get(['tasks', 'theme', 'crystalHue', 'currentTaskIndex', 'durations', 'timerState', 'pendingStart'], cb),
};
