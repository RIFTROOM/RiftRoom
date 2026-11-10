# RIFTROOM

Монорепо на npm workspaces.

```
apps/
  web/      фронтенд: React + TypeScript + Vite
  api/      бекенд (ще не створений)
packages/
  shared/   спільні типи для фронту й бекенду
```

## Команди (з кореня)

```bash
npm install        # встановити залежності для всіх пакетів
npm run dev        # запустити фронтенд
npm run build      # зібрати фронтенд
npm run typecheck  # перевірити типи в усіх пакетах
npm run lint       # oxlint по всьому репо
```
