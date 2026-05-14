# 🇦🇿 Fərdi Sahibkar — Налоговый Автопилот

Мобильное приложение + API-платформа для автоматизации бухгалтерии и налоговой отчётности индивидуальных предпринимателей Азербайджана.

## Правовая база
- Налоговый кодекс АР: https://e-qanun.az/framework/46948
- Портал налоговой: https://www.taxes.gov.az
- Playbook версия: v1.4

## Структура проекта
- `/src/tax_engine` — расчёт налогов (KVƏD → НК АР)
- `/src/payroll` — зарплаты и соцвзносы
- `/src/integrations` — ASAN İmza, банки
- `/src/api` — REST API
- `/mobile` — Flutter приложение
- `/docs` — документация

## Стек
- Backend: Python (FastAPI)
- Mobile: Flutter
- DB: PostgreSQL 15
- Infra: Docker + GitHub Actions
