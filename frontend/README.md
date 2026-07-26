# Physiotherapy Clinic Frontend

React and Vite frontend for the Physiotherapy Clinic application.

## Commands

```bash
npm install
npm run dev
npm run build
npm run lint
```

Set `VITE_API_URL` in `.env` to the backend base URL. The default is
`http://localhost:5000/api`.

## Localization

The interface supports English and Arabic with `react-i18next`. Translation
resources are organized by feature in `src/i18n/locales/{en,ar}`. The selected
language is stored under `physiocare-language`, and the application updates the
document language and LTR/RTL direction without reloading.

When adding interface copy, add the key to both locale files for the relevant
feature instead of placing user-visible text directly in a component. API
values such as roles, statuses, genders, and weekday identifiers remain in
their canonical English form and are translated only when rendered.
