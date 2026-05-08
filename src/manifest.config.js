import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'Just Do It!',
  version: '0.2.0',
  description: 'Чек-лист + Pomodoro таймер для продуктивной работы',
  action: {
    default_title: 'Just Do It!',
    default_popup: 'src/popup/index.html',
  },
  background: {
    service_worker: 'src/background/index.js',
    type: 'module',
  },
  side_panel: {
    default_path: 'src/popup/index.html?panel=1',
  },
  permissions: ['storage', 'windows', 'alarms', 'offscreen', 'sidePanel'],
  web_accessible_resources: [
    {
      resources: ['src/alarm/index.html', 'src/offscreen/index.html', 'sounds/*', 'images/*'],
      matches: ['<all_urls>'],
    },
  ],
});
