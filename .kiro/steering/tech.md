# Technology Stack

## Core Framework & Build System

- **TanStack Start**: Full-stack React framework with SSR/SSG capabilities
- **Vite**: Build tool and development server (port 3000)
- **TypeScript**: Strict type checking enabled across entire codebase
- **Node.js**: ES modules with `"type": "module"` in package.json

## Frontend Stack

- **React 19**: Latest React with concurrent features
- **TanStack Router**: File-based routing with type safety
- **TanStack Query**: Server state management and caching
- **Tailwind CSS**: Utility-first CSS framework
- **Amplify UI**: Pre-built authentication components

## Backend & Infrastructure

- **AWS Amplify Gen 2**: Backend-as-a-service with TypeScript-first DX
- **AWS Cognito**: User authentication and management
- **AWS AppSync**: GraphQL API with real-time subscriptions
- **AWS DynamoDB**: NoSQL database for data persistence

## Development Tools

- **TanStack Router DevTools**: Route debugging and inspection
- **TanStack Query DevTools**: Query state visualization
- **TypeScript paths**: `~/*` alias for `./src/*` imports
- **Prettier**: Code formatting (see .prettierignore)

## Common Commands

### Development
```bash
npm run dev              # Start development server on port 3000
npm run build            # Build for production
npm run start            # Start production server
```

### AWS Amplify Backend
```bash
npm run amplify:sandbox  # Deploy backend to development sandbox
npm run amplify:deploy   # Deploy backend to production
npm run amplify:generate # Generate outputs for existing app
```

## Configuration Files

- `vite.config.ts`: Vite configuration with TanStack Start plugin
- `tsconfig.json`: TypeScript configuration with strict mode
- `tailwind.config.mjs`: Tailwind CSS configuration
- `amplify_outputs.json`: Auto-generated AWS configuration (do not edit)
- `amplify/backend.ts`: Main backend configuration entry point

## Key Dependencies

- `@tanstack/react-start`: Core framework
- `@tanstack/react-router`: Type-safe routing
- `@tanstack/react-query`: Server state management
- `aws-amplify`: AWS SDK and utilities
- `@aws-amplify/ui-react`: Authentication UI components
- `tailwind-merge`: Utility for merging Tailwind classes