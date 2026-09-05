# ERP Web

Nuxt UI app scaffolded from property-management-web's core structure: auth (JWT + refresh), an admin user CRUD page, a dashboard shell, and a shared library of generic list/form building blocks (`DataTable`, `DynamicForm`, `Field`, `StatTile`, `StatusBadge`, upload fields, etc.) driven by declarative `ColumnDef`/`FieldDef` types in [shared/types.ts](shared/types.ts).

Copy `.env.example` to `.env` and point `NUXT_BACKEND_BASE` at the backend before running `npm run dev`. Add feature composables under `app/composables/` (`useX.ts`, wrapping `useApi()`) and pages under `app/pages/`, then register them in [app/layouts/default.vue](app/layouts/default.vue)'s nav `items`.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
