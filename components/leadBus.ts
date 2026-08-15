// Шина LeadPanel: панель одна, а открывают её из разных мест (пилюля навигации,
// CTA сцен, кнопка секции «Взаємодія»). Событие на window вместо подъёма
// состояния через все ветки дерева; FilmStage по нему же останавливает Lenis.

const LEAD_EVENT = "seir:lead";

export function openLeadPanel() {
  window.dispatchEvent(new CustomEvent(LEAD_EVENT, { detail: { open: true } }));
}

export function closeLeadPanel() {
  window.dispatchEvent(new CustomEvent(LEAD_EVENT, { detail: { open: false } }));
}

export function subscribeLeadPanel(listener: (open: boolean) => void) {
  const handler = (event: Event) =>
    listener(Boolean((event as CustomEvent).detail?.open));
  window.addEventListener(LEAD_EVENT, handler);
  return () => window.removeEventListener(LEAD_EVENT, handler);
}
