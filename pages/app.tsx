import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import { usePlan } from '../lib/usePlan'
import Head from 'next/head'
import { supabase } from '../lib/supabase'
import { useProfile } from '../lib/useProfile'
import { t, type Lang } from '../lib/i18n'

type Idea = { topic: string; title: string; hook: string; recommended?: boolean }
type Post = { id: string; topic: string; content: string; format: string; created_at: string }

const PALETTES = [
  { name:'Ivory', bg:'#FAF9F7', text:'#1F2421', accent:'#3D52A0' },
  { name:'Forest Sage', bg:'#3D52A0', text:'#FAF9F7', accent:'#D9C8A3' },
  { name:'Charcoal', bg:'#1F2421', text:'#FAF9F7', accent:'#B7C0B8' },
  { name:'Champagne', bg:'#D9C8A3', text:'#1F2421', accent:'#3D52A0' },
  { name:'Soft Sage', bg:'#B7C0B8', text:'#1F2421', accent:'#3D52A0' },
  { name:'Blue Pro', bg:'#1B2A4A', text:'#F0F4FF', accent:'#4A90E2' },
  { name:'Slate', bg:'#F4F6F8', text:'#1A1A2E', accent:'#6C5CE7' },
  { name:'Warm Noir', bg:'#1C1410', text:'#F5ECD7', accent:'#D4A853' },
]

const FONTS = [
  { id:'playfair', label:'Playfair Display', stack:"'Clash Display','Inter',sans-serif" },
  { id:'inter', label:'Inter', stack:"'Inter',sans-serif" },
  { id:'syne', label:'Syne', stack:"'Syne',sans-serif" },
  { id:'dm', label:'DM Sans', stack:"'DM Sans',sans-serif" },
  { id:'fraunces', label:'Fraunces', stack:"'Fraunces',Georgia,serif" },
]

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

// ─── VISUAL MODAL ──────────────────────────────────────────────────────────────
type VisualModalProps = {
  onClose: () => void; postContent: string; postTopic: string
  profileName: string; profileRole: string; profileCompany: string; profileSector: string
  brandBg: string; brandText: string; brandAccent: string
}

function VisualModal({ onClose, postContent, postTopic, profileName, profileRole, profileCompany, profileSector, brandBg, brandText, brandAccent }: VisualModalProps) {
  const extractHook = (content: string): string => {
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
    for (const line of lines) {
      const clean = line.replace(/^[#*>→•\-–]+\s*/, '').trim()
      if (clean.length >= 10 && clean.length <= 140) return clean
    }
    return postTopic || 'Votre expertise mérite d\'être visible.'
  }

  const [s, setS] = useState<any>({
    tpl:'quote', fmt:'square',
    colors:{ bg:brandBg||'#FAF9F7', text:brandText||'#1F2421', accent:brandAccent||'#3D52A0' },
    font:'playfair', textSize:'L', align:'left', accentStyle:'bar', bgPattern:'none',
    sectorIcon:'cyber', logoUrl:null, logoPos:'tl', logoSize:36, showWatermark:true,
    qText:extractHook(postContent),
    qAuthor:`${profileName} · ${profileRole.split(' ')[0]} @${profileCompany}`,
    qTag:postTopic||profileSector?.split('–')[0]?.trim()||'Cybersécurité MSP',
    sNum:'73', sUnit:'%', sLabel:'des MSP ne testent jamais leur PRA',
    sCtx:extractHook(postContent), sSrc:'Source',
    aRef:'Alerte', aTitle:postTopic||'Titre de l\'alerte',
    aDesc:extractHook(postContent),
    aItems:postContent.split('\n').filter((l:string)=>l.trim().match(/^[→•\-–*]/)).slice(0,3).map((l:string)=>l.replace(/^[→•\-–*]\s*/,'')).join('\n')||'Action 1\nAction 2\nAction 3',
    aSev:'CRITIQUE',
  })
  const [zoom, setZoom] = useState(50)
  const [tab, setTab] = useState<'basic'|'advanced'>('basic')
  const fileRef = useRef<HTMLInputElement>(null)
  const upd = (k:any) => setS((p:any)=>({...p,...k}))
  const updC = (k:string,v:string) => setS((p:any)=>({...p,colors:{...p.colors,[k]:v}}))
  const mix = (hex:string,a:number) => { const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16); return `rgba(${r},${g},${b},${a})` }
  const getDate = () => new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})
  const fontStack = FONTS.find(f=>f.id===s.font)?.stack||"'Clash Display','Inter',sans-serif"
  const sizeMult = ({S:0.8,M:1,L:1.2,XL:1.5} as any)[s.textSize]||1
  const logoSVGfn = (col:string,sz:number) => `<svg xmlns="http://www.w3.org/2000/svg" width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none"><path d="M6 4h8a4 4 0 0 1 0 8H6V4Z" fill="${col}" opacity=".9"/><path d="M6 12h5l4 8H6v-8Z" fill="${col}" opacity=".5"/></svg>`
  const buildPattern = (col:string) => (PATTERNS_SVG[s.bgPattern]||'').replace(/FILLCOL/g,col)
  const LOGO_POS: Record<string,[string,string]> = { tl:['flex-start','flex-start'],tc:['center','flex-start'],tr:['flex-end','flex-start'],ml:['flex-start','center'],mc:['center','center'],mr:['flex-end','center'],bl:['flex-start','flex-end'],bc:['center','flex-end'],br:['flex-end','flex-end'] }

  const buildAccentEl = (S:number,col:string) => {
    const p=(v:number)=>Math.round(v*(S/1080))
    if(s.accentStyle==='bar') return `<div style="position:absolute;left:0;top:0;bottom:0;width:${p(7)}px;background:${col};"></div>`
    if(s.accentStyle==='top') return `<div style="position:absolute;left:0;top:0;right:0;height:${p(7)}px;background:${col};"></div>`
    if(s.accentStyle==='gradient') return `<div style="position:absolute;left:0;top:0;bottom:0;width:${p(240)}px;background:linear-gradient(to right,${mix(col,.18)},transparent);pointer-events:none;"></div>`
    return ''
  }

  const buildLogoEl = (S:number,bgCol:string,accentCol:string) => {
    const p=(v:number)=>Math.round(v*(S/1080)); const sz=p(s.logoSize)
    const [jc,ai]=LOGO_POS[s.logoPos]||['flex-start','flex-start']
    let inner=''
    if(s.logoUrl) inner=`<img src="${s.logoUrl}" style="width:${sz}px;height:${sz}px;object-fit:contain;border-radius:${p(6)}px;" />`
    else if(s.sectorIcon&&SECTOR_ICONS_SVG[s.sectorIcon]) inner=`<div style="width:${sz}px;height:${sz}px;background:${accentCol};border-radius:${p(8)}px;display:flex;align-items:center;justify-content:center;padding:${Math.round(sz*0.18)}px;color:${bgCol};">${SECTOR_ICONS_SVG[s.sectorIcon].replace(/currentColor/g,bgCol)}</div>`
    else inner=`<div style="width:${sz}px;height:${sz}px;background:${accentCol};border-radius:${p(8)}px;display:flex;align-items:center;justify-content:center;">${logoSVGfn(bgCol,Math.round(sz*0.55))}</div>`
    const wm=s.showWatermark?`<span style="font-family:'Inter',sans-serif;font-size:${p(13)}px;font-weight:600;letter-spacing:.06em;color:${s.colors.text};margin-left:${p(8)}px;">ECRIRA</span>`:''
    return `<div style="position:absolute;inset:${p(44)}px;display:flex;align-items:${ai};justify-content:${jc};pointer-events:none;z-index:2;"><div style="display:flex;align-items:center;">${inner}${wm}</div></div>`
  }

  const buildViz = (S:number):string => {
    const H=s.fmt==='portrait'?Math.round(S*1.25):S
    const {bg,text,accent}=s.colors; const sub=mix(text,.58)
    const p=(v:number)=>Math.round(v*(S/1080)); const fs=(base:number)=>Math.round(base*sizeMult*(S/1080))
    const padL=s.accentStyle==='bar'?p(80):p(56); const pad=p(52); const ta=s.align
    if(s.tpl==='quote') return `<div style="width:${S}px;height:${H}px;background:${bg};display:flex;flex-direction:column;position:relative;overflow:hidden;font-family:${fontStack};box-sizing:border-box;">${buildPattern(text)}${buildAccentEl(S,accent)}${buildLogoEl(S,bg,accent)}<div style="position:relative;z-index:1;display:flex;flex-direction:column;height:100%;padding:${pad}px ${pad}px ${pad}px ${padL}px;"><div style="flex:1;display:flex;flex-direction:column;justify-content:center;text-align:${ta};"><div style="font-size:${fs(108)}px;line-height:.75;color:${accent};margin-bottom:${p(14)}px;font-weight:700;opacity:.18;">"</div><div style="font-size:${fs(46)}px;font-weight:500;line-height:1.28;font-style:italic;color:${text};">${s.qText}</div><div style="width:${p(48)}px;height:${p(3)}px;background:${accent};margin:${p(26)}px ${ta==='center'?'auto':'0'} ${p(18)}px;border-radius:2px;"></div><div style="font-family:'Inter',sans-serif;font-size:${fs(16)}px;font-weight:500;color:${sub};">${s.qAuthor}</div></div><div style="display:flex;align-items:center;justify-content:space-between;margin-top:${p(24)}px;"><span style="font-family:'Inter',sans-serif;font-size:${p(12)}px;padding:${p(5)}px ${p(14)}px;border-radius:${p(20)}px;border:1px solid ${mix(accent,.4)};color:${accent};">${s.qTag}</span><span style="font-family:'Inter',sans-serif;font-size:${p(11)}px;color:${mix(text,.3)};">${getDate()}</span></div></div></div>`
    if(s.tpl==='stat') return `<div style="width:${S}px;height:${H}px;background:${bg};display:flex;flex-direction:column;position:relative;overflow:hidden;font-family:'Inter',sans-serif;box-sizing:border-box;">${buildPattern(text)}${buildAccentEl(S,accent)}${buildLogoEl(S,bg,accent)}<div style="position:absolute;right:${p(-20)}px;bottom:${p(-50)}px;font-family:${fontStack};font-size:${p(360)}px;font-weight:700;color:${text};opacity:.04;line-height:1;pointer-events:none;">${s.sNum}</div><div style="position:relative;z-index:1;display:flex;flex-direction:column;flex:1;padding:${pad}px ${pad}px ${pad}px ${padL}px;"><div style="flex:1;display:flex;flex-direction:column;justify-content:center;"><div style="font-size:${p(11)}px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:${mix(text,.4)};margin-bottom:${p(10)}px;">Chiffre clé</div><div style="display:flex;align-items:flex-end;gap:${p(6)}px;margin-bottom:${p(14)}px;"><span style="font-family:${fontStack};font-size:${fs(128)}px;font-weight:700;color:${accent};line-height:.85;">${s.sNum}</span><span style="font-family:${fontStack};font-size:${fs(50)}px;color:${mix(accent,.6)};padding-bottom:${p(10)}px;">${s.sUnit}</span></div><div style="font-size:${fs(22)}px;color:${text};line-height:1.35;margin-bottom:${p(22)}px;max-width:${p(720)}px;">${s.sLabel}</div><div style="width:${p(48)}px;height:${p(3)}px;background:${accent};margin-bottom:${p(20)}px;border-radius:2px;"></div><div style="font-size:${fs(17)}px;line-height:1.7;color:${sub};max-width:${p(680)}px;">${s.sCtx}</div></div><div style="display:flex;align-items:center;justify-content:space-between;padding-top:${p(24)}px;"><span style="font-family:'Inter',sans-serif;font-size:${p(12)}px;padding:${p(5)}px ${p(14)}px;border-radius:${p(20)}px;border:1px solid ${mix(text,.18)};color:${sub};">${s.sSrc}</span><span style="font-family:'Inter',sans-serif;font-size:${p(11)}px;color:${mix(text,.3)};">${getDate()}</span></div></div></div>`
    const sevC=s.aSev==='CRITIQUE'?'#C0392B':s.aSev==='ÉLEVÉE'?'#D35400':'#E67E22'
    const sevBg=s.aSev==='CRITIQUE'?'rgba(192,57,43,.1)':s.aSev==='ÉLEVÉE'?'rgba(211,84,0,.1)':'rgba(230,126,34,.1)'
    const itemsHTML=s.aItems.split('\n').filter((l:string)=>l.trim()).map((it:string)=>`<div style="display:flex;align-items:flex-start;gap:${p(12)}px;font-size:${fs(17)}px;line-height:1.55;color:${sub};"><div style="width:${p(7)}px;height:${p(7)}px;border-radius:50%;background:${sevC};margin-top:${p(7)}px;flex-shrink:0;"></div><span>${it}</span></div>`).join('')
    return `<div style="width:${S}px;height:${H}px;background:${bg};display:flex;flex-direction:column;position:relative;overflow:hidden;font-family:'Inter',sans-serif;box-sizing:border-box;">${buildPattern(text)}${buildAccentEl(S,sevC)}${buildLogoEl(S,bg,accent)}<div style="position:relative;z-index:1;display:flex;flex-direction:column;flex:1;padding:${pad}px ${pad}px ${pad}px ${padL}px;"><div style="display:flex;justify-content:flex-end;margin-bottom:${p(32)}px;"><span style="font-size:${p(12)}px;font-weight:700;padding:${p(6)}px ${p(16)}px;border-radius:${p(20)}px;background:${sevBg};color:${sevC};letter-spacing:.06em;">${s.aSev}</span></div><div style="font-size:${p(13)}px;font-weight:700;letter-spacing:.1em;color:${mix(sevC,.8)};margin-bottom:${p(10)}px;text-transform:uppercase;">${s.aRef}</div><div style="font-family:${fontStack};font-size:${fs(42)}px;font-weight:600;line-height:1.2;color:${text};margin-bottom:${p(14)}px;">${s.aTitle}</div><div style="width:${p(48)}px;height:${p(4)}px;background:${sevC};border-radius:2px;margin-bottom:${p(18)}px;"></div><div style="font-size:${fs(17)}px;line-height:1.65;color:${sub};margin-bottom:${p(20)}px;max-width:${p(720)}px;">${s.aDesc}</div><div style="display:flex;flex-direction:column;gap:${p(10)}px;flex:1;">${itemsHTML}</div><div style="display:flex;align-items:center;justify-content:space-between;padding-top:${p(24)}px;"><div style="display:flex;align-items:center;gap:${p(8)}px;"><div style="width:${p(8)}px;height:${p(8)}px;border-radius:50%;background:${sevC};"></div><span style="font-size:${p(12)}px;font-weight:600;color:${sevC};">Alerte sécurité</span></div><span style="font-size:${p(11)}px;color:${mix(text,.3)};">${getDate()}</span></div></div></div>`
  }

  const exportPNG = useCallback(async(fmtOverride?:string)=>{
    const f=fmtOverride||s.fmt; const S=1080; const H=f==='portrait'?Math.round(S*1.25):S
    const div=document.createElement('div'); div.style.cssText=`position:fixed;left:-9999px;top:0;width:${S}px;height:${H}px;`
    div.innerHTML=buildViz(S); document.body.appendChild(div); await document.fonts.ready
    const h2c=(await import('html2canvas')).default
    const canvas=await h2c(div.firstChild as HTMLElement,{scale:1,useCORS:true,backgroundColor:null,logging:false})
    const a=document.createElement('a'); a.download=`ecrira-${s.tpl}-${f==='square'?'1080x1080':'1080x1350'}.png`
    a.href=canvas.toDataURL('image/png'); a.click(); document.body.removeChild(div)
  },[s])

  const S_BASE=1080; const H_BASE=s.fmt==='portrait'?Math.round(S_BASE*1.25):S_BASE
  const previewW=Math.round(S_BASE*zoom/100); const previewH=Math.round(H_BASE*zoom/100)
  const QUICK_COLORS=['#FFFFFF','#1F2421','#FAF9F7','#EDE9E3','#3D52A0','#A8784F','#2563EB','#DC2626','#D97706','#7C3AED']
  const POS_GRID=[['tl','tc','tr'],['ml','mc','mr'],['bl','bc','br']]
  const POS_LABELS:Record<string,string>={tl:'↖',tc:'↑',tr:'↗',ml:'←',mc:'·',mr:'→',bl:'↙',bc:'↓',br:'↘'}

  return (
    <div style={{position:'fixed',inset:0,zIndex:500,background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)',padding:20}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{background:'var(--ivory)',borderRadius:20,width:'100%',maxWidth:1100,maxHeight:'92vh',display:'flex',flexDirection:'column',boxShadow:'0 24px 80px rgba(0,0,0,0.25)',overflow:'hidden'}}>
        <div style={{padding:'16px 24px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--white)',flexShrink:0}}>
          <div><div style={{fontSize:11,fontWeight:600,color:'var(--indigo)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:2}}>Visuel du post</div><div style={{fontFamily:"'Clash Display','Inter',sans-serif",fontSize:16,fontWeight:500,color:'var(--text1)'}}>Générateur de visuel</div></div>
          <div style={{display:'flex',gap:8}}><button className="btn btn-primary" style={{fontSize:12}} onClick={()=>exportPNG()}>↓ Télécharger PNG</button><button className="btn btn-ghost" style={{fontSize:12}} onClick={onClose}>✕ Fermer</button></div>
        </div>
        <div style={{display:'flex',flex:1,overflow:'hidden'}}>
          <div style={{width:264,flexShrink:0,overflowY:'auto',padding:16,borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',gap:10,background:'var(--white)'}}>
            <div className="card-sm" style={{padding:'12px 14px'}}><div className="section-label">Template</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:5}}>{[{id:'quote',icon:'❝',label:'Quote'},{id:'stat',icon:'◎',label:'Stat'},{id:'alert',icon:'⚡',label:'Alerte'}].map(t=>(<button key={t.id} onClick={()=>upd({tpl:t.id})} style={{padding:'7px 4px',borderRadius:8,border:`1px solid ${s.tpl===t.id?'var(--indigo)':'var(--border)'}`,background:s.tpl===t.id?'var(--indigo)':'var(--ivory)',color:s.tpl===t.id?'white':'var(--text2)',fontSize:10,fontWeight:500,cursor:'pointer',textAlign:'center' as const,fontFamily:'inherit'}}><span style={{display:'block',fontSize:14,marginBottom:1}}>{t.icon}</span>{t.label}</button>))}</div></div>
            <div style={{display:'flex',gap:5}}>{(['basic','advanced'] as const).map(id=>(<button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:'7px',borderRadius:8,border:`1px solid ${tab===id?'var(--indigo)':'var(--border)'}`,background:tab===id?'var(--indigo)':'var(--ivory)',color:tab===id?'white':'var(--text2)',fontSize:11,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>{id==='basic'?'Basique':'Avancé'}</button>))}</div>
            {tab==='basic'&&<><div className="card-sm" style={{padding:'12px 14px'}}><div className="section-label">Couleurs</div>{([['Fond','bg'],['Texte','text'],['Accent','accent']] as [string,string][]).map(([label,key])=>(<div key={key} style={{display:'flex',alignItems:'center',gap:7,marginBottom:7}}><span style={{fontSize:10,color:'var(--text2)',width:40,flexShrink:0}}>{label}</span><input type="color" value={(s.colors as any)[key]} onChange={e=>updC(key,e.target.value)} style={{width:26,height:26,borderRadius:6,border:'1px solid var(--border)',cursor:'pointer',padding:2}}/><input className="form-input" value={(s.colors as any)[key]} onChange={e=>updC(key,e.target.value)} style={{fontSize:10,fontFamily:'monospace',padding:'3px 7px',flex:1}}/></div>))}<div style={{display:'flex',gap:4,flexWrap:'wrap' as const,marginTop:6}}>{QUICK_COLORS.map((c,i)=>(<div key={i} onClick={()=>updC('accent',c)} style={{width:20,height:20,borderRadius:'50%',background:c,border:`2px solid ${c==='#FFFFFF'?'#e0ddd8':'transparent'}`,cursor:'pointer',boxShadow:'0 1px 3px rgba(0,0,0,.15)'}}/>))}</div><div style={{display:'flex',gap:4,flexWrap:'wrap' as const,marginTop:6}}>{PALETTES.map((p:any,i:number)=>(<div key={i} onClick={()=>upd({colors:{bg:p.bg,text:p.text,accent:p.accent}})} title={p.name} style={{width:20,height:20,borderRadius:5,background:p.bg,border:`2px solid ${p.accent}`,cursor:'pointer'}}/>))}</div></div>
            <div className="card-sm" style={{padding:'12px 14px'}}><div className="section-label">Contenu</div>
              {s.tpl==='quote'&&<><div className="form-group" style={{marginBottom:10}}><label className="form-label">Citation</label><textarea className="form-input" rows={4} value={s.qText} onChange={(e:any)=>upd({qText:e.target.value})} style={{fontSize:11}}/></div><div className="form-group" style={{marginBottom:10}}><label className="form-label">Auteur</label><input className="form-input" value={s.qAuthor} onChange={(e:any)=>upd({qAuthor:e.target.value})} style={{fontSize:11}}/></div><div className="form-group" style={{marginBottom:0}}><label className="form-label">Tag</label><input className="form-input" value={s.qTag} onChange={(e:any)=>upd({qTag:e.target.value})} style={{fontSize:11}}/></div></>}
              {s.tpl==='stat'&&<><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><div className="form-group" style={{marginBottom:10}}><label className="form-label">Chiffre</label><input className="form-input" value={s.sNum} onChange={(e:any)=>upd({sNum:e.target.value})} style={{fontSize:11}}/></div><div className="form-group" style={{marginBottom:10}}><label className="form-label">Unité</label><input className="form-input" value={s.sUnit} onChange={(e:any)=>upd({sUnit:e.target.value})} style={{fontSize:11}}/></div></div><div className="form-group" style={{marginBottom:10}}><label className="form-label">Label</label><input className="form-input" value={s.sLabel} onChange={(e:any)=>upd({sLabel:e.target.value})} style={{fontSize:11}}/></div><div className="form-group" style={{marginBottom:10}}><label className="form-label">Contexte</label><textarea className="form-input" rows={3} value={s.sCtx} onChange={(e:any)=>upd({sCtx:e.target.value})} style={{fontSize:11}}/></div><div className="form-group" style={{marginBottom:0}}><label className="form-label">Source</label><input className="form-input" value={s.sSrc} onChange={(e:any)=>upd({sSrc:e.target.value})} style={{fontSize:11}}/></div></>}
              {s.tpl==='alert'&&<><div className="form-group" style={{marginBottom:10}}><label className="form-label">Référence</label><input className="form-input" value={s.aRef} onChange={(e:any)=>upd({aRef:e.target.value})} style={{fontSize:11}}/></div><div className="form-group" style={{marginBottom:10}}><label className="form-label">Titre</label><input className="form-input" value={s.aTitle} onChange={(e:any)=>upd({aTitle:e.target.value})} style={{fontSize:11}}/></div><div className="form-group" style={{marginBottom:10}}><label className="form-label">Description</label><textarea className="form-input" rows={2} value={s.aDesc} onChange={(e:any)=>upd({aDesc:e.target.value})} style={{fontSize:11}}/></div><div className="form-group" style={{marginBottom:10}}><label className="form-label">Actions (1/ligne)</label><textarea className="form-input" rows={3} value={s.aItems} onChange={(e:any)=>upd({aItems:e.target.value})} style={{fontSize:11}}/></div><div className="form-group" style={{marginBottom:0}}><label className="form-label">Sévérité</label><select className="form-input" value={s.aSev} onChange={(e:any)=>upd({aSev:e.target.value})} style={{fontSize:11}}><option>CRITIQUE</option><option>ÉLEVÉE</option><option>MODÉRÉE</option></select></div></>}
            </div></>}
            {tab==='advanced'&&<><div className="card-sm" style={{padding:'12px 14px'}}><div className="section-label">Typographie</div><div className="form-group" style={{marginBottom:10}}><label className="form-label">Police</label><select className="form-input" value={s.font} onChange={(e:any)=>upd({font:e.target.value})} style={{fontSize:11}}>{FONTS.map(f=><option key={f.id} value={f.id}>{f.label}</option>)}</select></div><div className="form-group" style={{marginBottom:10}}><label className="form-label">Taille</label><div style={{display:'flex',gap:4}}>{['S','M','L','XL'].map(sz=>(<button key={sz} onClick={()=>upd({textSize:sz})} style={{flex:1,padding:'6px',borderRadius:7,border:`1px solid ${s.textSize===sz?'var(--indigo)':'var(--border)'}`,background:s.textSize===sz?'var(--indigo)':'var(--ivory)',color:s.textSize===sz?'white':'var(--text2)',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>{sz}</button>))}</div></div><div className="form-group" style={{marginBottom:0}}><label className="form-label">Alignement</label><div style={{display:'flex',gap:4}}>{[{id:'left',l:'Gauche'},{id:'center',l:'Centré'}].map(a=>(<button key={a.id} onClick={()=>upd({align:a.id})} style={{flex:1,padding:'6px',borderRadius:7,border:`1px solid ${s.align===a.id?'var(--indigo)':'var(--border)'}`,background:s.align===a.id?'var(--indigo)':'var(--ivory)',color:s.align===a.id?'white':'var(--text2)',fontSize:10,cursor:'pointer',fontFamily:'inherit'}}>{a.l}</button>))}</div></div></div>
            <div className="card-sm" style={{padding:'12px 14px'}}><div className="section-label">Décoration</div><div className="form-group" style={{marginBottom:10}}><label className="form-label">Accent</label><select className="form-input" value={s.accentStyle} onChange={(e:any)=>upd({accentStyle:e.target.value})} style={{fontSize:11}}><option value="bar">Barre verticale gauche</option><option value="top">Barre horizontale haut</option><option value="gradient">Gradient latéral</option><option value="none">Aucun</option></select></div><div className="form-group" style={{marginBottom:0}}><label className="form-label">Motif de fond</label><select className="form-input" value={s.bgPattern} onChange={(e:any)=>upd({bgPattern:e.target.value})} style={{fontSize:11}}><option value="none">Aucun</option><option value="dots">Points</option><option value="grid">Grille</option><option value="diag">Diagonales</option><option value="circles">Cercles</option></select></div></div>
            <div className="card-sm" style={{padding:'12px 14px'}}><div className="section-label">Logo & icône</div><input ref={fileRef} type="file" accept="image/*" onChange={(e:any)=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=(ev)=>upd({logoUrl:ev.target?.result});r.readAsDataURL(f)}} style={{display:'none'}}/><div style={{display:'flex',gap:6,marginBottom:10}}><button onClick={()=>fileRef.current?.click()} className="btn btn-ghost" style={{fontSize:11,flex:1,justifyContent:'center'}}>{s.logoUrl?'✓ Logo chargé':'↑ Choisir'}</button>{s.logoUrl&&<button onClick={()=>upd({logoUrl:null})} className="btn btn-ghost" style={{fontSize:10,color:'#c0392b',borderColor:'transparent'}}>✕</button>}</div>{!s.logoUrl&&<div className="form-group" style={{marginBottom:10}}><label className="form-label">Icône sectorielle</label><select className="form-input" value={s.sectorIcon} onChange={(e:any)=>upd({sectorIcon:e.target.value})} style={{fontSize:11}}><option value="cyber">🔒 Cybersécurité</option><option value="finance">💳 Finance</option><option value="tech">💻 Tech</option><option value="marketing">📣 Marketing</option><option value="rh">👥 RH</option><option value="sante">❤️ Santé</option><option value="conseil">📋 Conseil</option><option value="none">Aucune</option></select></div>}<div className="form-group" style={{marginBottom:8}}><label className="form-label">Position</label><div style={{display:'inline-grid',gridTemplateColumns:'repeat(3,26px)',gap:3}}>{POS_GRID.map(row=>row.map(pos=>(<button key={pos} onClick={()=>upd({logoPos:pos})} style={{width:26,height:26,borderRadius:5,border:`1px solid ${s.logoPos===pos?'var(--indigo)':'var(--border)'}`,background:s.logoPos===pos?'var(--indigo)':'var(--ivory)',color:s.logoPos===pos?'white':'var(--text2)',fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{POS_LABELS[pos]}</button>)))}</div></div><div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}><span style={{fontSize:11,color:'var(--text2)'}}>Watermark</span><div className={`toggle ${s.showWatermark?'on':''}`} onClick={()=>upd({showWatermark:!s.showWatermark})}><div className="toggle-dot"/></div></div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:8}}><span style={{fontSize:11,color:'var(--text2)'}}>Logo entreprise</span><div className={`toggle ${s.showCompanyLogo?'on':''}`} onClick={()=>upd({showCompanyLogo:!s.showCompanyLogo})}><div className="toggle-dot"/></div></div></div></>}
            <div className="card-sm" style={{padding:'12px 14px'}}><div className="section-label">Format</div><div style={{display:'flex',gap:5,marginBottom:10}}>{['square','portrait'].map(f=>(<button key={f} onClick={()=>upd({fmt:f})} style={{flex:1,padding:'7px',borderRadius:8,border:`1px solid ${s.fmt===f?'var(--indigo)':'var(--border)'}`,background:s.fmt===f?'var(--indigo)':'var(--ivory)',color:s.fmt===f?'white':'var(--text2)',fontSize:10,cursor:'pointer',fontFamily:'inherit'}}>{f==='square'?'1080×1080':'1080×1350'}</button>))}</div><div style={{marginBottom:10}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}><label style={{fontSize:10,color:'var(--text2)',fontWeight:500}}>Zoom</label><span style={{fontSize:10,color:'var(--text3)',fontFamily:'monospace'}}>{zoom}%</span></div><input type="range" min={30} max={100} value={zoom} onChange={(e:any)=>setZoom(parseInt(e.target.value))} style={{width:'100%',accentColor:'var(--indigo)'}}/></div><button className="btn btn-primary" style={{width:'100%',justifyContent:'center',fontSize:12,marginBottom:5}} onClick={()=>exportPNG()}>↓ PNG</button><button className="btn btn-ghost" style={{width:'100%',justifyContent:'center',fontSize:11}} onClick={async()=>{await exportPNG('square');await new Promise(r=>setTimeout(r,400));await exportPNG('portrait')}}>↓ Les 2 formats</button></div>
          </div>
          <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'var(--sand)',overflow:'auto',padding:24}}>
            <div style={{fontSize:10,color:'var(--text3)',marginBottom:12,fontWeight:500,textTransform:'uppercase' as const,letterSpacing:'.08em'}}>Aperçu {zoom}% — {s.fmt==='square'?'1080 × 1080':'1080 × 1350'}</div>
            <div style={{borderRadius:Math.round(14*zoom/100),overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,.18)',flexShrink:0,width:previewW,height:previewH}}>
              <div style={{transform:`scale(${zoom/100})`,transformOrigin:'top left',width:S_BASE,height:H_BASE}} dangerouslySetInnerHTML={{__html:buildViz(S_BASE)}}/>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────
// Modal upgrade Pro
// ── SVG sanitisation globale (protection XSS) ──
function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+\s*=/gi, 'data-removed=')
    .replace(/javascript\s*:/gi, 'data-js:')
    .replace(/<use[^>]+href\s*=\s*["']?(?!#)[^"'>\s]+/gi, '<use')
    .replace(/xlink:href\s*=\s*["']?(?!#)[^"'>\s]+/gi, 'xlink:href="#removed"')
}

function UpgradeModal({ onClose, lang }: { onClose: () => void, lang: 'fr'|'en' }) {
  const router = useRouter()
  const TU = (k: string): string => ({
    upgrade_title: lang==='fr'?'Fonctionnalité Pro':'Pro feature',
    upgrade_body: lang==='fr'?'Cette fonctionnalité est réservée au plan Pro. Passez au Pro pour accéder aux visuels, au calendrier éditorial et aux posts illimités.':'This feature is reserved for the Pro plan.',
    see_offers: lang==='fr'?'Voir les offres':'See plans',
    cancel_btn: lang==='fr'?'Annuler':'Cancel',
  } as Record<string,string>)[k] || k
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:"#FAF9F7",borderRadius:20,padding:"40px 32px",maxWidth:400,width:"90%",textAlign:"center"}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:32,marginBottom:12}}>⚡</div>
        <h2 style={{fontFamily:"Clash Display,sans-serif",fontSize:22,fontWeight:700,color:"#1F2421",marginBottom:8}}>{TU('upgrade_title')}</h2>
        <p style={{color:"#3D52A0",fontSize:14,marginBottom:24,lineHeight:1.6}}>{TU('upgrade_body')}</p>
        <button onClick={()=>router.push("/pricing")} style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:"#1F2421",color:"#FAF9F7",fontFamily:"Clash Display,sans-serif",fontSize:15,fontWeight:700,cursor:"pointer",marginBottom:8}}>{TU('see_offers')}</button>
        <button onClick={onClose} style={{width:"100%",padding:"12px",borderRadius:12,border:"1.5px solid #B7C0B8",background:"transparent",color:"#3D52A0",fontSize:14,cursor:"pointer"}}>{TU('cancel_btn')}</button>
      </div>
    </div>
  )
}

export default function Home() {
  const { profile, setProfile, saveProfile, signOut, loading, userId } = useProfile()
  const { isPro, postsThisMonth, canGenerate, trialDaysLeft, plan } = usePlan(userId ?? null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  // Helper — injecte le token Supabase dans les appels API
  const authFetch = async (url: string, options: RequestInit = {}) => {
    const { data: { session } } = await supabase.auth.getSession()
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        ...(options.headers || {}),
      },
    })
  }
  const [page, setPage] = useState('apercu')
  const [dark, setDark] = useState(false)
  const [showAvatarMenu, setShowAvatarMenu] = useState(false)
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [ideasGeneratedAt, setIdeasGeneratedAt] = useState<Date | null>(null)
  const [savedPosts, setSavedPosts] = useState<Post[]>([])
  const [savedIdeas, setSavedIdeas] = useState<Idea[]>([])
  const [libraryTab, setLibraryTab] = useState<'posts'|'ideas'>('posts')
  const [generatedCount, setGeneratedCount] = useState(0)
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([])
  const [calView, setCalView] = useState<'semaine'|'mois'|'annee'>('semaine')
  const [calDate, setCalDate] = useState(new Date())
  const [selectedCalPost, setSelectedCalPost] = useState<any>(null)
  const [scheduling, setScheduling] = useState(false)
  const [scheduleDateTime, setScheduleDateTime] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [pickerMonth, setPickerMonth] = useState(new Date())
  const [loadingIdeas, setLoadingIdeas] = useState(false)
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [loadingPost, setLoadingPost] = useState(false)
  const [loadingByTab, setLoadingByTab] = useState<Record<number,boolean>>({})
  const [showLinkedInPreview, setShowLinkedInPreview] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewExpanded, setPreviewExpanded] = useState(false)
  const [selectedIdeaIds, setSelectedIdeaIds] = useState<Set<number>>(new Set())
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [batchFormat, setBatchFormat] = useState('storytelling')
  const [batchLength, setBatchLength] = useState('medium')
  const [batchTone, setBatchTone] = useState('expert')
  const [batchPosts, setBatchPosts] = useState<{topic:string,content:string}[]>([])
  const [batchIndex, setBatchIndex] = useState(0)
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchTopics, setBatchTopics] = useState<string[]>([])
  const [activeBatchTab, setActiveBatchTab] = useState(0)
  const [batchTabOutputs, setBatchTabOutputs] = useState<Record<number,string>>({})
  const [batchTabConfigs, setBatchTabConfigs] = useState<Record<number,{format:string,length:string,tone:string}>>({})
  const [batchTabVisuals, setBatchTabVisuals] = useState<Record<number,{svg:string,url:string}>>({})
  const [postVariants, setPostVariants] = useState<string[]>([])
  const [activeVariant, setActiveVariant] = useState(0)
  const [usedIdeaIds, setUsedIdeaIds] = useState<Set<string>>(new Set())
  const [draggedPostId, setDraggedPostId] = useState<string|null>(null)
  const [searchLibrary, setSearchLibrary] = useState('')
  const [suggestedHashtags, setSuggestedHashtags] = useState<string[]>([])
  const [postTopic, setPostTopic] = useState(() => { try { return localStorage.getItem('ecrira_draft_topic') || '' } catch { return '' } })
  const [postFormat, setPostFormat] = useState('educational')
  const [postLength, setPostLength] = useState('medium')
  const [postTone, setPostTone] = useState('expert')
  const [postOutput, setPostOutput] = useState('')
  const [toast, setToast] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('')
  const [showVisualModal, setShowVisualModal] = useState(false)
  const [aiVisualUrl, setAiVisualUrl] = useState('')
  const [aiSvgContent, setAiSvgContent] = useState('')
  const [customVisualBase64, setCustomVisualBase64] = useState<string|null>(null)
  const [customVisualName, setCustomVisualName] = useState('')
  const [improvementNote, setImprovementNote] = useState('')
  const [improving, setImproving] = useState(false)
  const [visualType, setVisualType] = useState('classique')
  const [hideWatermark, setHideWatermark] = useState(false)
  const [hideCompanyLogo, setHideCompanyLogo] = useState(false)
  const [visualCustomTitle, setVisualCustomTitle] = useState('')
  const [visualCustomPoints, setVisualCustomPoints] = useState('')
  const [showVisualConfig, setShowVisualConfig] = useState(false)
  const [svgEditTitle, setSvgEditTitle] = useState('')
  const [svgEditPoints, setSvgEditPoints] = useState<string[]>([])
  const [svgEditAccent, setSvgEditAccent] = useState('')
  const [showSvgEditor, setShowSvgEditor] = useState(false)
  const [showPublishMenu, setShowPublishMenu] = useState(false)
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showScheduleMenu, setShowScheduleMenu] = useState(false)
  const [scheduleWithVisual, setScheduleWithVisual] = useState(false)
  const [generatingAiVisual, setGeneratingAiVisual] = useState(false)
  const [generatingByTab, setGeneratingByTab] = useState<Record<number,boolean>>({})
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [newRefPost, setNewRefPost] = useState('')
  const [showAddRef, setShowAddRef] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [ideasRefreshCountdown, setIdeasRefreshCountdown] = useState<number | null>(null)
  const ideasLastRefresh = useRef<number | null>(null)
  const IDEAS_REFRESH_MS = 2 * 60 * 60 * 1000

  // Load theme
  useEffect(() => {
    const theme = localStorage.getItem('ecrira_dark')
    if (theme === '1') { setDark(true); document.documentElement.dataset.theme = 'dark' }
  }, [])


  // Upgrade success handler
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (params.get('upgrade') === 'success' && sessionId && userId) {
      fetch('/api/stripe/success', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      }).then(async () => {
        // Attendre que le webhook Stripe ait mis à jour le plan
        let retries = 0
        const checkPlan = async () => {
          const { createClient } = await import('@supabase/supabase-js')
          const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
          const { data } = await sb.from('profiles').select('plan').eq('id', userId).single()
          if (data?.plan === 'pro' || retries >= 5) {
            window.history.replaceState({}, '', '/');
            window.location.reload();
          } else {
            retries++
            setTimeout(checkPlan, 1500)
          }
        }
        setTimeout(checkPlan, 1000)
      });
    }
  }, [userId]);

  // Load Supabase data once userId is available
  useEffect(() => {
    if (!userId) return
    loadPosts()
    loadIdeas()
    loadCount()
    loadScheduledPosts()
    loadNotifications()
    loadNotifications()
  }, [userId])

  useEffect(() => {
    const fromUpgrade = new URLSearchParams(window.location.search).get('upgrade') === 'success'
    if (!loading && userId && !profile.role && !isPro && !fromUpgrade) setShowOnboarding(true)
  }, [loading, userId, profile.role])

  // Rediriger vers landing si non connecté
  useEffect(() => {
    if (!loading && !userId) {
      window.location.href = '/'
    }
  }, [loading, userId])

  // ── Supabase: load posts ──
  const loadPosts = async () => {
    setLoadingPosts(true)
    const { data } = await supabase.from('saved_posts').select('*').order('created_at', { ascending: false })
    if (data) {
      setSavedPosts(data.map((p: any) => ({
        id: p.id, topic: p.topic, content: p.content, format: p.format,
        created_at: p.created_at_display || new Date(p.created_at).toLocaleDateString(profile.lang==='en'?'en-GB':'fr-FR'),
      })))
    }
    setLoadingPosts(false)
  }

  // ── Supabase: load ideas ──
  const loadIdeas = async () => {
    const { data } = await supabase
      .from('daily_ideas').select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    if (data && data.length > 0) {
      // Group by generated_at date — take the latest batch
      const latest = data[0]
      const latestDate = latest.created_at
      const batch = data.filter((d: any) => {
        const diff = new Date(latestDate).getTime() - new Date(d.created_at).getTime()
        return Math.abs(diff) < 60000 * 5 // within 5 min = same batch
      })
      setIdeas(batch.map((d: any) => ({ topic: d.topic, title: d.title, hook: d.hook, recommended: d.recommended })))
      // Charger idées sauvegardées
      const { data: savedIdeasData } = await supabase.from('saved_ideas').select('*').eq('user_id', userId||'').order('created_at', { ascending: false })
      if (savedIdeasData) setSavedIdeas(savedIdeasData.map((d: any) => ({ topic: d.topic, title: d.title, hook: d.hook })))
      const generatedAt = new Date(latestDate)
      setIdeasGeneratedAt(generatedAt)
      ideasLastRefresh.current = generatedAt.getTime()
      const remaining = IDEAS_REFRESH_MS - (Date.now() - generatedAt.getTime())
      setIdeasRefreshCountdown(remaining > 0 ? remaining : 0)
    }
  }

  // ── Supabase: load generated count ──
  const loadScheduledPosts = async () => {
    const { data } = await supabase
      .from('scheduled_posts')
      .select('*')
      .order('scheduled_at', { ascending: true })
    if (data) setScheduledPosts(data)
  }

  const loadNotifications = async () => {
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(20)
    if (data) {
      setNotifications(data)
      setUnreadCount(data.filter((n:any) => !n.read).length)
    }
  }

  const markAllRead = async () => {
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const loadCount = async () => {
    const { data } = await supabase.from('profiles').select('posts_count_this_month').eq('id', userId as string).single()
    if (data?.posts_count_this_month !== undefined) setGeneratedCount(data.posts_count_this_month)
  }

  // Auto-refresh ideas every 2h
  useEffect(() => {
    const interval = setInterval(() => {
      if (ideasLastRefresh.current !== null) {
        const elapsed = Date.now() - ideasLastRefresh.current
        const remaining = IDEAS_REFRESH_MS - elapsed
        if (remaining <= 0) {
          authFetch('/api/ideas', { method:'POST', body:JSON.stringify({profile: {...profile, lang}, pastTitles: ideas.slice(0,10).map((i:any)=>i.title).filter(Boolean)}) })
            .then(r=>r.json()).then(async data=>{
              if (data.ideas) {
                setIdeas(data.ideas)
                ideasLastRefresh.current = Date.now()
                setIdeasRefreshCountdown(IDEAS_REFRESH_MS)
                await saveIdeasToSupabase(data.ideas)
              }
            }).catch(()=>{})
        } else {
          setIdeasRefreshCountdown(remaining)
        }
      }
    }, 60000)
    return () => clearInterval(interval)
  }, [profile])

  const saveIdeasToSupabase = async (ideasToSave: Idea[]) => {
    if (!userId) return
    // Delete old ideas for this user
    await supabase.from('daily_ideas').delete().eq('user_id', userId)
    // Insert new batch
    const now = new Date().toISOString()
    await supabase.from('daily_ideas').insert(
      ideasToSave.map(idea => ({
        user_id: userId, topic: idea.topic, title: idea.title,
        hook: idea.hook, recommended: idea.recommended || false,
        created_at: now,
      }))
    )
  }

  const formatCountdown = (ms: number) => {
    const m = Math.floor(ms / 60000); const h = Math.floor(m / 60)
    return h > 0 ? `${h}h${String(m % 60).padStart(2,'0')}` : `${m}m`
  }

  const formatIdeasDate = (date: Date) => {
    const loc = lang === 'en' ? 'en-GB' : 'fr-FR'
    const sep = lang === 'en' ? ' at ' : ' à '
    return date.toLocaleDateString(loc, { day: 'numeric', month: 'long' }) + sep + date.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })
  }

  const showToast = (msg: string) => { setToast(msg); setToastVisible(true); setTimeout(()=>setToastVisible(false), 2600) }
  useEffect(()=>{
    const close = ()=>setShowAvatarMenu(false)
    document.addEventListener('click', close)
    return ()=>document.removeEventListener('click', close)
  },[])

  const toggleDark = () => { const n=!dark; setDark(n); document.documentElement.dataset.theme=n?'dark':''; localStorage.setItem('ecrira_dark',n?'1':'0') }

  // Auto-save brouillon sujet
  const setPostTopicWithSave = (v: string) => {
    setPostTopic(v)
    try { localStorage.setItem('ecrira_draft_topic', v) } catch {}
  }

  const isProfileComplete = () => !!(profile.name && (profile.sector || (profile as any).domain || (profile as any).website))

  const generateBatch = async () => {
    if (selectedIdeaIds.size === 0) return
    setBatchLoading(true)
    setBatchPosts([])
    setBatchIndex(0)
    const selectedTopics = ideas.filter((_,i) => selectedIdeaIds.has(i)).map(idea => idea.title)
    const results: {topic:string,content:string}[] = []
    for (const topic of selectedTopics) {
      try {
        const res = await authFetch('/api/generate', {
          method: 'POST',
          body: JSON.stringify({ topic, format: batchFormat, length: batchLength, tone: batchTone, profile: {...profile, lang} })
        })
        const data = await res.json()
        if (data.content) results.push({ topic, content: data.content })
      } catch {}
    }
    setBatchPosts(results)
    setBatchLoading(false)
  }

  const generateIdeas = async () => {
    if (!isProfileComplete()) {
      showToast(lang === 'en' ? 'Complete your profile first (name + sector or website)' : "Complète ton profil d'abord (nom + secteur ou site web)")
      setPage('profil')
      return
    }
    setLoadingIdeas(true)
    try {
      const pastTitles = ideas.slice(0,10).map((i:any)=>i.title).filter(Boolean)
      const res = await authFetch('/api/ideas', { method:'POST', body:JSON.stringify({profile: {...profile, lang}, pastTitles}) })
      const data = await res.json()
      if (data.ideas) {
        setIdeas(data.ideas)
        const now = new Date()
        setIdeasGeneratedAt(now)
        ideasLastRefresh.current = now.getTime()
        setIdeasRefreshCountdown(IDEAS_REFRESH_MS)
        await saveIdeasToSupabase(data.ideas)
      } else showToast((lang==='en'?'Error: ':'Erreur : ')+(data.error||'unknown'))
    } catch { showToast(lang==='en'?'Network error':'Erreur réseau') }
    setLoadingIdeas(false)
  }

  const generate3Variants = async () => {
    const t = postTopic
    if (!t.trim()) { showToast(T('toast_enter_topic')); return }
    setLoadingPost(true); setPostOutput(''); setPostVariants([]); setActiveVariant(0)
    try {
      const results: string[] = []
      for (let i = 0; i < 3; i++) {
        const res = await authFetch('/api/generate', { method:'POST', body:JSON.stringify({topic:t,format:postFormat,length:postLength,tone:postTone,profile:{...profile,lang},variant:i+1}) })
        const data = await res.json()
        if (data.content) results.push(data.content)
      }
      if (results.length > 0) { setPostVariants(results); setPostOutput(results[0]); setActiveVariant(0) }
    } catch { showToast(T('toast_save_error')) }
    setLoadingPost(false)
  }

  
  const generatePost = useCallback(async (topic?: string) => {
    const t = topic || postTopic
    if (!t.trim()) { showToast(T('toast_enter_topic')); return }
    if (topic) setPostTopic(topic)
    setPage('rediger')
    if (batchTopics.length > 1) {
      setLoadingByTab(prev => ({...prev, [activeBatchTab]: true}))
    } else {
      setLoadingPost(true)
    }
    setPostOutput('')
    try {
      const res = await authFetch('/api/generate', { method:'POST', body:JSON.stringify({topic:t,format:postFormat,length:postLength,tone:postTone,profile: {...profile, lang}}) })
      const data = await res.json()
      if (data.error === 'LIMIT_REACHED') { setShowUpgradeModal(true); setLoadingPost(false); return }
      if (data.content) {
        setPostOutput(data.content)
        setGeneratedCount(c => c + 1)
        // Sauvegarder dans l'onglet batch actif si batch en cours
        if (batchTopics.length > 1) {
          setBatchTabOutputs(prev => ({...prev, [activeBatchTab]: data.content}))
        }
      }
      else showToast((lang==='en'?'Error: ':'Erreur : ')+(data.error||'unknown'))
    } catch { showToast(lang==='en'?'Network error':'Erreur réseau') }
    if (batchTopics.length > 1) {
      setLoadingByTab(prev => ({...prev, [activeBatchTab]: false}))
    } else {
      setLoadingPost(false)
    }
  }, [postTopic,postFormat,postLength,postTone,profile,batchTopics,activeBatchTab])

  // ── Supabase: save post ──
  const saveIdea = async (idea: Idea) => {
    if (!userId) return
    const already = savedIdeas.some(s => s.title === idea.title)
    if (already) { showToast(lang==='en'?'Already saved':'Déjà sauvegardée'); return }
    const { error } = await supabase.from('saved_ideas').insert({ user_id: userId, title: idea.title, hook: idea.hook, topic: idea.topic })
    if (!error) {
      setSavedIdeas(prev => [...prev, idea])
      showToast(lang==='en'?'Idea saved ✓':'Idée sauvegardée ✓')
    } else showToast(T('toast_save_error'))
  }

  const deleteSavedIdea = async (id?: string, title?: string) => {
    if (!userId) return
    await supabase.from('saved_ideas').delete().eq('user_id', userId).eq('title', title||'')
    setSavedIdeas(prev => prev.filter(s => s.title !== title))
  }

  const savePost = async () => {
    if (!postOutput.trim() || !userId) return
    const displayDate = new Date().toLocaleDateString(profile.lang==='en'?'en-GB':'fr-FR')
    const { data, error } = await supabase.from('saved_posts').insert({
      user_id: userId, topic: postTopic||T('sans_titre'),
      content: postOutput, format: postFormat, created_at_display: displayDate,
    }).select().single()
    if (!error && data) {
      const post: Post = { id: data.id, topic: data.topic, content: data.content, format: data.format, created_at: displayDate }
      setSavedPosts(prev => [post, ...prev])
      showToast(T('toast_post_saved'))
    } else {
      showToast(T('toast_save_error'))
    }
  }

  // ── Supabase: delete post ──
  const deletePost = async (id: string) => {
    const { error } = await supabase.from('saved_posts').delete().eq('id', id)
    if (!error) {
      setSavedPosts(prev => prev.filter(p => p.id !== id))
      showToast(T('toast_post_deleted'))
    }
  }

  const copyText = (text:string) => { navigator.clipboard.writeText(text); showToast(lang==='en'?'Copied ✓':'Copié ✓') }

  const [enriching, setEnriching] = useState(false)
  const [enrichSuggestions, setEnrichSuggestions] = useState<any>(null)

  const enrichProfile = async () => {
    if (!profile.domain) { showToast('Renseigne d\'abord ton domaine'); return }
    setEnriching(true)
    try {
      const res = await authFetch('/api/enrich-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: profile.domain }),
      })
      const data = await res.json()
      if (data.suggestions) {
        setEnrichSuggestions(data.suggestions)
        // Appliquer logo entreprise si trouvé
        if (data.company_logo) setProfile((p:any)=>({...p,company_logo:data.company_logo}))
        // Appliquer automatiquement les couleurs extraites
        if (data.colors) {
          setProfile(p => ({
            ...p,
            brand_bg: data.colors.bg || p.brand_bg,
            brand_text: data.colors.text || p.brand_text,
            brand_accent: data.colors.primary || data.colors.accent || p.brand_accent,
            brand_color2: data.colors.secondary || p.brand_color2,
            brand_color3: data.colors.accent || p.brand_color3,
          }))
          showToast(T('toast_colors_detected'))
        } else {
          showToast('Site dynamique détecté — renseigne les couleurs manuellement')
        }
      } else showToast(data.error || 'Impossible d\'analyser le site')
    } catch { showToast(lang==='en'?'Network error':'Erreur réseau') }
    setEnriching(false)
  }

  const applyEnrichSuggestion = (key: string, value: string) => {
    setProfile(p => ({ ...p, [key]: value }))
    setEnrichSuggestions((prev: any) => { const n = { ...prev }; delete n[key]; return Object.keys(n).length ? n : null })
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    const ok = await saveProfile(profile)
    showToast(ok ? T('toast_profile_saved') : T('toast_save_error'))
    setSavingProfile(false)
  }

  // Auto-save profil avec debounce 1.5s
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>|null>(null)
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    if (!userId) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(async () => {
      const ok = await saveProfile(profile)
      if (ok) {} // auto-save silencieux
    }, 1500)
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [profile])

  const [linkedinConnected, setLinkedinConnected] = useState(false)
  const lang = (profile.lang || 'fr') as Lang
  const T = (key: Parameters<typeof t>[1]) => t(lang, key)

  // Realtime désactivé temporairement — cause crash mobile
  // useEffect(() => {
  //   if (!userId) return
  //   const channel = supabase
  //     .channel('notifications-' + userId)
  //     .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload: any) => {
  //       const n = payload.new as any
  //       setNotifications((prev: any[]) => [n, ...prev])
  //       setUnreadCount((c: number) => c + 1)
  //     })
  //     .subscribe()
  //   return () => { supabase.removeChannel(channel) }
  // }, [userId])

  useEffect(() => {
    // Check LinkedIn connection status from URL param
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('linkedin') === 'already_used') {
        showToast(lang==='en'?'This LinkedIn account is already linked to another Ecrira account.':'Ce compte LinkedIn est déjà lié à un autre compte Ecrira.')
      } else if (params.get('linkedin') === 'success') {
        setLinkedinConnected(true)
        showToast(lang==='en'?'✓ LinkedIn connected!':'✓ LinkedIn connecté !')
        window.history.replaceState({}, '', '/')
      } else if (params.get('linkedin') === 'error') {
        showToast(lang==='en'?'LinkedIn connection error':'Erreur connexion LinkedIn')
        window.history.replaceState({}, '', '/')
      }
    }
  }, [])

  useEffect(() => {
    // Check if linkedin_token exists in profile
    if ((profile as any).linkedin_token) setLinkedinConnected(true)
    else setLinkedinConnected(false)
  }, [profile])

  // Fermer les pickers au clic extérieur
  useEffect(() => {
    const handler = () => { setShowPublishMenu(false); setShowScheduleMenu(false); setShowTimePicker(false); setShowNotifPanel(false); }
    if (showPublishMenu || showScheduleMenu || showTimePicker || showNotifPanel) document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [showPublishMenu, showScheduleMenu, showTimePicker, showNotifPanel])

  // Heure actuelle arrondie aux 15min suivantes
  const getNextQuarterHour = () => {
    const now = new Date()
    const minutes = now.getMinutes()
    const nextQuarter = Math.ceil((minutes + 1) / 15) * 15
    const h = (nextQuarter >= 60 ? now.getHours() + 1 : now.getHours()).toString().padStart(2, '0')
    const m = (nextQuarter % 60).toString().padStart(2, '0')
    return `${h}:${m}`
  }

  // Parse writing_style as JSON array of posts, fallback to legacy string
  const getRefPosts = (): string[] => {
    const ws = (profile as any).writing_style || ''
    if (!ws) return []
    try { return JSON.parse(ws) } catch { return ws ? [ws] : [] }
  }

  const addRefPost = async () => {
    if (!newRefPost.trim()) return
    const posts = getRefPosts()
    if (posts.length >= 5) { showToast('Maximum 5 posts référents'); return }
    const updated = [...posts, newRefPost.trim()]
    const updatedProfile = { ...profile, writing_style: JSON.stringify(updated) } as any
    setProfile(updatedProfile)
    setNewRefPost('')
    setShowAddRef(false)
    if (userId) {
      const { error } = await supabase.from('profiles').update({ writing_style: JSON.stringify(updated) }).eq('id', userId)
      if (!error) showToast('Post référent ajouté ✓')
      else showToast(T('toast_save_error'))
    }
  }

  const removeRefPost = async (idx: number) => {
    const posts = getRefPosts().filter((_: string, i: number) => i !== idx)
    const updatedProfile = { ...profile, writing_style: JSON.stringify(posts) } as any
    setProfile(updatedProfile)
    if (userId) {
      const { error } = await supabase.from('profiles').update({ writing_style: JSON.stringify(posts) }).eq('id', userId)
      if (!error) showToast('Post référent supprimé')
      else showToast(T('toast_delete_error'))
    }
  }

  const generateAiVisual = async () => {
    if (!postOutput.trim()) { showToast('Génère un post d\'abord'); return }
    const tabAtVisualStart = activeBatchTab
    setGeneratingAiVisual(true)
    if (batchTopics.length > 1) setGeneratingByTab(prev=>({...prev,[tabAtVisualStart]:true}))
    setAiVisualUrl('')
    try {
      const res = await authFetch('/api/generate-visual', {
        method: 'POST',
        body: JSON.stringify({
          postContent: postOutput,
          postTopic: visualCustomTitle || postTopic,
          profile,
          visualType,
          hideWatermark,
          isPro,
          customPoints: visualCustomPoints,
          showCompanyLogo: (profile as any).company_logo && !hideCompanyLogo ? true : false,
          companyLogo: (profile as any).company_logo || '',
        }),
      })
      const data = await res.json()
      if (data.svgContent) {
        const blob = new Blob([data.svgContent], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(blob)
        // Sauvegarder dans l'onglet qui a lancé la génération
        if (batchTopics.length > 1) {
          setBatchTabVisuals(prev => ({...prev, [tabAtVisualStart]: {svg: data.svgContent, url}}))
          // Mettre à jour l'affichage seulement si on est encore sur ce même onglet
          if (tabAtVisualStart === activeBatchTab) {
            setAiVisualUrl(url)
            setAiSvgContent(data.svgContent)
          }
        } else {
          setAiVisualUrl(url)
          setAiSvgContent(data.svgContent)
        }
        // Init editor with known values
        setSvgEditTitle(visualCustomTitle || postTopic || '')
        setSvgEditPoints(visualCustomPoints ? visualCustomPoints.split('\n').filter((p:string)=>p.trim()).slice(0,3) : [])
        setSvgEditAccent(profile?.brand_accent||'#3D52A0')
        setShowSvgEditor(false)
        showToast('Visuel généré ✓')
      } else showToast((lang==='en'?'Error: ':'Erreur : ')+(data.error||'unknown'))
    } catch { showToast(lang==='en'?'Network error':'Erreur réseau') }
    setGeneratingAiVisual(false)
    if (batchTopics.length > 1) setGeneratingByTab(prev=>({...prev,[tabAtVisualStart]:false}))
  }

  const completeOnboarding = async () => {
    if (userId) await supabase.from('profiles').update({ onboarding_done: true } as any).eq('id', userId)
    setOnboardingStep(3)
  }

  const finishOnboarding = () => {
    setShowOnboarding(false)
    showToast('Bienvenue sur Ecrira !')
  }

  const saveLang = async (l: string) => {
    setProfile(p => ({ ...p, lang: l }))
    if (userId) await supabase.from('profiles').update({ lang: l }).eq('id', userId)
  }


  const connectLinkedIn = () => {
    window.location.href = `/api/linkedin/auth?userId=${userId}`
  }

  // Darken a hex color by a percentage
  const darkenColor = (hex: string, pct: number) => {
    const h = hex.replace('#','')
    const r = Math.max(0, parseInt(h.slice(0,2),16) - Math.round(255*pct/100))
    const g = Math.max(0, parseInt(h.slice(2,4),16) - Math.round(255*pct/100))
    const b = Math.max(0, parseInt(h.slice(4,6),16) - Math.round(255*pct/100))
    return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('')
  }

  const improvePost = async () => {
    if (!improvementNote.trim() || !postOutput) return
    setImproving(true)
    try {
      const res = await authFetch('/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          topic: postTopic,
          format: postFormat,
          length: postLength,
          tone: postTone,
          profile,
          improvement: improvementNote,
          previousPost: postOutput,
          seed: Math.random().toString(36).substring(2),
        }),
      })
      const data = await res.json()
      if (data.content) {
        setPostOutput(data.content)
        try { localStorage.removeItem('ecrira_draft_topic') } catch {}
        // Extraire + suggérer des hashtags
        const existingTags = (data.content.match(/#[\w\u00C0-\u024F]+/g) || []).map((t:string)=>t)
        setSuggestedHashtags(existingTags.slice(0,5))
        setImprovementNote('')
        showToast('Post amélioré ✓')
      }
    } catch(e) {
      showToast(T('toast_improve_error'))
    } finally {
      setImproving(false)
    }
  }

  const handleVisualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { showToast('Fichier trop lourd (max 5MB)'); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      setCustomVisualBase64(result.split(',')[1])
      setCustomVisualName(file.name)
      // Reset AI visual
      setAiSvgContent('')
      showToast(T('visual_imported_label') + ' ✓')
    }
    reader.readAsDataURL(file)
  }

  // ── Drag & drop calendrier
  const handleDrop = async (targetDate: Date) => {
    if (!draggedPostId) return
    const post = scheduledPosts.find((p:any) => p.id === draggedPostId)
    if (!post) return
    const oldDate = new Date(post.scheduled_at)
    const newDate = new Date(targetDate)
    newDate.setHours(oldDate.getHours(), oldDate.getMinutes(), 0, 0)
    if (newDate.toDateString() === oldDate.toDateString()) return
    try {
      await authFetch('/api/schedule', {
        method: 'PUT',
        body: JSON.stringify({ id: post.id, content: post.content, scheduled_at: newDate.toISOString(), topic: post.topic, svg_content: post.svg_content }),
      })
      setScheduledPosts(prev => prev.map((p:any) => p.id === draggedPostId ? {...p, scheduled_at: newDate.toISOString()} : p).sort((a:any,b:any) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()))
      showToast(lang==='en'?'Post rescheduled ✓':'Post replanifié ✓')
    } catch { showToast(T('toast_save_error')) }
    setDraggedPostId(null)
  }

  const schedulePost = async () => {
    if (!postOutput.trim()) { showToast(T('toast_no_schedule')); return }
    if (!scheduleDateTime) { showToast(T('toast_pick_date')); return }
    if (!userId) return
    setScheduling(true)
    try {
      // SVG généré → brut ; PNG importé → base64 ; sinon null
      const visualToStore = scheduleWithVisual
        ? (aiSvgContent || customVisualBase64 || null)
        : null

      const res = await authFetch('/api/schedule', {
        method: 'POST',
        body: JSON.stringify({
          content: postOutput,
          topic: postTopic || T('sans_titre'),
          scheduled_at: new Date(scheduleDateTime).toISOString(),
          svg_content: visualToStore,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setScheduledPosts(prev => [...prev, data.post].sort((a,b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()))
        showToast(T('toast_post_scheduled'))
        setScheduleDateTime('')
        setShowDatePicker(false)
        setPostOutput('')
        setPage('apercu')
      } else showToast(data.error || T('toast_schedule_error'))
    } catch { showToast(lang==='en'?'Network error':'Erreur réseau') }
    setScheduling(false)
  }

  const cancelScheduled = async (id: string) => {
    await authFetch('/api/schedule', { method: 'DELETE', body: JSON.stringify({ id }) })
    setScheduledPosts(prev => prev.filter(p => p.id !== id))
    showToast(T('toast_post_cancelled'))
  }

  // Helpers calendrier
  const getPostsForDay = (day: Date) => scheduledPosts.filter(p => new Date(p.scheduled_at).toDateString() === day.toDateString())

  const getWeekDays = () => {
    const start = new Date(calDate)
    const day = start.getDay()
    const diff = day === 0 ? -6 : 1 - day
    start.setDate(start.getDate() + diff)
    return Array.from({length:7}, (_,i) => { const d = new Date(start); d.setDate(start.getDate()+i); return d })
  }

  const getMonthDays = () => {
    const year = calDate.getFullYear(), month = calDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month+1, 0)
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay()-1
    const days: (Date|null)[] = []
    for (let i=0; i<startDay; i++) days.push(null)
    for (let i=1; i<=lastDay.getDate(); i++) days.push(new Date(year,month,i))
    while (days.length % 7 !== 0) days.push(null)
    return days
  }

  const moveCalendar = (dir: number) => {
    const d = new Date(calDate)
    if (calView==='semaine') d.setDate(d.getDate()+dir*7)
    else if (calView==='mois') d.setMonth(d.getMonth()+dir)
    else d.setFullYear(d.getFullYear()+dir)
    setCalDate(d)
  }

  const getCalendarTitle = () => {
    if (calView==='semaine') {
      const days = getWeekDays()
      return `${days[0].getDate()} ${days[0].toLocaleDateString(lang==='fr'?'fr-FR':'en-GB',{month:'short'})} — ${days[6].getDate()} ${days[6].toLocaleDateString(lang==='fr'?'fr-FR':'en-GB',{month:'short',year:'numeric'})}`
    }
    if (calView==='mois') return calDate.toLocaleDateString(lang==='fr'?'fr-FR':'en-GB',{month:'long',year:'numeric'})
    return calDate.getFullYear().toString()
  }

  const publishPost = async (withImage?: boolean) => {
    if (!postOutput.trim()) { showToast(T('toast_no_publish')); return }
    if (!userId) { showToast('Non connecté'); return }
    setPublishing(true)
    try {
      let pngBase64: string | null = null

      // Conversion SVG → PNG côté serveur (resvg)
      if (withImage && aiSvgContent) {
        try {
          const svgRes = await authFetch('/api/svg-to-png', { method: 'POST', body: JSON.stringify({ svgContent: aiSvgContent }) })
          const svgData = await svgRes.json()
          pngBase64 = svgData.base64 || null
        } catch { pngBase64 = null }
      } else if (withImage && customVisualBase64) {
        pngBase64 = customVisualBase64
      }

      const res = await authFetch('/api/linkedin/publish-with-image', {
        method: 'POST',
        body: JSON.stringify({
          content: postOutput,
          pngBase64,
        }),
      })
      const data = await res.json()
      if (data.success) showToast(data.withImage ? '✓ Post + visuel publiés sur LinkedIn !' : '✓ Post publié sur LinkedIn !')
      else showToast(data.error || T('toast_publish_error'))
    } catch (err: any) { showToast('Erreur : ' + err.message) }
    setPublishing(false)
  }

  const fmtLabels: Record<string,string> = {educational:'Conseil',alert:'Alerte',opinion:'Opinion',story:'Story',list:'Liste'}
  const navItems = [
    { id:'apercu', label:T('nav_apercu'), icon:<GridIcon/> },
    { id:'idees', label:T('nav_idees'), icon:<BulbIcon/> },
    { id:'rediger', label:T('nav_rediger'), icon:<EditIcon/> },
    { id:'calendrier', label:T('nav_calendrier'), icon:<CalIcon/> },
    { id:'bibliotheque', label:T('nav_bibliotheque'), icon:<BookIcon/> },
    { id:'profil', label:T('nav_profil'), icon:<UserIcon/> },
  ]

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#FAF9F7',fontFamily:"'Inter',sans-serif"}}>
      <div style={{textAlign:'center' as const}}>
        <img src="/logo-ecrira-icon-bleu.png" alt="Ecrira" style={{width:60,height:'auto',margin:'0 auto 16px',display:'block'}} />
        <div style={{fontSize:13,color:'#6B7069'}}>{T('loading')}</div>
      </div>
    </div>
  )

  const ideasSection = (
    <>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
        <div>
          <div className="section-label" style={{marginBottom:2}}>{T('ideas_of_day')}</div>
          {ideasGeneratedAt && (
            <div style={{fontSize:11,color:'var(--text3)'}}>
              {lang==='en'?'Generated on':'Générées le'} {formatIdeasDate(ideasGeneratedAt)}
              {ideasRefreshCountdown !== null && ideasRefreshCountdown > 0 && (
                <span style={{marginLeft:8,color:'var(--indigo)'}}>{lang==='en'?'· Refresh in':'· Refresh dans'} {formatCountdown(ideasRefreshCountdown)}</span>
              )}
            </div>
          )}
        </div>
        <button className="btn btn-primary" onClick={generateIdeas} disabled={loadingIdeas}>
          {loadingIdeas ? <><span className="spinner"/> {T('generating')}</> : T('generate_ideas')}
        </button>
      </div>
      {loadingIdeas && <div style={{marginBottom:12}}><div className="strip"/></div>}
      {ideas.length === 0 && !loadingIdeas ? (
        <div className="card empty"><div className="empty-icon">✦</div><div className="empty-title">{T('ideas_empty_title')}</div><div className="empty-body">{T('ideas_empty_body')}</div></div>
      ) : (
        <>
          {selectedIdeaIds.size > 0 && (
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'rgba(61,82,160,0.06)',borderRadius:10,border:'1px solid rgba(61,82,160,0.15)',marginBottom:12}}>
              <span style={{fontSize:13,color:'var(--indigo)',fontWeight:500}}>{selectedIdeaIds.size} {lang==='en'?'idea(s) selected':'idée(s) sélectionnée(s)'}</span>
              <div style={{display:'flex',gap:8}}>
                <button className="btn btn-ghost" style={{fontSize:11}} onClick={()=>setSelectedIdeaIds(new Set())}>{lang==='en'?'Deselect all':'Tout désélectionner'}</button>
                <button className="btn btn-primary" style={{fontSize:12}} onClick={()=>{
                  const topics = ideas.filter((_,i)=>selectedIdeaIds.has(i)).map(idea=>idea.title)
                  setBatchTopics(topics)
                  setActiveBatchTab(0)
                  setBatchTabOutputs({})
                  setPostTopic(topics[0])
                  setPostOutput('')
                  setPostVariants([])
                  setSelectedIdeaIds(new Set())
                  setPage('rediger')
                }}>✦ {lang==='en'?`Open ${selectedIdeaIds.size} idea(s) in editor`:`Ouvrir ${selectedIdeaIds.size} idée(s) dans Rédiger`}</button>
              </div>
            </div>
          )}
          {ideas.map((idea, i) => (
            <div key={i} className="idea-card fade" style={{animationDelay:`${i*.06}s`,border:selectedIdeaIds.has(i)?'1px solid var(--indigo)':idea.recommended?'1px solid rgba(168,120,79,0.4)':undefined,background:selectedIdeaIds.has(i)?'rgba(61,82,160,0.04)':idea.recommended?'rgba(168,120,79,0.04)':undefined,opacity:usedIdeaIds.has(idea.title)?0.55:1,position:'relative' as const}}>
              {usedIdeaIds.has(idea.title)&&<div style={{position:'absolute' as const,top:10,right:10,fontSize:9,fontWeight:600,padding:'2px 7px',borderRadius:20,background:'var(--sand)',color:'var(--text3)',letterSpacing:'0.04em',textTransform:'uppercase' as const}}>{lang==='en'?'Used':'Développée'}</div>}
              <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                <input type="checkbox" checked={selectedIdeaIds.has(i)} onChange={e=>{const s=new Set(selectedIdeaIds);e.target.checked?s.add(i):s.delete(i);setSelectedIdeaIds(s)}} style={{marginTop:3,accentColor:'var(--indigo)',width:14,height:14,flexShrink:0,cursor:'pointer'}}/>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                    <span className="idea-tag">{idea.topic}</span>
                    {idea.recommended && <span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:20,background:'rgba(168,120,79,0.12)',color:'var(--indigo)',border:'1px solid rgba(168,120,79,0.25)'}}>{T('recommended')}</span>}
                  </div>
                  <div className="idea-title">{idea.title}</div>
                  <div className="idea-hook">{idea.hook}</div>
                  <div className="idea-actions">
                    <button className="btn btn-primary" style={{fontSize:12,padding:'7px 13px'}} onClick={()=>{setPostTopic(idea.title);setPostOutput('');setPage('rediger')}}>{T('develop')}</button>
                    <button className="btn btn-ghost" style={{fontSize:11}} onClick={()=>saveIdea(idea)}>{savedIdeas.some(s=>s.title===idea.title)?'★':'☆'} {lang==='en'?'Save':'Sauvegarder'}</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </>
  )

  const trialBanner = plan === 'trial' && trialDaysLeft <= 3 ? (
    <div style={{position:'fixed' as const,bottom:0,left:0,right:0,zIndex:200,background:'#D9A840',color:'white',padding:'10px 20px',display:'flex',alignItems:'center',justifyContent:'center',gap:16,fontSize:13,fontWeight:500}}>
      <span>⏰ {lang==='en'?`Trial ends in ${trialDaysLeft} days`:(`Essai se termine dans ${trialDaysLeft} jours`)}</span>
      <button onClick={()=>window.location.href='/pricing'} style={{background:'white',color:'#D9A840',border:'none',padding:'5px 14px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer'}}>{lang==='en'?'Upgrade →':'Passer au Pro →'}</button>
    </div>
  ) : null

  return (
    <>
      {trialBanner}
      <Head><title>Ecrira</title><link rel="icon" href="/favicon-32-bleu.png" type="image/png"/><script defer data-domain="ecrira.com" src="https://plausible.io/js/pa-JoffvncprLIz4FmqjAnDr.js"></script><link rel="apple-touch-icon" href="/logo-ecrira-icon-bleu.png"/><meta name="theme-color" content="#3D52A0"/></Head>
      <div className="app">
        {/* ── TOP HEADER ── */}
        <header className="app-header">
          <div className="app-header-left" onClick={()=>setPage('apercu')} style={{cursor:'pointer'}}>
            <img src="/logo-ecrira-icon-bleu.png" alt="Ecrira" style={{height:32,width:'auto'}} />
            <div className="app-header-title">
              <span className="app-header-brand">ECRIRA</span>
              <span className="app-header-page">{
                page==='apercu'?'Tableau de bord':
                page==='idees'?'Inspiration du jour':
                page==='rediger'?'Atelier de rédaction':
                page==='calendrier'?'Planning éditorial':
                page==='bibliotheque'?'Vos archives':
                page==='profil'?'Mon profil':''
              }</span>
            </div>
          </div>
          <div className="app-header-right">
            <button className="app-header-btn" onClick={()=>{}} title="Rechercher">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <span>Rechercher</span>
              <kbd>⌘K</kbd>
            </button>
            <button className="app-header-icon" onClick={(e)=>{e.stopPropagation();setShowNotifPanel(v=>!v);if(unreadCount>0)markAllRead()}} title="Notifications" style={{position:'relative'}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {unreadCount>0&&<span className="notif-badge">{unreadCount>9?'9+':unreadCount}</span>}
            </button>
            {showNotifPanel&&(
              <div className="notif-panel" onClick={e=>e.stopPropagation()}>
                <div style={{padding:'12px 14px',borderBottom:'1px solid var(--border)',fontSize:12,fontWeight:600,color:'var(--text1)'}}>{T('notifications')}</div>
                {notifications.length===0?(
                  <div style={{padding:24,textAlign:'center' as const,fontSize:12,color:'var(--text3)'}}>{T('no_notifications')}</div>
                ):notifications.map((n:any)=>(
                  <div key={n.id} style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',background:n.read?'transparent':'rgba(61,82,160,0.04)'}}>
                    <div style={{fontSize:12,fontWeight:n.read?400:600,color:'var(--text1)',marginBottom:2}}>{n.title}</div>
                    {n.body&&<div style={{fontSize:11,color:'var(--text2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{n.body.substring(0,60)}{n.body.length>60?'…':''}</div>}
                    <div style={{fontSize:10,color:'var(--text3)',marginTop:3}}>{new Date(n.created_at).toLocaleDateString(lang==='fr'?'fr-FR':'en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{position:'relative' as const}}>
              <div className="app-header-avatar" onClick={(e)=>{e.stopPropagation();setShowAvatarMenu(v=>!v)}} style={{cursor:'pointer'}}>
                {(profile as any).linkedin_picture?<img src={(profile as any).linkedin_picture} alt="" style={{width:'100%',height:'100%',objectFit:'cover' as const,borderRadius:'50%'}}/>:profile.name?profile.name.slice(0,2).toUpperCase():'??'}
              </div>
              {(isPro||plan==='trial')&&<span style={{position:'absolute' as const,bottom:-4,right:-4,background:plan==='trial'?'#D9A840':'var(--indigo)',color:'white',fontSize:7,fontWeight:700,padding:'1px 4px',borderRadius:6,letterSpacing:'0.04em',border:'1.5px solid var(--ivory)',zIndex:1}}>{plan==='trial'?`${trialDaysLeft}j`:'PRO'}</span>}

              {showAvatarMenu&&(
                <div onClick={e=>e.stopPropagation()} style={{position:'absolute' as const,top:48,right:0,width:220,background:'var(--white)',border:'0.5px solid var(--border)',borderRadius:14,boxShadow:'0 8px 32px rgba(0,0,0,0.12)',zIndex:300,overflow:'hidden'}}>
                  <div style={{padding:'12px 14px',borderBottom:'1px solid var(--border)'}}>
                    <div style={{fontSize:12,fontWeight:600,color:'var(--text1)'}}>{profile.name||'Mon compte'}</div>
                    <div style={{fontSize:11,color:'var(--text3)'}}>{profile.role?`${profile.role} · ${profile.company}`:''}</div>
                  </div>
                  {[
                    {label:lang==='en'?'My profile':'Mon profil',action:()=>{setPage('profil');setShowAvatarMenu(false)},icon:'👤'},
                    {label:lang==='en'?'Visuals':'Visuels',action:()=>{setPage('visuels');setShowAvatarMenu(false)},icon:''},
                  ].map((item,i)=>(
                    <button key={i} onClick={item.action} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'10px 14px',border:'none',background:'transparent',cursor:'pointer',fontSize:12,color:'var(--text1)',textAlign:'left' as const,fontFamily:'inherit',borderBottom:'0.5px solid var(--border)'}}>
                      <span>{item.icon}</span>{item.label}
                    </button>
                  ))}
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderBottom:'0.5px solid var(--border)'}}>
                    <span style={{fontSize:12,color:'var(--text1)'}}>{lang==='en'?'Dark mode':'Mode sombre'}</span>
                    <div className={`toggle ${dark?'on':''}`} onClick={toggleDark}><div className="toggle-dot"/></div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderBottom:'0.5px solid var(--border)'}}>
                    <span style={{fontSize:12,color:'var(--text1)'}}>{lang==='en'?'Language':'Langue'}</span>
                    <div style={{display:'flex',gap:4}}>
                      {['fr','en'].map(l=>(
                        <button key={l} onClick={()=>saveLang(l)} style={{padding:'2px 8px',borderRadius:6,border:`1px solid ${(profile as any).lang===l?'var(--indigo)':'var(--border)'}`,background:(profile as any).lang===l?'var(--indigo)':'transparent',color:(profile as any).lang===l?'white':'var(--text3)',fontSize:10,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>
                          {l==='fr'?'🇫🇷 FR':'🇬🇧 EN'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:12,padding:'8px 14px',borderBottom:'0.5px solid var(--border)'}}>
                    <a href="/cgu" style={{fontSize:10,color:'var(--text3)',textDecoration:'none'}}>CGU</a>
                    <a href="/mentions-legales" style={{fontSize:10,color:'var(--text3)',textDecoration:'none'}}>{lang==='en'?'Legal':'Mentions légales'}</a>
                    <a href="https://www.linkedin.com/company/ecrira/" target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:'var(--text3)',textDecoration:'none'}}>LinkedIn</a>
                  </div>
                  <button onClick={()=>{signOut();setShowAvatarMenu(false)}} style={{width:'100%',padding:'10px 14px',border:'none',background:'transparent',cursor:'pointer',fontSize:12,color:'#c0392b',textAlign:'left' as const,fontFamily:'inherit'}}>
                    {lang==='en'?'Sign out':'Se déconnecter'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="main">
          {/* Badge plan — haut droite sur toutes les pages */}

          {/* APERÇU */}
          <div className={`page ${page==='apercu'?'active':''}`}>
            {/* Header */}
            <div className="eyebrow">{T('dashboard')}</div>
            <div className="page-title" style={{fontFamily:"Georgia,'Times New Roman',serif",fontSize:36,fontWeight:400,marginBottom:4}}>{T('hello')}{profile.name?`, ${profile.name}`:''}.</div>
            <div className="copper-rule"/>
            <div className="page-sub" style={{marginBottom:24}}>{new Date().toLocaleDateString(lang==='fr'?'fr-FR':'en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>

            {/* Stats */}
            <div className="stats-grid" style={{marginBottom:28}}>
              <div className="stat-card">
                <div className="stat-icon" style={{background:'rgba(61,82,160,0.08)'}}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#3D52A0" strokeWidth="1.5" width="16" height="16"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z"/></svg>
                </div>
                <div className="stat-label">{T('saved_posts')}</div>
                <div className="stat-value" style={{fontFamily:"Georgia,serif"}}>{savedPosts.length}</div>
                <div className="stat-note">{T('in_library')}</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{background:'rgba(217,200,163,0.2)'}}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#B7956A" strokeWidth="1.5" width="16" height="16"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/></svg>
                </div>
                <div className="stat-label">{T('generated_posts')}</div>
                <div className="stat-value" style={{fontFamily:"Georgia,serif"}}>{generatedCount}</div>
                <div className="stat-note">{generatedCount===0?(lang==='en'?'Generate your first!':'Génère ton premier !'):T('in_total')}</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{background:'rgba(61,82,160,0.06)'}}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#3D52A0" strokeWidth="1.5" width="16" height="16"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                </div>
                <div className="stat-label">{T('active_sector')}</div>
                <div className="stat-value" style={{fontSize:18,paddingTop:4,fontFamily:"Georgia,serif"}}>{profile.sector?.split(' ')[0]||'Cyber'}</div>
                <div className="stat-note">{profile.company||T('my_company')}</div>
              </div>
            </div>

            {/* Checklist premiers pas */}
            {(!profile.role || !linkedinConnected || generatedCount===0) && !(!!profile.role && linkedinConnected && generatedCount>0) && (
              <div style={{background:'rgba(61,82,160,0.04)',border:'0.5px solid rgba(61,82,160,0.15)',borderRadius:12,padding:'14px 18px',marginBottom:20}}>
                <div style={{fontSize:10,fontWeight:600,color:'var(--indigo)',textTransform:'uppercase' as const,letterSpacing:'0.1em',marginBottom:10}}>{lang==='en'?'Getting started':'Premiers pas'}</div>
                {[
                  {done:!!profile.role, label:lang==='en'?'Complete your profile':'Compléter ton profil', action:()=>setPage('profil'), cta:lang==='en'?'Go →':'Aller →'},
                  {done:linkedinConnected, label:lang==='en'?'Connect LinkedIn':'Connecter LinkedIn', action:connectLinkedIn, cta:lang==='en'?'Connect':'Connecter'},
                  {done:generatedCount>0, label:lang==='en'?'Generate your first post':'Générer ton premier post', action:()=>setPage('rediger'), cta:lang==='en'?'Generate':'Générer'},
                ].map((step,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',borderBottom:i<2?'0.5px solid rgba(61,82,160,0.1)':'none'}}>
                    <div style={{width:20,height:20,borderRadius:'50%',background:step.done?'var(--indigo)':'transparent',border:step.done?'none':'1.5px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      {step.done&&<svg viewBox="0 0 10 10" width="10" height="10"><path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
                    </div>
                    <span style={{flex:1,fontSize:12,color:step.done?'var(--text3)':'var(--text1)',textDecoration:step.done?'line-through':'none'}}>{step.label}</span>
                    {!step.done&&<button onClick={step.action} style={{fontSize:11,color:'var(--indigo)',fontWeight:500,background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>{step.cta}</button>}
                  </div>
                ))}
              </div>
            )}

            {/* Idées du jour — 2 recommandées */}
            <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:4}}>
              <div style={{fontSize:12,fontWeight:600,color:'var(--indigo)',letterSpacing:'0.1em',textTransform:'uppercase' as const,cursor:'pointer'}} onClick={()=>setPage('idees')}>Idées du jour →</div>
              <span style={{fontSize:10,color:'var(--indigo)',cursor:'pointer',fontWeight:500}} onClick={()=>setPage('idees')}>{lang==='en'?'See all ideas →':'Voir toutes les idées →'}</span>
            </div>
            {ideasGeneratedAt&&<div style={{fontSize:10,color:'var(--text3)',marginBottom:12}}>{lang==='en'?'Generated':'Générées'} {ideasGeneratedAt.toLocaleDateString(lang==='fr'?'fr-FR':'en-GB',{day:'numeric',month:'long'})}{lang==='en'?' at ':' à '}{ideasGeneratedAt.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>}
            {ideas.filter(i=>i.recommended).length===0&&(
              <div style={{background:'var(--white)',border:'0.5px solid var(--border)',borderRadius:12,padding:'20px',textAlign:'center' as const,marginBottom:20}}>
                <div style={{fontSize:12,color:'var(--text3)',marginBottom:10}}>{lang==='en'?'No ideas yet — generate your first batch!':'Pas encore d\'idées — génère ton premier batch !'}</div>
                <button className="btn btn-primary" style={{fontSize:12}} onClick={()=>setPage('idees')}>{lang==='en'?'Generate ideas':'Générer les idées'}</button>
              </div>
            )}
            {ideas.filter(i=>i.recommended).length>0&&(
              <div className='ideas-grid' style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
                {ideas.filter(i=>i.recommended).slice(0,2).map((idea,idx)=>(
                  <div key={idx} style={{background:'var(--white)',border:'0.5px solid var(--border)',borderRadius:12,padding:'14px 16px'}}>
                    <div style={{marginBottom:6}}>
                      <span style={{fontSize:9,fontWeight:600,color:'var(--indigo)',background:'rgba(61,82,160,0.08)',borderRadius:20,padding:'2px 8px',textTransform:'uppercase' as const,letterSpacing:'0.06em'}}>{idea.topic}</span>
                      <span style={{marginLeft:4,fontSize:9,fontWeight:600,color:'#B7956A',background:'rgba(217,200,163,0.3)',borderRadius:20,padding:'2px 7px'}}>★ Recommandé</span>
                    </div>
                    <div style={{fontSize:15,fontWeight:500,color:'var(--text1)',lineHeight:1.4,marginBottom:6}}>{idea.title}</div>
                    <div style={{fontSize:13,color:'var(--text2)',lineHeight:1.5,marginBottom:12}}>{idea.hook}</div>
                    <div style={{display:'flex',gap:6}}>
                      <button className="btn btn-primary" style={{fontSize:10,padding:'5px 12px'}} onClick={()=>{setPostTopic(idea.title);setPostOutput('');setPage('rediger')}}>{T('develop')}</button>
                      <button className="btn btn-ghost" style={{fontSize:10,padding:'5px 12px'}} onClick={async()=>{
                        const{data:u}=await supabase.auth.getUser()
                        if(!u?.user)return
                        await supabase.from('saved_ideas').insert({user_id:u.user.id,topic:idea.topic,title:idea.title,hook:idea.hook})
                      }}>☆ Sauvegarder</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Planning semaine */}
            <div style={{fontSize:10,fontWeight:600,color:'var(--indigo)',letterSpacing:'0.1em',textTransform:'uppercase' as const,marginBottom:8}}>{lang==='en'?'This week':'Cette semaine'}</div>
            <div style={{background:'var(--white)',border:'0.5px solid var(--border)',borderRadius:12,padding:'16px 20px',marginBottom:20}}>
              {(()=>{
                const today=new Date()
                const dow=today.getDay()===0?6:today.getDay()-1
                const monday=new Date(today); monday.setDate(today.getDate()-dow)
                const days=['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']
                return(
                  <div className="week-grid-dash" style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:8}}>
                    {days.map((d,i)=>{
                      const date=new Date(monday); date.setDate(monday.getDate()+i)
                      const isToday=date.toDateString()===today.toDateString()
                      const dayPosts=scheduledPosts.filter(p=>{
                        const pd=new Date(p.scheduled_at)
                        return pd.toDateString()===date.toDateString()
                      })
                      return(
                        <div key={i} style={{display:'flex',flexDirection:'column' as const,alignItems:'center',gap:6}}>
                          <span style={{fontSize:9,color:'var(--text3)',fontWeight:500,textTransform:'uppercase' as const,letterSpacing:'0.05em'}}>{d}</span>
                          <div style={{width:28,height:28,borderRadius:'50%',background:isToday?'var(--indigo)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:500,color:isToday?'white':'var(--text2)'}}>{date.getDate()}</div>
                          <div style={{width:'100%',minHeight:54,borderRadius:8,border:dayPosts.length>0?'0.5px solid rgba(61,82,160,0.2)':'0.5px dashed var(--border)',background:dayPosts.length>0?'rgba(61,82,160,0.06)':'transparent',padding:dayPosts.length>0?'6px 6px':'0',display:'flex',alignItems:dayPosts.length>0?'flex-start':'center',justifyContent:'center'}}>
                            {dayPosts.length>0?(
                              <div>
                                <div style={{fontSize:8,color:'#B7956A',fontWeight:600,marginBottom:2}}>{new Date(dayPosts[0].scheduled_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
                                <div style={{fontSize:11,color:'var(--text1)',lineHeight:1.3,fontWeight:500,display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical' as const,overflow:'hidden'}}>{dayPosts[0].topic||dayPosts[0].content?.slice(0,40)}</div>
                              </div>
                            ):(
                              <span style={{fontSize:14,color:'var(--border)'}}>+</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
              {scheduledPosts.filter(p=>{const today=new Date();const dow=today.getDay()===0?6:today.getDay()-1;const mon=new Date(today);mon.setDate(today.getDate()-dow);const sun=new Date(mon);sun.setDate(mon.getDate()+6);const pd=new Date(p.scheduled_at);return pd>=mon&&pd<=sun}).length===0&&(
                <div style={{textAlign:'center' as const,marginTop:10,fontSize:10,color:'var(--text3)'}}>{lang==='en'?'No posts scheduled this week':'Aucun post planifié cette semaine'} · <span style={{color:'var(--indigo)',cursor:'pointer'}} onClick={()=>setPage('calendrier')}>{lang==='en'?'Schedule →':'Planifier →'}</span></div>
              )}
            </div>

            {/* Conseil du jour */}
            <div style={{fontSize:10,fontWeight:600,color:'var(--indigo)',letterSpacing:'0.1em',textTransform:'uppercase' as const,marginBottom:8}}>{lang==='en'?'Tip of the day':'Conseil du jour'}</div>
            <div style={{background:'var(--white)',border:'0.5px solid var(--border)',borderRadius:12,padding:'16px 20px',marginBottom:20}}>
              <div style={{fontSize:9,fontWeight:600,color:'#B7956A',letterSpacing:'0.1em',textTransform:'uppercase' as const,marginBottom:8}}>✦ Personal branding</div>
              <div style={{fontSize:13,color:'var(--text1)',lineHeight:1.6,fontStyle:'italic'}}>{["Un bon hook LinkedIn commence par une statistique surprenante ou une affirmation contre-intuitive. Les 3 premières lignes décident de tout.","Postez le mardi ou mercredi matin entre 8h et 10h. L'algorithme LinkedIn favorise les posts publiés en début de semaine.","Un post sans question finale perd 40% d'engagement. Terminez toujours par une question ouverte à votre audience.","La règle des 3 lignes : votre hook doit tenir en 3 lignes maximum avant le bouton 'voir plus'. Au-delà, vous perdez le lecteur.","Les posts avec une image personnelle génèrent 3x plus d'impressions que les posts texte seuls.","Répondez à chaque commentaire dans les 60 premières minutes. C'est la fenêtre où l'algorithme décide de booster votre post.","Un post qui raconte un échec personnel performe souvent mieux qu'un post sur un succès. L'authenticité crée la connexion."][new Date().getDay()]}</div>
            </div>
          </div>

          {/* IDÉES */}
          <div className={`page ${page==='idees'?'active':''}`}>
            <div className="eyebrow">{T('inspiration')}</div><div className="page-title">{T('ideas_of_day')}</div><div className="copper-rule"/>
            <div className="page-sub">{T('ideas_sub')}</div>
            {ideasSection}
          </div>

          {/* RÉDIGER */}
          <div className={`page ${page==='rediger'?'active':''}`} style={{maxWidth:'100%',padding:'20px 24px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap' as const,gap:8}}>
              <div>
                <div className="eyebrow">{T('creation')}</div>
                <div className="page-title" style={{fontSize:22,marginBottom:0}}>{T('write_post')}</div>
              </div>
            </div>
            {/* ONGLETS BATCH — AU-DESSUS DE LA GRILLE */}
            {batchTopics.length > 1 && (
              <div style={{marginBottom:12,display:'flex',gap:6,flexWrap:'wrap' as const,padding:'10px 14px',background:'rgba(61,82,160,0.04)',borderRadius:10,border:'1px solid rgba(61,82,160,0.12)'}}>
                <span style={{fontSize:11,fontWeight:600,color:'var(--text3)',alignSelf:'center',marginRight:4,flexShrink:0}}>{lang==='en'?'Ideas:':'Idées :'}</span>
                {batchTopics.map((topic,i)=>(
                  <button key={i} onClick={()=>{
                    // Sauvegarder config + output de l'onglet actuel
                    setBatchTabOutputs(prev=>({...prev,[activeBatchTab]:postOutput}))
                    setBatchTabConfigs(prev=>({...prev,[activeBatchTab]:{format:postFormat,length:postLength,tone:postTone}}))
                    setBatchTabVisuals(prev=>({...prev,[activeBatchTab]:{svg:aiSvgContent,url:aiVisualUrl}}))
                    // Restaurer config + output + visuel de l'onglet cible
                    const savedConfig = batchTabConfigs[i]
                    if (savedConfig) { setPostFormat(savedConfig.format); setPostLength(savedConfig.length); setPostTone(savedConfig.tone) }
                    const savedVisual = batchTabVisuals[i]
                    setAiSvgContent(savedVisual?.svg||'')
                    setAiVisualUrl(savedVisual?.url||'')
                    setActiveBatchTab(i)
                    setPostTopic(batchTopics[i])
                    setPostOutput(batchTabOutputs[i]||'')
                    setPostVariants([])
                    setAiSvgContent(batchTabVisuals[i]?.svg||'')
                    setAiVisualUrl(batchTabVisuals[i]?.url||'')
                  }} style={{fontSize:11,padding:'4px 12px',borderRadius:8,border:`1px solid ${activeBatchTab===i?'var(--indigo)':'var(--border)'}`,background:activeBatchTab===i?'rgba(61,82,160,0.08)':'white',color:activeBatchTab===i?'var(--indigo)':'var(--text2)',cursor:'pointer',fontWeight:activeBatchTab===i?600:400,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>
                    {i+1}. {topic.length > 22 ? topic.slice(0,22)+'…' : topic}
                    {batchTabOutputs[i] && <span style={{marginLeft:4,fontSize:9,color:'#27ae60'}}>✓</span>}
                  </button>
                ))}
                <button onClick={()=>{setBatchTopics([]);setBatchTabOutputs({});setBatchTabConfigs({});setBatchTabVisuals({});setActiveBatchTab(0);setAiSvgContent('');setAiVisualUrl('')}} style={{fontSize:10,padding:'4px 8px',borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'var(--text3)',cursor:'pointer',fontFamily:'inherit',marginLeft:'auto'}}>✕ {lang==='en'?'Close':'Fermer'}</button>
              </div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'340px 1fr',gap:16,alignItems:'start'}} className="rediger-grid">
              {/* LEFT: Formulaire */}
              <div className="card" style={{padding:'16px 18px'}}>
                <div className="form-group" style={{marginBottom:10}}>
                  <label className="form-label">{T('subject_label')}</label>
                  <textarea className="post-editor" style={{minHeight:70,fontSize:13}} value={postTopic} onChange={e=>setPostTopicWithSave(e.target.value)} placeholder={T('subject_placeholder')}/>
                </div>
                <div className="form-group" style={{marginBottom:10}}>
                    <label className="form-label">{T('format_label')}</label>
                    <div style={{display:'flex',flexWrap:'wrap' as const,gap:4,marginTop:4}}>
                      {([
                        {value:'educational',label:lang==='en'?'Advice':'Conseil'},
                        {value:'alert',label:lang==='en'?'Alert':'Alerte'},
                        {value:'opinion',label:lang==='en'?'Opinion':'Opinion'},
                        {value:'story',label:lang==='en'?'Story':'Storytelling'},
                        {value:'list',label:lang==='en'?'List':'Liste'},
                      ]).map(f=>(
                        <span key={f.value} className={`chip ${postFormat===f.value?'on':''}`} onClick={()=>setPostFormat(f.value)} style={{fontSize:11,padding:'3px 10px',cursor:'pointer'}}>{f.label}</span>
                      ))}
                    </div>
                  </div>
                <div className="form-group" style={{marginBottom:10}}>
                    <label className="form-label">{T('length_label')}</label>
                    <div style={{display:'flex',gap:4,marginTop:4}}>
                      {([
                        {value:'short',label:lang==='en'?'Short':'Court'},
                        {value:'medium',label:lang==='en'?'Medium':'Moyen'},
                        {value:'long',label:lang==='en'?'Long':'Long'},
                      ]).map(l=>(
                        <span key={l.value} className={`chip ${postLength===l.value?'on':''}`} onClick={()=>setPostLength(l.value)} style={{fontSize:11,padding:'3px 10px',cursor:'pointer'}}>{l.label}</span>
                      ))}
                    </div>
                  </div>
                <div className="form-group" style={{marginBottom:12}}>
                  <label className="form-label">{T('tone_label')}</label>
                  <div style={{display:'flex',flexWrap:'wrap' as const,gap:4,marginTop:4}}>
                    {['expert','accessible','direct','storyteller'].map(t=>(<span key={t} className={`chip ${postTone===t?'on':''}`} onClick={()=>setPostTone(t)} style={{fontSize:11,padding:'3px 10px'}}>{t.charAt(0).toUpperCase()+t.slice(1)}</span>))}
                  </div>
                </div>
                <div style={{display:'flex',gap:6}}><button className="btn btn-primary" style={{flex:1,justifyContent:'center'}} onClick={()=>{ if(!canGenerate){ setShowUpgradeModal(true); return; } generatePost(); }} disabled={loadingPost||!canGenerate}>{loadingPost?<><span className="spinner"/> {T('generating')}</>:canGenerate?`✦ Générer le post${!isPro?' ('+Math.max(0,5-postsThisMonth)+T('posts_remaining')+')':''}`:T('limit_reached')}</button>{isPro&&<button className="btn btn-secondary" style={{fontSize:12,padding:'0 12px',flexShrink:0}} onClick={()=>{ if(!canGenerate){setShowUpgradeModal(true);return;} generate3Variants(); }} disabled={loadingPost}>×3</button>}</div>
              </div>

              {/* RIGHT: Résultat */}
              <div className="card" style={{padding:'16px 18px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                  <div className="section-label" style={{marginBottom:0}}>{T('result')}</div>
                  <div style={{display:'flex',gap:6}}>
                    <button className="btn btn-ghost" style={{fontSize:11,opacity:postOutput?1:0.4}} onClick={savePost} disabled={!postOutput}>{T('save')}</button>
                    <button className="btn btn-ghost" style={{fontSize:11,opacity:postOutput?1:0.4}} onClick={()=>postOutput&&copyText(postOutput)} disabled={!postOutput}>{T('copy_btn')}</button>
                  </div>
                </div>
                {(batchTopics.length>1?loadingByTab[activeBatchTab]:loadingPost)&&<div style={{marginBottom:10}}><div className="strip"/></div>}
                <div style={{position:'relative'}}>
                <textarea className="post-editor" style={{minHeight:260}} value={postOutput} onChange={e=>setPostOutput(e.target.value.slice(0,3000))} placeholder={T('post_placeholder')} maxLength={3000}/>
                <div style={{position:'absolute',bottom:8,right:10,fontSize:10,color:postOutput.length>2800?'#c0392b':'var(--text3)',fontFamily:'monospace',pointerEvents:'none'}}>{postOutput.length}/3000</div>
              </div>
                {postVariants.length > 1 && (
                  <div style={{display:'flex',gap:6,marginBottom:6}}>
                    {postVariants.map((_,i)=>(<button key={i} onClick={()=>{setActiveVariant(i);setPostOutput(postVariants[i])}} style={{fontSize:11,padding:'4px 12px',borderRadius:8,border:`1px solid ${activeVariant===i?'var(--indigo)':'var(--border)'}`,background:activeVariant===i?'rgba(61,82,160,0.08)':'transparent',color:activeVariant===i?'var(--indigo)':'var(--text2)',cursor:'pointer',fontWeight:activeVariant===i?600:400}}>Post {i+1}</button>))}
                  </div>
                )}
                {/* Hashtags suggérés */}
                {suggestedHashtags.length > 0 && (
                  <div style={{marginTop:6,marginBottom:2,display:'flex',flexWrap:'wrap' as const,gap:5,alignItems:'center'}}>
                    <span style={{fontSize:11,color:'var(--text3)',flexShrink:0}}>{lang==='en'?'Hashtags:':'Hashtags :'}</span>
                    {suggestedHashtags.map((tag,i)=>(
                      <button key={i} onClick={()=>{
                        if(!postOutput.includes(tag)) setPostOutput(p=>p+'\n'+tag)
                      }} style={{fontSize:11,padding:'2px 8px',borderRadius:20,border:'1px solid rgba(61,82,160,0.3)',background:'rgba(61,82,160,0.06)',color:'var(--indigo)',cursor:'pointer',fontFamily:'inherit'}}>
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
                {/* Toggle aperçu LinkedIn */}
                {postOutput && (
                  <div style={{marginTop:6,marginBottom:2,display:'flex',justifyContent:'flex-end'}}>
                    <button
                      onClick={()=>{setShowPreviewModal(true);setPreviewExpanded(false)}}
                      style={{fontSize:11,color:'var(--indigo)',background:'none',border:'1px solid rgba(61,82,160,0.3)',borderRadius:8,padding:'4px 10px',cursor:'pointer',display:'flex',alignItems:'center',gap:4}}
                    >
                      {'👁 ' + T('linkedin_preview')}
                    </button>
                  </div>
                )}

                {/* Zone amélioration post */}
                {postOutput && (
                  <div style={{marginTop:8,border:'1px solid var(--border)',borderRadius:12,overflow:'hidden',background:'white'}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,padding:'8px 12px',borderBottom:'1px solid var(--border)',background:'rgba(61,82,160,0.04)'}}>
                      <span style={{fontSize:11,fontWeight:600,color:'var(--indigo)'}}>{T('improve_post')}</span>
                    </div>
                    <div style={{padding:'10px 12px',display:'flex',gap:8,alignItems:'flex-end'}}>
                      <textarea
                        value={improvementNote}
                        onChange={e=>setImprovementNote(e.target.value)}
                        placeholder={T('improve_placeholder')}
                        rows={2}
                        style={{flex:1,fontSize:12,padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',outline:'none',resize:'none' as const,fontFamily:'inherit',color:'var(--text1)',background:'var(--bg)',lineHeight:1.4}}
                      />
                      <button
                        className="btn btn-primary"
                        onClick={improvePost}
                        disabled={improving||!improvementNote.trim()}
                        style={{fontSize:11,padding:'7px 12px',background:'var(--indigo)',flexShrink:0,borderRadius:8}}
                      >
                        {improving?<><span className="spinner" style={{borderTopColor:'white'}}/>...</>:T('apply_arrow')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Action bar — always visible */}
                <div style={{marginTop:16,display:'flex',flexDirection:'column' as const,gap:10}}>

                  {/* Import visuel custom */}
                  <label style={{display:'flex',alignItems:'center',gap:6,padding:'9px 14px',borderRadius:10,border:'1px solid var(--border)',background:customVisualBase64?'var(--indigo)':'white',cursor:'pointer',fontSize:12,fontWeight:500,color:customVisualBase64?'white':'var(--text2)',justifyContent:'center'}}>
                    <input type="file" accept="image/png,image/jpeg,image/svg+xml" style={{display:'none'}} onChange={handleVisualUpload}/>
                    {customVisualBase64 ? `✓ ${customVisualName||T('visual_imported_label')}` : T('import_visual')}
                    {customVisualBase64 && <span onClick={(e)=>{e.preventDefault();e.stopPropagation();setCustomVisualBase64(null);setCustomVisualName('')}} style={{marginLeft:6,background:'rgba(255,255,255,0.3)',borderRadius:4,color:'white',cursor:'pointer',fontSize:10,padding:'1px 5px'}}>✕</span>}
                  </label>

                  {customVisualBase64 && (
                    <div style={{borderRadius:12,overflow:'hidden',border:'1px solid var(--border)',marginTop:4}}>
                      <img src={`data:image/png;base64,${customVisualBase64}`} style={{width:'100%',display:'block'}} alt={T('visual_imported_alt')}/>
                    </div>
                  )}

                  {/* Créer le visuel — config + bouton */}
                  <div style={{border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
                    {/* Toggle config */}
                    <div style={{display:'flex',gap:0}}>
                      <button className="btn btn-primary" style={{flex:1,fontSize:12,justifyContent:'center',background:'linear-gradient(135deg,#3D52A0,#B7C0B8)',opacity:postOutput?1:0.4,borderRadius:0}} onClick={()=>{ if(!isPro){ setShowUpgradeModal(true); return; } generateAiVisual(); }} disabled={!postOutput||(batchTopics.length>1?generatingByTab[activeBatchTab]:generatingAiVisual)}>
                        {(batchTopics.length>1?generatingByTab[activeBatchTab]:generatingAiVisual)?<><span className="spinner" style={{borderTopColor:'white'}}/>{T('generating_visual')}</>:T('create_visual')}
                      </button>
                      <button onClick={()=>setShowVisualConfig(v=>!v)} style={{padding:'0 12px',background:'var(--indigo)',border:'none',borderLeft:'1px solid rgba(255,255,255,0.2)',cursor:'pointer',color:'white',fontSize:16,opacity:postOutput?1:0.4}} disabled={!postOutput}>
                        {showVisualConfig?'▲':'▼'}
                      </button>
                    </div>

                    {/* Config panel */}
                    {showVisualConfig && (
                      <div style={{padding:14,background:'white',borderTop:'1px solid var(--border)',display:'flex',flexDirection:'column' as const,gap:10}}>

                        {/* Type de visuel */}
                        <div>
                          <div style={{fontSize:10,fontWeight:600,color:'var(--text3)',textTransform:'uppercase' as const,letterSpacing:'.05em',marginBottom:6}}>{T('visual_type_label')}</div>
                          <div style={{display:'flex',gap:5,flexWrap:'wrap' as const}}>
                            {[{id:'classique',label:'📰 Classique'},{id:'timeline',label:'🕓 Timeline'},{id:'stat',label:'📊 Stat'},{id:'citation',label:'💬 Citation'},{id:'liste',label:'📋 Liste'}].map(t=>(
                              <button key={t.id} onClick={()=>setVisualType(t.id)} style={{padding:'5px 10px',borderRadius:20,border:'1.5px solid',borderColor:visualType===t.id?'var(--indigo)':'var(--border)',background:visualType===t.id?'var(--indigo)':'transparent',color:visualType===t.id?'white':'var(--text2)',fontSize:11,fontWeight:500,cursor:'pointer'}}>
                                {t.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Titre personnalisé */}
                        <div>
                          <div style={{fontSize:10,color:'var(--text3)',marginBottom:4}}>{T('custom_title_label')}</div>
                          <input value={visualCustomTitle} onChange={e=>setVisualCustomTitle(e.target.value)} placeholder={T('custom_title_placeholder')} style={{width:'100%',fontSize:12,padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',outline:'none',boxSizing:'border-box' as const,color:'var(--text1)',background:'var(--bg)'}}/>
                        </div>

                        {/* Points personnalisés */}
                        <div>
                          <div style={{fontSize:10,color:'var(--text3)',marginBottom:4}}>{T('key_points_label')}</div>
                          <textarea value={visualCustomPoints} onChange={e=>setVisualCustomPoints(e.target.value)} placeholder={'Point 1\nPoint 2\nPoint 3'} rows={3} style={{width:'100%',fontSize:12,padding:'7px 10px',borderRadius:8,border:'1px solid var(--border)',outline:'none',resize:'vertical' as const,boxSizing:'border-box' as const,color:'var(--text1)',background:'var(--bg)',fontFamily:'inherit'}}/>
                        </div>

                        {/* Masquer mention Ecrira (Pro) */}
                        {isPro && (
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <input type="checkbox" id="hideWm" checked={hideWatermark} onChange={e=>setHideWatermark(e.target.checked)} style={{accentColor:'var(--indigo)',width:14,height:14}}/>
                            <label htmlFor="hideWm" style={{fontSize:11,color:'var(--text2)',cursor:'pointer'}}>Masquer la mention "ecrira.com"</label>
                          </div>
                        )}
                        {(profile as any).company_logo && (
                          <div style={{display:'flex',alignItems:'center',gap:8,marginTop:4}}>
                            <input type="checkbox" id="hideCompanyLogo" checked={hideCompanyLogo} onChange={e=>setHideCompanyLogo(e.target.checked)} style={{accentColor:'var(--indigo)',width:14,height:14}}/>
                            <label htmlFor="hideCompanyLogo" style={{fontSize:11,color:'var(--text2)',cursor:'pointer'}}>Masquer le logo entreprise</label>
                          </div>
                        )}
                        {!isPro && (
                          <div style={{fontSize:10,color:'var(--text3)',fontStyle:'italic' as const}}>{T('upgrade_watermark')}</div>
                        )}


                        {/* Bouton Régénérer */}
                        <button
                          className="btn btn-primary"
                          onClick={()=>{ setShowSvgEditor(false); generateAiVisual(); }}
                          disabled={batchTopics.length>1?generatingByTab[activeBatchTab]:generatingAiVisual}
                          style={{fontSize:12,justifyContent:'center',background:'var(--indigo)',borderRadius:8,marginTop:4}}
                        >
                          {generatingAiVisual?<><span className="spinner" style={{borderTopColor:'white'}}/>...</>:T('regenerate')}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Boutons Publier + Planifier */}
                  <div style={{display:'flex',gap:7}}>

                    {/* Publier maintenant dropdown */}
                    <div style={{position:'relative' as const,flex:1}}>
                      {linkedinConnected ? (
                        <>
                          <button className="btn" onClick={(e)=>{e.stopPropagation();setShowPublishMenu(m=>!m);setShowScheduleMenu(false);}} disabled={publishing||!postOutput} style={{width:'100%',background:'#0077B5',color:'white',justifyContent:'center',fontSize:12,borderRadius:10,padding:'9px 12px',border:'none',opacity:postOutput?1:0.5}}>
                            {publishing?<><span className="spinner" style={{borderTopColor:'white'}}/>Publication…</>:T('publish_btn')}
                          </button>
                          {showPublishMenu && (
                            <div style={{position:'absolute' as const,bottom:'100%',left:0,marginBottom:4,background:'var(--white)',border:'1px solid var(--border)',borderRadius:10,boxShadow:'0 4px 20px rgba(0,0,0,0.15)',zIndex:100,minWidth:'100%',overflow:'hidden'}}>
                              <button className="btn" onClick={()=>{publishPost(false);setShowPublishMenu(false);}} style={{width:'100%',padding:'10px 14px',fontSize:12,color:'var(--text1)',justifyContent:'flex-start',borderRadius:0,borderBottom:'1px solid var(--border)',background:'transparent'}}>
                                {T('text_only_option')}
                              </button>
                              <button className="btn" onClick={()=>{publishPost(true);setShowPublishMenu(false);}} disabled={!aiSvgContent} style={{width:'100%',padding:'10px 14px',fontSize:12,color:aiSvgContent?'var(--text1)':' var(--text3)',justifyContent:'flex-start',borderRadius:0,background:'transparent',cursor:(aiSvgContent||customVisualBase64)?'pointer':'not-allowed'}}>
                                {T('text_visual')}{(!aiSvgContent&&!customVisualBase64)?T('add_visual_hint'):''}
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <button className="btn btn-primary" style={{width:'100%',fontSize:12,justifyContent:'center',background:'#0077B5',borderRadius:10}} onClick={connectLinkedIn}>
                          {T('connect_linkedin')}
                        </button>
                      )}
                    </div>

                    {/* Planifier dropdown */}
                    <div style={{position:'relative' as const,flex:1}}>
                      <button className="btn" onClick={(e)=>{e.stopPropagation();setShowScheduleMenu(m=>!m);setShowPublishMenu(false);}} disabled={!postOutput} style={{width:'100%',background:'var(--indigo)',color:'white',justifyContent:'center',fontSize:12,borderRadius:10,padding:'9px 12px',border:'none',opacity:postOutput?1:0.5}}>
                        Planifier ▾
                      </button>
                      {showScheduleMenu && (
                        <div style={{position:'absolute' as const,bottom:'100%',left:0,marginBottom:4,background:'var(--white)',border:'1px solid var(--border)',borderRadius:10,boxShadow:'0 4px 20px rgba(0,0,0,0.15)',zIndex:100,minWidth:'100%',overflow:'hidden'}}>
                          <button className="btn" onClick={()=>{setScheduleWithVisual(false);setShowScheduleMenu(false);if(!scheduleDateTime){setScheduleDateTime(new Date().toISOString().split('T')[0]+'T'+getNextQuarterHour())}setShowDatePicker(true);}} style={{width:'100%',padding:'10px 14px',fontSize:12,color:'var(--text1)',justifyContent:'flex-start',borderRadius:0,borderBottom:'1px solid var(--border)',background:'transparent'}}>
                            {T('text_only_option')}
                          </button>
                          <button className="btn" onClick={()=>{setScheduleWithVisual(true);setShowScheduleMenu(false);if(!scheduleDateTime){setScheduleDateTime(new Date().toISOString().split('T')[0]+'T'+getNextQuarterHour())}setShowDatePicker(true);}} disabled={!aiSvgContent&&!customVisualBase64} style={{width:'100%',padding:'10px 14px',fontSize:12,color:(aiSvgContent||customVisualBase64)?'var(--text1)':'var(--text3)',justifyContent:'flex-start',borderRadius:0,background:'transparent',cursor:aiSvgContent?'pointer':'not-allowed'}}>
                            {T('text_visual')}{!aiSvgContent?T('create_visual_hint'):''}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Picker date/heure inline (visible après choix planifier) */}
                  {showDatePicker && (
                    <div style={{background:'var(--white)',border:'1px solid var(--border)',borderRadius:16,padding:16,boxShadow:'0 4px 20px rgba(0,0,0,0.1)'}}>
                      {/* Header mois */}
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                        <button className="btn btn-ghost" style={{padding:'4px 8px',fontSize:13}} onClick={()=>{const d=new Date(pickerMonth);d.setMonth(d.getMonth()-1);setPickerMonth(d);}}>←</button>
                        <span style={{fontSize:13,fontWeight:600,color:'var(--text1)',textTransform:'capitalize' as const}}>
                          {pickerMonth.toLocaleDateString(lang==='fr'?'fr-FR':'en-GB',{month:'long',year:'numeric'})}
                        </span>
                        <button className="btn btn-ghost" style={{padding:'4px 8px',fontSize:13}} onClick={()=>{const d=new Date(pickerMonth);d.setMonth(d.getMonth()+1);setPickerMonth(d);}}>→</button>
                      </div>
                      {/* Jours semaine */}
                      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',marginBottom:4}}>
                        {lang==='fr'?['L','M','M','J','V','S','D']:['M','T','W','T','F','S','S'].map((d,i)=>(
                          <div key={i} style={{textAlign:'center' as const,fontSize:10,fontWeight:600,color:'var(--text3)',padding:'2px 0'}}>{d}</div>
                        ))}
                      </div>
                      {/* Grille jours */}
                      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
                        {(()=>{
                          const year=pickerMonth.getFullYear(),month=pickerMonth.getMonth()
                          const firstDay=new Date(year,month,1)
                          const lastDay=new Date(year,month+1,0)
                          const startDay=firstDay.getDay()===0?6:firstDay.getDay()-1
                          const cells=[]
                          for(let i=0;i<startDay;i++) cells.push(<div key={`e${i}`}/>)
                          for(let d=1;d<=lastDay.getDate();d++){
                            const date=new Date(year,month,d)
                            const dateStr=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                            const selected=scheduleDateTime.split('T')[0]===dateStr
                            const isToday=date.toDateString()===new Date().toDateString()
                            const isPast=date<new Date(new Date().setHours(0,0,0,0))
                            cells.push(
                              <button key={d} onClick={()=>{if(!isPast){setScheduleDateTime(dateStr+'T'+(scheduleDateTime.split('T')[1]||getNextQuarterHour()))}}} style={{padding:'5px 0',borderRadius:8,border:'none',cursor:isPast?'not-allowed':'pointer',background:selected?'var(--indigo)':isToday?'rgba(61,82,160,0.1)':'transparent',color:isPast?'var(--text3)':selected?'white':'var(--text1)',fontSize:12,fontWeight:selected?600:400,opacity:isPast?0.4:1}}>
                                {d}
                              </button>
                            )
                          }
                          return cells
                        })()}
                      </div>
                      {/* Heure */}
                      <div style={{display:'flex',alignItems:'center',gap:8,marginTop:12,borderTop:'1px solid var(--border)',paddingTop:12}}>
                        <span style={{fontSize:11,color:'var(--text2)',flexShrink:0}}>{T('time_label')}</span>
                        <div style={{position:'relative' as const,flex:1}}>
                          <button className="btn btn-ghost" onClick={(e)=>{e.stopPropagation();setShowTimePicker(v=>!v);}} style={{fontSize:12,width:'100%',justifyContent:'center'}}>
                            {scheduleDateTime.split('T')[1]||getNextQuarterHour()}
                          </button>
                          {showTimePicker && (
                            <div style={{position:'absolute' as const,bottom:'100%',left:0,marginBottom:6,background:'var(--white)',border:'1px solid var(--border)',borderRadius:16,padding:12,boxShadow:'0 8px 32px rgba(0,0,0,0.12)',zIndex:150,width:160,maxHeight:220,overflowY:'auto' as const}} onClick={e=>e.stopPropagation()}>
                              {Array.from({length:24*4},(_,i)=>{
                                const h=Math.floor(i/4).toString().padStart(2,'0')
                                const m=(i%4*15).toString().padStart(2,'0')
                                const t=`${h}:${m}`
                                const selected=scheduleDateTime.split('T')[1]===t
                                return (
                                  <button key={t} onClick={()=>{setScheduleDateTime((scheduleDateTime.split('T')[0]||new Date().toISOString().split('T')[0])+'T'+t);setShowTimePicker(false);}} style={{display:'block',width:'100%',padding:'6px 12px',border:'none',borderRadius:8,cursor:'pointer',background:selected?'var(--indigo)':'transparent',color:selected?'white':'var(--text1)',fontSize:12,fontWeight:selected?600:400,textAlign:'left' as const}}>
                                    {t}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                        <button className="btn btn-primary" style={{background:'var(--indigo)',fontSize:12,flexShrink:0}} onClick={schedulePost} disabled={scheduling||!scheduleDateTime.split('T')[0]}>
                          {scheduling?<><span className="spinner" style={{borderTopColor:'white'}}/>...</>:T('schedule_arrow')}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Affichage visuel SVG généré */}
                  {aiSvgContent && (
                    <div style={{marginTop:16,borderRadius:16,overflow:'hidden',border:'1px solid var(--border)',background:'var(--sand)'}}>
                      {/* Toolbar */}
                      <div style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',display:'flex',flexDirection:'column' as const,gap:8}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                          <span style={{fontSize:12,fontWeight:500,color:'var(--text2)'}}>Visuel généré</span>
                          <button onClick={async()=>{
                            try {
                              const svgRes = await authFetch('/api/svg-to-png', { method:'POST', body:JSON.stringify({ svgContent: aiSvgContent }) })
                              const data = await svgRes.json()
                              if (data.base64) {
                                const a = document.createElement('a')
                                a.href = `data:image/png;base64,${data.base64}`
                                a.download = 'visuel-ecrira.png'
                                a.click()
                              } else { showToast('Erreur conversion PNG') }
                            } catch { showToast('Erreur téléchargement') }
                          }} style={{fontSize:11,color:'var(--indigo)',fontWeight:500,padding:'4px 10px',border:'1px solid var(--border)',borderRadius:8,background:'white',cursor:'pointer',fontFamily:'inherit'}}>⬇ Télécharger PNG</button>
                        </div>
                        {/* Palette couleurs */}
                        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap' as const}}>
                          <span style={{fontSize:10,color:'var(--text3)',flexShrink:0}}>Couleur :</span>
                          {[
                            '#3D52A0','#0077B5','#1F2421','#8B4513','#2C3E50',
                            '#C0392B','#8E44AD','#16A085','#E67E22','#2980B9',
                            '#27AE60','#D35400','#7F8C8D','#2C2C54','#B71C1C',
                          ].map(c=>(
                            <button key={c} onClick={()=>{
                              const prev = svgEditAccent || profile?.brand_accent || '#3D52A0'
                              const dark = darkenColor(c, 18)
                              setAiSvgContent(svg=>{
                                let s = svg.replace(new RegExp(prev.replace('#','\\#'),'gi'),c)
                                // Update gradient stop darker shade
                                s = s.replace(new RegExp(darkenColor(prev,18).replace('#','\\#'),'gi'),dark)
                                return s
                              })
                              setSvgEditAccent(c)
                            }} style={{width:20,height:20,borderRadius:'50%',border:c===svgEditAccent?'3px solid #1F2421':'2px solid transparent',background:c,cursor:'pointer',padding:0,flexShrink:0}}/>
                          ))}
                          <input type="color" value={svgEditAccent||'#3D52A0'} onChange={e=>{
                            const c=e.target.value
                            const prev = svgEditAccent || profile?.brand_accent || '#3D52A0'
                            const dark = darkenColor(c, 18)
                            setAiSvgContent(svg=>{
                              let s = svg.replace(new RegExp(prev.replace('#','\\#'),'gi'),c)
                              s = s.replace(new RegExp(darkenColor(prev,18).replace('#','\\#'),'gi'),dark)
                              return s
                            })
                            setSvgEditAccent(c)
                          }} title="Couleur personnalisée" style={{width:20,height:20,borderRadius:'50%',border:'1px solid var(--border)',cursor:'pointer',padding:0,flexShrink:0}}/>
                        </div>
                      </div>


                      {/* Aperçu SVG */}
                      <div style={{width:'100%',overflow:'hidden'}} dangerouslySetInnerHTML={{__html: sanitizeSvg(aiSvgContent).replace(/<svg/, '<svg style="width:100%;height:auto;display:block;max-height:600px"')}}/>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CALENDRIER */}
          <div className={`page ${page==='calendrier'?'active':''}`}>
            <div className="eyebrow">{T('planning')}</div>
            <div className="page-title">{T('editorial_calendar')}</div>
            <div className="copper-rule"/>

            {/* Contrôles calendrier */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap' as const,gap:10}}>
              <div style={{display:'flex',gap:6}}>
                {(['semaine','mois','annee'] as const).map(v=>(
                  <button key={v} className={`chip ${calView===v?'on':''}`} onClick={()=>setCalView(v)} style={{fontSize:12}}>
                    {v==='semaine'?T('view_week'):v==='mois'?T('view_month'):T('view_year')}
                  </button>
                ))}
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <button className="btn btn-ghost" style={{fontSize:13,padding:'5px 10px'}} onClick={()=>moveCalendar(-1)}>←</button>
                <span style={{fontSize:13,fontWeight:500,color:'var(--text1)',minWidth:160,textAlign:'center' as const}}>{getCalendarTitle()}</span>
                <button className="btn btn-ghost" style={{fontSize:13,padding:'5px 10px'}} onClick={()=>moveCalendar(1)}>→</button>
                <button className="btn btn-ghost" style={{fontSize:11}} onClick={()=>setCalDate(new Date())}>{T('today_btn')}</button>
              </div>
              <button className="btn btn-primary" style={{fontSize:12}} onClick={()=>setPage('rediger')}>{T('new_post_btn')}</button>
            </div>

            {/* Vue Semaine */}
            {calView==='semaine' && (
              <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:6}}>
                {getWeekDays().map((day,i)=>{
                  const dayPosts = getPostsForDay(day)
                  const isToday = day.toDateString()===new Date().toDateString()
                  return (
                    <div key={i}
                      onDragOver={e=>{e.preventDefault();e.currentTarget.style.background='rgba(61,82,160,0.06)';e.currentTarget.style.borderColor='var(--indigo)'}}
                      onDragLeave={e=>{e.currentTarget.style.background='var(--white)';e.currentTarget.style.borderColor=isToday?'var(--indigo)':'var(--border)'}}
                      onDrop={e=>{e.preventDefault();e.currentTarget.style.background='var(--white)';e.currentTarget.style.borderColor=isToday?'var(--indigo)':'var(--border)';handleDrop(day)}}
                      style={{minHeight:120,background:'var(--white)',border:`1px solid ${isToday?'var(--indigo)':'var(--border)'}`,borderRadius:12,padding:'8px 10px',transition:'background 0.15s,border-color 0.15s'}}>
                      <div style={{fontSize:11,fontWeight:600,color:isToday?'var(--indigo)':'var(--text3)',marginBottom:6,textTransform:'uppercase' as const}}>
                        {day.toLocaleDateString(lang==='fr'?'fr-FR':'en-GB',{weekday:'short'})} {day.getDate()}
                      </div>
                      {dayPosts.map((p:any)=>(
                        <div key={p.id}
                          draggable={p.status!=='published'}
                          onDragStart={e=>{e.stopPropagation();setDraggedPostId(p.id);e.dataTransfer.effectAllowed='move'}}
                          onDragEnd={()=>setDraggedPostId(null)}
                          onClick={()=>setSelectedCalPost(p)}
                          style={{background:p.status==='published'?'rgba(61,82,160,0.1)':'rgba(217,200,163,0.2)',border:`1px solid ${draggedPostId===p.id?'var(--indigo)':p.status==='published'?'rgba(61,82,160,0.3)':'rgba(217,200,163,0.4)'}`,borderRadius:6,padding:'4px 7px',marginBottom:4,cursor:p.status!=='published'?'grab':'pointer',fontSize:11,overflow:'hidden',opacity:draggedPostId===p.id?0.5:1,transition:'opacity 0.15s'}}>
                          {p.svg_content && (p.svg_content.trimStart().startsWith('<') ? <div style={{width:'100%',height:48,overflow:'hidden',borderRadius:4,marginBottom:3,pointerEvents:'none'}} dangerouslySetInnerHTML={{__html: sanitizeSvg(p.svg_content).replace(/<svg/, '<svg style="width:100%;height:auto;display:block"')}} /> : <img src={`data:image/png;base64,${p.svg_content}`} alt="" style={{width:'100%',height:48,objectFit:'cover',borderRadius:4,marginBottom:3,display:'block'}} />)}
                          <div style={{fontWeight:500,color:'var(--text1)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{p.topic||'Post'}</div>
                          <div style={{fontSize:10,color:'var(--text3)'}}>{new Date(p.scheduled_at).toLocaleTimeString(lang==='fr'?'fr-FR':'en-GB',{hour:'2-digit',minute:'2-digit'})}</div>
                          <span style={{fontSize:9,fontWeight:600,color:p.status==='published'?'var(--indigo)':p.status==='error'?'#c0392b':'#8a7040',textTransform:'uppercase' as const}}>{p.status==='published'?T('status_published'):p.status==='error'?T('status_error'):T('status_pending')}</span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Vue Mois */}
            {calView==='mois' && (
              <div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:4}}>
                  {lang==='fr'?['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>(
                    <div key={d} style={{textAlign:'center' as const,fontSize:11,fontWeight:600,color:'var(--text3)',padding:'4px 0'}}>{d}</div>
                  ))}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
                  {getMonthDays().map((day,i)=>{
                    const dayPosts = day ? getPostsForDay(day) : []
                    const isToday = day?.toDateString()===new Date().toDateString()
                    const isCurrentMonth = day?.getMonth()===calDate.getMonth()
                    return (
                      <div key={i}
                        onDragOver={e=>{if(day){e.preventDefault();e.currentTarget.style.background='rgba(61,82,160,0.06)';e.currentTarget.style.borderColor='var(--indigo)'}}}
                        onDragLeave={e=>{if(day){e.currentTarget.style.background='var(--white)';e.currentTarget.style.borderColor=isToday?'var(--indigo)':'var(--border)'}}}
                        onDrop={e=>{if(day){e.preventDefault();e.currentTarget.style.background='var(--white)';e.currentTarget.style.borderColor=isToday?'var(--indigo)':'var(--border)';handleDrop(day)}}}
                        style={{minHeight:80,background:day?'var(--white)':'transparent',border:day?`1px solid ${isToday?'var(--indigo)':'var(--border)'}`:'none',borderRadius:8,padding:'4px 6px',opacity:isCurrentMonth?1:0.4,transition:'background 0.15s,border-color 0.15s'}}>
                        {day&&<div style={{fontSize:11,fontWeight:isToday?700:400,color:isToday?'var(--indigo)':'var(--text3)',marginBottom:3}}>{day.getDate()}</div>}
                        {dayPosts.slice(0,2).map((p:any)=>(
                          <div key={p.id}
                            draggable={p.status!=='published'}
                            onDragStart={e=>{e.stopPropagation();setDraggedPostId(p.id);e.dataTransfer.effectAllowed='move'}}
                            onDragEnd={()=>setDraggedPostId(null)}
                            onClick={()=>setSelectedCalPost(p)}
                            style={{background:p.status==='published'?'rgba(61,82,160,0.1)':'rgba(217,200,163,0.2)',borderRadius:4,padding:'2px 5px',marginBottom:2,cursor:p.status!=='published'?'grab':'pointer',fontSize:10,overflow:'hidden',color:'var(--text1)',opacity:draggedPostId===p.id?0.5:1}}>
                            {p.svg_content && (p.svg_content.trimStart().startsWith('<') ? <div style={{width:'100%',height:28,overflow:'hidden',borderRadius:3,marginBottom:2,pointerEvents:'none'}} dangerouslySetInnerHTML={{__html: sanitizeSvg(p.svg_content).replace(/<svg/, '<svg style="width:100%;height:auto;display:block"')}} /> : <img src={`data:image/png;base64,${p.svg_content}`} alt="" style={{width:'100%',height:28,objectFit:'cover',borderRadius:3,marginBottom:2,display:'block'}} />)}
                            <div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{p.topic||'Post'}</div>
                          </div>
                        ))}
                        {dayPosts.length>2&&<div style={{fontSize:9,color:'var(--text3)'}}>+{dayPosts.length-2}</div>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Vue Année */}
            {calView==='annee' && (
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
                {Array.from({length:12},(_,i)=>i).map(month=>{
                  const monthPosts = scheduledPosts.filter(p=>{const d=new Date(p.scheduled_at);return d.getFullYear()===calDate.getFullYear()&&d.getMonth()===month})
                  return (
                    <div key={month} style={{background:'var(--white)',border:'1px solid var(--border)',borderRadius:12,padding:'12px 14px',cursor:'pointer'}} onClick={()=>{setCalDate(new Date(calDate.getFullYear(),month,1));setCalView('mois')}}>
                      <div style={{fontSize:12,fontWeight:600,color:'var(--text1)',marginBottom:8,textTransform:'capitalize' as const}}>
                        {new Date(calDate.getFullYear(),month,1).toLocaleDateString(lang==='fr'?'fr-FR':'en-GB',{month:'long'})}
                      </div>
                      {monthPosts.length>0?(
                        <div style={{fontSize:11,color:'var(--text2)'}}>{monthPosts.length} post{monthPosts.length>1?'s':''}</div>
                      ):(
                        <div style={{fontSize:11,color:'var(--text3)'}}>{T('no_posts_month')}</div>
                      )}
                      <div style={{marginTop:6,display:'flex',gap:3,flexWrap:'wrap' as const}}>
                        {monthPosts.slice(0,3).map((p:any)=>(
                          <span key={p.id} style={{fontSize:9,padding:'2px 6px',background:p.status==='published'?'rgba(61,82,160,0.1)':'rgba(217,200,163,0.2)',borderRadius:4,color:'var(--text2)'}}>
                            {new Date(p.scheduled_at).getDate()} {p.topic?.substring(0,10)||'Post'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Modal détail post */}
            {selectedCalPost && (
              <div style={{position:'fixed' as const,inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={()=>setSelectedCalPost(null)}>
                <div style={{background:'var(--white)',borderRadius:20,padding:24,maxWidth:480,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.15)'}} onClick={e=>e.stopPropagation()}>
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap' as const,gap:8}}>
                    <span className={`badge ${selectedCalPost.status==='published'?'badge-forest':'badge-copper'}`}>
                      {selectedCalPost.status==='published'?T('status_published'):selectedCalPost.status==='error'?T('status_error'):T('status_pending')}
                    </span>
                    <button className="btn btn-ghost" style={{fontSize:11}} onClick={()=>setSelectedCalPost(null)}>✕</button>
                  </div>
                  <div style={{fontFamily:"'Clash Display','Inter',sans-serif",fontSize:16,fontWeight:500,color:'var(--text1)',marginBottom:6}}>{selectedCalPost.topic||'Post'}</div>
                  <div style={{fontSize:12,color:'var(--text3)',marginBottom:12}}>
                    {new Date(selectedCalPost.scheduled_at).toLocaleDateString(lang==='fr'?'fr-FR':'en-GB',{weekday:'long',day:'numeric',month:'long'})} {lang==='en'?'at':'à'} {new Date(selectedCalPost.scheduled_at).toLocaleTimeString(lang==='fr'?'fr-FR':'en-GB',{hour:'2-digit',minute:'2-digit'})}
                  </div>
                  <div style={{fontSize:13,color:'var(--text2)',lineHeight:1.6,marginBottom:16,maxHeight:120,overflow:'hidden'}}>{selectedCalPost.content?.substring(0,200)}…</div>
                  {selectedCalPost.svg_content && (
                    <div style={{marginBottom:16,borderRadius:8,overflow:'hidden',border:'1px solid var(--border)'}}>
                      {selectedCalPost.svg_content.trimStart().startsWith('<')
                        ? <div style={{width:'100%',maxHeight:200,overflow:'hidden',pointerEvents:'none'}} dangerouslySetInnerHTML={{__html: sanitizeSvg(selectedCalPost.svg_content).replace(/<svg/, '<svg style="width:100%;height:auto;display:block;max-height:200px"')}} />
                        : <img src={`data:image/png;base64,${selectedCalPost.svg_content}`} style={{width:'100%',display:'block',maxHeight:200,objectFit:'cover'}} alt={T('visual_attached')} />
                      }
                    </div>
                  )}
                  <div style={{display:'flex',gap:8}}>
                    <button className="btn btn-secondary" style={{fontSize:12,flex:1,justifyContent:'center'}} onClick={()=>{setPostOutput(selectedCalPost.content);setPostTopic(selectedCalPost.topic);setPage('rediger');setSelectedCalPost(null)}}>{T('edit_post_btn')}</button>
                    {selectedCalPost.status==='pending'&&(
                      <button className="btn btn-ghost" style={{fontSize:12,color:'#c0392b',flex:1,justifyContent:'center'}} onClick={()=>{if(window.confirm(lang==='en'?'Cancel this scheduled post?':'Annuler ce post planifié ?')){cancelScheduled(selectedCalPost.id);setSelectedCalPost(null)}}}>{T('cancel_post_btn')}</button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* VISUELS */}
          <div className={`page ${page==='visuels'?'active':''}`} style={{maxWidth:'100%',padding:'28px 32px'}}>
            <div className="eyebrow">{T('visual_creation_eyebrow')}</div><div className="page-title">{T('visual_generator_title')}</div><div className="copper-rule"/>
            <div style={{background:'var(--white)',border:'1px solid var(--border)',borderRadius:16,padding:'20px 24px',marginBottom:18,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div><div style={{fontFamily:"'Clash Display','Inter',sans-serif",fontSize:15,fontWeight:500,color:'var(--text1)',marginBottom:4}}>{T('visual_from_post_title')}</div><div style={{fontSize:13,color:'var(--text2)'}}>{T('visual_from_post_body')}</div></div>
              {postOutput&&(<button className="btn btn-primary" style={{flexShrink:0}} onClick={()=>setShowVisualModal(true)}>{T('open_generator_btn')}</button>)}
            </div>
            <div style={{background:'var(--sand)',borderRadius:16,padding:'40px 24px',textAlign:'center' as const}}><div style={{fontSize:28,marginBottom:12,opacity:.3}}>◫</div><div style={{fontFamily:"'Clash Display','Inter',sans-serif",fontSize:16,fontStyle:'italic',color:'var(--text2)',marginBottom:6}}>{T('visual_integrated')}</div><div style={{fontSize:13,color:'var(--text3)'}}>{T('visual_go_to_write')}</div></div>
          </div>

          {/* BIBLIOTHÈQUE */}
          <div className={`page ${page==='bibliotheque'?'active':''}`}>
            <div className="eyebrow">{T('your_content')}</div><div className="page-title">{T('library')}</div><div className="copper-rule"/>
            <div style={{display:'flex',gap:8,marginBottom:16}}>
              <button onClick={()=>setLibraryTab('posts')} style={{padding:'6px 16px',borderRadius:8,border:`1px solid ${libraryTab==='posts'?'var(--indigo)':'var(--border)'}`,background:libraryTab==='posts'?'rgba(61,82,160,0.08)':'transparent',color:libraryTab==='posts'?'var(--indigo)':'var(--text2)',fontSize:12,cursor:'pointer',fontWeight:libraryTab==='posts'?600:400,fontFamily:'inherit'}}>
                {lang==='en'?'Posts':'Posts'} ({savedPosts.length})
              </button>
              <button onClick={()=>setLibraryTab('ideas')} style={{padding:'6px 16px',borderRadius:8,border:`1px solid ${libraryTab==='ideas'?'var(--indigo)':'var(--border)'}`,background:libraryTab==='ideas'?'rgba(61,82,160,0.08)':'transparent',color:libraryTab==='ideas'?'var(--indigo)':'var(--text2)',fontSize:12,cursor:'pointer',fontWeight:libraryTab==='ideas'?600:400,fontFamily:'inherit'}}>
                {lang==='en'?'Ideas':'Idées'} ({savedIdeas.length})
              </button>
            </div>
            {libraryTab==='ideas' && (
              <div>
                {savedIdeas.length===0 ? (
                  <div className="card empty"><div className="empty-icon">☆</div><div className="empty-title">{lang==='en'?'No saved ideas yet':'Aucune idée sauvegardée'}</div><div className="empty-body">{lang==='en'?'Star ideas to save them here':'Cliquez sur ☆ pour sauvegarder vos idées'}</div></div>
                ) : savedIdeas.map((idea,i)=>(
                  <div key={i} className="idea-card">
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                      <span className="idea-tag">{idea.topic}</span>
                    </div>
                    <div className="idea-title">{idea.title}</div>
                    <div className="idea-hook">{idea.hook}</div>
                    <div className="idea-actions">
                      <button className="btn btn-primary" style={{fontSize:12,padding:'7px 13px'}} onClick={()=>{setPostTopic(idea.title);setPostOutput('');setPage('rediger')}}>{T('develop')}</button>
                      <button className="btn btn-ghost" onClick={()=>copyText(idea.title+'\n\n'+(idea.hook||''))}>{T('copy')}</button>
                      <button className="btn btn-ghost" style={{fontSize:11,color:'#c0392b'}} onClick={()=>deleteSavedIdea(undefined,idea.title)}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {libraryTab==='posts' && <div className="page-sub">{T('library_sub_auto')}</div>}
            {libraryTab==='posts' && <>{savedPosts.length > 3 && (
              <div style={{marginBottom:16,position:'relative' as const}}>
                <input
                  className="form-input"
                  placeholder={lang==='en'?'Search posts...':'Rechercher dans les posts...'}
                  value={searchLibrary}
                  onChange={e=>setSearchLibrary(e.target.value)}
                  style={{paddingLeft:34}}
                />
                <span style={{position:'absolute' as const,left:11,top:'50%',transform:'translateY(-50%)',fontSize:14,color:'var(--text3)',pointerEvents:'none'}}>🔍</span>
                {searchLibrary && <button onClick={()=>setSearchLibrary('')} style={{position:'absolute' as const,right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--text3)',fontSize:14}}>✕</button>}
              </div>
            )}
            {loadingPosts && <div style={{marginBottom:12}}><div className="strip"/></div>}
            {!loadingPosts && savedPosts.length===0 ? (
              <div className="card empty">
              <div className="empty-icon">◫</div>
              <div className="empty-title">{T('library_empty_title')}</div>
              <div className="empty-body">{T('library_empty_save')}</div>
              <button className="btn btn-primary" style={{marginTop:16,justifyContent:'center'}} onClick={()=>setPage('rediger')}>
                ✦ {lang==='en'?'Generate my first post':'Générer mon premier post'}
              </button>
            </div>
            ) : savedPosts.filter(p=>!searchLibrary||p.content.toLowerCase().includes(searchLibrary.toLowerCase())||p.topic.toLowerCase().includes(searchLibrary.toLowerCase())).map(p=>(
              <div key={p.id} className="saved-card fade" style={{position:'relative'}}>
                {/* Header */}
                <div className="saved-header">
                  <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap' as const}}>
                    <span className="badge badge-forest">{fmtLabels[p.format]||p.format}</span>
                    <span style={{fontSize:11,color:'var(--text3)'}}>{p.created_at}</span>
                    <span style={{fontSize:10,color:'var(--text3)',background:'var(--sand)',padding:'1px 6px',borderRadius:10}}>{p.content.length} {T('chars')}</span>
                  </div>
                  <button className="btn btn-ghost" style={{fontSize:11,color:'#c0392b',borderColor:'transparent'}} onClick={()=>{if(window.confirm(lang==='en'?'Delete this post?':'Supprimer ce post ?'))deletePost(p.id)}}>{T('delete')}</button>
                </div>
                {/* Titre */}
                <div className="saved-title" style={{marginBottom:6}}>{p.topic}</div>
                {/* Aperçu contenu — 2 premières lignes */}
                <div style={{fontSize:13,color:'var(--text2)',lineHeight:1.6,marginBottom:12,padding:'10px 12px',background:'var(--ivory)',borderRadius:8,border:'1px solid var(--border)',fontFamily:"'Inter',sans-serif",whiteSpace:'pre-line' as const,maxHeight:80,overflow:'hidden',position:'relative' as const}}>
                  {p.content.split('\n').slice(0,3).join('\n')}
                  <div style={{position:'absolute',bottom:0,left:0,right:0,height:28,background:'linear-gradient(transparent,var(--ivory))'}}/>
                </div>
                {/* Actions */}
                <div style={{display:'flex',gap:7,flexWrap:'wrap' as const}}>
                  <button className="btn btn-secondary" style={{fontSize:12}} onClick={()=>copyText(p.content)}>{T('copy_post_btn')}</button>
                  <button className="btn btn-ghost" style={{fontSize:12}} onClick={()=>{setPostOutput(p.content);setPostTopic(p.topic);setPage('rediger')}}>{T('use_post')}</button>
                  <button className="btn btn-ghost" style={{fontSize:12}} onClick={()=>{setPostOutput(p.content);setPostTopic(p.topic);setPage('calendrier');setTimeout(()=>document.getElementById('new-post-btn')?.click(),100)}}>{T('schedule_from_lib')}</button>
                </div>
              </div>
            ))}
            </>
          }
          </div>

          {/* PROFIL */}
          <div className={`page ${page==='profil'?'active':''}`}>
            <div className="eyebrow">{T('settings')}</div><div className="page-title">{T('my_profile')}</div><div className="copper-rule"/>
            <div className="page-sub">{T('profile_sub')}</div>
            <div className="profile-hero">
              {(profile as any).linkedin_picture ? <img src={(profile as any).linkedin_picture} alt="" style={{width:48,height:48,borderRadius:'50%',objectFit:'cover'}} /> : <div className="profile-avatar">{profile.name?profile.name.slice(0,2).toUpperCase():'??'}</div>}
              <div><div className="profile-name">{profile.name||T('profile_name_fallback')}</div><div className="profile-role">{profile.role} · {profile.company}</div>{(profile as any).email&&<div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{(profile as any).email}</div>}</div>
              <div style={{marginLeft:'auto',display:'flex',flexDirection:'column' as const,alignItems:'center',gap:6}}>
                {(profile as any).company_logo ? (
                  <div style={{position:'relative' as const}}>
                    <img src={(profile as any).company_logo} alt="Logo" style={{width:48,height:48,objectFit:'contain',borderRadius:8,border:'1px solid var(--border)',background:'white',padding:4}}/>
                    <button onClick={()=>setProfile((p:any)=>({...p,company_logo:''}))} style={{position:'absolute' as const,top:-6,right:-6,width:16,height:16,borderRadius:'50%',background:'#c0392b',border:'none',cursor:'pointer',fontSize:10,color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'inherit'}}>×</button>
                  </div>
                ) : (
                  <div style={{width:48,height:48,borderRadius:8,border:'1px dashed var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'var(--text3)',textAlign:'center' as const,cursor:'pointer'}} onClick={()=>(document.getElementById('company-logo-input') as HTMLInputElement)?.click()}>
                    Logo
                  </div>
                )}
                <input id="company-logo-input" type="file" accept="image/png,image/jpeg,image/svg+xml" style={{display:'none'}} onChange={(e:any)=>{
                  const f=e.target.files?.[0];if(!f||f.size>2*1024*1024)return;
                  const r=new FileReader();
                  r.onload=(ev)=>setProfile((p:any)=>({...p,company_logo:ev.target?.result as string}));
                  r.readAsDataURL(f)
                }}/>
                <span style={{fontSize:9,color:'var(--text3)'}}>{lang==='en'?'Company logo':'Logo entreprise'}</span>
              </div>
            </div>
            <div className="grid2">
              <div className="card">
                <div className="section-label">{T('pro_identity')}</div>
                {([[T('field_first_name'),'name'],[T('field_role'),'role'],[T('field_company'),'company'],[T('field_audience'),'audience'],[T('field_domain'),'domain']] as [string,keyof typeof profile][]).map(([label,key])=>(
                  <div className="form-group" key={key}>
                    <label className="form-label">{label}</label>
                    <input type="text" className="form-input" value={profile[key]||''} placeholder={key==='domain'?'ex: entreprise.fr':undefined} onChange={e=>setProfile(p=>({...p,[key]:e.target.value}))}/>
                    {key==='domain'&&<>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginTop:6}}>
                        <div style={{fontSize:11,color:'var(--text3)',flex:1}}>{T('domain_hint_text')}</div>
                        <button className="btn btn-secondary" style={{fontSize:11,flexShrink:0,whiteSpace:'nowrap' as const}} onClick={enrichProfile} disabled={enriching}>
                          {enriching?<><span className="spinner"/> {T('enriching_btn')}</>:T('enrich_btn')}
                        </button>
                      </div>
                      {enrichSuggestions&&(
                        <div style={{marginTop:12,background:'rgba(79,103,84,0.05)',border:'1px solid rgba(79,103,84,0.2)',borderRadius:12,padding:'14px 16px'}}>
                          <div style={{fontSize:12,fontWeight:600,color:'var(--indigo)',marginBottom:10}}>{T('suggestions_from_domain')} {profile.domain}</div>
                          {enrichSuggestions.summary&&<div style={{fontSize:11,color:'var(--text2)',marginBottom:10,fontStyle:'italic'}}>"{enrichSuggestions.summary}"</div>}
                          {(Object.entries(enrichSuggestions) as [string,string][]).filter(([k])=>k!=='summary').map(([k,v])=>{
                            const labels:Record<string,string>={company:T('enrich_label_company'),sector:T('enrich_label_sector'),audience:T('enrich_label_audience'),tech_stack:T('enrich_label_stack')}
                            return (
                              <div key={k} style={{display:'flex',alignItems:'center',gap:8,marginBottom:7}}>
                                <span style={{fontSize:11,color:'var(--text2)',width:64,flexShrink:0}}>{labels[k]||k}</span>
                                <span style={{fontSize:11,color:'var(--text1)',flex:1,background:'var(--white)',padding:'4px 8px',borderRadius:6,border:'1px solid var(--border)'}}>{v}</span>
                                <button className="btn btn-primary" style={{fontSize:10,padding:'4px 10px',flexShrink:0}} onClick={()=>applyEnrichSuggestion(k,v)}>{T('apply_suggestion')}</button>
                              </div>
                            )
                          })}
                          <button className="btn btn-ghost" style={{fontSize:11,marginTop:4,color:'var(--text3)'}} onClick={()=>setEnrichSuggestions(null)}>{T('ignore_all_btn')}</button>
                        </div>
                      )}
                    </>}
                  </div>
                ))}
                <div className="form-group">
                  <label className="form-label">{T('field_sector')}</label>
                  <div style={{display:'flex',flexWrap:'wrap' as const,gap:6,marginBottom:8}}>
                    {(profile.sector||'').split(',').map(s=>s.trim()).filter(Boolean).map((tag,i)=>(
                      <span key={i} style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 10px',background:'rgba(61,82,160,0.08)',border:'1px solid rgba(61,82,160,0.2)',borderRadius:20,fontSize:12,color:'var(--indigo)'}}>
                        {tag}
                        <button onClick={()=>{const tags=(profile.sector||'').split(',').map((s:string)=>s.trim()).filter(Boolean);tags.splice(i,1);setProfile((p:any)=>({...p,sector:tags.join(', ')}))}} style={{background:'none',border:'none',cursor:'pointer',padding:0,fontSize:14,lineHeight:1,color:'var(--text3)',fontFamily:'inherit'}}>×</button>
                      </span>
                    ))}
                  </div>
                  <input type="text" className="form-input" placeholder={lang==='en'?'Add a sector, press Enter':'Ajouter un secteur, Entrée'} style={{fontSize:12}} onKeyDown={(e:any)=>{if(e.key==='Enter'&&e.target.value.trim()){e.preventDefault();const val=e.target.value.trim();const existing=(profile.sector||'').split(',').map((s:string)=>s.trim()).filter(Boolean);if(!existing.includes(val)){setProfile((p:any)=>({...p,sector:[...existing,val].join(', ')}))}e.target.value=''}}}/>
                </div>
                <div className="form-group"><label className="form-label">{T('field_language')}</label><select className="form-input" value={profile.lang} onChange={e=>setProfile(p=>({...p,lang:e.target.value}))}><option value="fr">Français</option><option value="en">English</option></select></div>
                <div className="form-group">
                  <label className="form-label">{T('linkedin_pub')}</label>
                  <div style={{background:linkedinConnected?'rgba(79,103,84,0.06)':'rgba(0,119,181,0.05)',border:`1px solid ${linkedinConnected?'rgba(79,103,84,0.2)':'rgba(0,119,181,0.2)'}`,borderRadius:10,padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:linkedinConnected?'var(--indigo)':'#0077B5',marginBottom:2}}>{linkedinConnected?T('linkedin_connected_status'):T('linkedin_disconnected_status')}</div>
                      <div style={{fontSize:11,color:'var(--text2)'}}>{linkedinConnected?T('linkedin_connected_hint_text'):T('linkedin_connect_hint_text')}</div>
                    </div>
                    <button className="btn btn-primary" style={{fontSize:11,flexShrink:0,background:linkedinConnected?'var(--indigo)':'#0077B5'}} onClick={connectLinkedIn}>{linkedinConnected?T('reconnect_btn'):T('connect_btn')}</button>
                  </div>
                </div>
                <button className="btn btn-primary" onClick={handleSaveProfile} disabled={savingProfile}>{savingProfile?<><span className="spinner"/> {T('saving')}</>:T('save_profile')}</button>
              </div>
              <div>
                <div className="card" style={{marginBottom:16}}>
                  <div className="section-label">{T('brand_colors')}</div>
                  <div style={{fontSize:12,color:'var(--text2)',marginBottom:12}}>{T('brand_colors_hint_text')}</div>
                  {([[T('color_bg'),'brand_bg'],[T('color_text'),'brand_text'],[T('color_primary'),'brand_accent'],[T('color_secondary'),'brand_color2'],[T('color_accent'),'brand_color3']] as [string,keyof typeof profile][]).map(([label,key])=>(
                    <div key={key} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                      <span style={{fontSize:11,color:'var(--text2)',width:64,flexShrink:0}}>{label}</span>
                      <input type="color" value={(profile[key] as string)||'#3D52A0'} onChange={e=>setProfile(p=>({...p,[key]:e.target.value}))} style={{width:30,height:30,borderRadius:8,border:'1px solid var(--border)',cursor:'pointer',padding:2}}/>
                      <span style={{fontSize:11,fontFamily:'monospace',color:'var(--text2)'}}>{profile[key] as string}</span>
                    </div>
                  ))}
                </div>
                <div className="card">
                  <div className="section-label">{T('stack_style')}</div>
                  <div className="form-group">
                    <label className="form-label">Tags</label>
                    <div style={{display:'flex',flexWrap:'wrap' as const,gap:6,marginBottom:8}}>
                      {(profile.tech_stack||'').split(',').map(s=>s.trim()).filter(Boolean).map((tag,i)=>(
                        <span key={i} style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 10px',background:'rgba(61,82,160,0.08)',border:'1px solid rgba(61,82,160,0.2)',borderRadius:20,fontSize:12,color:'var(--indigo)'}}>
                          {tag}
                          <button onClick={()=>{const tags=(profile.tech_stack||'').split(',').map((s:string)=>s.trim()).filter(Boolean);tags.splice(i,1);setProfile((p:any)=>({...p,tech_stack:tags.join(', ')}))}} style={{background:'none',border:'none',cursor:'pointer',padding:0,fontSize:14,lineHeight:1,color:'var(--text3)',fontFamily:'inherit'}}>×</button>
                        </span>
                      ))}
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      <input type="text" className="form-input" placeholder={lang==='en'?'Add a tag, press Enter':'Ajouter un tag, Entrée'} style={{fontSize:12}} onKeyDown={(e:any)=>{if(e.key==='Enter'&&e.target.value.trim()){e.preventDefault();const val=e.target.value.trim();const existing=(profile.tech_stack||'').split(',').map((s:string)=>s.trim()).filter(Boolean);if(!existing.includes(val)){setProfile((p:any)=>({...p,tech_stack:[...existing,val].join(', ')}))}e.target.value=''}}}/>
                    </div>
                  </div>
                  <div style={{marginTop:8,display:'flex',gap:6,flexWrap:'wrap' as const}}>
                  <div className="form-group" style={{marginTop:16}}>
                    <label className="form-label">{lang==='en'?'Tone':'Tutoiement / Vouvoiement'}</label>
                    <div style={{display:'flex',gap:8,marginTop:4}}>
                      {['tutoiement','vouvoiement'].map(f=>(
                        <button key={f} onClick={()=>setProfile((p:any)=>({...p,formality:f}))} style={{flex:1,padding:'8px',borderRadius:8,border:`1px solid ${(profile as any).formality===f||(!(profile as any).formality&&f==='vouvoiement')?'var(--indigo)':'var(--border)'}`,background:(profile as any).formality===f||(!(profile as any).formality&&f==='vouvoiement')?'rgba(61,82,160,0.08)':'transparent',color:(profile as any).formality===f||(!(profile as any).formality&&f==='vouvoiement')?'var(--indigo)':'var(--text2)',fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:'inherit',textTransform:'capitalize' as const}}>{f}</button>
                      ))}
                    </div>
                  </div>
                    {profile.company && <span className="badge badge-forest">{profile.company}</span>}
                  </div>
                </div>
                <div className="card" style={{marginTop:16}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                    <div className="section-label" style={{marginBottom:0}}>{T('ref_posts_title')}</div>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:11,color:'var(--text3)'}}>{getRefPosts().length}/5</span>
                      {getRefPosts().length < 5 && (
                        <button className="btn btn-secondary" style={{fontSize:11,padding:'4px 10px'}} onClick={()=>setShowAddRef(!showAddRef)}>
                          {showAddRef ? T('cancel_add_ref') : T('add_ref_btn')}
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{fontSize:12,color:'var(--text2)',marginBottom:12,lineHeight:1.5}}>
                    {T('ref_posts_body')}
                  </div>
                  {/* Existing ref posts */}
                  {getRefPosts().map((post: string, idx: number) => (
                    <div key={idx} style={{background:'var(--ivory)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 12px',marginBottom:8,position:'relative' as const}}>
                      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8}}>
                        <div>
                          <div style={{fontSize:11,fontWeight:600,color:'var(--indigo)',marginBottom:4}}>Post {idx+1}</div>
                          <div style={{fontSize:11,color:'var(--text2)',lineHeight:1.5,maxHeight:60,overflow:'hidden',maskImage:'linear-gradient(to bottom, black 60%, transparent 100%)'}}>{post}</div>
                        </div>
                        <button onClick={()=>removeRefPost(idx)} style={{flexShrink:0,background:'none',border:'none',cursor:'pointer',color:'var(--text3)',fontSize:14,padding:'0 4px',lineHeight:1}}>✕</button>
                      </div>
                    </div>
                  ))}
                  {/* Add new ref post */}
                  {showAddRef && (
                    <div style={{border:'1px solid var(--indigo)',borderRadius:10,padding:'12px',marginBottom:8,background:'rgba(79,103,84,0.03)'}}>
                      <div style={{fontSize:11,fontWeight:600,color:'var(--indigo)',marginBottom:6}}>{T('new_ref_post')}</div>
                      <textarea
                        className="form-input"
                        rows={6}
                        value={newRefPost}
                        onChange={e=>setNewRefPost(e.target.value)}
                        placeholder={T('ref_post_placeholder')}
                        style={{fontSize:12,fontFamily:'inherit',marginBottom:8}}
                        autoFocus
                      />
                      <div style={{display:'flex',gap:7}}>
                        <button className="btn btn-ghost" style={{fontSize:12}} onClick={()=>{setShowAddRef(false);setNewRefPost('')}}>{T('cancel_btn')}</button>
                        <button className="btn btn-primary" style={{fontSize:12,flex:1,justifyContent:'center'}} onClick={addRefPost} disabled={!newRefPost.trim()}>
                          {T('add_post_btn')}
                        </button>
                      </div>
                    </div>
                  )}
                  {getRefPosts().length === 0 && !showAddRef && (
                    <div style={{textAlign:'center' as const,padding:'16px 0',color:'var(--text3)',fontSize:12}}>
                      {T('no_ref_posts')}
                    </div>
                  )}
                  {getRefPosts().length > 0 && (
                    <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:'rgba(79,103,84,0.07)',borderRadius:8,fontSize:12,color:'var(--indigo)',marginTop:4}}>
                      <span>✓</span>
                      <span>Style actif — {getRefPosts().length} post{getRefPosts().length > 1 ? 's' : ''} référent{getRefPosts().length > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Bouton déconnexion — visible uniquement sur mobile */}
            <div className="mobile-only" style={{marginTop:24,paddingBottom:8}}>
              <button className="btn btn-ghost" style={{width:'100%',justifyContent:'center',color:'var(--text3)'}} onClick={signOut}>
                {T('sign_out_mobile')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM NAV ── */}
      <nav style={{position:'fixed' as const,bottom:20,left:'50%',transform:'translateX(-50%)',zIndex:200,display:'flex',alignItems:'center',gap:6,background:'var(--white)',border:'0.5px solid var(--border)',borderRadius:40,padding:'8px 14px',boxShadow:'0 4px 20px rgba(0,0,0,0.1)'}}>
        {([
          {id:'apercu' as const, label:'Aperçu', icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>},
          {id:'idees' as const, label:'Idées', icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20"><path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.3 6L15 20H9l-.7-5C6.3 13.7 5 11.5 5 9a7 7 0 0 1 7-7Z"/><path d="M9 21h6"/></svg>},
          {id:'rediger' as const, label:'Rédiger', icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/></svg>},
        ]).map(item=>(
          <div key={item.id} className="pill-btn-wrap">
            <span className="pill-tooltip">{item.label}</span>
            <button onClick={()=>setPage(item.id)} style={{width:42,height:42,borderRadius:'50%',border:'none',background:page===item.id?'var(--indigo)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'background 0.15s',color:page===item.id?'white':'var(--text3)'}}>
              {item.icon}
            </button>
          </div>
        ))}
        <div style={{width:'0.5px',height:20,background:'var(--border)',margin:'0 2px'}}/>
        <div className="pill-btn-wrap">
          <span className="pill-tooltip">Calendrier</span>
          <button onClick={()=>{ if(!isPro){setShowUpgradeModal(true);return;} setPage('calendrier') }} style={{width:42,height:42,borderRadius:'50%',border:'none',background:page==='calendrier'?'var(--indigo)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'background 0.15s',color:page==='calendrier'?'white':'var(--text3)'}}>
            <CalIcon/>
          </button>
        </div>
        <div className="pill-btn-wrap">
          <span className="pill-tooltip">Bibliothèque</span>
          <button onClick={()=>setPage('bibliotheque')} style={{width:42,height:42,borderRadius:'50%',border:'none',background:page==='bibliotheque'?'var(--indigo)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'background 0.15s',color:page==='bibliotheque'?'white':'var(--text3)'}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></svg>
          </button>
        </div>
      </nav>


      {showOnboarding&&(
        <div style={{position:'fixed',inset:0,zIndex:600,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(6px)',padding:20}}>
          <div style={{background:'var(--white)',borderRadius:20,width:'100%',maxWidth:500,boxShadow:'0 24px 64px rgba(0,0,0,0.25)',overflow:'hidden'}}>
            <div style={{background:'var(--indigo)',padding:'24px 28px 20px'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                <div style={{background:'white',borderRadius:10,width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 2px 8px rgba(0,0,0,0.15)'}}>
                  <img src="/logo-ecrira-icon-bleu.png" alt="Ecrira" style={{height:22,width:'auto'}} />
                </div>
                <span style={{fontFamily:"'Clash Display',sans-serif",fontSize:15,fontWeight:600,color:'white',letterSpacing:'0.02em'}}>Ecrira</span>
              </div>
              <div style={{fontFamily:"'Clash Display','Inter',sans-serif",fontSize:22,fontWeight:500,color:'white',marginBottom:4}}>
                {onboardingStep===0&&'Bienvenue'}{onboardingStep===1&&'Connecte LinkedIn'}{onboardingStep===2&&'Ton profil'}
              </div>
              <div style={{fontSize:13,color:'rgba(255,255,255,0.7)'}}>
                {onboardingStep===0&&'Ecrira génère tes posts LinkedIn en quelques secondes.'}
                {onboardingStep===1&&'LinkedIn pré-remplit ton nom et enrichit ton profil.'}
                {onboardingStep===2&&'Vérifiez et complétez les infos détectées.'}
              </div>
              <div style={{marginTop:16}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:7}}>
                  <div style={{display:'flex',gap:5}}>
                    {[0,1,2].map(i=>(<div key={i} style={{width:i===onboardingStep?24:7,height:6,borderRadius:3,background:i<=onboardingStep?'white':'rgba(255,255,255,0.25)',transition:'all 0.25s'}}/>))}
                  </div>
                  <span style={{fontSize:11,color:'rgba(255,255,255,0.6)',fontWeight:500,letterSpacing:'0.04em'}}>
                    {onboardingStep < 3 ? `${onboardingStep+1} / 3` : ''}
                  </span>
                </div>
                <div style={{height:2,background:'rgba(255,255,255,0.15)',borderRadius:1}}>
                  <div style={{height:'100%',borderRadius:1,background:'white',width:`${onboardingStep===0?0:onboardingStep===1?50:100}%`,transition:'width 0.35s ease'}}/>
                </div>
              </div>
            </div>
            <div style={{padding:'24px 32px 28px'}}>
              {onboardingStep===0&&(
                <div>
                  <div style={{background:'linear-gradient(135deg,rgba(61,82,160,0.06),rgba(217,200,163,0.08))',borderRadius:14,padding:'14px 16px',marginBottom:16,border:'1px solid var(--border)'}}>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--text1)',marginBottom:10}}>
                      {lang==='en'?'What you can do with Ecrira:':'Ce que vous pouvez faire avec Ecrira :'}
                    </div>
                    {[
                      {icon:'💡',color:'#f59e0b',title:T('onb_feat1_title'),desc:T('onb_feat1_desc')},
                      {icon:'⚡',color:'#3D52A0',title:T('onb_feat2_title'),desc:T('onb_feat2_desc')},
                      {icon:'',color:'#6366f1',title:T('onb_feat3_title'),desc:T('onb_feat3_desc')}
                    ].map((f,i)=>(
                      <div key={i} style={{display:'flex',gap:12,marginBottom:i<2?12:0,alignItems:'flex-start'}}>
                        <div style={{width:34,height:34,background:`${f.color}15`,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0,border:`1px solid ${f.color}25`}}>{f.icon}</div>
                        <div style={{paddingTop:2}}>
                          <div style={{fontSize:13,fontWeight:600,color:'var(--text1)',marginBottom:2}}>{f.title}</div>
                          <div style={{fontSize:12,color:'var(--text2)',lineHeight:1.5}}>{f.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:'flex',gap:10,alignItems:'center',padding:'10px 14px',background:'rgba(81,103,86,0.05)',borderRadius:10,marginBottom:14,border:'1px solid rgba(61,82,160,0.1)'}}>
                    <span style={{fontSize:18}}>🚀</span>
                    <span style={{fontSize:12,color:'var(--text2)',lineHeight:1.5}}>
                      {lang==='en'?'Setup takes less than 2 minutes. No credit card required to start.':'Configuration en moins de 2 minutes. Aucune carte bancaire requise pour commencer.'}
                    </span>
                  </div>
                  <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',fontSize:14,padding:'12px 20px'}} onClick={()=>setOnboardingStep(1)}>
                    {lang==='en'?'Get started →':T('start')+' →'}
                  </button>
                </div>
              )}
              {onboardingStep===1&&(
                <div>
                  <div style={{background:'rgba(0,119,181,0.05)',border:'1px solid rgba(0,119,181,0.15)',borderRadius:12,padding:'14px 16px',marginBottom:10}}>
                    <div style={{fontSize:13,fontWeight:600,color:'#0077B5',marginBottom:4}}>{T('onb_connect_linkedin')}</div>
                    <div style={{fontSize:12,color:'var(--text2)',marginBottom:10}}>{T('onb_connect_linkedin_desc')}</div>
                    {linkedinConnected ? (
                      <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',background:'rgba(0,119,181,0.08)',borderRadius:9,border:'1px solid rgba(0,119,181,0.2)'}}>
                        <span style={{fontSize:18}}>✅</span>
                        <span style={{fontSize:13,fontWeight:600,color:'#0077B5'}}>{lang==='en'?'LinkedIn connected':'LinkedIn connecté'}</span>
                      </div>
                    ) : (
                      <button className="btn btn-primary" style={{background:'#0077B5',width:'100%',justifyContent:'center',gap:8}} onClick={connectLinkedIn}>
                        <svg viewBox="0 0 24 24" fill="currentColor" style={{width:16,height:16}}><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                        {lang==='en'?'Connect with LinkedIn':'Se connecter avec LinkedIn'}
                      </button>
                    )}
                  </div>
                  <div style={{background:'rgba(79,103,84,0.05)',border:'1px solid rgba(79,103,84,0.15)',borderRadius:12,padding:'14px 16px',marginBottom:14}}>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--indigo)',marginBottom:4}}>{T('onb_enrich_site')}</div>
                    <div style={{fontSize:12,color:'var(--text2)',marginBottom:8}}>{T('onb_enrich_site_desc')}</div>
                    <div style={{display:'flex',gap:8}}>
                      <input className="form-input" placeholder="ex: entreprise.fr" value={profile.domain||''} onChange={(e:any)=>setProfile((p:any)=>({...p,domain:e.target.value}))} style={{flex:1,fontSize:12}}/>
                      <button className="btn btn-secondary" style={{fontSize:12,flexShrink:0}} onClick={enrichProfile} disabled={enriching}>{enriching?<><span className="spinner"/>...</>:T('onb_analyse_btn')}</button>
                    </div>
                    {enrichSuggestions&&(
                      <div style={{marginTop:8}}>
                        {(Object.entries(enrichSuggestions) as [string,string][]).filter(([k])=>k!=='summary').map(([k,v])=>{
                          const labels:Record<string,string>={company:'Entreprise',sector:'Secteur',audience:'Audience',tech_stack:'Stack'}
                          return (<div key={k} style={{display:'flex',alignItems:'center',gap:6,marginBottom:5}}><span style={{fontSize:11,color:'var(--text2)',width:58,flexShrink:0}}>{labels[k]||k}</span><span style={{fontSize:11,color:'var(--text1)',flex:1,background:'var(--ivory)',padding:'3px 7px',borderRadius:5,border:'1px solid var(--border)'}}>{v}</span><button className="btn btn-primary" style={{fontSize:10,padding:'3px 8px',flexShrink:0}} onClick={()=>applyEnrichSuggestion(k,v)}>OK</button></div>)
                        })}
                      </div>
                    )}
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button className="btn btn-ghost" style={{fontSize:12}} onClick={()=>setOnboardingStep(0)}>← {lang==='en'?'Back':'Retour'}</button>
                    <button className="btn btn-ghost" style={{flex:1,justifyContent:'center',fontSize:12}} onClick={()=>setOnboardingStep(2)}>{T('onb_pass_btn')}</button>
                    <button className="btn btn-primary" style={{flex:2,justifyContent:'center'}} onClick={()=>setOnboardingStep(2)}>{T('onb_continue_btn')}</button>
                  </div>
                </div>
              )}
              {onboardingStep===3&&(
  <div style={{display:'flex',flexDirection:'column',gap:16}}>
    <div style={{textAlign:'center',marginBottom:8}}>
      <div style={{fontFamily:"'Clash Display',sans-serif",fontSize:20,fontWeight:700,color:'var(--text1)',marginBottom:6}}>{T('choose_plan')}</div>
      <div style={{fontSize:13,color:'var(--text2)'}}>{T('choose_plan_sub')}</div>
    </div>
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{border:'1.5px solid var(--border)',borderRadius:14,padding:'16px 20px',cursor:'pointer',transition:'border-color 0.2s'}} onClick={finishOnboarding}
        onMouseEnter={e=>(e.currentTarget.style.borderColor='var(--indigo)')} onMouseLeave={e=>(e.currentTarget.style.borderColor='var(--border)')}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
          <div style={{fontFamily:"'Clash Display',sans-serif",fontWeight:700,fontSize:15,color:'var(--text1)'}}>{T('free_plan_label')}</div>
          <span style={{fontSize:11,background:'var(--sand)',color:'var(--text2)',padding:'2px 8px',borderRadius:20,fontWeight:500}}>{lang==='en'?'Free forever':'Gratuit'}</span>
        </div>
        {['5 posts','IA basique','Style personnalisé'].map((f,i)=>(<div key={i} style={{fontSize:12,color:'var(--text2)',display:'flex',alignItems:'center',gap:5,marginBottom:2}}><span style={{color:'var(--indigo)'}}>✓</span>{f}</div>))}
      </div>
      <div style={{border:'2px solid var(--indigo)',borderRadius:14,padding:'16px 20px',cursor:'pointer',background:'var(--indigo)',color:'white',position:'relative',overflow:'hidden'}} onClick={async()=>{
        if(!userId) return;
        const res = await authFetch('/api/stripe/checkout',{method:'POST',body:JSON.stringify({userId,email:(profile as any)?.email ?? ''})});
        const data = await res.json();
        if(data.url) window.location.href = data.url;
        else console.error('Checkout error:', data);
      }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
          <div style={{fontFamily:"'Clash Display',sans-serif",fontWeight:700,fontSize:15}}>{T('pro_plan_label')}</div>
          <span style={{fontSize:10,background:'rgba(255,255,255,0.2)',padding:'2px 8px',borderRadius:20,fontWeight:600,letterSpacing:'0.05em'}}>POPULAIRE</span>
        </div>
        {[lang==='en'?'Unlimited posts':'Posts illimités',lang==='en'?'Advanced AI':'IA avancée',lang==='en'?'Visuals + Calendar':'Visuels + Calendrier',lang==='en'?'Direct LinkedIn publishing':'Publication directe'].map((f,i)=>(<div key={i} style={{fontSize:12,opacity:0.9,display:'flex',alignItems:'center',gap:5,marginBottom:2}}><span>✓</span>{f}</div>))}
      </div>
      <div style={{border:'1.5px dashed var(--border)',borderRadius:14,padding:'16px 20px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
          <div style={{fontFamily:"'Clash Display',sans-serif",fontWeight:700,fontSize:15,color:'var(--text2)'}}>{T('team_plan_label')}</div>
        </div>
        <div style={{fontSize:12,color:'var(--text3)',marginBottom:10}}>{T('team_plan_desc')}</div>
        <button onClick={async()=>{
          const email = (profile as any).email
          if(email){await authFetch('/api/waitlist',{method:'POST',body:JSON.stringify({email})}); showToast(lang==='en'?'Added to waitlist ✓':'Inscrit sur la liste d\'attente ✓')}
        }} style={{fontSize:11,padding:'5px 12px',borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--text2)',cursor:'pointer',fontFamily:'inherit',width:'100%'}}>
          {lang==='en'?'Notify me at launch':'M\'avertir au lancement'}
        </button>
      </div>
    </div>
  </div>
)}
{onboardingStep===2&&(
                <div>
                  {([[T('onb_field_prenom'),'name'],[T('onb_field_role'),'role'],[T('onb_field_company'),'company'],[T('onb_field_sector'),'sector'],[T('onb_field_audience'),'audience']] as [string,keyof typeof profile][]).map(([label,key])=>(
                    <div className="form-group" key={key} style={{marginBottom:8}}>
                      <label className="form-label">{label}</label>
                      <input type="text" className="form-input" value={profile[key]||''} onChange={e=>setProfile(p=>({...p,[key]:e.target.value}))} style={{fontSize:13}}/>
                    </div>
                  ))}
                  <div style={{marginBottom:12}}>
                    <label className="form-label" style={{fontSize:12}}>{lang==='en'?'How do you address your audience?':'Comment tu t\'adresses à ton audience ?'}</label>
                    <div style={{display:'flex',gap:8,marginTop:6}}>
                      {['tutoiement','vouvoiement'].map(f=>(
                        <button key={f} onClick={()=>setProfile((p:any)=>({...p,formality:f}))} style={{flex:1,padding:'8px',borderRadius:8,border:`1px solid ${(profile as any).formality===f||(!(profile as any).formality&&f==='vouvoiement')?'var(--indigo)':'var(--border)'}`,background:(profile as any).formality===f||(!(profile as any).formality&&f==='vouvoiement')?'rgba(61,82,160,0.08)':'transparent',color:(profile as any).formality===f||(!(profile as any).formality&&f==='vouvoiement')?'var(--indigo)':'var(--text2)',fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:'inherit',textTransform:'capitalize' as const}}>{lang==='en'?(f==='tutoiement'?'Informal (tu)':'Formal (vous)'):f}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:8,marginTop:14}}>
                    <button className="btn btn-ghost" style={{fontSize:12}} onClick={()=>setOnboardingStep(1)}>← {lang==='en'?'Back':'Retour'}</button>
                    <button className="btn btn-ghost" style={{justifyContent:'center',fontSize:12}} onClick={completeOnboarding}>{T('onb_pass_btn')}</button>
                    <button className="btn btn-primary" style={{flex:1,justifyContent:'center'}} onClick={async()=>{await handleSaveProfile();completeOnboarding()}}>{T('save_and_start')}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* MODAL APERÇU LINKEDIN */}
      {/* MODAL BATCH IDÉES */}
      {showBatchModal && (
        <div onClick={()=>{if(!batchLoading)setShowBatchModal(false)}} style={{position:'fixed',inset:0,zIndex:700,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)',padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'var(--white)',borderRadius:20,width:'100%',maxWidth:520,boxShadow:'0 24px 64px rgba(0,0,0,0.2)',overflow:'hidden'}}>
            <div style={{background:'var(--indigo)',padding:'20px 24px'}}>
              <div style={{fontSize:16,fontWeight:700,color:'white',marginBottom:4}}>{lang==='en'?`Generate ${selectedIdeaIds.size} post(s)`:`Générer ${selectedIdeaIds.size} post(s)`}</div>
              <div style={{fontSize:12,color:'rgba(255,255,255,0.7)'}}>Choisissez le format, la longueur et le ton</div>
            </div>
            {batchPosts.length === 0 && !batchLoading ? (
              <div style={{padding:'20px 24px 24px'}}>
                <div className="form-group" style={{marginBottom:12}}>
                  <label className="form-label">{lang==='en'?'Format':'Format'}</label>
                  <select className="form-input" value={batchFormat} onChange={e=>setBatchFormat(e.target.value)}>
                    {['storytelling','liste','conseils','prise_de_position','inspiration','etude_de_cas'].map(f=>(
                      <option key={f} value={f}>{f.charAt(0).toUpperCase()+f.slice(1).replace(/_/g,' ')}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{marginBottom:12}}>
                  <label className="form-label">{lang==='en'?'Length':'Longueur'}</label>
                  <div style={{display:'flex',gap:8}}>
                    {(['short','medium','long'] as const).map(l=>(
                      <button key={l} onClick={()=>setBatchLength(l)} style={{flex:1,padding:'8px',borderRadius:8,border:`1px solid ${batchLength===l?'var(--indigo)':'var(--border)'}`,background:batchLength===l?'rgba(61,82,160,0.08)':'transparent',color:batchLength===l?'var(--indigo)':'var(--text2)',fontSize:12,cursor:'pointer',fontFamily:'inherit',fontWeight:batchLength===l?600:400}}>
                        {l==='short'?(lang==='en'?'Short':'Court'):l==='medium'?(lang==='en'?'Medium':'Moyen'):(lang==='en'?'Long':'Long')}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group" style={{marginBottom:20}}>
                  <label className="form-label">{lang==='en'?'Tone':'Ton'}</label>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap' as const}}>
                    {['expert','accessible','direct','storyteller'].map(t=>(
                      <button key={t} onClick={()=>setBatchTone(t)} className={`chip ${batchTone===t?'on':''}`} style={{fontSize:11,padding:'4px 12px'}}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
                    ))}
                  </div>
                </div>
                <button className="btn btn-primary" style={{width:'100%',justifyContent:'center'}} onClick={generateBatch}>
                  ✦ {lang==='en'?'Generate all posts':'Générer tous les posts'}
                </button>
              </div>
            ) : batchLoading ? (
              <div style={{padding:'40px 24px',textAlign:'center' as const}}>
                <div className="spinner" style={{margin:'0 auto 12px'}}/>
                <div style={{fontSize:13,color:'var(--text2)'}}>{lang==='en'?'Generating your posts…':'Génération de vos posts en cours…'}</div>
              </div>
            ) : (
              <div style={{padding:'20px 24px 24px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                  <div style={{fontSize:12,color:'var(--text2)'}}>Post {batchIndex+1} / {batchPosts.length}</div>
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={()=>setBatchIndex(i=>Math.max(0,i-1))} disabled={batchIndex===0} className="btn btn-ghost" style={{fontSize:11,padding:'4px 10px'}}>←</button>
                    <button onClick={()=>setBatchIndex(i=>Math.min(batchPosts.length-1,i+1))} disabled={batchIndex===batchPosts.length-1} className="btn btn-ghost" style={{fontSize:11,padding:'4px 10px'}}>→</button>
                  </div>
                </div>
                <div style={{fontWeight:600,fontSize:13,color:'var(--text1)',marginBottom:8}}>{batchPosts[batchIndex]?.topic}</div>
                <div style={{background:'var(--ivory)',borderRadius:8,border:'1px solid var(--border)',padding:12,fontSize:13,color:'var(--text1)',lineHeight:1.7,whiteSpace:'pre-wrap' as const,maxHeight:200,overflow:'auto',marginBottom:12}}>{batchPosts[batchIndex]?.content}</div>
                <div style={{display:'flex',gap:8}}>
                  <button className="btn btn-primary" style={{flex:1,justifyContent:'center',fontSize:12}} onClick={()=>{
                    const contents = batchPosts.map(p=>p.content)
                    setPostVariants(contents)
                    setPostOutput(contents[0])
                    setActiveVariant(0)
                    setPostTopic(batchPosts[0].topic)
                    setShowBatchModal(false)
                    setPage('rediger')
                  }}>
                    {lang==='en'?'Open in editor':"Ouvrir dans l'éditeur"}
                  </button>
                  <button className="btn btn-ghost" style={{fontSize:12}} onClick={async()=>{setPostOutput(batchPosts[batchIndex].content);setPostTopic(batchPosts[batchIndex].topic);await new Promise(r=>setTimeout(r,100));savePost();showToast(lang==='en'?'Saved ✓':'Sauvegardé ✓')}}>
                    {lang==='en'?'Save':'Sauvegarder'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showPreviewModal && (
        <div onClick={()=>setShowPreviewModal(false)} style={{position:'fixed',inset:0,zIndex:700,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)',padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'white',borderRadius:16,width:'100%',maxWidth:560,maxHeight:'90vh',overflow:'hidden',boxShadow:'0 24px 64px rgba(0,0,0,0.2)',display:'flex',flexDirection:'column' as const}}>
            {/* Header modal */}
            <div style={{padding:'14px 16px',borderBottom:'1px solid #e0e0e0',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <svg viewBox="0 0 24 24" fill="#0a66c2" style={{width:20,height:20}}><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                <span style={{fontSize:13,fontWeight:600,color:'#1F2421'}}>Aperçu LinkedIn</span>
              </div>
              <button onClick={()=>setShowPreviewModal(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#666',lineHeight:1}}>✕</button>
            </div>
            {/* Contenu scrollable */}
            <div style={{overflow:'auto',flex:1,padding:16,background:'#f3f2ef'}}>
              <div style={{background:'white',borderRadius:8,padding:16,boxShadow:'0 1px 3px rgba(0,0,0,0.08)',fontFamily:'system-ui,sans-serif'}}>
                {/* Header post LinkedIn */}
                <div style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:12}}>
                  {(profile as any).linkedin_picture
                    ? <img src={(profile as any).linkedin_picture} alt="" style={{width:48,height:48,borderRadius:'50%',objectFit:'cover',flexShrink:0}}/>
                    : <div style={{width:48,height:48,borderRadius:'50%',background:'#3D52A0',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:700,fontSize:16,flexShrink:0}}>{profile.name?profile.name.slice(0,2).toUpperCase():'??'}</div>
                  }
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:14,color:'#000'}}>{profile.name||'Votre nom'}</div>
                    <div style={{fontSize:12,color:'#666',marginBottom:2}}>{profile.role}{profile.company?` · ${profile.company}`:''}</div>
                    <div style={{fontSize:11,color:'#666',display:'flex',alignItems:'center',gap:4}}>À l&apos;instant · <svg viewBox="0 0 16 16" fill="#666" style={{width:12,height:12}}><path d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 14.5A6.5 6.5 0 118 1.5a6.5 6.5 0 010 13z"/></svg></div>
                  </div>
                  <button style={{background:'none',border:'none',cursor:'default',fontSize:18,color:'#666'}}>···</button>
                </div>
                {/* Contenu post avec voir plus */}
                <div style={{fontSize:14,color:'#000',lineHeight:1.65,marginBottom:10}}>
                  {(() => {
                    const lines = postOutput.split('\n')
                    const preview = lines.slice(0, 3).join('\n')
                    const hasMore = lines.length > 3
                    if (!hasMore || previewExpanded) {
                      return <div style={{whiteSpace:'pre-wrap' as const}} dangerouslySetInnerHTML={{__html: sanitizeSvg(postOutput.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/(#[^\s#<>]+)/g,'<span style="color:#0a66c2">$1</span>').replace(/(@[^\s@<>]+)/g,'<span style="color:#0a66c2">$1</span>'))}}/>
                    }
                    return (
                      <>
                        <div style={{whiteSpace:'pre-wrap' as const}} dangerouslySetInnerHTML={{__html: sanitizeSvg(preview.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/(#[^\s#<>]+)/g,'<span style="color:#0a66c2">$1</span>').replace(/(@[^\s@<>]+)/g,'<span style="color:#0a66c2">$1</span>'))}}/>
                        <span onClick={()=>setPreviewExpanded(true)} style={{color:'#666',cursor:'pointer',fontSize:13}}>...voir plus</span>
                      </>
                    )
                  })()}
                </div>
                {/* Visuel si présent */}
                {(aiSvgContent || customVisualBase64) && (
                  <div style={{marginBottom:10,borderRadius:6,overflow:'hidden',border:'1px solid #e0e0e0'}}>
                    {aiSvgContent
                      ? <div style={{width:'100%',pointerEvents:'none'}} dangerouslySetInnerHTML={{__html: sanitizeSvg(aiSvgContent).replace(/<svg/, '<svg style="width:100%;height:auto;display:block"')}}/>
                      : <img src={`data:image/png;base64,${customVisualBase64}`} alt="" style={{width:'100%',display:'block'}}/>
                    }
                  </div>
                )}
                {/* Compteurs */}
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#666',padding:'8px 0',borderBottom:'1px solid #e0e0e0',marginBottom:4}}>
                  <span>👍 ❤️ 💡 24</span>
                  <span>3 commentaires</span>
                </div>
                {/* Actions */}
                <div style={{display:'flex',justifyContent:'space-around',paddingTop:4}}>
                  {["👍 J'aime","💬 Commenter","🔁 Republier"," Envoyer"].map((a,i)=>(
                    <button key={i} style={{background:'none',border:'none',cursor:'default',fontSize:12,color:'#666',padding:'6px 8px',borderRadius:4,display:'flex',alignItems:'center',gap:4,fontFamily:'inherit'}}>{a}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showVisualModal&&(<VisualModal onClose={()=>setShowVisualModal(false)} postContent={postOutput} postTopic={postTopic} profileName={profile.name} profileRole={profile.role} profileCompany={profile.company} profileSector={profile.sector} brandBg={profile.brand_bg} brandText={profile.brand_text} brandAccent={profile.brand_accent}/>)}
      {showUpgradeModal&&<UpgradeModal onClose={()=>setShowUpgradeModal(false)} lang={lang}/>}
      <div className={`toast ${toastVisible?'show':''}`}>{toast}</div>
    </>
  )
}

const BarIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 20V14M12 20V10M18 20V6"/></svg>
const CalIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>
const GridIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
const BulbIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.3 6L15 20H9l-.7-5C6.3 13.7 5 11.5 5 9a7 7 0 0 1 7-7Z"/><path d="M9 21h6"/></svg>
const EditIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/></svg>
const ImgIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
const BookIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></svg>
const UserIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
