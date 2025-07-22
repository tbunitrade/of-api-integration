export interface Step {
  type: string;
  key?: string;
  value?: string;
  selector?: string;
  btnSelector?: string;
  childs?: {
    yes?: Step[] | Step;
    no?: Step[] | Step;
  };

  // 🆕 Добавил новые свойства для логики безопасности
  safeguard?: boolean;     // если true — безопасный skip при ошибке
  fallback?: boolean;      // если true — fallback при fail
  retry?: number;          // количество повторов (для clickUntil, etc.)
}

//
// 🚀 Почему так
// 	•	safeguard и fallback — не обязывает писать их в каждом шаге, но если указаны — будет работать.
// 	•	retry — опционально для тех шагов, где может понадобиться повтор.
// 📦 После этого
// 	•	ошибки типа “safeguard does not exist in type Step” исчезнут.
// 	•	Vue / TS будет нормально понимать новые поля в postSteps.
