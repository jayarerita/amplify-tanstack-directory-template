import { createFileRoute } from '@tanstack/react-router'
import { generateRobots } from '~/lib/server-functions'

export const Route = createFileRoute('/robots.txt')({
  loader: async () => {
    return await generateRobots()
  },
})