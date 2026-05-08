// Curated free / legal jazz & chill internet radio streams.
// All streams are listener-supported public broadcasts (SomaFM, SRG, WWOZ, etc).
export const MUSIC_PRESETS = [
  // ── Классический / standards jazz ──────────────────────────────
  {
    id: 'swiss-jazz',
    name: 'Radio Swiss Jazz',
    description: 'Классический джаз, стандарты, swing',
    url: 'https://stream.srg-ssr.ch/m/rsj/mp3_128',
  },
  {
    id: 'wwoz',
    name: 'WWOZ New Orleans',
    description: 'Новоорлеанский джаз и блюз, легендарная станция',
    url: 'https://wwoz-sc.streamguys1.com/wwoz-hi.mp3',
  },
  // ── Лаундж / cool / downtempo ──────────────────────────────────
  {
    id: 'somafm-illinois',
    name: 'SomaFM · Illinois Street Lounge',
    description: 'Классический лаундж, джаз 60-х',
    url: 'https://ice1.somafm.com/illstreet-128-mp3',
  },
  {
    id: 'somafm-secret',
    name: 'SomaFM · Secret Agent',
    description: 'Шпионский лаундж и кул-джаз',
    url: 'https://ice1.somafm.com/secretagent-128-mp3',
  },
  {
    id: 'somafm-groove',
    name: 'SomaFM · Groove Salad',
    description: 'Эмбиент-даунтемпо, лёгкий джаз',
    url: 'https://ice1.somafm.com/groovesalad-128-mp3',
  },
  {
    id: 'somafm-sonic',
    name: 'SomaFM · Sonic Universe',
    description: 'Современный джаз и фьюжн',
    url: 'https://ice1.somafm.com/sonicuniverse-128-mp3',
  },
];

export const DEFAULT_MUSIC = {
  enabled: true,
  source: 'preset',     // 'preset' | 'url' | 'file'
  presetId: 'swiss-jazz',
  customUrl: '',
  fileName: '',         // display only
  volume: 0.35,         // 0..1
};
