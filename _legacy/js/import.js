import { state } from './state.js';
import { saveTasks, renderTasks } from './tasks.js';

export function initImport() {
  document.getElementById('mdFileInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      ev.target.result.split('\n').forEach(line => {
        const subMatch = line.match(/^(\s+)- \[(x| )\] (.+)/i);
        const topMatch = line.match(/^- \[(x| )\] (.+)/i);
        if (subMatch && state.tasks.length > 0) {
          state.tasks[state.tasks.length - 1].subtasks.push({
            text: subMatch[3].trim(),
            done: subMatch[2].toLowerCase() === 'x',
          });
        } else if (topMatch) {
          state.tasks.push({
            text:     topMatch[2].trim(),
            done:     topMatch[1].toLowerCase() === 'x',
            subtasks: [],
            date:     state.selectedDate,
          });
        }
      });
      saveTasks();
      renderTasks();
    };
    reader.readAsText(file);
    e.target.value = '';
  });
}
