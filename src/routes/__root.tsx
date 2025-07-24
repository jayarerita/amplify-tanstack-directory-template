/// <reference types="vite/client" />
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { QueryClientProvider } from '@tanstack/react-query'
import * as React from 'react'
import { DefaultCatchBoundary } from '~/components/DefaultCatchBoundary.js'
import { NotFound } from '~/components/NotFound.js'
import appCss from '~/styles/app.css?url'
import { seo } from '~/utils/seo.js'
import { generateWebSiteSchema, generateOrganizationSchema, injectStructuredData } from '~/utils/structured-data.js'
import { useAuth } from '~/hooks/useAuth.js'
import { queryClient } from '~/lib/query-client.js'
import { SearchInterface } from '~/components/SearchInterface.js'
import '~/lib/amplify.js'

// Lazy load React Query DevTools to avoid SSR issues
const ReactQueryDevtools = React.lazy(() =>
  import('@tanstack/react-query-devtools').then((d) => ({
    default: d.ReactQueryDevtools,
  }))
)

export const Route = createRootRoute({
  head: () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://localhost:3000';
    
    // Generate structured data for the website
    const websiteSchema = generateWebSiteSchema(baseUrl);
    const organizationSchema = generateOrganizationSchema(baseUrl);

    return {
      meta: [
        {
          charSet: 'utf-8',
        },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1',
        },
        ...seo({
          title: 'Local Business Directory | Find the Best Businesses Near You',
          description: 'Discover local restaurants, services, and shops in your area. Browse reviews, get directions, and connect with businesses in your community.',
          url: baseUrl,
          canonical: baseUrl,
        }),
      ],
      links: [
        { rel: 'stylesheet', href: appCss },
        {
          rel: 'apple-touch-icon',
          sizes: '180x180',
          href: '/apple-touch-icon.png',
        },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '32x32',
          href: '/favicon-32x32.png',
        },
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '16x16',
          href: '/favicon-16x16.png',
        },
        { rel: 'manifest', href: '/site.webmanifest', color: '#fffff' },
        { rel: 'icon', href: '/favicon.ico' },
      ],
      scripts: [
        injectStructuredData(websiteSchema),
        injectStructuredData(organizationSchema),
      ],
    };
  },
  errorComponent: (props) => {
    return (
      <RootDocument>
        <DefaultCatchBoundary {...props} />
      </RootDocument>
    )
  },
  notFoundComponent: () => <NotFound />,
  component: RootComponent,
})

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootDocument>
        <Outlet />
      </RootDocument>
      <React.Suspense fallback={null}>
        <ReactQueryDevtools initialIsOpen={false} />
      </React.Suspense>
    </QueryClientProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout, userAttributes, isAdmin, isBusinessOwner } = useAuth()

  const handleLogout = async () => {
    await logout()
    // Force a page refresh to ensure clean state
    window.location.href = '/'
  }

  const getUserDisplayName = () => {
    if (userAttributes?.given_name && userAttributes?.family_name) {
      return `${userAttributes.given_name} ${userAttributes.family_name}`
    }
    return user?.signInDetails?.loginId || 'User'
  }

  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        <nav className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-8">
                <Link
                  to="/"
                  className="text-xl font-bold text-gray-900"
                  activeOptions={{ exact: true }}
                >
                  Directory
                </Link>
                
                {/* Compact Search Interface */}
                <div className="hidden lg:block flex-1 max-w-md">
                  <SearchInterface
                    placeholder="Search businesses..."
                    className="text-sm"
                    showFilters={false}
                  />
                </div>
                
                <div className="hidden md:flex space-x-6">
                  <Link
                    to="/listings"
                    className="text-gray-600 hover:text-gray-900"
                    activeProps={{ className: 'text-blue-600 font-medium' }}
                  >
                    Browse
                  </Link>
                  <Link
                    to="/categories"
                    className="text-gray-600 hover:text-gray-900"
                    activeProps={{ className: 'text-blue-600 font-medium' }}
                  >
                    Categories
                  </Link>
                  <Link
                    to="/listings/submit"
                    className="text-gray-600 hover:text-gray-900"
                    activeProps={{ className: 'text-blue-600 font-medium' }}
                  >
                    Add Business
                  </Link>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {isAuthenticated && user ? (
                  <>
                    {isAdmin() && (
                      <Link
                        to="/admin"
                        className="text-gray-600 hover:text-gray-900"
                        activeProps={{ className: 'text-blue-600 font-medium' }}
                      >
                        Admin
                      </Link>
                    )}
                    <div className="relative group">
                      <button className="text-gray-700 hover:text-gray-900 flex items-center">
                        {getUserDisplayName()}
                        <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 hidden group-hover:block">
                        <Link
                          to="/profile"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Profile
                        </Link>
                        {isBusinessOwner() && (
                          <Link
                            to="/dashboard"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            My Listings
                          </Link>
                        )}
                        <button 
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-x-4">
                    <Link 
                      to="/login"
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Login
                    </Link>
                    <Link 
                      to="/signup"
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>
        {children}
        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  )
}
