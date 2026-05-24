import { useEffect, useState } from 'react';

const VERSION = '1.7';
const UPDATED = '2026-05-24';
const REPO = 'github.com/byazerbaijan/ferdi-sahibkar-platform';
const FONT_MONO = '"JetBrains Mono", ui-monospace, monospace';
const FONT_BODY = '"Fraunces", ui-serif, Georgia, serif';

const changelog = [
  {
    v: '1.7', date: '2026-05-24', status: 'current',
    entries: [
      {
        tag: 'api',
        title: 'REST API v1 — запущен и задеплоен',
        body: 'FastAPI + Uvicorn. 5 эндпоинтов: POST /v1/tax/calculate (главный — оптимальный режим), POST /v1/tax/burden (полная нагрузка помесячно), POST /v1/dsmf/calculate, GET /v1/kvad/{code}, GET /health. Автодокументация: /docs. Все три тестовых сценария верифицированы.',
      },
      {
        tag: 'engine',
        title: 'Верификация API на реальных сценариях',
        body: 'Магазин одежды 36k + 3 сотрудника → 180 AZN (0.5%, льгота 75%). IT-разработчик 60k → 3,000 AZN (5% до 2032). Строительство 50k → упрощёнка заблокирована (ст. 218.5) → НДФЛ 2,900 AZN.',
      },
    ],
  },
  {
    v: '1.6', date: '2026-05-22', status: 'archived',
    entries: [
      { tag: 'engine', title: 'Tax Engine завершён — 3 модуля, 87 тестов', body: 'regime.py (29 ✓), calculator.py (34 ✓), optimizer.py (24 ✓). CI/CD зелёный.' },
      { tag: 'legal', title: 'ДСМФ новая формула 01.01.2026 (ст. 14.5.1)', body: '2% от оборота, мин 60 AZN, макс 400 AZN. Помесячно.' },
      { tag: 'legal', title: 'İcbari tibbi sığorta', body: '16 AZN/мес фиксированно.' },
      { tag: 'data', title: 'Поддержка 7-значных KVƏD-кодов', body: 'DVX 16.01.2025.' },
      { tag: 'rule', title: 'Реклама 73110 — нет льготы 75%', body: 'Не входит в список 13 видов ст. 102.1.30-1.' },
    ],
  },
  {
    v: '1.5', date: '2026-05-21', status: 'archived',
    entries: [
      { tag: 'data', title: 'KVƏD-маппинг — 773 кода в playbook', body: 'Официальный справочник taxes.gov.az с соответствием статьям НК АР.' },
    ],
  },
  {
    v: '1.4', date: 'архив', status: 'archived',
    entries: [
      { tag: 'note', title: 'См. предыдущий артефакт', body: 'Интеграция taxes.gov.az, ст. 99 vs 101, льгота 75% две ветки (102.1.30 / 102.1.30-1), правило 50% (102.9), yoga-кейс (85.51.0).' },
    ],
  },
];

const phases = [
  { id: 'P0', title: 'Foundation — правовая база и KVƏD', status: 'done', items: ['НК АР e-qanun.az/framework/46948', '773 KVƏD кодов → режимы + статьи НК', 'ДСМФ ст. 14.5.1, медстрах', 'Разделение ст. 99 (ИП) и ст. 101 (наёмные)'] },
  { id: 'P1', title: 'Tax Engine — спецификация', status: 'done', items: ['3 модуля: regime.py, calculator.py, optimizer.py', 'Тест-кейсы из реальных клиентов', 'Edge cases: ДСМФ мин/макс, льгота 75% две ветки'] },
  { id: 'P2', title: 'Tax Engine — имплементация', status: 'done', items: ['87 тестов — все зелёные', 'CI/CD GitHub Actions', 'Репо: ' + REPO] },
  { id: 'P3', title: 'REST API', status: 'done', items: ['FastAPI + Uvicorn', 'POST /v1/tax/calculate — главный эндпоинт', 'POST /v1/tax/burden — помесячная нагрузка', 'GET /v1/kvad/{code} — режим по коду', 'Автодокументация /docs'] },
  { id: 'P4', title: 'Интеграции — ASAN İmza + банки', status: 'planned', items: ['ASAN İmza SDK (официальный, sandbox)', 'RPA Playwright для taxes.gov.az', 'Bank Connector — ABB Bank (приоритет 1)', 'Мониторинг изменений форм и НК'] },
  { id: 'P5', title: 'B2C мобильное приложение', status: 'planned', items: ['Flutter — iOS + Android', 'Онбординг: VÖEN → KVƏD → авторежим', 'Dashboard: налоги, дедлайны, push-уведомления', 'Подпись и сдача отчётов через ASAN İmza'] },
  { id: 'P6', title: 'B2B API платформа', status: 'planned', items: ['White Label для банков', 'Revenue Share / API License', 'Webhook-уведомления', 'Документация и sandbox'] },
];

const apiEndpoints = [
  { method: 'POST', path: '/v1/tax/calculate', desc: 'Главный — оптимальный режим + все опции', body: '{"kvad_code": "47711", "annual_income": 36000, "employees": 3, "year": 2026}', response: '{"recommended_regime": "SIMPLIFIED_EXEMPT75", "tax_amount": 180.0, "effective_rate_pct": "0.5%", "saving_vs_standard": 540.0}' },
  { method: 'POST', path: '/v1/tax/burden', desc: 'Полная нагрузка помесячно (tax + DSMF + medical)', body: '{"kvad_code": "73110", "monthly_revenues": [7500, 2000], "employees": 0}', response: '{"total_burden": 622.0, "effective_rate_pct": "6.55%"}' },
  { method: 'POST', path: '/v1/dsmf/calculate', desc: 'ДСМФ за один месяц (ст. 14.5.1)', body: '{"monthly_revenue": 7500}', response: '{"dsmf_amount": 150.0, "floor_applied": false}' },
  { method: 'GET', path: '/v1/kvad/{code}', desc: 'Налоговый режим по KVƏD-коду', body: 'GET /v1/kvad/47711', response: '{"regime": "SIMPLIFIED_2", "simplified_allowed": true, "exempt75_eligible": true}' },
  { method: 'GET', path: '/health', desc: 'Health check', body: 'GET /health', response: '{"status": "ok", "timestamp": "..."}' },
];

const taxEngineModules = [
  { n: 1, name: 'regime.py', tests: 29, desc: 'KVƏD-резолвер. 226 кодов → режим + статьи НК. Запрет ст. 218.5, спецрежимы (IT, медиа).' },
  { n: 2, name: 'calculator.py', tests: 34, desc: 'Упрощёнка 2%/4%, НДФЛ 2026-2028, льгота 75% (102.1.30 / 102.1.30-1), ДСМФ, медстрах, полная нагрузка.' },
  { n: 3, name: 'optimizer.py', tests: 24, desc: 'Авто-выбор оптимального режима. Сравнение всех опций, предупреждения о граничных значениях.' },
];

const testCases = [
  {
    name: 'Магазин одежды — KVƏD 47711', inputs: '36,000 AZN/год, 3 сотрудника', regime: 'sadələşdirilmiş 2% + 75% güzəşt',
    breakdown: [['Без льготы', '36000 × 2% = 720 AZN'], ['С льготой 75%', '9000 × 2% = 180 AZN'], ['Экономия', '540 AZN (75%)'], ['Эффективная ставка', '0.5%']],
  },
  {
    name: 'IT-разработчик — KVƏD 62010', inputs: '60,000 AZN/год, без сотрудников', regime: 'IT sektoru 5% (Maddə 101, 2032-ə qədər)',
    breakdown: [['IT ставка', '60000 × 5% = 3,000 AZN'], ['vs НДФЛ прогрессив', '3,900 AZN'], ['Экономия', '900 AZN'], ['Упрощёнка', 'ЗАПРЕЩЕНА (ст. 218.5)']],
  },
  {
    name: 'Реклама — KVƏD 73110 (7-значный: 7311003)', inputs: 'Апрель 7,500 + Май 2,000 AZN', regime: 'sadələşdirilmiş 2% (льгота 75% — НЕ применима)',
    breakdown: [['Vergi апрель+май', '150 + 40 = 190 AZN'], ['DSMF апрель', 'max(150,60) = 150 AZN'], ['DSMF май', 'max(40,60) = 60 AZN'], ['Tibbi 2 мес.', '32 AZN'], ['ИТОГО', '432 AZN (4.55%)']],
  },
  {
    name: 'Строительство — KVƏD 41200', inputs: '50,000 AZN/год', regime: 'Gəlir vergisi progressiv (ст. 218.5 — запрет)',
    breakdown: [['Упрощёнка', 'ЗАПРЕЩЕНА — ст. 218.5'], ['НДФЛ 2026', '2,900 AZN (5.8%)'], ['Единственный вариант', 'Прогрессивный НДФЛ']],
  },
];

// ── COMPONENTS ─────────────────────────────────────────────

function Dot({ status }) {
  const m = { done: ['bg-emerald-400','text-emerald-400','Готово'], progress: ['bg-amber-400','text-amber-400','В работе'], planned: ['bg-slate-500','text-slate-500','План'], current: ['bg-amber-300','text-amber-300','Текущая'], archived: ['bg-slate-700','text-slate-600','Архив'] };
  const [bg, tc, lbl] = m[status] || m.planned;
  return <span className="inline-flex items-center gap-2"><span className={`w-1.5 h-1.5 rounded-full ${bg}`}/><span className={`text-[10px] uppercase tracking-widest ${tc}`} style={{fontFamily:FONT_MONO}}>{lbl}</span></span>;
}

function Tag({ tag }) {
  const c = { api:'border-violet-500/30 text-violet-300 bg-violet-500/5', engine:'border-emerald-500/30 text-emerald-300 bg-emerald-500/5', legal:'border-amber-500/30 text-amber-300 bg-amber-500/5', data:'border-sky-500/30 text-sky-300 bg-sky-500/5', rule:'border-rose-500/30 text-rose-300 bg-rose-500/5', note:'border-slate-500/30 text-slate-400 bg-slate-500/5' };
  return <span className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-widest border rounded-sm ${c[tag]||c.note}`} style={{fontFamily:FONT_MONO}}>{tag}</span>;
}

function SH({ kicker, title, sub }) {
  return (
    <div className="mb-8 border-b border-slate-800 pb-4">
      <div className="text-[10px] uppercase tracking-[0.3em] text-amber-300/70 mb-2" style={{fontFamily:FONT_MONO}}>{kicker}</div>
      <h2 className="text-2xl md:text-3xl text-slate-100 mb-1" style={{fontFamily:FONT_BODY,fontWeight:500}}>{title}</h2>
      {sub && <div className="text-sm text-slate-500" style={{fontFamily:FONT_BODY}}>{sub}</div>}
    </div>
  );
}

function Code({ children }) {
  return <pre className="bg-slate-950 border border-slate-800 rounded-sm p-3 text-xs overflow-x-auto" style={{fontFamily:FONT_MONO}}><code className="text-slate-300">{children}</code></pre>;
}

// ── TABS ───────────────────────────────────────────────────

function Overview() {
  return (
    <div>
      <SH kicker="// overview" title="Tax autopilot для Fərdi Sahibkar" sub="Автоматизация 90%+ бухгалтерии для ИП Азербайджана — B2C мобильное приложение + B2B API" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {[['Версия',VERSION,'amber-300'],['Модули','3','emerald-400'],['Тесты','87 / 87','emerald-400'],['Фазы готовы','4 / 7','amber-400']].map(([l,v,c],i)=>(
          <div key={i} className="border border-slate-800 bg-slate-900/40 p-4 rounded-sm">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2" style={{fontFamily:FONT_MONO}}>{l}</div>
            <div className={`text-3xl text-${c}`} style={{fontFamily:FONT_MONO,fontWeight:700}}>{v}</div>
          </div>
        ))}
      </div>
      <div className="space-y-5">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-2" style={{fontFamily:FONT_MONO}}>// стек</div>
          <div className="flex flex-wrap gap-2">
            {['Python 3.9','FastAPI','Uvicorn','pytest','pyyaml','Flutter (планируется)','PostgreSQL (планируется)'].map(t=>(
              <span key={t} className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded-sm" style={{fontFamily:FONT_MONO}}>{t}</span>
            ))}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-2" style={{fontFamily:FONT_MONO}}>// репозиторий</div>
          <Code>{REPO}</Code>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-2" style={{fontFamily:FONT_MONO}}>// правовая база</div>
          <p className="text-sm text-slate-400 leading-relaxed" style={{fontFamily:FONT_BODY}}>
            НК АР — <span className="text-slate-200">e-qanun.az/framework/46948</span> · Закон о соц. страховании — <span className="text-slate-200">e-qanun.az/framework/3813</span> · KVƏD справочник DVX 16.01.2025
          </p>
        </div>
      </div>
    </div>
  );
}

function Changelog() {
  return (
    <div>
      <SH kicker="// changelog" title={`v${VERSION} — REST API shipped`} sub={`Обновлено ${UPDATED} · следующая итерация: ASAN İmza + банки`} />
      <div className="space-y-10">
        {changelog.map(r=>(
          <div key={r.v} className="relative pl-6 border-l border-slate-800">
            <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-slate-700 border border-slate-600"/>
            <div className="flex items-baseline gap-4 mb-4">
              <span className="text-2xl text-amber-200" style={{fontFamily:FONT_MONO,fontWeight:700}}>v{r.v}</span>
              <span className="text-xs text-slate-500" style={{fontFamily:FONT_MONO}}>{r.date}</span>
              <Dot status={r.status}/>
            </div>
            <div className="space-y-3">
              {r.entries.map((e,i)=>(
                <div key={i} className="border border-slate-800 bg-slate-900/30 p-4 rounded-sm">
                  <div className="flex items-center gap-2 mb-2"><Tag tag={e.tag}/><h3 className="text-base text-slate-100" style={{fontFamily:FONT_BODY,fontWeight:600}}>{e.title}</h3></div>
                  <p className="text-sm text-slate-400 leading-relaxed" style={{fontFamily:FONT_BODY}}>{e.body}</p>
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
      <SH kicker="// roadmap" title="Фазы развития платформы" sub="P0–P3 закрыты. P4: ASAN İmza + банки. P5: мобильное приложение. P6: B2B API." />
      <div className="space-y-3">
        {phases.map(p=>(
          <div key={p.id} className={`border p-4 rounded-sm ${p.status==='done'?'border-emerald-500/30 bg-emerald-500/[0.03]':'border-slate-800 bg-slate-900/30'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-amber-300 text-sm" style={{fontFamily:FONT_MONO,fontWeight:700}}>{p.id}</span>
                <h3 className="text-base text-slate-100" style={{fontFamily:FONT_BODY,fontWeight:600}}>{p.title}</h3>
              </div>
              <Dot status={p.status}/>
            </div>
            <ul className="space-y-1 pl-7">
              {p.items.map((item,i)=>(
                <li key={i} className="text-sm text-slate-400 flex items-start gap-2" style={{fontFamily:FONT_BODY}}>
                  <span className="text-slate-600 mt-1">—</span><span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function API() {
  const [open, setOpen] = useState(0);
  return (
    <div>
      <SH kicker="// rest api v1" title="5 эндпоинтов · FastAPI · /docs" sub={`Запущен локально: http://127.0.0.1:8000 · uvicorn src.api.main:app --reload`} />
      <div className="mb-6 p-3 border border-violet-500/20 bg-violet-500/5 rounded-sm text-xs text-violet-300" style={{fontFamily:FONT_MONO}}>
        python3 -m uvicorn src.api.main:app --reload --port 8000
      </div>
      <div className="space-y-2">
        {apiEndpoints.map((ep,i)=>(
          <div key={i} className="border border-slate-800 rounded-sm overflow-hidden">
            <div className="flex items-center gap-3 p-3 cursor-pointer bg-slate-900/30 hover:bg-slate-900/60" onClick={()=>setOpen(open===i?-1:i)}>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-sm ${ep.method==='POST'?'bg-violet-500/20 text-violet-300':'bg-sky-500/20 text-sky-300'}`} style={{fontFamily:FONT_MONO}}>{ep.method}</span>
              <span className="text-slate-200 text-sm" style={{fontFamily:FONT_MONO}}>{ep.path}</span>
              <span className="text-slate-500 text-xs flex-1" style={{fontFamily:FONT_BODY}}>{ep.desc}</span>
              <span className="text-slate-600 text-xs">{open===i?'▲':'▼'}</span>
            </div>
            {open===i && (
              <div className="p-4 border-t border-slate-800 space-y-3">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1" style={{fontFamily:FONT_MONO}}>Request</div>
                  <Code>{ep.body}</Code>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1" style={{fontFamily:FONT_MONO}}>Response (сокращённо)</div>
                  <Code>{ep.response}</Code>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Engine() {
  return (
    <div>
      <SH kicker="// tax engine" title="3 модуля · 87 тестов · все зелёные" sub="Ядро расчётов — читает tax_rates.yaml и kvad_mapping.json" />
      <div className="grid grid-cols-1 gap-3 mb-6">
        {taxEngineModules.map(m=>(
          <div key={m.n} className="border border-slate-800 bg-slate-900/30 p-4 rounded-sm">
            <div className="flex items-baseline justify-between mb-2">
              <div className="flex items-baseline gap-3">
                <span className="text-amber-300/70 text-xs" style={{fontFamily:FONT_MONO}}>M{m.n}</span>
                <h3 className="text-slate-100" style={{fontFamily:FONT_MONO,fontWeight:600}}>{m.name}</h3>
              </div>
              <span className="text-xs text-emerald-400" style={{fontFamily:FONT_MONO}}>{m.tests} ✓</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed" style={{fontFamily:FONT_BODY}}>{m.desc}</p>
          </div>
        ))}
      </div>
      <div className="border border-slate-800 bg-slate-900/30 p-4 rounded-sm">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-3" style={{fontFamily:FONT_MONO}}>// pipeline</div>
        <div className="flex flex-wrap items-center gap-2 text-xs" style={{fontFamily:FONT_MONO}}>
          {['regime.py','calculator.py','optimizer.py','→ API'].map((s,i,a)=>(
            <span key={s} className="flex items-center gap-2">
              <span className="px-2 py-1 bg-slate-800 text-slate-200 rounded-sm">{s}</span>
              {i<a.length-1&&<span className="text-slate-600">→</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Cases() {
  return (
    <div>
      <SH kicker="// test cases" title="Эталонные сценарии" sub="Верифицированы через API + unit-тесты" />
      <div className="space-y-4">
        {testCases.map((tc,i)=>(
          <div key={i} className="border border-slate-800 bg-slate-900/30 rounded-sm overflow-hidden">
            <div className="border-b border-slate-800 p-4 bg-slate-900/50">
              <h3 className="text-slate-100 mb-1" style={{fontFamily:FONT_BODY,fontWeight:600}}>{tc.name}</h3>
              <div className="text-xs text-slate-500" style={{fontFamily:FONT_MONO}}>inputs: <span className="text-slate-300">{tc.inputs}</span></div>
              <div className="text-xs text-slate-500 mt-1" style={{fontFamily:FONT_MONO}}>regime: <span className="text-emerald-300">{tc.regime}</span></div>
            </div>
            <table className="w-full text-sm p-4">
              <tbody>
                {tc.breakdown.map(([l,v],j)=>(
                  <tr key={j} className="border-b border-slate-800/50 last:border-0">
                    <td className="py-2 px-4 text-slate-400" style={{fontFamily:FONT_BODY}}>{l}</td>
                    <td className="py-2 px-4 text-slate-200 text-right" style={{fontFamily:FONT_MONO}}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

function Next() {
  const items = [
    { step: 'P4.1', title: 'ASAN İmza SDK', desc: 'Зарегистрироваться на asanimza.az как разработчик → sandbox → подпись XML-документов.', priority: 'Критичный' },
    { step: 'P4.2', title: 'RPA Playwright — taxes.gov.az', desc: 'Автологин (Kod/Parol), заполнение форм деклараций, версионированные шаблоны в form_templates/.', priority: 'Критичный' },
    { step: 'P4.3', title: 'Bank Connector — ABB Bank', desc: 'Open API ABB Bank: инициировать оплату налогов, получать квитанции. Adapter pattern.', priority: 'Высокий' },
    { step: 'P4.4', title: 'Мониторинг НК и форм', desc: 'Парсинг e-qanun.az (еженедельно) и taxes.gov.az/xeberler (ежедневно). Алерт → обновление yaml.', priority: 'Высокий' },
    { step: 'P5.1', title: 'Flutter — онбординг', desc: 'VÖEN → KVƏD → авторежим от Tax Optimizer. WOW-момент: пользователь видит свой налог за 30 сек.', priority: 'Высокий' },
  ];
  return (
    <div>
      <SH kicker="// что дальше" title="Следующие шаги" sub="P4: Интеграции → P5: Мобильное приложение → P6: B2B API" />
      <div className="space-y-3">
        {items.map((item,i)=>(
          <div key={i} className="border border-slate-800 bg-slate-900/30 p-4 rounded-sm flex gap-4">
            <div className="text-amber-300 text-xs shrink-0 mt-0.5" style={{fontFamily:FONT_MONO}}>{item.step}</div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-slate-100 text-sm" style={{fontFamily:FONT_BODY,fontWeight:600}}>{item.title}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-sm ${item.priority==='Критичный'?'bg-red-500/15 text-red-400':'bg-amber-500/15 text-amber-400'}`} style={{fontFamily:FONT_MONO}}>{item.priority}</span>
              </div>
              <p className="text-sm text-slate-400" style={{fontFamily:FONT_BODY}}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ROOT ───────────────────────────────────────────────────

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'changelog', label: 'Changelog' },
  { id: 'phases', label: 'Phases' },
  { id: 'api', label: 'REST API' },
  { id: 'engine', label: 'Tax Engine' },
  { id: 'cases', label: 'Test Cases' },
  { id: 'next', label: 'Что дальше' },
];

export default function Playbook() {
  const [tab, setTab] = useState('changelog');

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&display=swap';
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch(e){} };
  }, []);

  const render = () => {
    switch(tab) {
      case 'overview': return <Overview/>;
      case 'changelog': return <Changelog/>;
      case 'phases': return <Phases/>;
      case 'api': return <API/>;
      case 'engine': return <Engine/>;
      case 'cases': return <Cases/>;
      case 'next': return <Next/>;
      default: return <Changelog/>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200" style={{fontFamily:FONT_BODY}}>
      <div className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-amber-300/70 mb-0.5" style={{fontFamily:FONT_MONO}}>// playbook</div>
              <h1 className="text-xl md:text-2xl text-slate-100" style={{fontFamily:FONT_BODY,fontWeight:600}}>Fərdi Sahibkar · Tax Autopilot</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-slate-500" style={{fontFamily:FONT_MONO}}>version</div>
                <div className="text-amber-300 text-lg" style={{fontFamily:FONT_MONO,fontWeight:700}}>v{VERSION}</div>
              </div>
              <div className="text-right border-l border-slate-800 pl-4">
                <div className="text-[10px] uppercase tracking-widest text-slate-500" style={{fontFamily:FONT_MONO}}>updated</div>
                <div className="text-slate-300 text-sm" style={{fontFamily:FONT_MONO}}>{UPDATED}</div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 border-b border-slate-900 -mb-px overflow-x-auto">
            {TABS.map(t=>{
              const active = tab===t.id;
              return (
                <button key={t.id} onClick={()=>setTab(t.id)}
                  className={`px-3 py-2 text-xs uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap ${active?'text-amber-300 border-amber-300':'text-slate-500 border-transparent hover:text-slate-300'}`}
                  style={{fontFamily:FONT_MONO}}>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12">{render()}</div>
      <div className="border-t border-slate-800 mt-12">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600" style={{fontFamily:FONT_MONO}}>// {REPO}</div>
          <div className="text-xs text-slate-600" style={{fontFamily:FONT_MONO}}>single source of truth · v{VERSION}</div>
        </div>
      </div>
    </div>
  );
}