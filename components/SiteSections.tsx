"use client";

import { openLeadPanel } from "@/components/leadBus";
import { CATALOG } from "@/content/catalog";
import { CHROME, CONTACTS, SECTIONS } from "@/content/film";

// Обычные секции после фильма на фоне --ground: про компанию, лента каталога,
// контакты. Без JS-анимаций — только разметка и CSS.

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="font-display font-semibold uppercase leading-[1.08] tracking-[-0.03em] text-[clamp(22px,3vw,40px)] text-[var(--ink)]">
      {children}
    </h2>
  );
}

export default function SiteSections() {
  return (
    <div className="bg-[var(--ground)] text-[var(--ink)]">
      {/* Про компанію */}
      <section id={SECTIONS.about.id} className="px-6 py-28 md:px-[8vw] md:py-36">
        <SectionTitle>{SECTIONS.about.title}</SectionTitle>
        <div className="mt-10 flex flex-col gap-12 md:flex-row md:items-start md:gap-20">
          <p className="max-w-[640px] text-[15px] leading-relaxed text-[var(--ink)]">
            {SECTIONS.about.text}
          </p>
          <div className="shrink-0">
            <p className="font-display font-semibold text-[clamp(40px,5vw,72px)] leading-none text-[var(--gold)]">
              {SECTIONS.about.counter.value}
            </p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--dim)]">
              {SECTIONS.about.counter.caption}
            </p>
          </div>
        </div>
      </section>

      {/* Обладнання: горизонтальная лента карточек каталога */}
      <section id={SECTIONS.catalog.id} className="py-28 md:py-36">
        <div className="px-6 md:px-[8vw]">
          <SectionTitle>{SECTIONS.catalog.title}</SectionTitle>
        </div>
        {/* tabindex: лента прокручивается с клавиатуры; спейсеры вместо
            горизонтальных паддингов — Safari не учитывает правый паддинг
            в scrollable overflow */}
        <div
          tabIndex={0}
          role="region"
          aria-label={SECTIONS.catalog.title}
          className="mt-12 flex snap-x gap-5 overflow-x-auto pb-6 focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--gold)]"
        >
          <div aria-hidden className="w-1 shrink-0 md:w-[calc(8vw-1.25rem)]" />
          {CATALOG.map((item) => (
            <article
              key={item.code}
              id={item.code}
              className="w-[300px] shrink-0 snap-start rounded border border-white/20 p-6"
            >
              <p className="font-mono text-[22px] text-[var(--gold)]">{item.code}</p>
              <h3 className="mt-4 min-h-[3em] text-[13px] font-medium uppercase tracking-[0.08em] text-[var(--ink)]">
                {item.title}
              </h3>
              <ul className="mt-4 space-y-1 font-mono text-[12px] leading-relaxed text-[var(--dim)]">
                {item.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </article>
          ))}
          <div aria-hidden className="w-1 shrink-0 md:w-[calc(8vw-1.25rem)]" />
        </div>
      </section>

      {/* Взаємодія */}
      <section id={SECTIONS.contact.id} className="px-6 py-28 md:px-[8vw] md:py-36">
        <SectionTitle>{SECTIONS.contact.title}</SectionTitle>
        <div className="mt-10 flex flex-col gap-12 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2 text-[15px] leading-relaxed">
            <p>{CONTACTS.address}</p>
            <p>
              <a
                href={`tel:${CONTACTS.phone.replace(/\s+/g, "")}`}
                className="underline-offset-4 hover:underline"
              >
                {CONTACTS.phone}
              </a>
            </p>
            <p>
              <a
                href={`mailto:${CONTACTS.email}`}
                className="underline-offset-4 hover:underline"
              >
                {CONTACTS.email}
              </a>
            </p>
            <p className="pt-4 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--dim)]">
              {CONTACTS.status} / {CONTACTS.statusLine}
            </p>
          </div>
          <button
            type="button"
            onClick={openLeadPanel}
            className="h-fit w-fit cursor-pointer rounded-full border border-[var(--gold)] px-7 py-3 text-[11px] uppercase tracking-[0.3em] text-[var(--gold)] transition-colors hover:bg-[var(--gold)] hover:text-[#02030A]"
          >
            {CHROME.cta}
          </button>
        </div>
        <p className="mt-24 font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--dim)]">
          {CHROME.status}
        </p>
      </section>
    </div>
  );
}
