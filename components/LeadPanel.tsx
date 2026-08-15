"use client";

import { useEffect, useRef, useState } from "react";
import { closeLeadPanel, subscribeLeadPanel } from "@/components/leadBus";
import { CONTACTS, LEAD } from "@/content/film";

// Форма заявки: выезжает справа. Поля: тип объекта (селект), задача (textarea),
// телефон. Валидация по blur, ошибка под полем говорит, что делать.
// Бэкенда нет — отправка формирует письмо на CONTACTS.email через mailto.

type FieldName = "object" | "task" | "phone";
type Values = Record<FieldName, string>;

const EMPTY: Values = { object: "", task: "", phone: "" };

// mailto с кириллицей раздувается при encodeURIComponent — ограничиваем задачу,
// чтобы URL оставался в пределах лимитов почтовых обработчиков (~2000 символов)
const TASK_MAX = 300;

const validators: Record<FieldName, (value: string) => string> = {
  object: (value) => (value ? "" : LEAD.fields.object.error),
  task: (value) => (value.trim().length >= 5 ? "" : LEAD.fields.task.error),
  phone: (value) => {
    const digits = (value.match(/\d/g) ?? []).length;
    return digits >= 9 && /^\+?[\d\s()-]{10,18}$/.test(value.trim())
      ? ""
      : LEAD.fields.phone.error;
  },
};

const fieldClass =
  "w-full rounded border border-white/40 bg-white/5 px-4 py-3 text-[14px] text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--dim)] focus:border-[var(--gold)]";
const labelClass =
  "mb-2 block font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--dim)]";
const errorClass = "mt-2 text-[12px] leading-snug text-[#FFA3A3]";

const FOCUSABLE = "button, select, textarea, input, a[href]";

export default function LeadPanel() {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Partial<Values>>({});
  const [sent, setSent] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const firstFieldRef = useRef<HTMLSelectElement>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => subscribeLeadPanel(setOpen), []);

  // Открытая панель: фокус внутрь и ловушка Tab, скролл фона заблокирован,
  // Escape закрывает; при закрытии фокус возвращается открывшей кнопке.
  useEffect(() => {
    if (!open) return;
    lastActiveRef.current = document.activeElement as HTMLElement | null;
    firstFieldRef.current?.focus();
    document.documentElement.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeLeadPanel();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      const inside = panel.contains(active);
      if (event.shiftKey && (active === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
      lastActiveRef.current?.focus?.();
    };
  }, [open]);

  const setValue = (name: FieldName, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: validators[name](value) }));
    if (sent) setSent(false);
  };

  const onBlur = (name: FieldName) =>
    setErrors((prev) => ({ ...prev, [name]: validators[name](values[name]) }));

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const next: Partial<Values> = {
      object: validators.object(values.object),
      task: validators.task(values.task),
      phone: validators.phone(values.phone),
    };
    setErrors(next);
    if (next.object || next.task || next.phone) return;
    const body = [
      `${LEAD.fields.object.label}: ${values.object}`,
      `${LEAD.fields.task.label}: ${values.task}`,
      `${LEAD.fields.phone.label}: ${values.phone}`,
    ].join("\n");
    window.location.href = `mailto:${CONTACTS.email}?subject=${encodeURIComponent(
      LEAD.title,
    )}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  return (
    <>
      {/* Подложка */}
      <div
        aria-hidden
        onClick={closeLeadPanel}
        className={`fixed inset-0 z-[60] bg-black/55 transition-opacity duration-500 motion-reduce:transition-none ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      {/* Панель. inert выводит закрытую панель из tab-order и дерева AT;
          data-lenis-prevent — остановленный Lenis не глушит её прокрутку */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-title"
        inert={!open}
        data-lenis-prevent=""
        className={`fixed inset-y-0 right-0 z-[60] w-[min(420px,92vw)] overflow-y-auto border-l border-white/10 bg-[#070B12] px-8 py-10 transition-transform duration-500 motion-reduce:transition-none ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between">
          <h2
            id="lead-title"
            className="font-display font-semibold uppercase leading-tight tracking-[-0.03em] text-[22px] text-[var(--ink)]"
          >
            {LEAD.title}
          </h2>
          <button
            type="button"
            onClick={closeLeadPanel}
            aria-label={LEAD.close}
            className="cursor-pointer p-1 font-mono text-[14px] text-[var(--dim)] transition-colors hover:text-[var(--ink)]"
          >
            ×
          </button>
        </div>

        <form onSubmit={onSubmit} noValidate className="mt-8 space-y-6">
          <div>
            <label htmlFor="lead-object" className={labelClass}>
              {LEAD.fields.object.label}
            </label>
            <select
              ref={firstFieldRef}
              id="lead-object"
              value={values.object}
              onChange={(event) => setValue("object", event.target.value)}
              onBlur={() => onBlur("object")}
              aria-invalid={Boolean(errors.object) || undefined}
              aria-describedby={errors.object ? "lead-object-error" : undefined}
              className={`${fieldClass} appearance-none ${values.object ? "" : "text-[var(--dim)]"}`}
            >
              <option value="" disabled>
                {LEAD.fields.object.placeholder}
              </option>
              {LEAD.fields.object.options.map((option) => (
                <option key={option} value={option} className="bg-[#070B12]">
                  {option}
                </option>
              ))}
            </select>
            {errors.object && (
              <p id="lead-object-error" className={errorClass}>
                {errors.object}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="lead-task" className={labelClass}>
              {LEAD.fields.task.label}
            </label>
            <textarea
              id="lead-task"
              rows={4}
              maxLength={TASK_MAX}
              value={values.task}
              onChange={(event) => setValue("task", event.target.value)}
              onBlur={() => onBlur("task")}
              placeholder={LEAD.fields.task.placeholder}
              aria-invalid={Boolean(errors.task) || undefined}
              aria-describedby={errors.task ? "lead-task-error" : undefined}
              className={`${fieldClass} resize-none`}
            />
            {errors.task && (
              <p id="lead-task-error" className={errorClass}>
                {errors.task}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="lead-phone" className={labelClass}>
              {LEAD.fields.phone.label}
            </label>
            <input
              id="lead-phone"
              type="tel"
              value={values.phone}
              onChange={(event) => setValue("phone", event.target.value)}
              onBlur={() => onBlur("phone")}
              placeholder={LEAD.fields.phone.placeholder}
              aria-invalid={Boolean(errors.phone) || undefined}
              aria-describedby={errors.phone ? "lead-phone-error" : undefined}
              className={fieldClass}
            />
            {errors.phone && (
              <p id="lead-phone-error" className={errorClass}>
                {errors.phone}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full cursor-pointer rounded-full border border-[var(--gold)] px-6 py-3 text-[11px] uppercase tracking-[0.3em] text-[var(--gold)] transition-colors hover:bg-[var(--gold)] hover:text-[#02030A]"
          >
            {LEAD.submit}
          </button>

          <p className="font-mono text-[10px] leading-relaxed text-[var(--dim)]">
            {sent ? LEAD.sent : LEAD.note}
          </p>
        </form>
      </aside>
    </>
  );
}
