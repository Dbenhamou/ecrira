import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { postContent, postTopic, profile } = req.body

  if (!postContent?.trim()) return res.status(400).json({ error: 'Contenu du post manquant' })

  const sector = profile?.sector || 'Cybersécurité B2B'
  const company = profile?.company || ''
  const name = profile?.name || ''
  const role = profile?.role || ''

  try {
    // Step 1: Use Claude to build an optimized DALL-E prompt from the post
    const promptMessage = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `Tu es un expert en design LinkedIn B2B premium. 
        
Génère un prompt DALL-E 3 en anglais pour créer un visuel LinkedIn 1080x1350px basé sur ce post :

SUJET : ${postTopic || 'Post LinkedIn'}
SECTEUR : ${sector}
CONTENU : ${postContent.substring(0, 300)}

CONTRAINTES STRICTES pour le prompt DALL-E :
- Style : premium B2B, modern, clean, professional — inspired by Gartner, Palo Alto, CrowdStrike
- Palette : deep navy blue #302082, electric blue #0078c7, bright blue #0099ff, purple accent #8000ff
- Typography style : bold, geometric, ultra-readable on mobile
- Layout : strong visual hierarchy, lots of white space, minimal text
- NO: hackers, hoodies, green matrix code, padlocks, skulls, dark web clichés
- YES: business people in modern office, clean data visualizations, abstract network graphs, professional infographic style
- Format : portrait 1080x1350, LinkedIn post visual
- Must convey the key message of the post emotionally and professionally

Réponds UNIQUEMENT avec le prompt DALL-E en anglais, sans introduction ni commentaire. Maximum 400 mots.`
      }]
    })

    const dallePrompt = (promptMessage.content[0] as { text: string }).text.trim()

    // Step 2: Call DALL-E 3
    const openaiRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: dallePrompt,
        n: 1,
        size: '1024x1024',
        quality: 'hd',
      }),
    })

    const openaiData = await openaiRes.json()

    console.log('OpenAI response status:', openaiRes.status)
    console.log('OpenAI response:', JSON.stringify(openaiData).substring(0, 500))

    if (!openaiRes.ok) {
      return res.status(500).json({ 
        error: openaiData.error?.message || 'Erreur génération image',
        code: openaiData.error?.code,
        details: openaiData
      })
    }

    // gpt-image-1 returns base64, dall-e-3 returns URL
    let imageUrl = ''
    if (openaiData.data?.[0]?.url) {
      imageUrl = openaiData.data[0].url
    } else if (openaiData.data?.[0]?.b64_json) {
      imageUrl = `data:image/png;base64,${openaiData.data[0].b64_json}`
    } else {
      console.error('No image in response:', openaiData)
      return res.status(500).json({ error: 'Pas d\'image dans la réponse', details: openaiData })
    }
    const revisedPrompt = openaiData.data[0].revised_prompt

    res.status(200).json({ 
      imageUrl,
      prompt: dallePrompt,
      revisedPrompt,
    })

  } catch (err: any) {
    console.error('Generate visual error:', err)
    res.status(500).json({ error: err.message || 'Erreur serveur' })
  }
}
