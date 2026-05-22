import { useEffect, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// FERDI SAHIBKAR — TAX AUTOPILOT PLAYBOOK
// Version 1.6 // 2026-05-22
// ─────────────────────────────────────────────────────────────────────────────

const VERSION = '1.6';
const UPDATED = '2026-05-22';
const REPO = 'github.com/byazerbaijan/ferdi-sahibkar-platform';

const FONT_DISPLAY = '"JetBrains Mono", ui-monospace, monospace';
const FONT_BODY = '"Fraunces", ui-serif, Georgia, serif';

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────

const changelog = [
  {
    v: '1.6',
    date: '2026-05-22',
    status: 'current',
    entries: [
      {
        tag: 'engine',
        title: 'Tax Engine завершён',
        body: '3 модуля (regime.py, calculator.py, optimizer.py), 87 тестов (все зелёные). Репозиторий: ' + REPO + '. Покрытие всех режимов простого ИП — sadələşdirilmiş, gəlir vergisi, спецрежимы.',
      },
      {
        tag: 'legal',
        title: 'ДСМФ — новая модель с 01.01.2026 (ст. 14.5.1)',
        body: '2% от оборота, минимум 60 AZN (15% от минималки), максимум 400 AZN (100%). Расчёт строго помесячный — не от суммарного оборота. Старая формула (25%/50% × региональный коэффициент) — только для исторических периодов до 31.12.2025.',
      },
      {
        tag: 'legal',
        title: 'İcbari tibbi sığorta для ИП',
        body: '4% от минимальной зарплаты = 16 AZN/мес фиксированно. Не зависит от оборота. Платится одновременно с ДСМФ до 15-го числа следующего месяца.',
      },
      {
        tag: 'data',
        title: 'Поддержка 7-значных KVƏD-кодов',
        body: 'Обновлённый справочник DVX (16.01.2025) заменил 5-значные на 7-значные коды. Первые 5 цифр сохраняют соответствие старой классификации; последние 2 — подвид. Резолвер обновлён.',
      },
      {
        tag: 'rule',
        title: 'Реклама (73110) — НЕТ права на льготу 75%',
        body: 'Рекламная деятельность не входит в закрытый список 13 видов ст. 102.1.30-1 и не соответствует 102.1.30 без 3+ работников. Для рекламных ИП оптимум — sadələşdirilmiş 2% без льгот.',
      },
    ],
  },
  {
    v: '1.5',
    date: '2026-05-21',
    status: 'archived',
    entries: [
      {
        tag: 'data',
        title: 'KVƏD-маппинг — 773 пятизначных кода интегрированы в playbook',
        body: 'Полная карта пятизначных KVƏD-кодов из официального справочника taxes.gov.az с соответствием налоговым режимам и статьям НК АР. Добавлена как поисковая вкладка в playbook. Основа для будущего резолвера в Tax Engine.',
      },
    ],
  },
  {
    v: '1.4',
    date: 'архив',
    status: 'archived',
    entries: [
      {
        tag: 'note',
        title: 'См. предыдущий артефакт v1.4',
        body: 'Интеграция с taxes.gov.az через Playwright + ASAN İmza, разделение ст. 99 (20% для ИП) и ст. 101 (прогрессивная шкала для наёмных), две ветки льготы 75% (102.1.30 / 102.1.30-1), правило 50% (102.9), yoga-кейс (102.1.30-1.6, KVƏD 85.51.0).',
      },
    ],
  },
];

const phases = [
  {
    id: 'P0',
    title: 'Foundation — правовая база и КВЭД',
    status: 'done',
    items: [
      'Полная проработка НК АР (e-qanun.az/framework/46948)',
      '773 пятизначных KVƏD-кода смаплены на режимы и статьи НК',
      'Закрытый список 13 видов льготы 102.1.30-1 — задокументирован',
      'Разделение ст. 99 (20% для ИП) и ст. 101 (прогр. шкала для наёмных)',
    ],
  },
  {
    id: 'P1',
    title: 'Tax Engine — спецификация',
    status: 'done',
    items: [
      'Декомпозиция на 3 модуля',
      'Тест-кейсы из реальных клиентов',
      'Edge cases: смешанная деятельность, мин/макс ДСМФ',
    ],
  },
  {
    id: 'P2',
    title: 'Tax Engine — имплементация',
    status: 'done',
    items: [
      '3 модуля: regime.py, calculator.py, optimizer.py',
      '87 тестов, 100% зелёные',
      'Репо: ' + REPO,
      'CI-пайплайн с автозапуском на пуш',
    ],
  },
  {
    id: 'P3',
    title: 'B2C мобильное приложение',
    status: 'planned',
    items: [
      'Onboarding с автодетекцией KVƏD',
      'Лента "что и когда платить"',
      'Push-напоминания по срокам',
    ],
  },
  {
    id: 'P4',
    title: 'Интеграция с taxes.gov.az (RPA)',
    status: 'planned',
    items: [
      'Playwright + ASAN İmza SDK',
      'Автоподача sadələşdirilmiş декларации',
      'Чтение текущего баланса по налогам и взносам',
    ],
  },
  {
    id: 'P5',
    title: 'B2B API платформа',
    status: 'planned',
    items: [
      'REST API для банков, ERP, маркетплейсов',
      'Webhook-уведомления о налоговых событиях',
      'Документация и sandbox',
    ],
  },
];

const taxEngineModules = [
  {
    n: 1,
    name: 'regime.py',
    desc: 'KVƏD-резолвер и определение применимого налогового режима. Поддержка 5- и 7-значных кодов, проверка запретов ст. 218.5 (строительство, финансы, нефтегаз), спецрежимы (IT, медиа, технопарки).',
    tests: 29,
  },
  {
    n: 2,
    name: 'calculator.py',
    desc: 'Расчёт всех видов налогов и взносов: sadələşdirilmiş 2%, НДФЛ 2026-2028 (ст. 99, 20%), льгота 75% по обоим путям (102.1.30 и 102.1.30-1), ДСМФ (ст. 14.5.1), İcbari tibbi sığorta, полная налоговая нагрузка.',
    tests: 34,
  },
  {
    n: 3,
    name: 'optimizer.py',
    desc: 'Автоматический выбор оптимального режима — сравнение sadələşdirilmiş vs gəlir vergisi с учётом расходов и льгот. Выдаёт предупреждения о граничных значениях, истечении льгот, нарушении правила 50% (ст. 102.9).',
    tests: 24,
  },
];

const taxRatesYaml = `# tax_rates.yaml — конфигурация Tax Engine v1.6
# обновлено 2026-05-22

minimum_wage_azn: 400          # с 01.01.2025, без изменений

simplified_tax:                # ст. 218 НК АР
  rate: 0.02                   # 2% от оборота без вычета расходов
  income_cap_azn: 200000       # годовой лимит для применения

income_tax_ip:                 # ст. 99 НК АР — ИП, не путать со ст. 101 (наёмные)
  rate: 0.20                   # 20% от прибыли

exemption_75pct:               # ст. 102.1.30 и 102.1.30-1
  rate: 0.75                   # 75% дохода освобождается
  annual_income_cap_azn: 45000
  mixed_activity_threshold: 0.50   # ст. 102.9 — доля льготируемой деятельности
  paths:
    - article: "102.1.30"
      requires_employees_min: 3
      activity_whitelist: null   # любая деятельность с 3+ работниками
    - article: "102.1.30-1"
      requires_employees_min: 0
      activity_whitelist:        # закрытый список из 13 видов
        - наука, образование, культура, спорт
        - кулинария
        - курьеры
        - "... (см. полный список в НК)"

# ───────── ОБЯЗАТЕЛЬНЫЕ ВЗНОСЫ ─────────

dsmf_ip:                       # ст. 14.5.1 закона о соц. страховании
                               # ! новая модель с 01.01.2026
  rate_of_revenue: 0.02        # 2% от оборота
  floor_pct_min_wage: 0.15     # минимум 15% × 400 = 60 AZN
  cap_pct_min_wage: 1.00       # максимум 100% × 400 = 400 AZN
  calculation: monthly         # ПОМЕСЯЧНО, не от суммарного оборота
  due_day_next_month: 15
  region_coefficient: null     # отменён с 01.01.2026
  legacy_pre_2026:             # для расчётов до 31.12.2025
    formula: "rate × min_wage × regional_coef"
    rate_default: 0.25
    rate_construction_trade: 0.50

tibbi_sigorta_ip:              # icbari tibbi sığorta
  rate_of_min_wage: 0.04       # 4% × 400 = 16 AZN/мес фикс.
  monthly_fixed_azn: 16
  depends_on_revenue: false
  due_day_next_month: 15

# ───────── СПЕЦРЕЖИМЫ ─────────

it_sector:
  rate: 0.05
  valid_until: "2032-01-01"

media_sector:
  exemption_years: 6           # полное освобождение

prohibited_simplified:         # ст. 218.5 — нельзя на sadələşdirilmiş
  - construction
  - finance
  - oil_gas
  - lottery_operators
  - excise_goods_producers`;

const testCases = [
  {
    name: 'Реклама — KVƏD 73110 (7-значный: 7311003)',
    inputs: 'Апрель: 7 500 AZN; Май: 2 000 AZN',
    regime: 'sadələşdirilmiş 2% (льгота 75% — НЕ применима)',
    breakdown: [
      ['Vergi апрель', '7500 × 2% = 150 AZN'],
      ['Vergi май', '2000 × 2% = 40 AZN'],
      ['DSMF апрель', 'max(150, 60) = 150 AZN'],
      ['DSMF май', 'max(40, 60) = 60 AZN'],
      ['Tibbi апрель + май', '16 + 16 = 32 AZN'],
      ['ИТОГО за 2 мес.', '432 AZN (4.55% от оборота)'],
    ],
  },
  {
    name: 'Йога — KVƏD 85.51.0 (sports education)',
    inputs: 'Годовой доход < 45 000 AZN, без работников',
    regime: 'sadələşdirilmiş 2% + льгота 75% (ст. 102.1.30-1.6)',
    breakdown: [
      ['Путь льготы', '102.1.30-1 (no employee requirement)'],
      ['Условие', 'спорт входит в whitelist 13 видов'],
      ['База для vergi', 'оборот × 25% (после 75% льготы)'],
      ['Эффективная ставка', '0.5% от оборота'],
    ],
  },
  {
    name: 'Краевой кейс — оборот ниже минимума ДСМФ',
    inputs: 'Месячный оборот = 1 200 AZN',
    regime: 'любой простой ИП',
    breakdown: [
      ['2% × 1200', '= 24 AZN'],
      ['ниже floor 60', 'применяется 60 AZN'],
      ['Точка безразличия', 'оборот = 3 000 AZN (2% = 60)'],
      ['Точка cap', 'оборот = 20 000 AZN (2% = 400)'],
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function StatusDot({ status }) {
  const map = {
    done: { bg: 'bg-emerald-400', label: 'Готово', text: 'text-emerald-400' },
    progress: { bg: 'bg-amber-400', label: 'В работе', text: 'text-amber-400' },
    planned: { bg: 'bg-slate-500', label: 'План', text: 'text-slate-500' },
    current: { bg: 'bg-amber-300', label: 'Текущая', text: 'text-amber-300' },
    archived: { bg: 'bg-slate-600', label: 'Архив', text: 'text-slate-500' },
  };
  const s = map[status] || map.planned;
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`w-1.5 h-1.5 rounded-full ${s.bg}`} />
      <span className={`text-[10px] uppercase tracking-widest ${s.text}`} style={{ fontFamily: FONT_DISPLAY }}>
        {s.label}
      </span>
    </span>
  );
}

function TagPill({ tag }) {
  const colors = {
    engine: 'border-emerald-500/30 text-emerald-300 bg-emerald-500/5',
    legal: 'border-amber-500/30 text-amber-300 bg-amber-500/5',
    data: 'border-sky-500/30 text-sky-300 bg-sky-500/5',
    rule: 'border-rose-500/30 text-rose-300 bg-rose-500/5',
    note: 'border-slate-500/30 text-slate-400 bg-slate-500/5',
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-widest border rounded-sm ${colors[tag] || colors.note}`}
      style={{ fontFamily: FONT_DISPLAY }}
    >
      {tag}
    </span>
  );
}

function SectionHeader({ kicker, title, subtitle }) {
  return (
    <div className="mb-8 border-b border-slate-800 pb-4">
      <div className="text-[10px] uppercase tracking-[0.3em] text-amber-300/70 mb-2" style={{ fontFamily: FONT_DISPLAY }}>
        {kicker}
      </div>
      <h2 className="text-2xl md:text-3xl text-slate-100 mb-1" style={{ fontFamily: FONT_BODY, fontWeight: 500 }}>
        {title}
      </h2>
      {subtitle && (
        <div className="text-sm text-slate-500" style={{ fontFamily: FONT_BODY }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB CONTENT
// ─────────────────────────────────────────────────────────────────────────────

function Overview() {
  return (
    <div>
      <SectionHeader
        kicker="// overview"
        title="Tax autopilot для Fərdi Sahibkar в Azərbaycan"
        subtitle="Автоматизация 90%+ бухгалтерии для индивидуальных предпринимателей"
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {[
          ['Версия', VERSION, 'amber-300'],
          ['Модули', '5', 'emerald-400'],
          ['Тесты', '87 / 87', 'emerald-400'],
          ['Фазы готовы', '3 / 6', 'amber-400'],
        ].map(([label, val, color], i) => (
          <div key={i} className="border border-slate-800 bg-slate-900/40 p-4 rounded-sm">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2" style={{ fontFamily: FONT_DISPLAY }}>
              {label}
            </div>
            <div className={`text-3xl text-${color}`} style={{ fontFamily: FONT_DISPLAY, fontWeight: 700 }}>
              {val}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-2" style={{ fontFamily: FONT_DISPLAY }}>
            // продукт
          </div>
          <p className="text-slate-300 text-base leading-relaxed" style={{ fontFamily: FONT_BODY }}>
            Две дорожки: <span className="text-amber-200">B2C мобильное приложение</span> для самих ИП и{' '}
            <span className="text-amber-200">B2B API</span> для интеграций с банками, ERP-системами и маркетплейсами. Основа —
            движок налоговых правил, верифицированный по реальным клиентским сценариям и первоисточникам Налогового
            кодекса.
          </p>
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-2" style={{ fontFamily: FONT_DISPLAY }}>
            // репозиторий
          </div>
          <code className="block px-3 py-2 bg-slate-900/60 border border-slate-800 text-emerald-300 text-sm rounded-sm" style={{ fontFamily: FONT_DISPLAY }}>
            {REPO}
          </code>
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-2" style={{ fontFamily: FONT_DISPLAY }}>
            // правовая база
          </div>
          <p className="text-slate-400 text-sm leading-relaxed" style={{ fontFamily: FONT_BODY }}>
            НК АР через <span className="text-slate-200">e-qanun.az/framework/46948</span>. Закон о соц. страховании —{' '}
            <span className="text-slate-200">e-qanun.az/framework/3813</span>. Справочник KVƏD — обновлён DVX 16.01.2025
            (теперь 7-значный).
          </p>
        </div>
      </div>
    </div>
  );
}

function Changelog() {
  return (
    <div>
      <SectionHeader
        kicker="// changelog"
        title={`v${VERSION} — Tax Engine shipped`}
        subtitle={`Обновлено ${UPDATED} · следующая итерация: B2C onboarding flow`}
      />
      <div className="space-y-10">
        {changelog.map((release) => (
          <div key={release.v} className="relative pl-6 border-l border-slate-800">
            <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-slate-700 border border-slate-600" />
            <div className="flex items-baseline gap-4 mb-4">
              <span className="text-2xl text-amber-200" style={{ fontFamily: FONT_DISPLAY, fontWeight: 700 }}>
                v{release.v}
              </span>
              <span className="text-xs text-slate-500" style={{ fontFamily: FONT_DISPLAY }}>
                {release.date}
              </span>
              <StatusDot status={release.status} />
            </div>
            <div className="space-y-4">
              {release.entries.map((e, i) => (
                <div key={i} className="border border-slate-800 bg-slate-900/30 p-4 rounded-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <TagPill tag={e.tag} />
                    <h3 className="text-base text-slate-100" style={{ fontFamily: FONT_BODY, fontWeight: 600 }}>
                      {e.title}
                    </h3>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed pl-1" style={{ fontFamily: FONT_BODY }}>
                    {e.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Phases() {
  return (
    <div>
      <SectionHeader
        kicker="// roadmap"
        title="Фазы развития платформы"
        subtitle="Phase 0, 1, 2 — закрыты. Дальше — продуктовая разработка."
      />
      <div className="space-y-3">
        {phases.map((p) => (
          <div
            key={p.id}
            className={`border p-4 rounded-sm ${
              p.status === 'done' ? 'border-emerald-500/30 bg-emerald-500/[0.03]' : 'border-slate-800 bg-slate-900/30'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-amber-300 text-sm" style={{ fontFamily: FONT_DISPLAY, fontWeight: 700 }}>
                  {p.id}
                </span>
                <h3 className="text-base text-slate-100" style={{ fontFamily: FONT_BODY, fontWeight: 600 }}>
                  {p.title}
                </h3>
              </div>
              <StatusDot status={p.status} />
            </div>
            <ul className="space-y-1 pl-7">
              {p.items.map((item, i) => (
                <li key={i} className="text-sm text-slate-400 flex items-start gap-2" style={{ fontFamily: FONT_BODY }}>
                  <span className="text-slate-600 mt-1">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function TaxEngine() {
  return (
    <div>
      <SectionHeader
        kicker="// tax engine"
        title="3 модуля · 87 тестов · все зелёные"
        subtitle="Архитектурный обзор движка налоговых правил"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
        {taxEngineModules.map((m) => (
          <div key={m.n} className="border border-slate-800 bg-slate-900/30 p-4 rounded-sm">
            <div className="flex items-baseline justify-between mb-2">
              <div className="flex items-baseline gap-3">
                <span className="text-amber-300/70 text-xs" style={{ fontFamily: FONT_DISPLAY }}>
                  M{m.n}
                </span>
                <h3 className="text-slate-100" style={{ fontFamily: FONT_BODY, fontWeight: 600 }}>
                  {m.name}
                </h3>
              </div>
              <span className="text-xs text-emerald-400" style={{ fontFamily: FONT_DISPLAY }}>
                {m.tests} ✓
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed" style={{ fontFamily: FONT_BODY }}>
              {m.desc}
            </p>
          </div>
        ))}
      </div>

      <div className="border border-slate-800 bg-slate-900/30 p-4 rounded-sm">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-3" style={{ fontFamily: FONT_DISPLAY }}>
          // pipeline
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs" style={{ fontFamily: FONT_DISPLAY }}>
          {['regime.py', 'calculator.py', 'optimizer.py'].map((s, i, a) => (
            <span key={s} className="flex items-center gap-2">
              <span className="px-2 py-1 bg-slate-800 text-slate-200 rounded-sm">{s}</span>
              {i < a.length - 1 && <span className="text-slate-600">→</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Config() {
  return (
    <div>
      <SectionHeader
        kicker="// config"
        title="tax_rates.yaml"
        subtitle="Конфигурация Tax Engine — все ставки, лимиты и формулы в одном месте"
      />
      <pre
        className="bg-slate-950 border border-slate-800 p-4 md:p-6 rounded-sm overflow-x-auto text-xs leading-relaxed"
        style={{ fontFamily: FONT_DISPLAY }}
      >
        <code className="text-slate-300">{taxRatesYaml}</code>
      </pre>

      <div className="mt-6 border-l-2 border-amber-400/50 pl-4 py-2">
        <div className="text-[10px] uppercase tracking-widest text-amber-300 mb-1" style={{ fontFamily: FONT_DISPLAY }}>
          // critical
        </div>
        <p className="text-sm text-slate-300" style={{ fontFamily: FONT_BODY }}>
          Не путать <code className="text-amber-200 px-1">income_tax_ip</code> (20%, ст. 99) с прогрессивной шкалой
          для наёмных работников (ст. 101). Это разные ставки и разные базы.
        </p>
      </div>
    </div>
  );
}

function KvedSection() {
  return (
    <div>
      <SectionHeader
        kicker="// kved"
        title="Классификатор видов деятельности"
        subtitle="773 пятизначных кода + поддержка нового 7-значного формата от 16.01.2025"
      />

      <div className="space-y-4 mb-8">
        <div className="border border-slate-800 bg-slate-900/30 p-4 rounded-sm">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2" style={{ fontFamily: FONT_DISPLAY }}>
            // структура 7-значного кода
          </div>
          <div className="flex items-center gap-1 mb-3" style={{ fontFamily: FONT_DISPLAY }}>
            {['7', '3', '1', '1', '0', '0', '3'].map((d, i) => (
              <span
                key={i}
                className={`w-8 h-10 flex items-center justify-center text-lg border rounded-sm ${
                  i < 5 ? 'border-amber-400/40 text-amber-200 bg-amber-400/5' : 'border-sky-400/40 text-sky-200 bg-sky-400/5'
                }`}
              >
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs" style={{ fontFamily: FONT_BODY }}>
            <div>
              <div className="text-amber-300 mb-1" style={{ fontFamily: FONT_DISPLAY }}>
                73110 — основной KVƏD
              </div>
              <div className="text-slate-400">"Reklam agentliklərinin fəaliyyəti" — деятельность рекламных агентств</div>
            </div>
            <div>
              <div className="text-sky-300 mb-1" style={{ fontFamily: FONT_DISPLAY }}>
                03 — подвид
              </div>
              <div className="text-slate-400">Конкретный подвид внутри группы (см. xls справочник DVX)</div>
            </div>
          </div>
        </div>

        <div className="border border-rose-500/30 bg-rose-500/5 p-4 rounded-sm">
          <div className="flex items-center gap-2 mb-2">
            <TagPill tag="rule" />
            <h3 className="text-slate-100" style={{ fontFamily: FONT_BODY, fontWeight: 600 }}>
              Реклама 73110 — нет права на льготу 75%
            </h3>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed mb-2" style={{ fontFamily: FONT_BODY }}>
            Рекламная деятельность не входит в закрытый список 13 видов ст. 102.1.30-1 ("наука, образование,
            культура, спорт", кулинария, курьеры, бытовые услуги и т.д.) и не подходит под 102.1.30 без 3+
            работников.
          </p>
          <div className="text-xs text-slate-500" style={{ fontFamily: FONT_BODY }}>
            Оптимум: <span className="text-amber-200">sadələşdirilmiş 2%</span> без льгот.
          </div>
        </div>
      </div>
    </div>
  );
}

function TestCases() {
  return (
    <div>
      <SectionHeader
        kicker="// test cases"
        title="Эталонные сценарии"
        subtitle="Проверочные кейсы для движка — реальные клиентские ситуации"
      />
      <div className="space-y-4">
        {testCases.map((tc, i) => (
          <div key={i} className="border border-slate-800 bg-slate-900/30 rounded-sm overflow-hidden">
            <div className="border-b border-slate-800 p-4 bg-slate-900/50">
              <h3 className="text-slate-100 mb-1" style={{ fontFamily: FONT_BODY, fontWeight: 600 }}>
                {tc.name}
              </h3>
              <div className="text-xs text-slate-500" style={{ fontFamily: FONT_DISPLAY }}>
                inputs: <span className="text-slate-300">{tc.inputs}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1" style={{ fontFamily: FONT_DISPLAY }}>
                regime: <span className="text-emerald-300">{tc.regime}</span>
              </div>
            </div>
            <div className="p-4">
              <table className="w-full text-sm">
                <tbody>
                  {tc.breakdown.map(([label, val], j) => (
                    <tr key={j} className="border-b border-slate-800/50 last:border-0">
                      <td className="py-2 text-slate-400 pr-4" style={{ fontFamily: FONT_BODY }}>
                        {label}
                      </td>
                      <td className="py-2 text-slate-200 text-right" style={{ fontFamily: FONT_DISPLAY }}>
                        {val}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'changelog', label: 'Changelog' },
  { id: 'phases', label: 'Phases' },
  { id: 'engine', label: 'Tax Engine' },
  { id: 'config', label: 'Config' },
  { id: 'kved', label: 'KVƏD' },
  { id: 'cases', label: 'Test Cases' },
];

export default function Playbook() {
  const [tab, setTab] = useState('changelog');

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&display=swap';
    document.head.appendChild(link);
    return () => {
      try { document.head.removeChild(link); } catch (e) {}
    };
  }, []);

  const renderTab = () => {
    switch (tab) {
      case 'overview': return <Overview />;
      case 'changelog': return <Changelog />;
      case 'phases': return <Phases />;
      case 'engine': return <TaxEngine />;
      case 'config': return <Config />;
      case 'kved': return <KvedSection />;
      case 'cases': return <TestCases />;
      default: return <Changelog />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200" style={{ fontFamily: FONT_BODY }}>
      {/* HEADER */}
      <div className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-amber-300/70 mb-0.5" style={{ fontFamily: FONT_DISPLAY }}>
                // playbook
              </div>
              <h1 className="text-xl md:text-2xl text-slate-100" style={{ fontFamily: FONT_BODY, fontWeight: 600 }}>
                Fərdi Sahibkar · Tax Autopilot
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-slate-500" style={{ fontFamily: FONT_DISPLAY }}>
                  version
                </div>
                <div className="text-amber-300 text-lg" style={{ fontFamily: FONT_DISPLAY, fontWeight: 700 }}>
                  v{VERSION}
                </div>
              </div>
              <div className="text-right border-l border-slate-800 pl-4">
                <div className="text-[10px] uppercase tracking-widest text-slate-500" style={{ fontFamily: FONT_DISPLAY }}>
                  updated
                </div>
                <div className="text-slate-300 text-sm" style={{ fontFamily: FONT_DISPLAY }}>
                  {UPDATED}
                </div>
              </div>
            </div>
          </div>

          {/* TABS */}
          <div className="mt-5 flex flex-wrap gap-1 border-b border-slate-900 -mb-px overflow-x-auto">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-3 py-2 text-xs uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap ${
                    active
                      ? 'text-amber-300 border-amber-300'
                      : 'text-slate-500 border-transparent hover:text-slate-300'
                  }`}
                  style={{ fontFamily: FONT_DISPLAY }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12">{renderTab()}</div>

      {/* FOOTER */}
      <div className="border-t border-slate-800 mt-12">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600" style={{ fontFamily: FONT_DISPLAY }}>
            // {REPO}
          </div>
          <div className="text-xs text-slate-600" style={{ fontFamily: FONT_DISPLAY }}>
            single source of truth · v{VERSION}
          </div>
        </div>
      </div>
    </div>
  );
}