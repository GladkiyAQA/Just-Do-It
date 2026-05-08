# Just Do It!

A Chrome extension that combines a **Pomodoro timer** with a **weekly task planner**, a **calendar**, customizable **themes**, and **break-time music**. Built to help you focus on what matters and actually finish it.

## Features

- **Pomodoro timer** — work / short break / long break modes with editable durations.
- **Weekly task planner** — Mon–Sun day cards with subtasks, drag-and-drop reordering, and per-day progress rings.
- **Recurring tasks** — pin a task to every day; check it off independently per date.
- **Active task picker** — choose what you're focusing on; visible in every timer mode.
- **Daily pomodoro goal** — set a target (e.g. 4 🍅) and watch the progress bar fill.
- **Calendar view** — jump to any date; click a day to open its tasks.
- **Three themes** — Crystal (glassy light), Notion (warm pastels), Dark Minimal (graphite).
- **Break music** — built-in presets, custom URLs, or your own uploaded files.
- **Fullscreen / compact alarm window** — when a Pomodoro ends, a window surfaces to mark the transition (with a slideshow backdrop).
- **Service-worker driven** — timer keeps running even when the popup is closed.
- **Clickable URLs** in task and subtask text.

## Installation

1. Make sure you have **Node.js 18+** and **npm** installed.
2. Clone the repository:
   ```bash
   git clone <repo-url>
   cd JustDoIt!
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Build the extension:
   ```bash
   npm run build
   ```
   The build output appears in `dist/`.
5. Open `chrome://extensions/` in Chrome.
6. Toggle **Developer mode** on (top-right corner).
7. Click **Load unpacked** and select the `dist/` folder (not the project root — only `dist/` contains the generated `manifest.json`).
8. Pin the extension to the toolbar and click its icon to open the popup.

### Updating after code changes

```bash
npm run build
```
Then on `chrome://extensions/` click the ↺ refresh button on the extension card.

### Development mode

```bash
npm run dev
```
Runs Vite on port 5174 with HMR. You still need to load `dist/` once for the extension to register.

---

# Just Do It! (Русский)

Расширение для Chrome, которое объединяет **таймер Pomodoro**, **недельный планировщик задач**, **календарь**, настраиваемые **темы** и **музыку на перерывах**. Создано, чтобы ты сфокусировался на главном и действительно довёл дело до конца.

## Возможности

- **Таймер Pomodoro** — работа / короткий перерыв / длинный перерыв с настраиваемой длительностью.
- **Недельный планировщик** — карточки дней Пн–Вс с подзадачами, перетаскиванием и кольцами прогресса по дню.
- **Регулярные задачи** — закрепи задачу на каждый день и отмечай её отдельно на каждую дату.
- **Выбор активной задачи** — задаёт, на чём ты сейчас сосредоточен; виден во всех режимах таймера.
- **Дневная цель помидорок** — задай цель (например, 4 🍅) и следи за заполнением прогресса.
- **Календарь** — перейди к любой дате; клик по дню открывает его задачи.
- **Три темы** — Crystal (стеклянная светлая), Notion (тёплые пастельные тона), Dark Minimal (графитовая).
- **Музыка на перерывах** — встроенные пресеты, свои URL или загруженные файлы.
- **Полноэкранное / компактное окно будильника** — после Pomodoro появляется окно перехода со слайд-шоу на фоне.
- **Работа через service worker** — таймер тикает, даже когда попап закрыт.
- **Кликабельные ссылки** в тексте задач и подзадач.

## Установка

1. Убедись, что установлены **Node.js 18+** и **npm**.
2. Клонируй репозиторий:
   ```bash
   git clone <repo-url>
   cd JustDoIt!
   ```
3. Установи зависимости:
   ```bash
   npm install
   ```
4. Собери расширение:
   ```bash
   npm run build
   ```
   Результат сборки появится в папке `dist/`.
5. Открой в Chrome `chrome://extensions/`.
6. Включи **Режим разработчика** (правый верхний угол).
7. Нажми **Загрузить распакованное расширение** и выбери папку `dist/` (не корень проекта — `manifest.json` генерируется только внутри `dist/`).
8. Закрепи расширение на панели и кликни по его иконке, чтобы открыть попап.

### Обновление после изменений в коде

```bash
npm run build
```
Затем на `chrome://extensions/` нажми кнопку ↺ на карточке расширения.

### Режим разработки

```bash
npm run dev
```
Запускает Vite на порту 5174 с HMR. Папку `dist/` всё равно нужно один раз загрузить в Chrome, чтобы расширение зарегистрировалось.
