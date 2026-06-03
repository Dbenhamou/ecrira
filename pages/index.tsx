import { useState, useEffect, useCallback, useRef } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'

type Idea = { topic: string; title: string; hook: string; recommended?: boolean }
type Post = { id: string; topic: string; content: string; format: string; created_at: string }
type Profile = { role: string; company: string; sector: string; audience: string; tech_stack: string; lang: string; name: string; brand_bg: string; brand_text: string; brand_accent: string; webhook_url: string; domain: string }

const DEFAULT_PROFILE: Profile = {
  name: 'David', role: 'Account Executive (AE)', company: 'Cyna',
  sector: 'Cybersécurité B2B – partenaires MSP',
  audience: 'Professionnels MSP, DSI, RSSI – France',
  tech_stack: 'Microsoft, Azure, Entra ID, M365', lang: 'fr',
  brand_bg: '#F8F6F2', brand_text: '#232323', brand_accent: '#4F6754',
  webhook_url: '',
  domain: '',
}

const PALETTES = [
  { name:'Postoria Ivory', bg:'#F8F6F2', text:'#232323', accent:'#4F6754' },
  { name:'Postoria Forest', bg:'#4F6754', text:'#F8F6F2', accent:'#A8784F' },
  { name:'Postoria Dark', bg:'#232323', text:'#F8F6F2', accent:'#A8784F' },
  { name:'Postoria Copper', bg:'#A8784F', text:'#F8F6F2', accent:'#F8F6F2' },
  { name:'Postoria Sand', bg:'#ECE6DD', text:'#232323', accent:'#4F6754' },
  { name:'Blue Pro', bg:'#1B2A4A', text:'#F0F4FF', accent:'#4A90E2' },
  { name:'Slate', bg:'#F4F6F8', text:'#1A1A2E', accent:'#6C5CE7' },
  { name:'Warm Noir', bg:'#1C1410', text:'#F5ECD7', accent:'#D4A853' },
]


const FONTS = [
  { id:'playfair', label:'Playfair Display', stack:"'Playfair Display',Georgia,serif" },
  { id:'inter', label:'Inter', stack:"'Inter',sans-serif" },
  { id:'syne', label:'Syne', stack:"'Syne',sans-serif" },
  { id:'dm', label:'DM Sans', stack:"'DM Sans',sans-serif" },
  { id:'fraunces', label:'Fraunces', stack:"'Fraunces',Georgia,serif" },
]

const TEXT_SIZES = { S:0.8, M:1, L:1.2, XL:1.45 }

const SECTOR_ICONS: Record<string,string> = {
  cyber: `<svg viewBox="0 0 40 40" fill="none"><path d="M20 4L6 10v10c0 8.3 6 16 14 18 8-2 14-9.7 14-18V10L20 4Z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M14 20l4 4 8-8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  finance: `<svg viewBox="0 0 40 40" fill="none"><path d="M20 4v32M8 16h24M8 24h24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="4" y="8" width="32" height="24" rx="3" stroke="currentColor" stroke-width="2"/></svg>`,
  tech: `<svg viewBox="0 0 40 40" fill="none"><rect x="4" y="8" width="32" height="24" rx="3" stroke="currentColor" stroke-width="2"/><path d="M14 20l-4 4 4 4M26 20l4 4-4 4M22 16l-4 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  marketing: `<svg viewBox="0 0 40 40" fill="none"><path d="M8 28V16l20-8v24L8 28Z" stroke="currentColor" stroke-width="2"/><path d="M28 16c4 2 4 6 0 8M12 28v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  rh: `<svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="12" r="6" stroke="currentColor" stroke-width="2"/><path d="M6 36c0-7.7 6.3-14 14-14s14 6.3 14 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  sante: `<svg viewBox="0 0 40 40" fill="none"><path d="M20 34C20 34 6 26 6 16a8 8 0 0 1 14-5.3A8 8 0 0 1 34 16c0 10-14 18-14 18Z" stroke="currentColor" stroke-width="2"/></svg>`,
  conseil: `<svg viewBox="0 0 40 40" fill="none"><path d="M8 12h24M8 20h16M8 28h20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  none: '',
}

const PATTERNS: Record<string,string> = {
  none: '',
  dots: `<pattern id="pat" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="currentColor" opacity=".08"/></pattern><rect width="100%" height="100%" fill="url(#pat)"/>`,
  grid: `<pattern id="pat" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="currentColor" stroke-width="0.5" opacity=".08"/></pattern><rect width="100%" height="100%" fill="url(#pat)"/>`,
  diag: `<pattern id="pat" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M0 20L20 0" stroke="currentColor" stroke-width="0.5" opacity=".08"/></pattern><rect width="100%" height="100%" fill="url(#pat)"/>`,
  circles: `<pattern id="pat" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse"><circle cx="30" cy="30" r="25" fill="none" stroke="currentColor" stroke-width="0.5" opacity=".07"/></pattern><rect width="100%" height="100%" fill="url(#pat)"/>`,
}

const DEFAULT = {
  tpl:'quote', fmt:'square',
  colors:{ bg:'#F8F6F2', text:'#232323', accent:'#4F6754' },
  font:'playfair', textSize:'L', align:'left',
  accentStyle:'bar', bgPattern:'none',
  sectorIcon:'cyber', logoUrl:null, showWatermark:true,
  qText:'Votre expertise mérite d\'être visible. Pas votre agenda.',
  qAuthor:'David · AE @Cyna', qTag:'Cybersécurité MSP',
  sNum:'73', sUnit:'%', sLabel:'des MSP ne testent jamais leur PRA',
  sCtx:'Un ransomware ne prévient pas. La question n\'est pas "si" mais "quand".',
  sSrc:'ANSSI 2025',
  aRef:'CVE-2025-21298', aTitle:'RCE critique sur Windows OLE',
  aDesc:'Score CVSS 9.8. Patch disponible depuis le 14 jan.',
  aItems:'Appliquer KB5049981 immédiatement\nVérifier l\'exposition des endpoints\nActiver les alertes Defender',
  aSev:'CRITIQUE',
}

function VisualGenerator() {
  const [s, setS] = useState<any>({
    tpl:'quote', fmt:'square',
    colors:{ bg:'#F8F6F2', text:'#232323', accent:'#4F6754' },
    font:'playfair', textSize:'L', align:'left',
    accentStyle:'bar', bgPattern:'none',
    sectorIcon:'cyber', logoUrl:null, logoPos:'tl', logoSize:36, showWatermark:true,
    qText:'Votre expertise mérite d\'être visible. Pas votre agenda.',
    qAuthor:'David · AE @Cyna', qTag:'Cybersécurité MSP',
    sNum:'73', sUnit:'%', sLabel:'des MSP ne testent jamais leur PRA',
    sCtx:'Un ransomware ne prévient pas. La question n\'est pas "si" mais "quand".',
    sSrc:'ANSSI 2025',
    aRef:'CVE-2025-21298', aTitle:'RCE critique sur Windows OLE',
    aDesc:'Score CVSS 9.8. Patch disponible depuis le 14 jan.',
    aItems:'Appliquer KB5049981 immédiatement\nVérifier l\'exposition des endpoints\nActiver les alertes Defender',
    aSev:'CRITIQUE',
  })
  const [tab, setTab] = useState<'basic'|'advanced'>('basic')
  const [zoom, setZoom] = useState(75)
  const fileRef = useRef<HTMLInputElement>(null)

  const upd = (k: any) => setS((prev: any) => ({ ...prev, ...k }))
  const updC = (k: string, v: string) => setS((prev: any) => ({ ...prev, colors: { ...prev.colors, [k]: v } }))

  const mix = (hex: string, a: number) => {
    const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16)
    return `rgba(${r},${g},${b},${a})`
  }
  const getDate = () => new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})

  const QUICK_COLORS = [
    '#FFFFFF','#232323','#F8F6F2','#ECE6DD',
    '#4F6754','#A8784F','#2563EB','#DC2626',
    '#D97706','#7C3AED',
  ]

  const LOGO_POSITIONS: Record<string,[string,string]> = {
    tl:['flex-start','flex-start'], tc:['center','flex-start'], tr:['flex-end','flex-start'],
    ml:['flex-start','center'],    mc:['center','center'],    mr:['flex-end','center'],
    bl:['flex-start','flex-end'],  bc:['center','flex-end'],  br:['flex-end','flex-end'],
  }

  const fontStack = (FONTS.find((f:any)=>f.id===s.font)?.stack) || "'Playfair Display',serif"
  const sizeMult = ({S:0.8,M:1,L:1.2,XL:1.5} as any)[s.textSize] || 1

  const logoSVGfn = (col: string, sz: number) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none"><path d="M6 4h8a4 4 0 0 1 0 8H6V4Z" fill="${col}" opacity=".9"/><path d="M6 12h5l4 8H6v-8Z" fill="${col}" opacity=".5"/></svg>`

  const SECTOR_ICONS_SVG: Record<string,string> = {
    cyber: `<svg viewBox="0 0 40 40" fill="none"><path d="M20 4L6 10v10c0 8.3 6 16 14 18 8-2 14-9.7 14-18V10L20 4Z" stroke="currentColor" stroke-width="2"/><path d="M14 20l4 4 8-8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    finance: `<svg viewBox="0 0 40 40" fill="none"><rect x="4" y="8" width="32" height="24" rx="3" stroke="currentColor" stroke-width="2"/><path d="M20 4v32M8 16h24M8 24h24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    tech: `<svg viewBox="0 0 40 40" fill="none"><rect x="4" y="8" width="32" height="24" rx="3" stroke="currentColor" stroke-width="2"/><path d="M14 20l-4 4 4 4M26 20l4 4-4 4M22 16l-4 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    marketing: `<svg viewBox="0 0 40 40" fill="none"><path d="M8 28V16l20-8v24L8 28Z" stroke="currentColor" stroke-width="2"/><path d="M28 16c4 2 4 6 0 8M12 28v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    rh: `<svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="12" r="6" stroke="currentColor" stroke-width="2"/><path d="M6 36c0-7.7 6.3-14 14-14s14 6.3 14 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    sante: `<svg viewBox="0 0 40 40" fill="none"><path d="M20 34C20 34 6 26 6 16a8 8 0 0 1 14-5.3A8 8 0 0 1 34 16c0 10-14 18-14 18Z" stroke="currentColor" stroke-width="2"/></svg>`,
    conseil: `<svg viewBox="0 0 40 40" fill="none"><path d="M8 12h24M8 20h16M8 28h20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    none: '',
  }

  const PATTERNS_SVG: Record<string,string> = {
    none: '',
    dots: `<svg style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="pat" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="FILLCOL" opacity=".1"/></pattern></defs><rect width="100%" height="100%" fill="url(#pat)"/></svg>`,
    grid: `<svg style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="pat" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="FILLCOL" stroke-width="0.6" opacity=".1"/></pattern></defs><rect width="100%" height="100%" fill="url(#pat)"/></svg>`,
    diag: `<svg style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="pat" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M0 20L20 0" stroke="FILLCOL" stroke-width="0.6" opacity=".1"/></pattern></defs><rect width="100%" height="100%" fill="url(#pat)"/></svg>`,
    circles: `<svg style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="pat" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse"><circle cx="40" cy="40" r="35" fill="none" stroke="FILLCOL" stroke-width="0.6" opacity=".08"/></pattern></defs><rect width="100%" height="100%" fill="url(#pat)"/></svg>`,
  }

  const buildPattern = (col: string) => (PATTERNS_SVG[s.bgPattern]||'').replace(/FILLCOL/g, col)

  const buildAccentEl = (S: number, col: string) => {
    const p = (v: number) => Math.round(v*(S/1080))
    if (s.accentStyle==='bar') return `<div style="position:absolute;left:0;top:0;bottom:0;width:${p(7)}px;background:${col};"></div>`
    if (s.accentStyle==='top') return `<div style="position:absolute;left:0;top:0;right:0;height:${p(7)}px;background:${col};"></div>`
    if (s.accentStyle==='gradient') return `<div style="position:absolute;left:0;top:0;bottom:0;width:${p(240)}px;background:linear-gradient(to right,${mix(col,.18)},transparent);pointer-events:none;"></div>`
    return ''
  }

  const buildLogoEl = (S: number, bgCol: string, accentCol: string) => {
    const p = (v: number) => Math.round(v*(S/1080))
    const sz = p(s.logoSize)
    const [jc, ai] = LOGO_POSITIONS[s.logoPos] || ['flex-start','flex-start']
    let inner = ''
    if (s.logoUrl) {
      inner = `<img src="${s.logoUrl}" style="width:${sz}px;height:${sz}px;object-fit:contain;border-radius:${p(6)}px;" />`
    } else if (s.sectorIcon && SECTOR_ICONS_SVG[s.sectorIcon]) {
      inner = `<div style="width:${sz}px;height:${sz}px;background:${accentCol};border-radius:${p(8)}px;display:flex;align-items:center;justify-content:center;padding:${Math.round(sz*0.18)}px;color:${bgCol};">${SECTOR_ICONS_SVG[s.sectorIcon].replace(/currentColor/g,bgCol)}</div>`
    } else {
      inner = `<div style="width:${sz}px;height:${sz}px;background:${accentCol};border-radius:${p(8)}px;display:flex;align-items:center;justify-content:center;">${logoSVGfn(bgCol,Math.round(sz*0.55))}</div>`
    }
    const watermark = s.showWatermark ? `<span style="font-family:'Inter',sans-serif;font-size:${p(13)}px;font-weight:600;letter-spacing:.06em;color:${s.colors.text};margin-left:${p(8)}px;">POSTORIA</span>` : ''
    return `<div style="position:absolute;inset:${p(44)}px;display:flex;align-items:${ai};justify-content:${jc};pointer-events:none;z-index:2;">
      <div style="display:flex;align-items:center;">${inner}${watermark}</div>
    </div>`
  }

  const buildViz = (S: number): string => {
    const H = s.fmt==='portrait' ? Math.round(S*1.25) : S
    const {bg, text, accent} = s.colors
    const sub = mix(text, .58)
    const p = (v: number) => Math.round(v*(S/1080))
    const fs = (base: number) => Math.round(base * sizeMult * (S/1080))
    const padL = s.accentStyle==='bar' ? p(80) : p(56)
    const pad = p(52)
    const ta = s.align

    if (s.tpl === 'quote') {
      return `<div style="width:${S}px;height:${H}px;background:${bg};display:flex;flex-direction:column;position:relative;overflow:hidden;font-family:${fontStack};box-sizing:border-box;">
        ${buildPattern(text)}
        ${buildAccentEl(S, accent)}
        ${buildLogoEl(S, bg, accent)}
        <div style="position:relative;z-index:1;display:flex;flex-direction:column;height:100%;padding:${pad}px ${pad}px ${pad}px ${padL}px;">
          <div style="flex:1;display:flex;flex-direction:column;justify-content:center;text-align:${ta};">
            <div style="font-size:${fs(108)}px;line-height:.75;color:${accent};margin-bottom:${p(14)}px;font-weight:700;opacity:.18;">"</div>
            <div style="font-size:${fs(46)}px;font-weight:500;line-height:1.28;font-style:italic;color:${text};">${s.qText}</div>
            <div style="width:${p(48)}px;height:${p(3)}px;background:${accent};margin:${p(26)}px ${ta==='center'?'auto':'0'} ${p(18)}px;border-radius:2px;"></div>
            <div style="font-family:'Inter',sans-serif;font-size:${fs(16)}px;font-weight:500;color:${sub};">${s.qAuthor}</div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:${p(24)}px;">
            <span style="font-family:'Inter',sans-serif;font-size:${p(12)}px;padding:${p(5)}px ${p(14)}px;border-radius:${p(20)}px;border:1px solid ${mix(accent,.4)};color:${accent};">${s.qTag}</span>
            <span style="font-family:'Inter',sans-serif;font-size:${p(11)}px;color:${mix(text,.3)};">${getDate()}</span>
          </div>
        </div>
      </div>`
    }

    if (s.tpl === 'stat') {
      return `<div style="width:${S}px;height:${H}px;background:${bg};display:flex;flex-direction:column;position:relative;overflow:hidden;font-family:'Inter',sans-serif;box-sizing:border-box;">
        ${buildPattern(text)}
        ${buildAccentEl(S, accent)}
        ${buildLogoEl(S, bg, accent)}
        <div style="position:absolute;right:${p(-20)}px;bottom:${p(-50)}px;font-family:${fontStack};font-size:${p(360)}px;font-weight:700;color:${text};opacity:.04;line-height:1;pointer-events:none;">${s.sNum}</div>
        <div style="position:relative;z-index:1;display:flex;flex-direction:column;flex:1;padding:${pad}px ${pad}px ${pad}px ${padL}px;">
          <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
            <div style="font-size:${p(11)}px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:${mix(text,.4)};margin-bottom:${p(10)}px;">Chiffre clé</div>
            <div style="display:flex;align-items:flex-end;gap:${p(6)}px;margin-bottom:${p(14)}px;">
              <span style="font-family:${fontStack};font-size:${fs(128)}px;font-weight:700;color:${accent};line-height:.85;">${s.sNum}</span>
              <span style="font-family:${fontStack};font-size:${fs(50)}px;color:${mix(accent,.6)};padding-bottom:${p(10)}px;">${s.sUnit}</span>
            </div>
            <div style="font-size:${fs(22)}px;color:${text};line-height:1.35;margin-bottom:${p(22)}px;max-width:${p(720)}px;">${s.sLabel}</div>
            <div style="width:${p(48)}px;height:${p(3)}px;background:${accent};margin-bottom:${p(20)}px;border-radius:2px;"></div>
            <div style="font-size:${fs(17)}px;line-height:1.7;color:${sub};max-width:${p(680)}px;">${s.sCtx}</div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding-top:${p(24)}px;">
            <span style="font-family:'Inter',sans-serif;font-size:${p(12)}px;padding:${p(5)}px ${p(14)}px;border-radius:${p(20)}px;border:1px solid ${mix(text,.18)};color:${sub};">${s.sSrc}</span>
            <span style="font-family:'Inter',sans-serif;font-size:${p(11)}px;color:${mix(text,.3)};">${getDate()}</span>
          </div>
        </div>
      </div>`
    }

    // ALERT
    const sevC = s.aSev==='CRITIQUE'?'#C0392B':s.aSev==='ÉLEVÉE'?'#D35400':'#E67E22'
    const sevBg = s.aSev==='CRITIQUE'?'rgba(192,57,43,.1)':s.aSev==='ÉLEVÉE'?'rgba(211,84,0,.1)':'rgba(230,126,34,.1)'
    const itemsHTML = s.aItems.split('\n').filter((l:string)=>l.trim()).map((it:string) =>
      `<div style="display:flex;align-items:flex-start;gap:${p(12)}px;font-size:${fs(17)}px;line-height:1.55;color:${sub};">
        <div style="width:${p(7)}px;height:${p(7)}px;border-radius:50%;background:${sevC};margin-top:${p(7)}px;flex-shrink:0;"></div>
        <span>${it}</span>
      </div>`).join('')
    return `<div style="width:${S}px;height:${H}px;background:${bg};display:flex;flex-direction:column;position:relative;overflow:hidden;font-family:'Inter',sans-serif;box-sizing:border-box;">
      ${buildPattern(text)}
      ${buildAccentEl(S, sevC)}
      ${buildLogoEl(S, bg, accent)}
      <div style="position:relative;z-index:1;display:flex;flex-direction:column;flex:1;padding:${pad}px ${pad}px ${pad}px ${padL}px;">
        <div style="display:flex;justify-content:flex-end;margin-bottom:${p(32)}px;">
          <span style="font-size:${p(12)}px;font-weight:700;padding:${p(6)}px ${p(16)}px;border-radius:${p(20)}px;background:${sevBg};color:${sevC};letter-spacing:.06em;">${s.aSev}</span>
        </div>
        <div style="font-size:${p(13)}px;font-weight:700;letter-spacing:.1em;color:${mix(sevC,.8)};margin-bottom:${p(10)}px;text-transform:uppercase;">${s.aRef}</div>
        <div style="font-family:${fontStack};font-size:${fs(42)}px;font-weight:600;line-height:1.2;color:${text};margin-bottom:${p(14)}px;">${s.aTitle}</div>
        <div style="width:${p(48)}px;height:${p(4)}px;background:${sevC};border-radius:2px;margin-bottom:${p(18)}px;"></div>
        <div style="font-size:${fs(17)}px;line-height:1.65;color:${sub};margin-bottom:${p(20)}px;max-width:${p(720)}px;">${s.aDesc}</div>
        <div style="display:flex;flex-direction:column;gap:${p(10)}px;flex:1;">${itemsHTML}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding-top:${p(24)}px;">
          <div style="display:flex;align-items:center;gap:${p(8)}px;"><div style="width:${p(8)}px;height:${p(8)}px;border-radius:50%;background:${sevC};"></div><span style="font-size:${p(12)}px;font-weight:600;color:${sevC};">Alerte sécurité</span></div>
          <span style="font-size:${p(11)}px;color:${mix(text,.3)};">${getDate()}</span>
        </div>
      </div>
    </div>`
  }

  const exportPNG = useCallback(async (fmtOverride?: string) => {
    const f = fmtOverride || s.fmt
    const S = 1080; const H = f==='portrait' ? Math.round(S*1.25) : S
    const div = document.createElement('div')
    div.style.cssText = `position:fixed;left:-9999px;top:0;width:${S}px;height:${H}px;`
    div.innerHTML = buildViz(S)
    document.body.appendChild(div)
    await document.fonts.ready
    const h2c = (await import('html2canvas')).default
    const canvas = await h2c(div.firstChild as HTMLElement, {scale:1,useCORS:true,backgroundColor:null,logging:false})
    const a = document.createElement('a')
    a.download = `postoria-${s.tpl}-${f==='square'?'1080x1080':'1080x1350'}.png`
    a.href = canvas.toDataURL('image/png'); a.click()
    document.body.removeChild(div)
  }, [s])

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => upd({ logoUrl: ev.target?.result as string })
    reader.readAsDataURL(file)
  }

  const S_BASE = 1080
  const H_BASE = s.fmt==='portrait' ? Math.round(S_BASE*1.25) : S_BASE
  const previewW = Math.round(S_BASE * zoom / 100)
  const previewH = Math.round(H_BASE * zoom / 100)

  const POS_GRID = [
    ['tl','tc','tr'],
    ['ml','mc','mr'],
    ['bl','bc','br'],
  ]
  const POS_LABELS: Record<string,string> = {tl:'↖',tc:'↑',tr:'↗',ml:'←',mc:'·',mr:'→',bl:'↙',bc:'↓',br:'↘'}

  const tabBtn = (id: 'basic'|'advanced', label: string) => (
    <button onClick={()=>setTab(id)} style={{flex:1,padding:'8px',borderRadius:9,border:`1px solid ${tab===id?'var(--forest)':'var(--border)'}`,background:tab===id?'var(--forest)':'var(--ivory)',color:tab===id?'white':'var(--text2)',fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}>
      {label}
    </button>
  )

  return (
    <div style={{display:'flex',gap:28,alignItems:'flex-start'}}>

      {/* CONTROLS */}
      <div style={{width:280,flexShrink:0,display:'flex',flexDirection:'column',gap:12,maxHeight:'calc(100vh - 160px)',overflowY:'auto',paddingRight:4}}>

        {/* Template */}
        <div className="card-sm">
          <div className="section-label">Template</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:5}}>
            {[{id:'quote',icon:'❝',label:'Quote'},{id:'stat',icon:'◎',label:'Stat'},{id:'alert',icon:'⚡',label:'Alerte'}].map(t=>(
              <button key={t.id} onClick={()=>upd({tpl:t.id})} style={{padding:'8px 4px',borderRadius:9,border:`1px solid ${s.tpl===t.id?'var(--forest)':'var(--border)'}`,background:s.tpl===t.id?'var(--forest)':'var(--ivory)',color:s.tpl===t.id?'white':'var(--text2)',fontSize:11,fontWeight:500,cursor:'pointer',textAlign:'center' as const,fontFamily:'inherit'}}>
                <span style={{display:'block',fontSize:16,marginBottom:2}}>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:5}}>{tabBtn('basic','Basique')}{tabBtn('advanced','Avancé')}</div>

        {tab==='basic' && <>
          {/* Colors */}
          <div className="card-sm">
            <div className="section-label">Couleurs</div>
            {([['Fond','bg'],['Texte','text'],['Accent','accent']] as [string,string][]).map(([label,key])=>(
              <div key={key} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <span style={{fontSize:11,color:'var(--text2)',width:44,flexShrink:0}}>{label}</span>
                <input type="color" value={(s.colors as any)[key]} onChange={e=>updC(key,e.target.value)} style={{width:28,height:28,borderRadius:7,border:'1px solid var(--border)',cursor:'pointer',padding:2}}/>
                <input className="form-input" value={(s.colors as any)[key]} onChange={e=>updC(key,e.target.value)} style={{fontSize:11,fontFamily:'monospace',padding:'4px 8px',flex:1}}/>
              </div>
            ))}
            <div className="section-label" style={{marginTop:10,marginBottom:6}}>Couleurs rapides</div>
            <div style={{display:'flex',gap:5,flexWrap:'wrap' as const}}>
              {QUICK_COLORS.map((c,i)=>(
                <div key={i} title={c} onClick={()=>updC('accent',c)}
                  style={{width:24,height:24,borderRadius:'50%',background:c,border:`2px solid ${c==='#FFFFFF'?'#e0ddd8':'transparent'}`,cursor:'pointer',boxShadow:'0 1px 3px rgba(0,0,0,.15)',transition:'transform .12s'}}
                  onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.2)')} onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}/>
              ))}
            </div>
            <div style={{marginTop:8,display:'flex',gap:5,flexWrap:'wrap' as const}}>
              {PALETTES.map((p:any,i:number)=>(
                <div key={i} title={p.name} onClick={()=>upd({colors:{bg:p.bg,text:p.text,accent:p.accent}})}
                  style={{width:22,height:22,borderRadius:6,background:p.bg,border:`2px solid ${p.accent}`,cursor:'pointer',flexShrink:0,transition:'transform .12s'}}
                  onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.2)')} onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}/>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="card-sm">
            <div className="section-label">Contenu</div>
            {s.tpl==='quote' && <>
              <div className="form-group"><label className="form-label">Citation</label><textarea className="form-input" rows={4} value={s.qText} onChange={(e:any)=>upd({qText:e.target.value})} style={{fontSize:12}}/></div>
              <div className="form-group"><label className="form-label">Auteur</label><input className="form-input" value={s.qAuthor} onChange={(e:any)=>upd({qAuthor:e.target.value})} style={{fontSize:12}}/></div>
              <div className="form-group"><label className="form-label">Tag</label><input className="form-input" value={s.qTag} onChange={(e:any)=>upd({qTag:e.target.value})} style={{fontSize:12}}/></div>
            </>}
            {s.tpl==='stat' && <>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div className="form-group"><label className="form-label">Chiffre</label><input className="form-input" value={s.sNum} onChange={(e:any)=>upd({sNum:e.target.value})} style={{fontSize:12}}/></div>
                <div className="form-group"><label className="form-label">Unité</label><input className="form-input" value={s.sUnit} onChange={(e:any)=>upd({sUnit:e.target.value})} style={{fontSize:12}}/></div>
              </div>
              <div className="form-group"><label className="form-label">Label</label><input className="form-input" value={s.sLabel} onChange={(e:any)=>upd({sLabel:e.target.value})} style={{fontSize:12}}/></div>
              <div className="form-group"><label className="form-label">Contexte</label><textarea className="form-input" rows={3} value={s.sCtx} onChange={(e:any)=>upd({sCtx:e.target.value})} style={{fontSize:12}}/></div>
              <div className="form-group"><label className="form-label">Source</label><input className="form-input" value={s.sSrc} onChange={(e:any)=>upd({sSrc:e.target.value})} style={{fontSize:12}}/></div>
            </>}
            {s.tpl==='alert' && <>
              <div className="form-group"><label className="form-label">Référence</label><input className="form-input" value={s.aRef} onChange={(e:any)=>upd({aRef:e.target.value})} style={{fontSize:12}}/></div>
              <div className="form-group"><label className="form-label">Titre</label><input className="form-input" value={s.aTitle} onChange={(e:any)=>upd({aTitle:e.target.value})} style={{fontSize:12}}/></div>
              <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows={2} value={s.aDesc} onChange={(e:any)=>upd({aDesc:e.target.value})} style={{fontSize:12}}/></div>
              <div className="form-group"><label className="form-label">Actions (1/ligne)</label><textarea className="form-input" rows={3} value={s.aItems} onChange={(e:any)=>upd({aItems:e.target.value})} style={{fontSize:12}}/></div>
              <div className="form-group"><label className="form-label">Sévérité</label><select className="form-input" value={s.aSev} onChange={(e:any)=>upd({aSev:e.target.value})} style={{fontSize:12}}><option>CRITIQUE</option><option>ÉLEVÉE</option><option>MODÉRÉE</option></select></div>
            </>}
          </div>
        </>}

        {tab==='advanced' && <>
          {/* Typo */}
          <div className="card-sm">
            <div className="section-label">Typographie</div>
            <div className="form-group">
              <label className="form-label">Police</label>
              <select className="form-input" value={s.font} onChange={(e:any)=>upd({font:e.target.value})} style={{fontSize:12}}>
                {FONTS.map((f:any)=><option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Taille du texte</label>
              <div style={{display:'flex',gap:5}}>
                {(['S','M','L','XL']).map(sz=>(
                  <button key={sz} onClick={()=>upd({textSize:sz})} style={{flex:1,padding:'7px',borderRadius:8,border:`1px solid ${s.textSize===sz?'var(--forest)':'var(--border)'}`,background:s.textSize===sz?'var(--forest)':'var(--ivory)',color:s.textSize===sz?'white':'var(--text2)',fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>
                    {sz}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Alignement</label>
              <div style={{display:'flex',gap:5}}>
                {[{id:'left',label:'Gauche'},{id:'center',label:'Centré'}].map(a=>(
                  <button key={a.id} onClick={()=>upd({align:a.id})} style={{flex:1,padding:'7px',borderRadius:8,border:`1px solid ${s.align===a.id?'var(--forest)':'var(--border)'}`,background:s.align===a.id?'var(--forest)':'var(--ivory)',color:s.align===a.id?'white':'var(--text2)',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Décoration */}
          <div className="card-sm">
            <div className="section-label">Décoration</div>
            <div className="form-group">
              <label className="form-label">Accent</label>
              <select className="form-input" value={s.accentStyle} onChange={(e:any)=>upd({accentStyle:e.target.value})} style={{fontSize:12}}>
                <option value="bar">Barre verticale gauche</option>
                <option value="top">Barre horizontale haut</option>
                <option value="gradient">Gradient latéral</option>
                <option value="none">Aucun</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Motif de fond</label>
              <select className="form-input" value={s.bgPattern} onChange={(e:any)=>upd({bgPattern:e.target.value})} style={{fontSize:12}}>
                <option value="none">Aucun</option>
                <option value="dots">Points</option>
                <option value="grid">Grille</option>
                <option value="diag">Diagonales</option>
                <option value="circles">Cercles</option>
              </select>
            </div>
          </div>

          {/* Logo */}
          <div className="card-sm">
            <div className="section-label">Logo & icône</div>
            <div className="form-group">
              <label className="form-label">Upload logo</label>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{display:'none'}}/>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>fileRef.current?.click()} className="btn btn-ghost" style={{fontSize:12,flex:1,justifyContent:'center'}}>{s.logoUrl?'✓ Logo chargé':'↑ Choisir un fichier'}</button>
                {s.logoUrl && <button onClick={()=>upd({logoUrl:null})} className="btn btn-ghost" style={{fontSize:11,color:'#c0392b',borderColor:'transparent'}}>✕</button>}
              </div>
            </div>
            {!s.logoUrl && <div className="form-group">
              <label className="form-label">Icône sectorielle</label>
              <select className="form-input" value={s.sectorIcon} onChange={(e:any)=>upd({sectorIcon:e.target.value})} style={{fontSize:12}}>
                <option value="cyber">🔒 Cybersécurité</option>
                <option value="finance">💳 Finance</option>
                <option value="tech">💻 Tech</option>
                <option value="marketing">📣 Marketing</option>
                <option value="rh">👥 RH</option>
                <option value="sante">❤️ Santé</option>
                <option value="conseil">📋 Conseil</option>
                <option value="none">Aucune</option>
              </select>
            </div>}
            <div className="form-group">
              <label className="form-label">Position</label>
              <div style={{display:'inline-grid',gridTemplateColumns:'repeat(3,28px)',gap:3}}>
                {POS_GRID.map((row,ri)=>row.map(pos=>(
                  <button key={pos} onClick={()=>upd({logoPos:pos})} style={{width:28,height:28,borderRadius:6,border:`1px solid ${s.logoPos===pos?'var(--forest)':'var(--border)'}`,background:s.logoPos===pos?'var(--forest)':'var(--ivory)',color:s.logoPos===pos?'white':'var(--text2)',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {POS_LABELS[pos]}
                  </button>
                )))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Taille icône — {s.logoSize}px</label>
              <input type="range" min={24} max={80} value={s.logoSize} onChange={(e:any)=>upd({logoSize:parseInt(e.target.value)})} style={{width:'100%',accentColor:'var(--forest)'}}/>
            </div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:12,color:'var(--text2)'}}>Watermark</span>
              <div className={`toggle ${s.showWatermark?'on':''}`} onClick={()=>upd({showWatermark:!s.showWatermark})}><div className="toggle-dot"/></div>
            </div>
          </div>
        </>}

        {/* Format + Zoom + Export */}
        <div className="card-sm">
          <div className="section-label">Format</div>
          <div style={{display:'flex',gap:5,marginBottom:12}}>
            {['square','portrait'].map(f=>(
              <button key={f} onClick={()=>upd({fmt:f})} style={{flex:1,padding:'7px',borderRadius:8,border:`1px solid ${s.fmt===f?'var(--forest)':'var(--border)'}`,background:s.fmt===f?'var(--forest)':'var(--ivory)',color:s.fmt===f?'white':'var(--text2)',fontSize:11,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>
                {f==='square'?'1080×1080':'1080×1350'}
              </button>
            ))}
          </div>
          <div style={{marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><label style={{fontSize:11,color:'var(--text2)',fontWeight:500}}>Zoom aperçu</label><span style={{fontSize:11,color:'var(--text3)',fontFamily:'monospace'}}>{zoom}%</span></div>
            <input type="range" min={30} max={100} value={zoom} onChange={(e:any)=>setZoom(parseInt(e.target.value))} style={{width:'100%',accentColor:'var(--forest)'}}/>
          </div>
          <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',marginBottom:6}} onClick={()=>exportPNG()}>↓ Télécharger PNG</button>
          <button className="btn btn-ghost" style={{width:'100%',justifyContent:'center'}} onClick={async()=>{await exportPNG('square');await new Promise(r=>setTimeout(r,500));await exportPNG('portrait')}}>↓ Les 2 formats</button>
        </div>

      </div>

      {/* PREVIEW */}
      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',paddingTop:4,overflow:'auto'}}>
        <div style={{fontSize:10,color:'var(--text3)',marginBottom:10,fontWeight:500,textTransform:'uppercase' as const,letterSpacing:'.08em'}}>
          Aperçu {zoom}% — {s.fmt==='square'?'1080 × 1080':'1080 × 1350'}
        </div>
        <div style={{borderRadius:Math.round(14*zoom/100),overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,.13)',flexShrink:0,width:previewW,height:previewH,transformOrigin:'top center'}}>
          <div style={{transform:`scale(${zoom/100})`,transformOrigin:'top left',width:S_BASE,height:H_BASE}} dangerouslySetInnerHTML={{__html:buildViz(S_BASE)}}/>
        </div>
      </div>

    </div>
  )
}

export default function Home() {
  const [page, setPage] = useState('apercu')
  const [dark, setDark] = useState(false)
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [savedPosts, setSavedPosts] = useState<Post[]>([])
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE)
  const [generatedCount, setGeneratedCount] = useState(0)
  const [loadingIdeas, setLoadingIdeas] = useState(false)
  const [loadingPost, setLoadingPost] = useState(false)
  const [postTopic, setPostTopic] = useState('')
  const [postFormat, setPostFormat] = useState('educational')
  const [postLength, setPostLength] = useState('medium')
  const [postTone, setPostTone] = useState('expert')
  const [postOutput, setPostOutput] = useState('')
  const [toast, setToast] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  // Visual generator state
  const [vizTpl, setVizTpl] = useState('quote')
  const [vizFmt, setVizFmt] = useState('square')
  const [vizColors, setVizColors] = useState({ bg:'#F8F6F2', text:'#232323', accent:'#4F6754' })
  const [qText, setQText] = useState('Votre expertise mérite d\'être visible. Pas votre agenda.')
  const [qAuthor, setQAuthor] = useState('David · AE @Cyna')
  const [qTag, setQTag] = useState('Cybersécurité MSP')
  const [sNum, setSNum] = useState('73')
  const [sUnit, setSUnit] = useState('%')
  const [sLabel, setSLabel] = useState('des MSP ne testent jamais leur plan de reprise')
  const [sCtx, setSCtx] = useState('Un ransomware ne prévient pas. La question n\'est pas "si" mais "quand".')
  const [sSrc, setSSrc] = useState('ANSSI 2025')
  const [aRef, setARef] = useState('CVE-2025-21298')
  const [aTitle, setATitle] = useState('RCE critique sur Windows OLE')
  const [aDesc, setADesc] = useState('Score CVSS 9.8. Patch disponible depuis le 14 jan.')
  const [aItems, setAItems] = useState('Appliquer KB5049981 immédiatement\nVérifier l\'exposition des endpoints\nActiver les alertes Defender')
  const [aSev, setASev] = useState('CRITIQUE')
  const previewRef = useRef<HTMLDivElement>(null)
  const [user, setUser] = useState<any>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authMode, setAuthMode] = useState<'login'|'signup'>('login')
  const [authLoading, setAuthLoading] = useState(false)
  const [showVisualInPublish, setShowVisualInPublish] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthChecked(true)
      if (session?.user) {
        supabase.from('profiles').select('*').eq('id', session.user.id).single().then(({ data }) => {
          if (data) { setProfile(data); if (data.brand_bg) setVizColors({bg:data.brand_bg,text:data.brand_text||'#232323',accent:data.brand_accent||'#4F6754'}) }
        })
      }
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    const saved = localStorage.getItem('postoria_posts')
    const count = localStorage.getItem('postoria_count')
    const prof = localStorage.getItem('postoria_profile')
    const theme = localStorage.getItem('postoria_dark')
    if (saved) setSavedPosts(JSON.parse(saved))
    if (count) setGeneratedCount(parseInt(count))
    if (prof) { const p = JSON.parse(prof); setProfile(p); if(p.brand_bg) setVizColors({bg:p.brand_bg,text:p.brand_text||'#232323',accent:p.brand_accent||'#4F6754'}) }
    if (theme === '1') { setDark(true); document.documentElement.dataset.theme = 'dark' }
  }, [])

  const showToast = (msg: string) => { setToast(msg); setToastVisible(true); setTimeout(() => setToastVisible(false), 2600) }
  const toggleDark = () => { const n=!dark; setDark(n); document.documentElement.dataset.theme=n?'dark':''; localStorage.setItem('postoria_dark',n?'1':'0') }

  const generateIdeas = async () => {
    setLoadingIdeas(true)
    try {
      const res = await fetch('/api/ideas', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({profile}) })
      const data = await res.json()
      if (data.ideas) setIdeas(data.ideas)
      else showToast('Erreur : '+(data.error||'inconnue'))
    } catch { showToast('Erreur réseau') }
    setLoadingIdeas(false)
  }

  const generatePost = useCallback(async (topic?: string) => {
    const t = topic || postTopic
    if (!t.trim()) { showToast('Saisis un sujet d\'abord'); return }
    if (topic) setPostTopic(topic)
    setPage('rediger'); setLoadingPost(true); setPostOutput('')
    try {
      const res = await fetch('/api/generate', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({topic:t,format:postFormat,length:postLength,tone:postTone,profile}) })
      const data = await res.json()
      if (data.content) { setPostOutput(data.content); const c=generatedCount+1; setGeneratedCount(c); localStorage.setItem('postoria_count',String(c)) }
      else showToast('Erreur : '+(data.error||'inconnue'))
    } catch { showToast('Erreur réseau') }
    setLoadingPost(false)
  }, [postTopic,postFormat,postLength,postTone,profile,generatedCount])

  const savePost = () => {
    if (!postOutput.trim()) return
    const post:Post = { id:Date.now().toString(), topic:postTopic||'Sans titre', content:postOutput, format:postFormat, created_at:new Date().toLocaleDateString('fr-FR') }
    const updated=[post,...savedPosts]; setSavedPosts(updated); localStorage.setItem('postoria_posts',JSON.stringify(updated)); showToast('Post sauvegardé ✓')
  }
  const deletePost = (id:string) => { const u=savedPosts.filter(p=>p.id!==id); setSavedPosts(u); localStorage.setItem('postoria_posts',JSON.stringify(u)); showToast('Post supprimé') }
  const copyText = (text:string) => { navigator.clipboard.writeText(text); showToast('Copié ✓') }
  const saveProfile = async () => {
    if (user) {
      await supabase.from('profiles').upsert({ id: user.id, ...profile })
      showToast('Profil enregistré ✓')
    } else {
      localStorage.setItem('postoria_profile', JSON.stringify(profile))
      showToast('Profil enregistré ✓')
    }
  }

  const publishPost = async (scheduled?: string) => {
    if (!postOutput.trim()) { showToast('Aucun post à publier'); return }
    if (!profile.webhook_url) { showToast('Configure d\'abord ton URL webhook dans Mon profil'); return }
    setPublishing(true)
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: postOutput, webhookUrl: profile.webhook_url, scheduledAt: scheduled || null }),
      })
      const data = await res.json()
      if (data.success) showToast('✓ Post envoyé à LinkedIn via Zapier !')
      else showToast('Erreur : ' + (data.error || 'inconnue'))
    } catch { showToast('Erreur réseau') }
    setPublishing(false)
  }

  // ── VISUAL GENERATOR ──
  const mix = (hex:string, a:number) => { const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16); return `rgba(${r},${g},${b},${a})` }
  const getDate = () => new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})
  const logoSVG = (col:string) => `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 4h8a4 4 0 0 1 0 8H6V4Z" fill="${col}" opacity=".9"/><path d="M6 12h5l4 8H6v-8Z" fill="${col}" opacity=".5"/></svg>`

  const buildQuote = (S:number) => {
    const H = vizFmt==='portrait'?Math.round(S*1.25):S
    const {bg,text,accent}=vizColors; const sub=mix(text,.55)
    const p = (v:number) => Math.round(v*(S/1080))+'px'
    return `<div style="width:${S}px;height:${H}px;background:${bg};display:flex;flex-direction:column;position:relative;overflow:hidden;font-family:'Playfair Display',serif;">
      <div style="position:absolute;left:0;top:0;bottom:0;width:${p(6)};background:${accent};"></div>
      <div style="padding:${p(44)} ${p(60)} 0 ${p(72)};display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:${p(10)};"><div style="width:${p(34)};height:${p(34)};background:${accent};border-radius:${p(8)};display:flex;align-items:center;justify-content:center;">${logoSVG(bg)}</div><span style="font-family:'Inter',sans-serif;font-size:${p(14)};font-weight:600;letter-spacing:.06em;color:${text};">POSTORIA</span></div>
        <span style="font-family:'Inter',sans-serif;font-size:${p(11)};color:${sub};">${getDate()}</span>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:${p(48)} ${p(60)} ${p(40)} ${p(72)};">
        <div style="font-size:${p(100)};line-height:.75;color:${accent};margin-bottom:${p(20)};font-weight:700;opacity:.25;">"</div>
        <div style="font-size:${p(46)};font-weight:500;line-height:1.25;font-style:italic;color:${text};letter-spacing:-.01em;">${qText}</div>
        <div style="width:${p(48)};height:${p(3)};background:${accent};margin:${p(32)} 0 ${p(22)};border-radius:2px;"></div>
        <div style="font-family:'Inter',sans-serif;font-size:${p(16)};font-weight:500;color:${sub};">${qAuthor}</div>
      </div>
      <div style="padding:0 ${p(60)} ${p(44)} ${p(72)};display:flex;align-items:center;justify-content:space-between;">
        <span style="font-family:'Inter',sans-serif;font-size:${p(12)};font-weight:500;padding:${p(5)} ${p(14)};border-radius:${p(20)};border:1px solid ${mix(accent,.4)};color:${accent};">${qTag}</span>
      </div>
    </div>`
  }

  const buildStat = (S:number) => {
    const H = vizFmt==='portrait'?Math.round(S*1.25):S
    const {bg,text,accent}=vizColors; const sub=mix(text,.55)
    const p = (v:number) => Math.round(v*(S/1080))+'px'
    return `<div style="width:${S}px;height:${H}px;background:${bg};display:flex;flex-direction:column;position:relative;overflow:hidden;font-family:'Inter',sans-serif;">
      <div style="position:absolute;right:${p(-30)};bottom:${p(-60)};font-family:'Playfair Display',serif;font-size:${p(380)};font-weight:700;color:${text};opacity:.04;line-height:1;pointer-events:none;">${sNum}</div>
      <div style="height:${p(6)};background:${accent};"></div>
      <div style="flex:1;display:flex;flex-direction:column;padding:${p(52)} ${p(60)};">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:${p(52)};">
          <div style="display:flex;align-items:center;gap:${p(10)};"><div style="width:${p(34)};height:${p(34)};background:${accent};border-radius:${p(8)};display:flex;align-items:center;justify-content:center;">${logoSVG(bg)}</div><span style="font-size:${p(14)};font-weight:600;letter-spacing:.06em;color:${text};">POSTORIA</span></div>
          <span style="font-size:${p(11)};color:${sub};">Chiffre clé</span>
        </div>
        <div style="display:flex;align-items:flex-end;gap:${p(8)};margin-bottom:${p(16)};"><span style="font-family:'Playfair Display',serif;font-size:${p(130)};font-weight:700;color:${accent};line-height:.85;">${sNum}</span><span style="font-family:'Playfair Display',serif;font-size:${p(52)};color:${mix(accent,.7)};padding-bottom:${p(12)};">${sUnit}</span></div>
        <div style="font-size:${p(22)};color:${text};line-height:1.35;margin-bottom:${p(28)};max-width:${p(700)};">${sLabel}</div>
        <div style="width:${p(48)};height:${p(3)};background:${accent};margin-bottom:${p(24)};border-radius:2px;"></div>
        <div style="font-size:${p(18)};line-height:1.65;color:${sub};max-width:${p(680)};flex:1;">${sCtx}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding-top:${p(32)};"><span style="font-size:${p(12)};padding:${p(5)} ${p(14)};border-radius:${p(20)};border:1px solid ${mix(text,.2)};color:${sub};">${sSrc}</span><span style="font-size:${p(11)};color:${mix(text,.3)};">${getDate()}</span></div>
      </div>
    </div>`
  }

  const buildAlert = (S:number) => {
    const H = vizFmt==='portrait'?Math.round(S*1.25):S
    const {bg,text,accent}=vizColors; const sub=mix(text,.6)
    const p = (v:number) => Math.round(v*(S/1080))+'px'
    const sevC=aSev==='CRITIQUE'?'#C0392B':aSev==='ÉLEVÉE'?'#D35400':'#E67E22'
    const sevBg=aSev==='CRITIQUE'?'rgba(192,57,43,.1)':aSev==='ÉLEVÉE'?'rgba(211,84,0,.1)':'rgba(230,126,34,.1)'
    const itemsHTML=aItems.split('\n').filter(l=>l.trim()).map(it=>`<div style="display:flex;align-items:flex-start;gap:${p(14)};font-size:${p(17)};line-height:1.55;color:${sub};"><div style="width:${p(7)};height:${p(7)};border-radius:50%;background:${sevC};margin-top:${p(7)};flex-shrink:0;"></div><span>${it}</span></div>`).join('')
    return `<div style="width:${S}px;height:${H}px;background:${bg};display:flex;flex-direction:column;position:relative;overflow:hidden;font-family:'Inter',sans-serif;">
      <div style="height:${p(6)};background:${sevC};"></div>
      <div style="flex:1;display:flex;flex-direction:column;padding:${p(48)} ${p(60)};">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:${p(40)};"><div style="display:flex;align-items:center;gap:${p(10)};"><div style="width:${p(34)};height:${p(34)};background:${accent};border-radius:${p(8)};display:flex;align-items:center;justify-content:center;">${logoSVG(bg)}</div><span style="font-size:${p(14)};font-weight:600;letter-spacing:.06em;color:${text};">POSTORIA</span></div><span style="font-size:${p(12)};font-weight:700;padding:${p(6)} ${p(16)};border-radius:${p(20)};background:${sevBg};color:${sevC};letter-spacing:.06em;">${aSev}</span></div>
        <div style="font-size:${p(13)};font-weight:700;letter-spacing:.1em;color:${mix(sevC,.8)};margin-bottom:${p(12)};text-transform:uppercase;">${aRef}</div>
        <div style="font-family:'Playfair Display',serif;font-size:${p(40)};font-weight:600;line-height:1.2;color:${text};margin-bottom:${p(16)};">${aTitle}</div>
        <div style="width:${p(48)};height:${p(4)};background:${sevC};border-radius:2px;margin-bottom:${p(22)};"></div>
        <div style="font-size:${p(18)};line-height:1.65;color:${sub};margin-bottom:${p(24)};max-width:${p(700)};">${aDesc}</div>
        <div style="display:flex;flex-direction:column;gap:${p(12)};flex:1;">${itemsHTML}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding-top:${p(28)};"><div style="display:flex;align-items:center;gap:${p(8)};"><div style="width:${p(8)};height:${p(8)};border-radius:50%;background:${sevC};"></div><span style="font-size:${p(12)};font-weight:600;color:${sevC};">Alerte de sécurité</span></div><span style="font-size:${p(11)};color:${mix(text,.3)};">${getDate()}</span></div>
      </div>
    </div>`
  }

  const buildViz = (S:number) => vizTpl==='quote'?buildQuote(S):vizTpl==='stat'?buildStat(S):buildAlert(S)

  const exportPNG = async (fmtOverride?: string) => {
    const f = fmtOverride || vizFmt
    const S = 1080
    const div = document.createElement('div')
    div.style.position='fixed'; div.style.left='-9999px'; div.style.top='0'
    const inner = document.createElement('div')
    const H = f==='portrait'?Math.round(S*1.25):S
    inner.style.width=S+'px'; inner.style.height=H+'px'
    inner.innerHTML = f===vizFmt ? buildViz(S) : (() => { const orig=vizFmt; /* temp */ return buildViz(S) })()
    div.appendChild(inner); document.body.appendChild(div)
    await document.fonts.ready
    const { default: h2c } = await import('html2canvas' as any)
    const canvas = await h2c(inner, {scale:1,useCORS:true,backgroundColor:null,logging:false})
    const a = document.createElement('a')
    a.download=`postoria-${vizTpl}-${f==='square'?'1080x1080':'1080x1350'}.png`
    a.href=canvas.toDataURL('image/png'); a.click()
    document.body.removeChild(div)
  }

  const fmtLabels: Record<string,string> = {educational:'Conseil',alert:'Alerte',opinion:'Opinion',story:'Story',list:'Liste'}

  const navItems = [
    { id:'apercu', label:'Aperçu', icon:<GridIcon/> },
    { id:'idees', label:'Idées du jour', icon:<BulbIcon/> },
    { id:'rediger', label:'Rédiger', icon:<EditIcon/> },
    { id:'visuels', label:'Visuels', icon:<ImgIcon/> },
    { id:'bibliotheque', label:'Bibliothèque', icon:<BookIcon/> },
    { id:'profil', label:'Mon profil', icon:<UserIcon/> },
  ]

  return (
    <>
      <Head><title>Postoria</title></Head>
      {!authChecked && <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}><span className="spinner"/></div>}
      {authChecked && !user && (
        <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)'}}>
          <div style={{width:360,padding:40,borderRadius:16,background:'var(--card)',boxShadow:'0 4px 24px rgba(0,0,0,0.08)'}}>
            <div style={{textAlign:'center',marginBottom:32}}>
              <div style={{fontSize:28,fontWeight:700,color:'var(--text1)'}}>Postoria</div>
              <div style={{fontSize:14,color:'var(--text2)',marginTop:4}}>{authMode==='login'?'Connexion':'Créer un compte'}</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <input className="form-input" type="email" placeholder="Email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)}/>
              <input className="form-input" type="password" placeholder="Mot de passe" value={authPassword} onChange={e=>setAuthPassword(e.target.value)}/>
              <button className="btn btn-primary" style={{marginTop:8}} disabled={authLoading} onClick={async()=>{
                setAuthLoading(true)
                if(authMode==='login'){
                  const {error}=await supabase.auth.signInWithPassword({email:authEmail,password:authPassword})
                  if(error) alert(error.message)
                  else { const {data:{user:u}}=await supabase.auth.getUser(); setUser(u) }
                } else {
                  const {error}=await supabase.auth.signUp({email:authEmail,password:authPassword})
                  if(error) alert(error.message)
                  else alert('Vérifiez votre email pour confirmer votre compte')
                }
                setAuthLoading(false)
              }}>{authLoading?'...':authMode==='login'?'Se connecter':'Créer le compte'}</button>
              <button className="btn btn-ghost" style={{fontSize:13}} onClick={()=>setAuthMode(m=>m==='login'?'signup':'login')}>
                {authMode==='login'?"Pas encore de compte ? S'inscrire":'Déjà un compte ? Se connecter'}
              </button>
            </div>
          </div>
        </div>
      )}
      {authChecked && user && <>
      <div className="app">

        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M6 4h8a4 4 0 0 1 0 8H6V4Z" fill="white" opacity=".9"/><path d="M6 12h5l4 8H6v-8Z" fill="white" opacity=".5"/></svg></div>
            <span className="logo-name">POSTORIA</span>
          </div>
          <nav className="sidebar-nav">
            {navItems.map(item => (
              <button key={item.id} className={`nav-link ${page===item.id?'active':''}`} onClick={()=>setPage(item.id)}>{item.icon}{item.label}</button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="user-row" onClick={()=>setPage('profil')}>
              <div className="user-avatar">{profile.name.slice(0,2).toUpperCase()}</div>
              <div><div className="user-name">{profile.name}</div><div className="user-role">AE · Cyna</div></div>
            </div>
            <div className="theme-row">
              <span>Mode sombre</span>
              <div className={`toggle ${dark?'on':''}`} onClick={toggleDark}><div className="toggle-dot"/></div>
            </div>
          </div>
        </aside>

        <div className="main">

          {/* APERÇU */}
          <div className={`page ${page==='apercu'?'active':''}`}>
            <div className="eyebrow">Tableau de bord</div>
            <div className="page-title">Bonjour, {profile.name}.</div>
            <div className="copper-rule"/>
            <div className="page-sub">{new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
            <div className="stats-grid">
              <div className="stat-card"><div className="stat-label">Posts générés</div><div className="stat-value">{generatedCount}</div><div className="stat-note">cette session</div></div>
              <div className="stat-card"><div className="stat-label">Bibliothèque</div><div className="stat-value">{savedPosts.length}</div><div className="stat-note">posts sauvegardés</div></div>
              <div className="stat-card"><div className="stat-label">Secteur actif</div><div className="stat-value" style={{fontSize:18,paddingTop:6}}>Cyber</div><div className="stat-note">MSP · B2B France</div></div>
            </div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
              <div className="section-label" style={{marginBottom:0}}>Idées du jour</div>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--text3)'}}><div className="dot"/> Refresh · 7h00</div>
                <button className="btn btn-primary" onClick={generateIdeas} disabled={loadingIdeas}>{loadingIdeas?<><span className="spinner"/> Génération…</>:'✦ Générer les idées'}</button>
              </div>
            </div>
            {loadingIdeas&&<div style={{marginBottom:12}}><div className="strip"/></div>}
            {ideas.length===0&&!loadingIdeas?(<div className="card empty"><div className="empty-icon">✦</div><div className="empty-title">Vos idées du jour vous attendent</div><div className="empty-body">Cliquez sur "Générer les idées" pour recevoir 5 sujets personnalisés.</div></div>)
            :ideas.map((idea,i)=>(<div key={i} className="idea-card fade" style={{animationDelay:`${i*.06}s`}}><span className="idea-tag">{idea.topic}</span><div className="idea-title">{idea.title}</div><div className="idea-hook">{idea.hook}</div><div className="idea-actions"><button className="btn btn-primary" style={{fontSize:12,padding:'7px 13px'}} onClick={()=>generatePost(idea.title)}>Développer</button><button className="btn btn-ghost" onClick={()=>copyText(idea.title+'\n\n'+idea.hook)}>⎘ Copier</button></div></div>))}
          </div>

          {/* IDÉES */}
          <div className={`page ${page==='idees'?'active':''}`}>
            <div className="eyebrow">Inspiration</div><div className="page-title">Idées du jour</div><div className="copper-rule"/><div className="page-sub">5 sujets calibrés pour votre audience, renouvelés chaque matin.</div>
            {ideas.length===0?(<div className="card empty"><div className="empty-icon">✦</div><div className="empty-title">Aucune idée générée</div><div className="empty-body">Retournez sur l'Aperçu et cliquez sur "Générer les idées".</div></div>)
            :ideas.map((idea,i)=>(<div key={i} className="idea-card fade"><span className="idea-tag">{idea.topic}</span><div className="idea-title">{idea.title}</div><div className="idea-hook">{idea.hook}</div><div className="idea-actions"><button className="btn btn-primary" style={{fontSize:12,padding:'7px 13px'}} onClick={()=>generatePost(idea.title)}>Développer</button><button className="btn btn-ghost" onClick={()=>copyText(idea.title+'\n\n'+idea.hook)}>⎘ Copier</button></div></div>))}
          </div>

          {/* RÉDIGER */}
          <div className={`page ${page==='rediger'?'active':''}`}>
            <div className="eyebrow">Création</div><div className="page-title">Rédiger un post</div><div className="copper-rule"/><div className="page-sub">Décrivez votre idée. Postoria s'occupe du reste.</div>
            <div className="grid2">
              <div className="card">
                <div className="section-label">Votre sujet</div>
                <div className="form-group"><textarea className="post-editor" style={{minHeight:80}} value={postTopic} onChange={e=>setPostTopic(e.target.value)} placeholder="Ex : Les MSP face aux ransomwares en 2025…"/></div>
                <div className="form-group"><label className="form-label">Format</label><select className="form-input" value={postFormat} onChange={e=>setPostFormat(e.target.value)}><option value="educational">Conseil & astuce pratique</option><option value="alert">Alerte — CVE ou menace récente</option><option value="opinion">Prise de position</option><option value="story">Storytelling</option><option value="list">Liste numérotée</option></select></div>
                <div className="form-group"><label className="form-label">Longueur</label><select className="form-input" value={postLength} onChange={e=>setPostLength(e.target.value)}><option value="short">Court</option><option value="medium">Moyen</option><option value="long">Long</option></select></div>
                <div className="form-group"><label className="form-label">Ton</label><div style={{marginTop:4}}>{['expert','accessible','direct','storyteller'].map(t=>(<span key={t} className={`chip ${postTone===t?'on':''}`} onClick={()=>setPostTone(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</span>))}</div></div>
                <button className="btn btn-primary" style={{width:'100%',justifyContent:'center'}} onClick={()=>generatePost()} disabled={loadingPost}>{loadingPost?<><span className="spinner"/> Génération…</>:'✦ Générer le post'}</button>
              </div>
              <div className="card">
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                  <div className="section-label" style={{marginBottom:0}}>Résultat</div>
                  {postOutput&&<div style={{display:'flex',gap:7,flexWrap:'wrap' as const}}>
                    <button className="btn btn-ghost" onClick={savePost}>↓ Sauvegarder</button>
                    <button className="btn btn-ghost" onClick={()=>copyText(postOutput)}>⎘ Copier</button>
                    <button className="btn btn-primary" onClick={()=>publishPost()} disabled={publishing} style={{background:'#0077B5'}}>
                      {publishing ? <><span className="spinner"/> Envoi…</> : '🔗 Publier sur LinkedIn'}
                    </button>
                  </div>}
                  {postOutput&&<div style={{display:'flex',gap:7,alignItems:'center',marginTop:8}}>
                    <input type="datetime-local" className="form-input" value={scheduleDate} onChange={e=>setScheduleDate(e.target.value)} style={{fontSize:12,flex:1}}/>
                    <button className="btn btn-secondary" onClick={()=>publishPost(scheduleDate)} disabled={publishing||!scheduleDate} style={{fontSize:12,whiteSpace:'nowrap' as const}}>
                      📅 Planifier
                    </button>
                  </div>}
                </div>
                {loadingPost&&<div style={{marginBottom:12}}><div className="strip"/></div>}
                <textarea className="post-editor" value={postOutput} onChange={e=>setPostOutput(e.target.value)} placeholder="Votre post apparaîtra ici…"/>
              </div>
            </div>
          </div>

          {/* VISUELS */}
          <div className={`page ${page==='visuels'?'active':''}`} style={{maxWidth:'100%',padding:'28px 32px'}}>
            <div className="eyebrow">Création visuelle</div><div className="page-title">Générateur visuel</div><div className="copper-rule"/>
            <VisualGenerator />
          </div>

                    {/* BIBLIOTHÈQUE */}
          <div className={`page ${page==='bibliotheque'?'active':''}`}>
            <div className="eyebrow">Vos contenus</div><div className="page-title">Bibliothèque</div><div className="copper-rule"/><div className="page-sub">Tous vos posts sauvegardés.</div>
            {savedPosts.length===0?(<div className="card empty"><div className="empty-icon">◫</div><div className="empty-title">Bibliothèque vide</div><div className="empty-body">Générez des posts et cliquez sur "Sauvegarder".</div></div>)
            :savedPosts.map(p=>(<div key={p.id} className="saved-card fade"><div className="saved-header"><div><span className="badge badge-forest">{fmtLabels[p.format]||p.format}</span><span style={{fontSize:11,color:'var(--text3)',marginLeft:8}}>{p.created_at}</span></div><button className="btn btn-ghost" style={{fontSize:11,color:'#c0392b',borderColor:'transparent'}} onClick={()=>deletePost(p.id)}>Supprimer</button></div><div className="saved-title">{p.topic}</div><div className="saved-preview">{p.content.substring(0,180)}…</div><div style={{display:'flex',gap:7}}><button className="btn btn-secondary" style={{fontSize:12}} onClick={()=>copyText(p.content)}>⎘ Copier</button><button className="btn btn-ghost" style={{fontSize:12}} onClick={()=>{setPostOutput(p.content);setPostTopic(p.topic);setPage('rediger')}}>Modifier</button></div></div>))}
          </div>

          {/* PROFIL */}
          <div className={`page ${page==='profil'?'active':''}`}>
            <div className="eyebrow">Paramètres</div><div className="page-title">Mon profil</div><div className="copper-rule"/><div className="page-sub">Votre contexte guide chaque génération.</div>
            <div className="profile-hero"><div className="profile-avatar">{profile.name.slice(0,2).toUpperCase()}</div><div><div className="profile-name">{profile.name}</div><div className="profile-role">{profile.role} · {profile.company}</div></div></div>
            <div className="grid2">
              <div className="card">
                <div className="section-label">Identité professionnelle</div>
                {([['Prénom','name'],['Rôle','role'],['Entreprise','company'],['Secteur','sector'],['Audience LinkedIn','audience']] as [string,keyof Profile][]).map(([label,key])=>(<div className="form-group" key={key}><label className="form-label">{label}</label><input type="text" className="form-input" value={profile[key]} onChange={e=>setProfile(p=>({...p,[key]:e.target.value}))}/></div>))}
                <div className="form-group"><label className="form-label">Langue</label><select className="form-input" value={profile.lang} onChange={e=>setProfile(p=>({...p,lang:e.target.value}))}><option value="fr">Français</option><option value="en">English</option></select></div>
                <div className="form-group">
                  <label className="form-label">URL Webhook Zapier</label>
                  <input type="text" className="form-input" placeholder="https://hooks.zapier.com/hooks/catch/..." value={profile.webhook_url||''} onChange={e=>setProfile(p=>({...p,webhook_url:e.target.value}))} style={{fontSize:12}}/>
                  <div style={{fontSize:11,color:'var(--text3)',marginTop:4}}>Colle ici l'URL générée par Zapier pour publier sur LinkedIn.</div>
                </div>
                <button className="btn btn-primary" onClick={saveProfile}>Enregistrer</button>
              </div>
              <div>
                <div className="card" style={{marginBottom:16}}>
                  <div className="section-label">Couleurs de marque</div>
                  <div style={{fontSize:12,color:'var(--text2)',marginBottom:12}}>Utilisées par défaut dans le générateur visuel.</div>
                  {([['Fond','brand_bg'],['Texte','brand_text'],['Accent','brand_accent']] as [string,keyof Profile][]).map(([label,key])=>(<div key={key} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}><span style={{fontSize:11,color:'var(--text2)',width:50}}>{label}</span><input type="color" value={profile[key]||'#F8F6F2'} onChange={e=>setProfile(p=>({...p,[key]:e.target.value}))} style={{width:30,height:30,borderRadius:8,border:'1px solid var(--border)',cursor:'pointer',padding:2}}/><span style={{fontSize:11,fontFamily:'monospace',color:'var(--text2)'}}>{profile[key]}</span></div>))}
                </div>
                <div className="card">
                  <div className="section-label">Stack & style</div>
                  <div className="form-group"><label className="form-label">Technologies</label><input type="text" className="form-input" value={profile.tech_stack} onChange={e=>setProfile(p=>({...p,tech_stack:e.target.value}))}/></div>
                  <div style={{marginTop:8}}><span className="badge badge-forest">Ton expert</span>&nbsp;<span className="badge badge-copper">MSP France</span></div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
      <div className={`toast ${toastVisible?'show':''}`}>{toast}</div>
    </>
    </>
  )
}

const GridIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
const BulbIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.3 6L15 20H9l-.7-5C6.3 13.7 5 11.5 5 9a7 7 0 0 1 7-7Z"/><path d="M9 21h6"/></svg>
const EditIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/></svg>
const ImgIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
const BookIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></svg>
const UserIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
