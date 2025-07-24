# Project Structure & Organization

## Root Directory Layout

```
├── amplify/                 # AWS Amplify backend configuration
├── src/                     # Frontend source code
├── public/                  # Static assets (favicons, manifests)
├── .kiro/                   # Kiro IDE configuration and steering
├── package.json             # Dependencies and scripts
├── vite.config.ts           # Vite build configuration
├── tsconfig.json            # TypeScript configuration
├── tailwind.config.mjs      # Tailwind CSS configuration
└── amplify_outputs.json     # Auto-generated AWS config (gitignored)
```

## Backend Structure (`amplify/`)

- `backend.ts`: Main backend entry point that combines auth and data resources
- `auth/resource.ts`: AWS Cognito authentication configuration
- `data/resource.ts`: GraphQL schema and DynamoDB table definitions

## Frontend Structure (`src/`)

### Core Application Files
- `router.tsx`: TanStack Router configuration and setup
- `routeTree.gen.ts`: Auto-generated route tree (do not edit manually)

### Directory Organization

#### `src/components/`
React components organized by functionality:
- Authentication components (`Auth.tsx`, `AuthenticatorWrapper.tsx`, `Login.tsx`)
- Error handling (`DefaultCatchBoundary.tsx`, `NotFound.tsx`)

#### `src/routes/`
File-based routing following TanStack Router conventions:
- `__root.tsx`: Root layout with navigation and global providers
- `index.tsx`: Home page route
- `login.tsx`, `signup.tsx`, `logout.tsx`: Authentication routes
- `_authed.tsx`: Layout for authenticated routes
- `_authed/`: Directory for protected routes

#### `src/lib/`
Utility libraries and configuration:
- `amplify.ts`: AWS Amplify configuration setup
- `data.ts`: Data service layer and GraphQL operations
- `query-client.ts`: TanStack Query client configuration
- `amplify-ui-theme.ts`: Amplify UI theming customization

#### `src/hooks/`
Custom React hooks:
- `useAuth.ts`: Authentication state management

#### `src/utils/`
Utility functions and helpers

#### `src/styles/`
- `app.css`: Global CSS styles and Tailwind imports

## File Naming Conventions

- **Components**: PascalCase (e.g., `AuthenticatorWrapper.tsx`)
- **Routes**: kebab-case or underscore prefixes for special routes (e.g., `_authed.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAuth.ts`)
- **Utilities**: camelCase (e.g., `amplify.ts`)
- **Types**: PascalCase with `.types.ts` suffix when separate

## Import Path Conventions

- Use `~/*` alias for imports from `src/` directory
- Relative imports for files in the same directory
- Absolute imports for shared utilities and components

## Route Organization Patterns

- **Public routes**: Direct files in `src/routes/`
- **Protected routes**: Under `_authed/` directory
- **Layout routes**: Use underscore prefix (e.g., `_authed.tsx`)
- **Route groups**: Use parentheses for organization without URL segments

## Component Organization Guidelines

- Keep components focused and single-purpose
- Co-locate related components when they're tightly coupled
- Separate authentication-related components from general UI components
- Use descriptive names that indicate component purpose