import { createFileRoute } from '@tanstack/react-router'
import { generateSitemapXml } from '~/lib/server-functions'

export const Route = createFileRoute('/sitemap.xml')({
  loader: async () => {
    return await generateSitemapXml()
  },
})