import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { readFileSync } from 'fs'
import { join } from 'path'
import { dataDir } from '../paths.js'

export function registerVoiceTool(server: McpServer) {
  server.tool(
    'get_writing_profile',
    "Get Jack Butcher's complete writing profile — voice, rhetorical patterns, contrast frames, word-level mechanics, anti-patterns, and reference tweets. Use this to write in the VV voice or understand the style.",
    {},
    async () => {
      const content = readFileSync(join(dataDir, 'writing-profile.md'), 'utf-8')
      return {
        content: [{ type: 'text' as const, text: content }],
      }
    }
  )
}
