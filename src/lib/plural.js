// Russian plural rules for "1 / 2-4 / 5+" word forms.

function pickRu(n, forms) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return forms[0];
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1];
  return forms[2];
}

export const pluralPomodoro = (n) => pickRu(n, ['помидорка', 'помидорки', 'помидорок']);
export const pluralTasks    = (n) => pickRu(n, ['задача', 'задачи', 'задач']);
export const pluralHabits   = (n) => pickRu(n, ['привычка', 'привычки', 'привычек']);
export const pluralDays     = (n) => pickRu(n, ['день', 'дня', 'дней']);
