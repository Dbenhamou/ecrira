import { useState, useEffect, useCallback, useRef } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'
import { useProfile } from '../lib/useProfile'

type Idea = { topic: string; title: string; hook: string; recommended?: boolean }
type Post = { id: string; topic: string; content: string; format: string; created_at: string }

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
    colors:{ bg:brandBg||'#F8F6F2', text:brandText||'#232323', accent:brandAccent||'#4F6754' },
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
  const fontStack = FONTS.find(f=>f.id===s.font)?.stack||"'Playfair Display',serif"
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
    const wm=s.showWatermark?`<span style="font-family:'Inter',sans-serif;font-size:${p(13)}px;font-weight:600;letter-spacing:.06em;color:${s.colors.text};margin-left:${p(8)}px;">POSTORIA</span>`:''
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
    const a=document.createElement('a'); a.download=`postoria-${s.tpl}-${f==='square'?'1080x1080':'1080x1350'}.png`
    a.href=canvas.toDataURL('image/png'); a.click(); document.body.removeChild(div)
  },[s])

  const S_BASE=1080; const H_BASE=s.fmt==='portrait'?Math.round(S_BASE*1.25):S_BASE
  const previewW=Math.round(S_BASE*zoom/100); const previewH=Math.round(H_BASE*zoom/100)
  const QUICK_COLORS=['#FFFFFF','#232323','#F8F6F2','#ECE6DD','#4F6754','#A8784F','#2563EB','#DC2626','#D97706','#7C3AED']
  const POS_GRID=[['tl','tc','tr'],['ml','mc','mr'],['bl','bc','br']]
  const POS_LABELS:Record<string,string>={tl:'↖',tc:'↑',tr:'↗',ml:'←',mc:'·',mr:'→',bl:'↙',bc:'↓',br:'↘'}

  return (
    <div style={{position:'fixed',inset:0,zIndex:500,background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(4px)',padding:20}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div style={{background:'var(--ivory)',borderRadius:20,width:'100%',maxWidth:1100,maxHeight:'92vh',display:'flex',flexDirection:'column',boxShadow:'0 24px 80px rgba(0,0,0,0.25)',overflow:'hidden'}}>
        <div style={{padding:'16px 24px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--white)',flexShrink:0}}>
          <div><div style={{fontSize:11,fontWeight:600,color:'var(--copper)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:2}}>Visuel du post</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:500,color:'var(--text1)'}}>Générateur de visuel</div></div>
          <div style={{display:'flex',gap:8}}><button className="btn btn-primary" style={{fontSize:12}} onClick={()=>exportPNG()}>↓ Télécharger PNG</button><button className="btn btn-ghost" style={{fontSize:12}} onClick={onClose}>✕ Fermer</button></div>
        </div>
        <div style={{display:'flex',flex:1,overflow:'hidden'}}>
          <div style={{width:264,flexShrink:0,overflowY:'auto',padding:16,borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',gap:10,background:'var(--white)'}}>
            <div className="card-sm" style={{padding:'12px 14px'}}><div className="section-label">Template</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:5}}>{[{id:'quote',icon:'❝',label:'Quote'},{id:'stat',icon:'◎',label:'Stat'},{id:'alert',icon:'⚡',label:'Alerte'}].map(t=>(<button key={t.id} onClick={()=>upd({tpl:t.id})} style={{padding:'7px 4px',borderRadius:8,border:`1px solid ${s.tpl===t.id?'var(--forest)':'var(--border)'}`,background:s.tpl===t.id?'var(--forest)':'var(--ivory)',color:s.tpl===t.id?'white':'var(--text2)',fontSize:10,fontWeight:500,cursor:'pointer',textAlign:'center' as const,fontFamily:'inherit'}}><span style={{display:'block',fontSize:14,marginBottom:1}}>{t.icon}</span>{t.label}</button>))}</div></div>
            <div style={{display:'flex',gap:5}}>{(['basic','advanced'] as const).map(id=>(<button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:'7px',borderRadius:8,border:`1px solid ${tab===id?'var(--forest)':'var(--border)'}`,background:tab===id?'var(--forest)':'var(--ivory)',color:tab===id?'white':'var(--text2)',fontSize:11,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>{id==='basic'?'Basique':'Avancé'}</button>))}</div>
            {tab==='basic'&&<><div className="card-sm" style={{padding:'12px 14px'}}><div className="section-label">Couleurs</div>{([['Fond','bg'],['Texte','text'],['Accent','accent']] as [string,string][]).map(([label,key])=>(<div key={key} style={{display:'flex',alignItems:'center',gap:7,marginBottom:7}}><span style={{fontSize:10,color:'var(--text2)',width:40,flexShrink:0}}>{label}</span><input type="color" value={(s.colors as any)[key]} onChange={e=>updC(key,e.target.value)} style={{width:26,height:26,borderRadius:6,border:'1px solid var(--border)',cursor:'pointer',padding:2}}/><input className="form-input" value={(s.colors as any)[key]} onChange={e=>updC(key,e.target.value)} style={{fontSize:10,fontFamily:'monospace',padding:'3px 7px',flex:1}}/></div>))}<div style={{display:'flex',gap:4,flexWrap:'wrap' as const,marginTop:6}}>{QUICK_COLORS.map((c,i)=>(<div key={i} onClick={()=>updC('accent',c)} style={{width:20,height:20,borderRadius:'50%',background:c,border:`2px solid ${c==='#FFFFFF'?'#e0ddd8':'transparent'}`,cursor:'pointer',boxShadow:'0 1px 3px rgba(0,0,0,.15)'}}/>))}</div><div style={{display:'flex',gap:4,flexWrap:'wrap' as const,marginTop:6}}>{PALETTES.map((p:any,i:number)=>(<div key={i} onClick={()=>upd({colors:{bg:p.bg,text:p.text,accent:p.accent}})} title={p.name} style={{width:20,height:20,borderRadius:5,background:p.bg,border:`2px solid ${p.accent}`,cursor:'pointer'}}/>))}</div></div>
            <div className="card-sm" style={{padding:'12px 14px'}}><div className="section-label">Contenu</div>
              {s.tpl==='quote'&&<><div className="form-group" style={{marginBottom:10}}><label className="form-label">Citation</label><textarea className="form-input" rows={4} value={s.qText} onChange={(e:any)=>upd({qText:e.target.value})} style={{fontSize:11}}/></div><div className="form-group" style={{marginBottom:10}}><label className="form-label">Auteur</label><input className="form-input" value={s.qAuthor} onChange={(e:any)=>upd({qAuthor:e.target.value})} style={{fontSize:11}}/></div><div className="form-group" style={{marginBottom:0}}><label className="form-label">Tag</label><input className="form-input" value={s.qTag} onChange={(e:any)=>upd({qTag:e.target.value})} style={{fontSize:11}}/></div></>}
              {s.tpl==='stat'&&<><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><div className="form-group" style={{marginBottom:10}}><label className="form-label">Chiffre</label><input className="form-input" value={s.sNum} onChange={(e:any)=>upd({sNum:e.target.value})} style={{fontSize:11}}/></div><div className="form-group" style={{marginBottom:10}}><label className="form-label">Unité</label><input className="form-input" value={s.sUnit} onChange={(e:any)=>upd({sUnit:e.target.value})} style={{fontSize:11}}/></div></div><div className="form-group" style={{marginBottom:10}}><label className="form-label">Label</label><input className="form-input" value={s.sLabel} onChange={(e:any)=>upd({sLabel:e.target.value})} style={{fontSize:11}}/></div><div className="form-group" style={{marginBottom:10}}><label className="form-label">Contexte</label><textarea className="form-input" rows={3} value={s.sCtx} onChange={(e:any)=>upd({sCtx:e.target.value})} style={{fontSize:11}}/></div><div className="form-group" style={{marginBottom:0}}><label className="form-label">Source</label><input className="form-input" value={s.sSrc} onChange={(e:any)=>upd({sSrc:e.target.value})} style={{fontSize:11}}/></div></>}
              {s.tpl==='alert'&&<><div className="form-group" style={{marginBottom:10}}><label className="form-label">Référence</label><input className="form-input" value={s.aRef} onChange={(e:any)=>upd({aRef:e.target.value})} style={{fontSize:11}}/></div><div className="form-group" style={{marginBottom:10}}><label className="form-label">Titre</label><input className="form-input" value={s.aTitle} onChange={(e:any)=>upd({aTitle:e.target.value})} style={{fontSize:11}}/></div><div className="form-group" style={{marginBottom:10}}><label className="form-label">Description</label><textarea className="form-input" rows={2} value={s.aDesc} onChange={(e:any)=>upd({aDesc:e.target.value})} style={{fontSize:11}}/></div><div className="form-group" style={{marginBottom:10}}><label className="form-label">Actions (1/ligne)</label><textarea className="form-input" rows={3} value={s.aItems} onChange={(e:any)=>upd({aItems:e.target.value})} style={{fontSize:11}}/></div><div className="form-group" style={{marginBottom:0}}><label className="form-label">Sévérité</label><select className="form-input" value={s.aSev} onChange={(e:any)=>upd({aSev:e.target.value})} style={{fontSize:11}}><option>CRITIQUE</option><option>ÉLEVÉE</option><option>MODÉRÉE</option></select></div></>}
            </div></>}
            {tab==='advanced'&&<><div className="card-sm" style={{padding:'12px 14px'}}><div className="section-label">Typographie</div><div className="form-group" style={{marginBottom:10}}><label className="form-label">Police</label><select className="form-input" value={s.font} onChange={(e:any)=>upd({font:e.target.value})} style={{fontSize:11}}>{FONTS.map(f=><option key={f.id} value={f.id}>{f.label}</option>)}</select></div><div className="form-group" style={{marginBottom:10}}><label className="form-label">Taille</label><div style={{display:'flex',gap:4}}>{['S','M','L','XL'].map(sz=>(<button key={sz} onClick={()=>upd({textSize:sz})} style={{flex:1,padding:'6px',borderRadius:7,border:`1px solid ${s.textSize===sz?'var(--forest)':'var(--border)'}`,background:s.textSize===sz?'var(--forest)':'var(--ivory)',color:s.textSize===sz?'white':'var(--text2)',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}>{sz}</button>))}</div></div><div className="form-group" style={{marginBottom:0}}><label className="form-label">Alignement</label><div style={{display:'flex',gap:4}}>{[{id:'left',l:'Gauche'},{id:'center',l:'Centré'}].map(a=>(<button key={a.id} onClick={()=>upd({align:a.id})} style={{flex:1,padding:'6px',borderRadius:7,border:`1px solid ${s.align===a.id?'var(--forest)':'var(--border)'}`,background:s.align===a.id?'var(--forest)':'var(--ivory)',color:s.align===a.id?'white':'var(--text2)',fontSize:10,cursor:'pointer',fontFamily:'inherit'}}>{a.l}</button>))}</div></div></div>
            <div className="card-sm" style={{padding:'12px 14px'}}><div className="section-label">Décoration</div><div className="form-group" style={{marginBottom:10}}><label className="form-label">Accent</label><select className="form-input" value={s.accentStyle} onChange={(e:any)=>upd({accentStyle:e.target.value})} style={{fontSize:11}}><option value="bar">Barre verticale gauche</option><option value="top">Barre horizontale haut</option><option value="gradient">Gradient latéral</option><option value="none">Aucun</option></select></div><div className="form-group" style={{marginBottom:0}}><label className="form-label">Motif de fond</label><select className="form-input" value={s.bgPattern} onChange={(e:any)=>upd({bgPattern:e.target.value})} style={{fontSize:11}}><option value="none">Aucun</option><option value="dots">Points</option><option value="grid">Grille</option><option value="diag">Diagonales</option><option value="circles">Cercles</option></select></div></div>
            <div className="card-sm" style={{padding:'12px 14px'}}><div className="section-label">Logo & icône</div><input ref={fileRef} type="file" accept="image/*" onChange={(e:any)=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=(ev)=>upd({logoUrl:ev.target?.result});r.readAsDataURL(f)}} style={{display:'none'}}/><div style={{display:'flex',gap:6,marginBottom:10}}><button onClick={()=>fileRef.current?.click()} className="btn btn-ghost" style={{fontSize:11,flex:1,justifyContent:'center'}}>{s.logoUrl?'✓ Logo chargé':'↑ Choisir'}</button>{s.logoUrl&&<button onClick={()=>upd({logoUrl:null})} className="btn btn-ghost" style={{fontSize:10,color:'#c0392b',borderColor:'transparent'}}>✕</button>}</div>{!s.logoUrl&&<div className="form-group" style={{marginBottom:10}}><label className="form-label">Icône sectorielle</label><select className="form-input" value={s.sectorIcon} onChange={(e:any)=>upd({sectorIcon:e.target.value})} style={{fontSize:11}}><option value="cyber">🔒 Cybersécurité</option><option value="finance">💳 Finance</option><option value="tech">💻 Tech</option><option value="marketing">📣 Marketing</option><option value="rh">👥 RH</option><option value="sante">❤️ Santé</option><option value="conseil">📋 Conseil</option><option value="none">Aucune</option></select></div>}<div className="form-group" style={{marginBottom:8}}><label className="form-label">Position</label><div style={{display:'inline-grid',gridTemplateColumns:'repeat(3,26px)',gap:3}}>{POS_GRID.map(row=>row.map(pos=>(<button key={pos} onClick={()=>upd({logoPos:pos})} style={{width:26,height:26,borderRadius:5,border:`1px solid ${s.logoPos===pos?'var(--forest)':'var(--border)'}`,background:s.logoPos===pos?'var(--forest)':'var(--ivory)',color:s.logoPos===pos?'white':'var(--text2)',fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{POS_LABELS[pos]}</button>)))}</div></div><div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}><span style={{fontSize:11,color:'var(--text2)'}}>Watermark</span><div className={`toggle ${s.showWatermark?'on':''}`} onClick={()=>upd({showWatermark:!s.showWatermark})}><div className="toggle-dot"/></div></div></div></>}
            <div className="card-sm" style={{padding:'12px 14px'}}><div className="section-label">Format</div><div style={{display:'flex',gap:5,marginBottom:10}}>{['square','portrait'].map(f=>(<button key={f} onClick={()=>upd({fmt:f})} style={{flex:1,padding:'7px',borderRadius:8,border:`1px solid ${s.fmt===f?'var(--forest)':'var(--border)'}`,background:s.fmt===f?'var(--forest)':'var(--ivory)',color:s.fmt===f?'white':'var(--text2)',fontSize:10,cursor:'pointer',fontFamily:'inherit'}}>{f==='square'?'1080×1080':'1080×1350'}</button>))}</div><div style={{marginBottom:10}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}><label style={{fontSize:10,color:'var(--text2)',fontWeight:500}}>Zoom</label><span style={{fontSize:10,color:'var(--text3)',fontFamily:'monospace'}}>{zoom}%</span></div><input type="range" min={30} max={100} value={zoom} onChange={(e:any)=>setZoom(parseInt(e.target.value))} style={{width:'100%',accentColor:'var(--forest)'}}/></div><button className="btn btn-primary" style={{width:'100%',justifyContent:'center',fontSize:12,marginBottom:5}} onClick={()=>exportPNG()}>↓ PNG</button><button className="btn btn-ghost" style={{width:'100%',justifyContent:'center',fontSize:11}} onClick={async()=>{await exportPNG('square');await new Promise(r=>setTimeout(r,400));await exportPNG('portrait')}}>↓ Les 2 formats</button></div>
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
export default function Home() {
  const { profile, setProfile, saveProfile, signOut, loading, userId } = useProfile()
  const [page, setPage] = useState('apercu')
  const [dark, setDark] = useState(false)
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [ideasGeneratedAt, setIdeasGeneratedAt] = useState<Date | null>(null)
  const [savedPosts, setSavedPosts] = useState<Post[]>([])
  const [generatedCount, setGeneratedCount] = useState(0)
  const [loadingIdeas, setLoadingIdeas] = useState(false)
  const [loadingPosts, setLoadingPosts] = useState(false)
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
  const [showVisualModal, setShowVisualModal] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [savingProfile, setSavingProfile] = useState(false)
  const [ideasRefreshCountdown, setIdeasRefreshCountdown] = useState<number | null>(null)
  const ideasLastRefresh = useRef<number | null>(null)
  const IDEAS_REFRESH_MS = 2 * 60 * 60 * 1000

  // Load theme
  useEffect(() => {
    const theme = localStorage.getItem('postoria_dark')
    if (theme === '1') { setDark(true); document.documentElement.dataset.theme = 'dark' }
  }, [])

  // Load Supabase data once userId is available
  useEffect(() => {
    if (!userId) return
    loadPosts()
    loadIdeas()
    loadCount()
  }, [userId])

  useEffect(() => {
    if (!loading && userId && !profile.role) setShowOnboarding(true)
  }, [loading, userId, profile.role])

  // ── Supabase: load posts ──
  const loadPosts = async () => {
    setLoadingPosts(true)
    const { data } = await supabase.from('saved_posts').select('*').order('created_at', { ascending: false })
    if (data) {
      setSavedPosts(data.map((p: any) => ({
        id: p.id, topic: p.topic, content: p.content, format: p.format,
        created_at: p.created_at_display || new Date(p.created_at).toLocaleDateString('fr-FR'),
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
      const generatedAt = new Date(latestDate)
      setIdeasGeneratedAt(generatedAt)
      ideasLastRefresh.current = generatedAt.getTime()
      const remaining = IDEAS_REFRESH_MS - (Date.now() - generatedAt.getTime())
      setIdeasRefreshCountdown(remaining > 0 ? remaining : 0)
    }
  }

  // ── Supabase: load generated count ──
  const loadCount = async () => {
    const { count } = await supabase.from('saved_posts').select('*', { count: 'exact', head: true })
    if (count !== null) setGeneratedCount(count)
  }

  // Auto-refresh ideas every 2h
  useEffect(() => {
    const interval = setInterval(() => {
      if (ideasLastRefresh.current !== null) {
        const elapsed = Date.now() - ideasLastRefresh.current
        const remaining = IDEAS_REFRESH_MS - elapsed
        if (remaining <= 0) {
          fetch('/api/ideas', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({profile}) })
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
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) + ' à ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  const showToast = (msg: string) => { setToast(msg); setToastVisible(true); setTimeout(()=>setToastVisible(false), 2600) }
  const toggleDark = () => { const n=!dark; setDark(n); document.documentElement.dataset.theme=n?'dark':''; localStorage.setItem('postoria_dark',n?'1':'0') }

  const generateIdeas = async () => {
    setLoadingIdeas(true)
    try {
      const res = await fetch('/api/ideas', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({profile}) })
      const data = await res.json()
      if (data.ideas) {
        setIdeas(data.ideas)
        const now = new Date()
        setIdeasGeneratedAt(now)
        ideasLastRefresh.current = now.getTime()
        setIdeasRefreshCountdown(IDEAS_REFRESH_MS)
        await saveIdeasToSupabase(data.ideas)
      } else showToast('Erreur : '+(data.error||'inconnue'))
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
      if (data.content) { setPostOutput(data.content); setGeneratedCount(c => c + 1) }
      else showToast('Erreur : '+(data.error||'inconnue'))
    } catch { showToast('Erreur réseau') }
    setLoadingPost(false)
  }, [postTopic,postFormat,postLength,postTone,profile])

  // ── Supabase: save post ──
  const savePost = async () => {
    if (!postOutput.trim() || !userId) return
    const displayDate = new Date().toLocaleDateString('fr-FR')
    const { data, error } = await supabase.from('saved_posts').insert({
      user_id: userId, topic: postTopic||'Sans titre',
      content: postOutput, format: postFormat, created_at_display: displayDate,
    }).select().single()
    if (!error && data) {
      const post: Post = { id: data.id, topic: data.topic, content: data.content, format: data.format, created_at: displayDate }
      setSavedPosts(prev => [post, ...prev])
      showToast('Post sauvegardé ✓')
    } else {
      showToast('Erreur lors de la sauvegarde')
    }
  }

  // ── Supabase: delete post ──
  const deletePost = async (id: string) => {
    const { error } = await supabase.from('saved_posts').delete().eq('id', id)
    if (!error) {
      setSavedPosts(prev => prev.filter(p => p.id !== id))
      showToast('Post supprimé')
    }
  }

  const copyText = (text:string) => { navigator.clipboard.writeText(text); showToast('Copié ✓') }

  const [enriching, setEnriching] = useState(false)
  const [enrichSuggestions, setEnrichSuggestions] = useState<any>(null)

  const enrichProfile = async () => {
    if (!profile.domain) { showToast('Renseigne d\'abord ton domaine'); return }
    setEnriching(true)
    try {
      const res = await fetch('/api/enrich-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: profile.domain }),
      })
      const data = await res.json()
      if (data.suggestions) setEnrichSuggestions(data.suggestions)
      else showToast(data.error || 'Impossible d\'analyser le site')
    } catch { showToast('Erreur réseau') }
    setEnriching(false)
  }

  const applyEnrichSuggestion = (key: string, value: string) => {
    setProfile(p => ({ ...p, [key]: value }))
    setEnrichSuggestions((prev: any) => { const n = { ...prev }; delete n[key]; return Object.keys(n).length ? n : null })
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    const ok = await saveProfile(profile)
    showToast(ok ? 'Profil enregistré ✓' : 'Erreur lors de la sauvegarde')
    setSavingProfile(false)
  }

  const [linkedinConnected, setLinkedinConnected] = useState(false)

  useEffect(() => {
    // Check LinkedIn connection status from URL param
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('linkedin') === 'success') {
        setLinkedinConnected(true)
        showToast('✓ LinkedIn connecté !')
        window.history.replaceState({}, '', '/')
      } else if (params.get('linkedin') === 'error') {
        showToast('Erreur connexion LinkedIn')
        window.history.replaceState({}, '', '/')
      }
    }
  }, [])

  useEffect(() => {
    // Check if linkedin_token exists in profile
    if ((profile as any).linkedin_token) setLinkedinConnected(true)
  }, [profile])

  const completeOnboarding = async () => {
    if (userId) await supabase.from('profiles').update({ onboarding_done: true } as any).eq('id', userId)
    setShowOnboarding(false)
    showToast('Bienvenue sur Postoria !')
  }

  const connectLinkedIn = () => {
    window.location.href = `/api/linkedin/auth?userId=${userId}`
  }

  const publishPost = async (scheduled?: string) => {
    if (!postOutput.trim()) { showToast('Aucun post à publier'); return }
    if (!userId) { showToast('Non connecté'); return }
    setPublishing(true)
    try {
      const res = await fetch('/api/linkedin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, content: postOutput }),
      })
      const data = await res.json()
      if (data.success) showToast('✓ Post publié sur LinkedIn !')
      else showToast(data.error || 'Erreur publication')
    } catch { showToast('Erreur réseau') }
    setPublishing(false)
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

  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#F8F6F2',fontFamily:"'Inter',sans-serif"}}>
      <div style={{textAlign:'center' as const}}>
        <div style={{width:36,height:36,background:'#4F6754',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 4h8a4 4 0 0 1 0 8H6V4Z" fill="white" opacity=".9"/><path d="M6 12h5l4 8H6v-8Z" fill="white" opacity=".5"/></svg></div>
        <div style={{fontSize:13,color:'#727272'}}>Chargement…</div>
      </div>
    </div>
  )

  const ideasSection = (
    <>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
        <div>
          <div className="section-label" style={{marginBottom:2}}>Idées du jour</div>
          {ideasGeneratedAt && (
            <div style={{fontSize:11,color:'var(--text3)'}}>
              Générées le {formatIdeasDate(ideasGeneratedAt)}
              {ideasRefreshCountdown !== null && ideasRefreshCountdown > 0 && (
                <span style={{marginLeft:8,color:'var(--copper)'}}>· Refresh dans {formatCountdown(ideasRefreshCountdown)}</span>
              )}
            </div>
          )}
        </div>
        <button className="btn btn-primary" onClick={generateIdeas} disabled={loadingIdeas}>
          {loadingIdeas ? <><span className="spinner"/> Génération…</> : '✦ Générer les idées'}
        </button>
      </div>
      {loadingIdeas && <div style={{marginBottom:12}}><div className="strip"/></div>}
      {ideas.length === 0 && !loadingIdeas ? (
        <div className="card empty"><div className="empty-icon">✦</div><div className="empty-title">Vos idées du jour vous attendent</div><div className="empty-body">Cliquez sur "Générer les idées" pour recevoir 10 sujets personnalisés.</div></div>
      ) : ideas.map((idea, i) => (
        <div key={i} className="idea-card fade" style={{animationDelay:`${i*.06}s`,border:idea.recommended?'1px solid rgba(168,120,79,0.4)':undefined,background:idea.recommended?'rgba(168,120,79,0.04)':undefined}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
            <span className="idea-tag">{idea.topic}</span>
            {idea.recommended && <span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:20,background:'rgba(168,120,79,0.12)',color:'var(--copper)',border:'1px solid rgba(168,120,79,0.25)'}}>★ Recommandé</span>}
          </div>
          <div className="idea-title">{idea.title}</div>
          <div className="idea-hook">{idea.hook}</div>
          <div className="idea-actions">
            <button className="btn btn-primary" style={{fontSize:12,padding:'7px 13px'}} onClick={()=>generatePost(idea.title)}>Développer</button>
            <button className="btn btn-ghost" onClick={()=>copyText(idea.title+'\n\n'+idea.hook)}>⎘ Copier</button>
          </div>
        </div>
      ))}
    </>
  )

  return (
    <>
      <Head><title>Postoria</title></Head>
      <div className="app">
        <aside className="sidebar">
          <div className="sidebar-logo"><div className="logo-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M6 4h8a4 4 0 0 1 0 8H6V4Z" fill="white" opacity=".9"/><path d="M6 12h5l4 8H6v-8Z" fill="white" opacity=".5"/></svg></div><span className="logo-name">POSTORIA</span></div>
          <nav className="sidebar-nav">{navItems.map(item=>(<button key={item.id} className={`nav-link ${page===item.id?'active':''}`} onClick={()=>setPage(item.id)}>{item.icon}{item.label}</button>))}</nav>
          <div className="sidebar-footer">
            <div className="user-row" onClick={()=>setPage('profil')}>
              <div className="user-avatar">{profile.name?profile.name.slice(0,2).toUpperCase():'??'}</div>
              <div><div className="user-name">{profile.name||'Mon compte'}</div><div className="user-role">{profile.role?`${profile.role.split(' ')[0]} · ${profile.company}`:'Compléter le profil'}</div></div>
            </div>
            <div className="theme-row"><span>Mode sombre</span><div className={`toggle ${dark?'on':''}`} onClick={toggleDark}><div className="toggle-dot"/></div></div>
            <div style={{padding:'4px 10px'}}><button className="btn btn-ghost" style={{width:'100%',justifyContent:'center',fontSize:11,color:'var(--text3)'}} onClick={signOut}>↩ Se déconnecter</button></div>
          </div>
        </aside>

        <div className="main">
          {/* APERÇU */}
          <div className={`page ${page==='apercu'?'active':''}`}>
            <div className="eyebrow">Tableau de bord</div>
            <div className="page-title">Bonjour{profile.name?`, ${profile.name}`:''}.</div>
            <div className="copper-rule"/>
            <div className="page-sub">{new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
            <div className="stats-grid">
              <div className="stat-card"><div className="stat-label">Posts sauvegardés</div><div className="stat-value">{savedPosts.length}</div><div className="stat-note">dans votre bibliothèque</div></div>
              <div className="stat-card"><div className="stat-label">Posts générés</div><div className="stat-value">{generatedCount}</div><div className="stat-note">au total</div></div>
              <div className="stat-card"><div className="stat-label">Secteur actif</div><div className="stat-value" style={{fontSize:18,paddingTop:6}}>{profile.sector?.split(' ')[0]||'Cyber'}</div><div className="stat-note">{profile.company||'Mon entreprise'}</div></div>
            </div>
            {ideasSection}
          </div>

          {/* IDÉES */}
          <div className={`page ${page==='idees'?'active':''}`}>
            <div className="eyebrow">Inspiration</div><div className="page-title">Idées du jour</div><div className="copper-rule"/>
            <div className="page-sub">10 sujets calibrés pour votre audience, sauvegardés automatiquement.</div>
            {ideasSection}
          </div>

          {/* RÉDIGER */}
          <div className={`page ${page==='rediger'?'active':''}`}>
            <div className="eyebrow">Création</div><div className="page-title">Rédiger un post</div><div className="copper-rule"/>
            <div className="page-sub">Décrivez votre idée. Postoria s'occupe du reste.</div>
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
                  {postOutput&&<div style={{display:'flex',gap:7}}><button className="btn btn-ghost" onClick={savePost}>↓ Sauvegarder</button><button className="btn btn-ghost" onClick={()=>copyText(postOutput)}>⎘ Copier</button></div>}
                </div>
                {loadingPost&&<div style={{marginBottom:12}}><div className="strip"/></div>}
                <textarea className="post-editor" value={postOutput} onChange={e=>setPostOutput(e.target.value)} placeholder="Votre post apparaîtra ici…"/>
                {postOutput&&(
                  <div style={{marginTop:14}}>
                    <div style={{background:'rgba(79,103,84,0.05)',border:'1px solid rgba(79,103,84,0.18)',borderRadius:12,padding:'12px 14px',marginBottom:12,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
                      <div><div style={{fontSize:12,fontWeight:600,color:'var(--forest)',marginBottom:2}}>🖼 Ajouter un visuel</div><div style={{fontSize:11,color:'var(--text2)'}}>Génère une image 1080×1080 à partir de ce post.</div></div>
                      <button className="btn btn-secondary" style={{fontSize:12,flexShrink:0}} onClick={()=>setShowVisualModal(true)}>Créer le visuel →</button>
                    </div>
                    {linkedinConnected ? (
                      <div style={{display:'flex',gap:7,alignItems:'center'}}>
                        <button className="btn btn-primary" onClick={()=>publishPost()} disabled={publishing} style={{background:'#0077B5',flex:1,justifyContent:'center'}}>{publishing?<><span className="spinner"/> Publication…</>:'🔗 Publier sur LinkedIn'}</button>
                      </div>
                    ) : (
                      <div style={{background:'rgba(0,119,181,0.06)',border:'1px solid rgba(0,119,181,0.2)',borderRadius:12,padding:'12px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
                        <div><div style={{fontSize:12,fontWeight:600,color:'#0077B5',marginBottom:2}}>🔗 Publier directement sur LinkedIn</div><div style={{fontSize:11,color:'var(--text2)'}}>Connecte ton compte LinkedIn pour publier en 1 clic.</div></div>
                        <button className="btn btn-primary" style={{fontSize:12,flexShrink:0,background:'#0077B5'}} onClick={connectLinkedIn}>Connecter →</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* VISUELS */}
          <div className={`page ${page==='visuels'?'active':''}`} style={{maxWidth:'100%',padding:'28px 32px'}}>
            <div className="eyebrow">Création visuelle</div><div className="page-title">Générateur visuel</div><div className="copper-rule"/>
            <div style={{background:'var(--white)',border:'1px solid var(--border)',borderRadius:16,padding:'20px 24px',marginBottom:18,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div><div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:500,color:'var(--text1)',marginBottom:4}}>Créer un visuel depuis un post</div><div style={{fontSize:13,color:'var(--text2)'}}>Génère d'abord un post dans Rédiger, puis clique sur "Créer le visuel".</div></div>
              {postOutput&&(<button className="btn btn-primary" style={{flexShrink:0}} onClick={()=>setShowVisualModal(true)}>Ouvrir le générateur →</button>)}
            </div>
            <div style={{background:'var(--sand)',borderRadius:16,padding:'40px 24px',textAlign:'center' as const}}><div style={{fontSize:28,marginBottom:12,opacity:.3}}>◫</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontStyle:'italic',color:'var(--text2)',marginBottom:6}}>Générateur intégré au flow publication</div><div style={{fontSize:13,color:'var(--text3)'}}>Rendez-vous dans Rédiger → générez un post → cliquez sur "Créer le visuel".</div></div>
          </div>

          {/* BIBLIOTHÈQUE */}
          <div className={`page ${page==='bibliotheque'?'active':''}`}>
            <div className="eyebrow">Vos contenus</div><div className="page-title">Bibliothèque</div><div className="copper-rule"/>
            <div className="page-sub">Tous vos posts sauvegardés — synchronisés sur tous vos appareils.</div>
            {loadingPosts && <div style={{marginBottom:12}}><div className="strip"/></div>}
            {!loadingPosts && savedPosts.length===0 ? (
              <div className="card empty"><div className="empty-icon">◫</div><div className="empty-title">Bibliothèque vide</div><div className="empty-body">Générez des posts et cliquez sur "Sauvegarder".</div></div>
            ) : savedPosts.map(p=>(
              <div key={p.id} className="saved-card fade">
                <div className="saved-header"><div><span className="badge badge-forest">{fmtLabels[p.format]||p.format}</span><span style={{fontSize:11,color:'var(--text3)',marginLeft:8}}>{p.created_at}</span></div><button className="btn btn-ghost" style={{fontSize:11,color:'#c0392b',borderColor:'transparent'}} onClick={()=>deletePost(p.id)}>Supprimer</button></div>
                <div className="saved-title">{p.topic}</div>
                <div className="saved-preview">{p.content.substring(0,180)}…</div>
                <div style={{display:'flex',gap:7}}><button className="btn btn-secondary" style={{fontSize:12}} onClick={()=>copyText(p.content)}>⎘ Copier</button><button className="btn btn-ghost" style={{fontSize:12}} onClick={()=>{setPostOutput(p.content);setPostTopic(p.topic);setPage('rediger')}}>Modifier</button></div>
              </div>
            ))}
          </div>

          {/* PROFIL */}
          <div className={`page ${page==='profil'?'active':''}`}>
            <div className="eyebrow">Paramètres</div><div className="page-title">Mon profil</div><div className="copper-rule"/>
            <div className="page-sub">Votre contexte guide chaque génération. Sauvegardé dans Supabase.</div>
            <div className="profile-hero"><div className="profile-avatar">{profile.name?profile.name.slice(0,2).toUpperCase():'??'}</div><div><div className="profile-name">{profile.name||'Mon compte'}</div><div className="profile-role">{profile.role} · {profile.company}</div></div></div>
            <div className="grid2">
              <div className="card">
                <div className="section-label">Identité professionnelle</div>
                {([['Prénom','name'],['Rôle','role'],['Entreprise','company'],['Secteur','sector'],['Audience LinkedIn','audience'],['Domaine email','domain']] as [string,keyof typeof profile][]).map(([label,key])=>(
                  <div className="form-group" key={key}>
                    <label className="form-label">{label}</label>
                    <input type="text" className="form-input" value={profile[key]||''} placeholder={key==='domain'?'ex: cyna.fr':undefined} onChange={e=>setProfile(p=>({...p,[key]:e.target.value}))}/>
                    {key==='domain'&&<>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginTop:6}}>
                        <div style={{fontSize:11,color:'var(--text3)',flex:1}}>Utilisé pour personnaliser les idées selon votre domaine.</div>
                        <button className="btn btn-secondary" style={{fontSize:11,flexShrink:0,whiteSpace:'nowrap' as const}} onClick={enrichProfile} disabled={enriching}>
                          {enriching?<><span className="spinner"/> Analyse…</>:'✦ Enrichir'}
                        </button>
                      </div>
                      {enrichSuggestions&&(
                        <div style={{marginTop:12,background:'rgba(79,103,84,0.05)',border:'1px solid rgba(79,103,84,0.2)',borderRadius:12,padding:'14px 16px'}}>
                          <div style={{fontSize:12,fontWeight:600,color:'var(--forest)',marginBottom:10}}>✦ Suggestions détectées depuis {profile.domain}</div>
                          {enrichSuggestions.summary&&<div style={{fontSize:11,color:'var(--text2)',marginBottom:10,fontStyle:'italic'}}>"{enrichSuggestions.summary}"</div>}
                          {(Object.entries(enrichSuggestions) as [string,string][]).filter(([k])=>k!=='summary').map(([k,v])=>{
                            const labels:Record<string,string>={company:'Entreprise',sector:'Secteur',audience:'Audience',tech_stack:'Stack'}
                            return (
                              <div key={k} style={{display:'flex',alignItems:'center',gap:8,marginBottom:7}}>
                                <span style={{fontSize:11,color:'var(--text2)',width:64,flexShrink:0}}>{labels[k]||k}</span>
                                <span style={{fontSize:11,color:'var(--text1)',flex:1,background:'var(--white)',padding:'4px 8px',borderRadius:6,border:'1px solid var(--border)'}}>{v}</span>
                                <button className="btn btn-primary" style={{fontSize:10,padding:'4px 10px',flexShrink:0}} onClick={()=>applyEnrichSuggestion(k,v)}>Appliquer</button>
                              </div>
                            )
                          })}
                          <button className="btn btn-ghost" style={{fontSize:11,marginTop:4,color:'var(--text3)'}} onClick={()=>setEnrichSuggestions(null)}>Ignorer tout</button>
                        </div>
                      )}
                    </>}
                  </div>
                ))}
                <div className="form-group"><label className="form-label">Langue</label><select className="form-input" value={profile.lang} onChange={e=>setProfile(p=>({...p,lang:e.target.value}))}><option value="fr">Français</option><option value="en">English</option></select></div>
                <div className="form-group">
                  <label className="form-label">Publication LinkedIn</label>
                  <div style={{background:linkedinConnected?'rgba(79,103,84,0.06)':'rgba(0,119,181,0.05)',border:`1px solid ${linkedinConnected?'rgba(79,103,84,0.2)':'rgba(0,119,181,0.2)'}`,borderRadius:10,padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:linkedinConnected?'var(--forest)':'#0077B5',marginBottom:2}}>{linkedinConnected?'✓ LinkedIn connecté':'LinkedIn non connecté'}</div>
                      <div style={{fontSize:11,color:'var(--text2)'}}>{linkedinConnected?'Tu peux publier directement depuis Rédiger.':'Connecte ton compte pour publier en 1 clic.'}</div>
                    </div>
                    <button className="btn btn-primary" style={{fontSize:11,flexShrink:0,background:linkedinConnected?'var(--forest)':'#0077B5'}} onClick={connectLinkedIn}>{linkedinConnected?'Reconnecter':'Connecter →'}</button>
                  </div>
                </div>
                <button className="btn btn-primary" onClick={handleSaveProfile} disabled={savingProfile}>{savingProfile?<><span className="spinner"/> Sauvegarde…</>:'Enregistrer'}</button>
              </div>
              <div>
                <div className="card" style={{marginBottom:16}}>
                  <div className="section-label">Couleurs de marque</div>
                  <div style={{fontSize:12,color:'var(--text2)',marginBottom:12}}>Utilisées par défaut dans le générateur visuel.</div>
                  {([['Fond','brand_bg'],['Texte','brand_text'],['Accent','brand_accent']] as [string,keyof typeof profile][]).map(([label,key])=>(
                    <div key={key} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                      <span style={{fontSize:11,color:'var(--text2)',width:50}}>{label}</span>
                      <input type="color" value={profile[key]||'#F8F6F2'} onChange={e=>setProfile(p=>({...p,[key]:e.target.value}))} style={{width:30,height:30,borderRadius:8,border:'1px solid var(--border)',cursor:'pointer',padding:2}}/>
                      <span style={{fontSize:11,fontFamily:'monospace',color:'var(--text2)'}}>{profile[key]}</span>
                    </div>
                  ))}
                </div>
                <div className="card">
                  <div className="section-label">Stack & style</div>
                  <div className="form-group"><label className="form-label">Technologies</label><input type="text" className="form-input" value={profile.tech_stack||''} onChange={e=>setProfile(p=>({...p,tech_stack:e.target.value}))}/></div>
                  <div style={{marginTop:8}}><span className="badge badge-forest">Ton expert</span>&nbsp;<span className="badge badge-copper">MSP France</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showOnboarding&&(
        <div style={{position:'fixed',inset:0,zIndex:600,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(6px)',padding:20}}>
          <div style={{background:'var(--white)',borderRadius:24,width:'100%',maxWidth:520,boxShadow:'0 32px 80px rgba(0,0,0,0.2)',overflow:'hidden'}}>
            <div style={{background:'var(--forest)',padding:'28px 32px 24px'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                <div style={{width:32,height:32,background:'rgba(255,255,255,0.15)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 4h8a4 4 0 0 1 0 8H6V4Z" fill="white" opacity=".9"/><path d="M6 12h5l4 8H6v-8Z" fill="white" opacity=".5"/></svg></div>
                <span style={{fontFamily:"'Playfair Display',serif",fontSize:14,fontWeight:500,color:'rgba(255,255,255,0.9)',letterSpacing:'.06em'}}>POSTORIA</span>
              </div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:500,color:'white',marginBottom:4}}>
                {onboardingStep===0&&'Bienvenue'}{onboardingStep===1&&'Connecte LinkedIn'}{onboardingStep===2&&'Ton profil'}
              </div>
              <div style={{fontSize:13,color:'rgba(255,255,255,0.7)'}}>
                {onboardingStep===0&&'Postoria génère tes posts LinkedIn en quelques secondes.'}
                {onboardingStep===1&&'LinkedIn pré-remplit ton nom et enrichit ton profil.'}
                {onboardingStep===2&&'Vérifiez et complétez les infos détectées.'}
              </div>
              <div style={{display:'flex',gap:6,marginTop:16}}>
                {[0,1,2].map(i=>(<div key={i} style={{width:i===onboardingStep?20:6,height:6,borderRadius:3,background:i===onboardingStep?'white':'rgba(255,255,255,0.3)',transition:'all 0.2s'}}/>))}
              </div>
            </div>
            <div style={{padding:'24px 32px 28px'}}>
              {onboardingStep===0&&(
                <div>
                  {[{icon:'✦',title:'10 idées par jour',desc:'Générées selon ton secteur et ton audience LinkedIn'},{icon:'◎',title:'Post en 30 secondes',desc:'Génère, édite, publie directement sur LinkedIn'},{icon:'◫',title:'Visuels 1080px',desc:'Crée des images pro pour accompagner chaque post'}].map((f,i)=>(
                    <div key={i} style={{display:'flex',gap:14,marginBottom:14}}>
                      <div style={{width:32,height:32,background:'var(--sand)',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>{f.icon}</div>
                      <div><div style={{fontSize:13,fontWeight:500,color:'var(--text1)',marginBottom:2}}>{f.title}</div><div style={{fontSize:12,color:'var(--text2)'}}>{f.desc}</div></div>
                    </div>
                  ))}
                  <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',marginTop:12}} onClick={()=>setOnboardingStep(1)}>Commencer</button>
                </div>
              )}
              {onboardingStep===1&&(
                <div>
                  <div style={{background:'rgba(0,119,181,0.05)',border:'1px solid rgba(0,119,181,0.15)',borderRadius:12,padding:'14px 16px',marginBottom:10}}>
                    <div style={{fontSize:13,fontWeight:600,color:'#0077B5',marginBottom:4}}>🔗 Connecte LinkedIn</div>
                    <div style={{fontSize:12,color:'var(--text2)',marginBottom:10}}>Récupère ton nom et enrichit ton profil automatiquement.</div>
                    <button className="btn btn-primary" style={{background:'#0077B5',width:'100%',justifyContent:'center'}} onClick={connectLinkedIn}>{linkedinConnected?'✓ LinkedIn connecté':'Se connecter avec LinkedIn'}</button>
                  </div>
                  <div style={{background:'rgba(79,103,84,0.05)',border:'1px solid rgba(79,103,84,0.15)',borderRadius:12,padding:'14px 16px',marginBottom:14}}>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--forest)',marginBottom:4}}>✦ Enrichir depuis ton site</div>
                    <div style={{fontSize:12,color:'var(--text2)',marginBottom:8}}>Analyse ton site pour pré-remplir secteur, audience, stack.</div>
                    <div style={{display:'flex',gap:8}}>
                      <input className="form-input" placeholder="ex: cyna.fr" value={profile.domain||''} onChange={(e:any)=>setProfile((p:any)=>({...p,domain:e.target.value}))} style={{flex:1,fontSize:12}}/>
                      <button className="btn btn-secondary" style={{fontSize:12,flexShrink:0}} onClick={enrichProfile} disabled={enriching}>{enriching?<><span className="spinner"/>...</>:'Analyser'}</button>
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
                    <button className="btn btn-ghost" style={{flex:1,justifyContent:'center',fontSize:12}} onClick={()=>setOnboardingStep(2)}>Passer</button>
                    <button className="btn btn-primary" style={{flex:2,justifyContent:'center'}} onClick={()=>setOnboardingStep(2)}>Continuer</button>
                  </div>
                </div>
              )}
              {onboardingStep===2&&(
                <div>
                  {([['Prenom','name'],['Role','role'],['Entreprise','company'],['Secteur','sector'],['Audience LinkedIn','audience']] as [string,keyof typeof profile][]).map(([label,key])=>(
                    <div className="form-group" key={key} style={{marginBottom:8}}>
                      <label className="form-label">{label}</label>
                      <input type="text" className="form-input" value={profile[key]||''} onChange={e=>setProfile(p=>({...p,[key]:e.target.value}))} style={{fontSize:13}}/>
                    </div>
                  ))}
                  <div style={{display:'flex',gap:8,marginTop:14}}>
                    <button className="btn btn-ghost" style={{justifyContent:'center',fontSize:12}} onClick={completeOnboarding}>Passer</button>
                    <button className="btn btn-primary" style={{flex:1,justifyContent:'center'}} onClick={async()=>{await handleSaveProfile();completeOnboarding()}}>Enregistrer et commencer</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showVisualModal&&(<VisualModal onClose={()=>setShowVisualModal(false)} postContent={postOutput} postTopic={postTopic} profileName={profile.name} profileRole={profile.role} profileCompany={profile.company} profileSector={profile.sector} brandBg={profile.brand_bg} brandText={profile.brand_text} brandAccent={profile.brand_accent}/>)}
      <div className={`toast ${toastVisible?'show':''}`}>{toast}</div>
    </>
  )
}

const GridIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
const BulbIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.3 6L15 20H9l-.7-5C6.3 13.7 5 11.5 5 9a7 7 0 0 1 7-7Z"/><path d="M9 21h6"/></svg>
const EditIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"/></svg>
const ImgIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
const BookIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></svg>
const UserIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
