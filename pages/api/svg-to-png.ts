import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAuth } from '../../lib/auth-helper'

export const config = { api: { bodyParser: { sizeLimit: '4mb' } } }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const userId = await requireAuth(req, res)
  if (!userId) return

  const { svgContent } = req.body
  if (!svgContent || typeof svgContent !== 'string') {
    return res.status(400).json({ error: 'svgContent manquant' })
  }

  try {
    const apiKey = process.env.BROWSERLESS_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'BROWSERLESS_API_KEY manquant' })

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0}body{width:1080px;height:1350px;overflow:hidden}</style></head><body>${svgContent}</body></html>`

    const browserlessRes = await fetch(`https://production-sfo.browserless.io/screenshot?token=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html,
        options: { type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1350 } },
        viewport: { width: 1080, height: 1350 },
        waitForTimeout: 2000,
      }),
    })

    if (!browserlessRes.ok) {
      const err = await browserlessRes.text()
      console.error('[svg-to-png] Browserless error:', err)
      return res.status(500).json({ error: 'Conversion Browserless échouée' })
    }

    const pngBuffer = await browserlessRes.arrayBuffer()
    const base64 = Buffer.from(pngBuffer).toString('base64')
    return res.status(200).json({ base64 })
  } catch (err: any) {
    console.error('[svg-to-png]', err)
    return res.status(500).json({ error: err.message || 'Conversion échouée' })
  }
}
