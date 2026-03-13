# SHITHEAD — Spec Prompt · Partie 3 : Instructions Claude Code & Code Source

## Prompt d'instruction à donner à Claude Code

Colle ce message exactement au démarrage de la session Claude Code :

---

```
Je veux que tu reconstruises exactement un jeu de cartes Shithead en React.
Le résultat doit être un seul fichier `shithead-ui.jsx` avec un export default `ShitheadGame`.

Lis les trois fichiers de spec avant de commencer :
- SPEC_1_CONTEXT_RULES.md  → règles du jeu, moteur, logique de jouabilité
- SPEC_2_DESIGN_COMPONENTS.md → design, composants, animations
- SPEC_3_SOURCE.md → code source de référence (utilise-le tel quel)

Le code source dans SPEC_3_SOURCE.md EST la référence finale. 
Ne le réinterprète pas — utilise-le directement comme point de départ.
Si tu veux modifier quelque chose, explique pourquoi avant de le faire.

Setup du projet :
- Crée un projet Vite + React : `npm create vite@latest shithead -- --template react`
- Remplace `src/App.jsx` par le contenu de `shithead-ui.jsx`
- Dans `src/main.jsx`, importe `ShitheadGame` depuis `./App`
- Lance avec `npm run dev`
```

---

## Code source complet de référence

Copie ce fichier comme `shithead-ui.jsx` dans ton projet.

```jsx
import { useState, useEffect, useRef, useLayoutEffect } from "react";

// ─── CSS KEYFRAMES ────────────────────────────────────────────────────────────
const CSS = `
@keyframes dealCard {
  from { opacity:0; transform:translateY(-80px) scale(0.6) rotate(-10deg); }
  to   { opacity:1; transform:translateY(0)     scale(1)   rotate(0deg);   }
}
@keyframes slideToDiscard {
  0%   { opacity:1; transform:translate(0,0) scale(1) rotate(0deg); }
  45%  { opacity:1; transform:translate(var(--tx),var(--ty)) scale(1.1) rotate(var(--rot)); }
  100% { opacity:0; transform:translate(var(--tx),var(--ty)) scale(0.95) rotate(var(--rot)); }
}
@keyframes landCard {
  0%   { transform:rotate(var(--rot)) translateY(-14px) scale(1.12); }
  100% { transform:rotate(var(--rot)) translateY(0)     scale(1);    }
}
@keyframes flipCard {
  0%   { transform:rotateY(0deg);    }
  49%  { transform:rotateY(90deg);   }
  51%  { transform:rotateY(-90deg);  }
  100% { transform:rotateY(0deg);    }
}
@keyframes burnFlash {
  0%,100% { opacity:1; }
  40%      { opacity:0.1; box-shadow:0 0 40px rgba(255,80,0,0.9); }
}
`;
if (typeof document!=="undefined"&&!document.getElementById("sh-css")) {
  const s=document.createElement("style"); s.id="sh-css"; s.textContent=CSS; document.head.appendChild(s);
}

// ─── MOTEUR ──────────────────────────────────────────────────────────────────

const SUITS=["♠","♥","♦","♣"];
const VALUES=["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const SPECIAL_INFO={"2":"Reset","3":"Transparent","7":"≤7","10":"Burn 🔥","🃏":"Inverse ↺"};

function cardNumericValue(v){const o={"🃏":1,"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,"J":11,"Q":12,"K":13,"A":14};return o[v]??0;}
function isRed(s){return s==="♥"||s==="♦";}
function createDeck(){const d=[];for(const s of SUITS)for(const v of VALUES)d.push({suit:s,value:v,id:`${v}${s}`});d.push({suit:null,value:"🃏",id:"joker_0"},{suit:null,value:"🃏",id:"joker_1"});return shuffle(d);}
function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function sortCards(cards){return[...cards].sort((a,b)=>cardNumericValue(a.value)-cardNumericValue(b.value));}
function getEffectiveDiscardValue(discard){for(let i=discard.length-1;i>=0;i--){const v=discard[i].value;if(v!=="3"&&v!=="🃏")return v;}return null;}
function hasFourOfAKind(d){if(d.length<4)return false;const t=d.slice(-4);return t.every(c=>c.value===t[0].value);}
function isPlayerFinished(p){return p.handCards.length===0&&p.faceUpCards.length===0&&p.faceDownCards.length===0;}
function nextIdx(cur,players,dir){const n=players.length;let next=(cur+dir+n)%n,s=0;while(isPlayerFinished(players[next])&&s++<n)next=(next+dir+n)%n;return next;}
function canPlayValue(val,state){
  if(val==="2"||val==="3"||val==="10"||val==="🃏")return true;
  const eff=getEffectiveDiscardValue(state.discard);
  if(eff===null)return true;
  if(state.mustPlayLower)return cardNumericValue(val)<=7;
  return cardNumericValue(val)>=cardNumericValue(eff);
}
function canPlayGroup(cards,state,allZoneCards){
  if(!cards||cards.length===0)return false;
  const val=cards[0].value;
  const totalOfValue=allZoneCards.filter(c=>c.value===val).length;
  if(totalOfValue>=4&&cards.length>=4)return true;
  return canPlayValue(val,state);
}
function hasPlayableMove(zoneCards,state){
  const groups={};
  for(const c of zoneCards){if(!groups[c.value])groups[c.value]=[];groups[c.value].push(c);}
  return Object.values(groups).some(g=>canPlayGroup(g,state,zoneCards));
}

function initGame(playerNames){
  const deck=createDeck();const players=[];let di=0;
  for(let i=0;i<playerNames.length;i++){
    players.push({id:`p${i}`,name:playerNames[i],handCards:sortCards(deck.slice(di+6,di+9)),faceUpCards:deck.slice(di+3,di+6),faceDownCards:deck.slice(di,di+3),phase:"hand",isShithead:false,setupConfirmed:i!==0,isHuman:i===0});
    di+=9;
  }
  return{status:"setup",direction:1,currentPlayerIndex:0,players,pile:deck.slice(di),discard:[],lastPlayedValue:null,mustPlayLower:false,winner:null,shithead:null,log:["La partie commence ! Échangez vos cartes puis confirmez."],burnedPiles:0};
}

function applyPlay(state,cards){
  const s=JSON.parse(JSON.stringify(state));const pi=s.currentPlayerIndex;const player=s.players[pi];const val=cards[0].value;const ids=new Set(cards.map(c=>c.id));
  const src=player.handCards.some(c=>ids.has(c.id))?"hand":player.faceUpCards.some(c=>ids.has(c.id))?"faceUp":"faceDown";
  if(src==="hand")player.handCards=player.handCards.filter(c=>!ids.has(c.id));
  else if(src==="faceUp")player.faceUpCards=player.faceUpCards.filter(c=>!ids.has(c.id));
  else player.faceDownCards=player.faceDownCards.filter(c=>!ids.has(c.id));
  s.discard.push(...cards);let burned=false;
  let logMsg=`${player.name} joue ${cards.map(c=>c.value==="🃏"?"🃏":`${c.value}${c.suit}`).join(" ")}`;
  s.mustPlayLower=false;
  if(val==="10"){s.discard=[];burned=true;s.burnedPiles++;logMsg+=" — Talon brûlé 🔥";}
  else if(val==="🃏"){s.direction*=-1;logMsg+=` — Sens inversé ${s.direction===1?"↻":"↺"}`;}
  else if(val==="7"){s.mustPlayLower=true;logMsg+=" — Joue ≤ 7 !";}
  if(!burned&&hasFourOfAKind(s.discard)){s.discard=[];burned=true;s.burnedPiles++;logMsg+=" — 4 identiques ! 🔥";}
  if(!player.handCards.length&&player.faceUpCards.length)player.phase="face_up";
  else if(!player.handCards.length&&!player.faceUpCards.length)player.phase="face_down";
  else player.phase="hand";
  while(player.handCards.length<3&&s.pile.length>0&&player.phase==="hand")player.handCards.push(s.pile.shift());
  player.handCards=sortCards(player.handCards);
  s.lastPlayedValue=val;s.log=[...s.log.slice(-19),logMsg];
  const finished=isPlayerFinished(player);
  if(finished){const rem=s.players.filter(p=>!isPlayerFinished(p));if(rem.length===1){rem[0].isShithead=true;s.status="finished";s.winner=player.id;s.shithead=rem[0].id;s.log=[...s.log,`🏆 ${player.name} gagne ! 💩 ${rem[0].name} est le SHITHEAD !`];}}
  s.currentPlayerIndex=burned?pi:nextIdx(pi,s.players,s.direction);
  return s;
}

function applyPickUp(state){
  const s=JSON.parse(JSON.stringify(state));const pi=s.currentPlayerIndex;const player=s.players[pi];let logMsg;
  if(s.discard.length>0){const count=s.discard.length;player.handCards=sortCards([...player.handCards,...s.discard]);s.discard=[];player.phase="hand";logMsg=`${player.name} ramasse le talon (${count} cartes) 😬`;}
  else if(s.pile.length>0){player.handCards=sortCards([...player.handCards,s.pile.shift()]);player.phase="hand";logMsg=`${player.name} pioche (talon vide).`;}
  else return state;
  s.log=[...s.log.slice(-19),logMsg];s.currentPlayerIndex=nextIdx(pi,s.players,s.direction);s.mustPlayLower=false;return s;
}

function getBotMove(state,playerIndex){
  const player=state.players[playerIndex];const zone=player.phase==="hand"?player.handCards:player.phase==="face_up"?player.faceUpCards:player.faceDownCards;
  if(player.phase==="face_down")return{type:"play",cards:[zone[Math.floor(Math.random()*zone.length)]]};
  const groups={};for(const c of zone){if(!groups[c.value])groups[c.value]=[];groups[c.value].push(c);}
  const playable=Object.values(groups).filter(g=>canPlayGroup(g,state,zone));
  if(playable.length===0)return{type:"draw"};
  playable.sort((a,b)=>{const aV=a[0].value,bV=b[0].value;if(aV==="10")return -1;if(bV==="10")return 1;if(aV==="2")return -1;if(bV==="2")return 1;if(b.length!==a.length)return b.length-a.length;return cardNumericValue(bV)-cardNumericValue(aV);});
  return{type:"play",cards:playable[0]};
}

function cardRotation(id){let h=0;for(let i=0;i<id.length;i++)h=(h*31+id.charCodeAt(i))&0xffffffff;return((h%1400)/100)-7;}
function cardOffset(id){let h=0;for(let i=0;i<id.length;i++)h=(h*17+id.charCodeAt(i))&0xffffffff;return{x:((h%1200)/100)-6,y:(((h>>8)%1000)/100)-5};}

function PlayingCard({card,selected,onClick,disabled,hidden,small,facedown,glow,dealIdx}){
  const dealAnim=dealIdx!==undefined?{animation:`dealCard 0.38s cubic-bezier(0.22,1,0.36,1) ${dealIdx*65}ms both`}:{};
  if(hidden||facedown){
    return(
      <div onClick={disabled?undefined:onClick} style={{width:small?44:70,height:small?62:98,borderRadius:8,background:"linear-gradient(135deg,#6b1a1a,#3d0f0f 50%,#6b1a1a)",border:"2px solid #8b3030",cursor:disabled?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 12px rgba(0,0,0,0.5)",position:"relative",overflow:"hidden",flexShrink:0,...dealAnim}}>
        <div style={{position:"absolute",inset:4,border:"1px solid rgba(255,255,255,0.1)",borderRadius:5,backgroundImage:"repeating-linear-gradient(45deg,transparent,transparent 4px,rgba(255,255,255,0.03) 4px,rgba(255,255,255,0.03) 5px)"}}/>
        <span style={{fontSize:small?14:20,opacity:0.4}}>🂠</span>
      </div>
    );
  }
  const red=card.value==="🃏"?false:isRed(card.suit);
  const special=SPECIAL_INFO[card.value];
  return(
    <div onClick={disabled?undefined:onClick} style={{width:small?44:70,height:small?62:98,borderRadius:8,background:selected?"linear-gradient(135deg,#fffde0,#fff9c4)":"linear-gradient(160deg,#fffff8,#f5f0e8)",border:selected?"2.5px solid #d4a017":"2px solid #c8bfa8",cursor:disabled?"default":"pointer",transform:selected?"translateY(-12px) scale(1.05)":"translateY(0)",transition:"all 0.18s cubic-bezier(0.34,1.56,0.64,1)",boxShadow:selected?"0 12px 28px rgba(212,160,23,0.5),0 2px 6px rgba(0,0,0,0.3)":glow?"0 0 16px rgba(100,220,100,0.6),0 3px 10px rgba(0,0,0,0.4)":"0 3px 10px rgba(0,0,0,0.4)",display:"flex",flexDirection:"column",justifyContent:"space-between",padding:small?"3px 4px":"5px 7px",position:"relative",flexShrink:0,userSelect:"none",...dealAnim}}>
      <div style={{fontSize:small?11:14,fontWeight:700,lineHeight:1,color:red?"#c0392b":"#1a1a2e",fontFamily:"'Georgia',serif"}}>{card.value}{card.suit&&<span style={{fontSize:small?9:11}}>{card.suit}</span>}</div>
      <div style={{textAlign:"center",fontSize:small?16:26,lineHeight:1,color:red?"#c0392b":"#1a1a2e"}}>{card.value==="🃏"?"🃏":card.suit}</div>
      <div style={{fontSize:small?11:14,fontWeight:700,lineHeight:1,transform:"rotate(180deg)",color:red?"#c0392b":"#1a1a2e",fontFamily:"'Georgia',serif"}}>{card.value}{card.suit&&<span style={{fontSize:small?9:11}}>{card.suit}</span>}</div>
      {special&&!small&&<div style={{position:"absolute",bottom:3,right:4,fontSize:8,color:"#8b6914",fontWeight:700,background:"rgba(255,215,0,0.25)",borderRadius:3,padding:"1px 3px",letterSpacing:0.3}}>{special}</div>}
    </div>
  );
}

function FaceDownCard({card,isPlayable,selected,onClick,disabled}){
  const[flipping,setFlipping]=useState(false);
  const[revealed,setRevealed]=useState(false);
  const handleClick=()=>{
    if(disabled)return;
    if(!revealed&&!flipping){setFlipping(true);setTimeout(()=>{setRevealed(true);setFlipping(false);},260);}
    else if(revealed){onClick&&onClick();}
  };
  return(
    <div style={{animation:flipping?"flipCard 0.5s ease-in-out forwards":"none",display:"inline-block"}}>
      {revealed
        ?<PlayingCard card={card} selected={selected} onClick={handleClick} disabled={disabled} glow={isPlayable&&!selected}/>
        :<PlayingCard card={card} facedown selected={selected} onClick={handleClick} disabled={disabled}/>}
    </div>
  );
}

function FlyingCard({card,fromRect,toRect,onDone}){
  const ref=useRef(null);
  useLayoutEffect(()=>{
    if(!ref.current||!fromRect||!toRect){setTimeout(onDone,10);return;}
    const el=ref.current;
    const tx=toRect.left+toRect.width/2-(fromRect.left+fromRect.width/2);
    const ty=toRect.top+toRect.height/2-(fromRect.top+fromRect.height/2);
    const rot=cardRotation(card.id);
    el.style.setProperty("--tx",`${tx}px`);
    el.style.setProperty("--ty",`${ty}px`);
    el.style.setProperty("--rot",`${rot}deg`);
    el.style.animation="slideToDiscard 0.44s cubic-bezier(0.4,0,0.2,1) forwards";
    const t=setTimeout(onDone,440);
    return()=>clearTimeout(t);
  },[]);
  if(!fromRect)return null;
  return(
    <div ref={ref} style={{position:"fixed",left:fromRect.left,top:fromRect.top,width:fromRect.width,height:fromRect.height,zIndex:600,pointerEvents:"none"}}>
      <PlayingCard card={card} disabled/>
    </div>
  );
}

function BotPlayerZone({player,isActive,position}){
  const isLeft=position==="left",isRight=position==="right";
  const rotate=isLeft?-90:isRight?90:0;
  const total=player.handCards.length+player.faceUpCards.length+player.faceDownCards.length;
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,transform:`rotate(${rotate}deg)`}}>
      <div style={{background:isActive?"rgba(212,160,23,0.25)":"rgba(0,0,0,0.4)",border:`1px solid ${isActive?"#d4a017":"rgba(255,255,255,0.1)"}`,borderRadius:20,padding:"4px 12px",fontSize:12,fontWeight:700,color:isActive?"#d4a017":"rgba(255,255,255,0.5)",fontFamily:"'Georgia',serif",letterSpacing:1,whiteSpace:"nowrap",transition:"all 0.3s",boxShadow:isActive?"0 0 12px rgba(212,160,23,0.3)":"none",display:"flex",alignItems:"center",gap:6}}>
        {isActive&&<span>▶</span>}{player.name}{player.isShithead&&" 💩"}
      </div>
      <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
        {player.handCards.length>0&&(
          <div style={{background:"rgba(0,0,0,0.5)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,padding:"4px 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:2,minWidth:36,alignSelf:"center"}}>
            <span style={{fontSize:14}}>🂠</span>
            <span style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.6)",fontFamily:"'Georgia',serif"}}>×{player.handCards.length}</span>
          </div>
        )}
        {(player.faceUpCards.length>0||player.faceDownCards.length>0)&&(
          <div style={{display:"flex",gap:4}}>
            {Array.from({length:Math.max(player.faceUpCards.length,player.faceDownCards.length)}).map((_,i)=>{
              const fu=player.faceUpCards[i],fd=player.faceDownCards[i];
              return(
                <div key={i} style={{position:"relative",width:44,height:68}}>
                  {fd&&<div style={{position:"absolute",top:6,left:0,zIndex:1}}><PlayingCard card={fd} facedown small disabled/></div>}
                  {fu&&<div style={{position:"absolute",top:0,left:0,zIndex:2}}><PlayingCard card={fu} small disabled/></div>}
                  {!fu&&fd&&<div style={{position:"absolute",top:0,left:0,zIndex:2}}><PlayingCard card={fd} facedown small disabled/></div>}
                </div>
              );
            })}
          </div>
        )}
        {total===0&&<div style={{fontSize:11,color:"rgba(255,255,255,0.2)",fontFamily:"'Georgia',serif",alignSelf:"center"}}>—</div>}
      </div>
    </div>
  );
}

function DiscardPile({discard,effectiveValue,mustPlayLower}){
  const prevRef=useRef(discard.length);
  const[landingId,setLandingId]=useState(null);
  const[burned,setBurned]=useState(false);
  useEffect(()=>{
    const prev=prevRef.current;
    if(prev>0&&discard.length===0){setBurned(true);setTimeout(()=>setBurned(false),450);}
    if(discard.length>prev&&discard.length>0){const top=discard[discard.length-1];setLandingId(top.id);setTimeout(()=>setLandingId(null),440);}
    prevRef.current=discard.length;
  },[discard]);
  const visible=discard.slice(-7);
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
      <div style={{fontSize:10,letterSpacing:2,color:"rgba(255,255,255,0.35)",fontFamily:"'Georgia',serif",textTransform:"uppercase"}}>
        Talon {discard.length>0&&<span style={{color:"rgba(255,255,255,0.2)"}}>({discard.length})</span>}
      </div>
      <div style={{position:"relative",width:70,height:98,animation:burned?"burnFlash 0.45s ease-out":"none"}}>
        {discard.length===0
          ?<div style={{width:70,height:98,borderRadius:8,border:"2px dashed rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.15)",fontSize:11}}>vide</div>
          :visible.map((c,i)=>{
            const isTop=i===visible.length-1;
            const rot=cardRotation(c.id);
            const off=cardOffset(c.id);
            const isLanding=c.id===landingId;
            return(
              <div key={c.id} style={{position:"absolute",top:off.y,left:off.x,zIndex:i,opacity:isTop?1:Math.max(0.5,0.5+i*0.08),filter:isTop?"none":`brightness(${0.62+i*0.06})`,["--rot"]:`${rot}deg`,transform:`rotate(${rot}deg)`,animation:isLanding?"landCard 0.4s cubic-bezier(0.22,1,0.36,1) forwards":"none",boxShadow:isTop?"0 6px 20px rgba(0,0,0,0.6)":"none"}}>
                <PlayingCard card={c} disabled/>
              </div>
            );
          })
        }
      </div>
      {effectiveValue&&(
        <div style={{background:mustPlayLower?"rgba(220,80,40,0.3)":"rgba(0,0,0,0.3)",border:`1px solid ${mustPlayLower?"#e05020":"rgba(255,255,255,0.1)"}`,borderRadius:12,padding:"3px 10px",fontSize:11,color:mustPlayLower?"#ff9070":"rgba(255,255,255,0.5)",fontFamily:"'Georgia',serif"}}>
          {mustPlayLower?"Joue ≤ 7":`Joue ≥ ${effectiveValue}`}
        </div>
      )}
    </div>
  );
}

function GameLog({log}){
  const ref=useRef(null);const[open,setOpen]=useState(false);
  useEffect(()=>{if(open&&ref.current)ref.current.scrollTop=ref.current.scrollHeight;},[log,open]);
  const lastEntry=log[log.length-1],prevEntry=useRef(lastEntry);
  const[flash,setFlash]=useState(false);
  useEffect(()=>{if(lastEntry!==prevEntry.current){prevEntry.current=lastEntry;setFlash(true);const t=setTimeout(()=>setFlash(false),1200);return()=>clearTimeout(t);}},[lastEntry]);
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end"}}>
      <button onClick={()=>setOpen(o=>!o)} style={{background:flash&&!open?"rgba(212,160,23,0.25)":"rgba(0,0,0,0.5)",border:`1px solid ${flash&&!open?"rgba(212,160,23,0.5)":"rgba(255,255,255,0.1)"}`,borderRadius:open?"10px 10px 0 0":10,padding:"6px 14px",fontSize:11,letterSpacing:2,color:flash&&!open?"#d4a017":"rgba(255,255,255,0.4)",cursor:"pointer",fontFamily:"'Georgia',serif",transition:"all 0.25s",display:"flex",alignItems:"center",gap:7,backdropFilter:"blur(8px)"}}>
        <span style={{fontSize:13}}>📋</span>JOURNAL
        <span style={{fontSize:10,opacity:0.6,transform:open?"rotate(180deg)":"none",transition:"transform 0.25s",display:"inline-block"}}>▲</span>
        {!open&&flash&&<span style={{width:7,height:7,borderRadius:"50%",background:"#d4a017",boxShadow:"0 0 6px #d4a017",display:"inline-block"}}/>}
      </button>
      <div style={{overflow:"hidden",maxHeight:open?220:0,transition:"max-height 0.3s cubic-bezier(0.4,0,0.2,1)",width:240}}>
        <div ref={ref} style={{background:"rgba(0,0,0,0.6)",border:"1px solid rgba(255,255,255,0.07)",borderTop:"none",borderRadius:"0 0 10px 10px",padding:"10px 12px",maxHeight:200,overflowY:"auto",backdropFilter:"blur(8px)"}}>
          {log.slice(-14).map((entry,i,arr)=>(
            <div key={i} style={{fontSize:11,color:i===arr.length-1?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.3)",marginBottom:5,lineHeight:1.4,fontFamily:"'Georgia',serif"}}>{entry}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SetupScreen({state,onSwap,onConfirm}){
  const[selHand,setSelHand]=useState(null);const[selFU,setSelFU]=useState(null);
  const player=state.players[0];
  const onHand=c=>{if(selFU){onSwap(c.id,selFU.id);setSelHand(null);setSelFU(null);}else{setSelHand(selHand?.id===c.id?null:c);setSelFU(null);}};
  const onFU=c=>{if(selHand){onSwap(selHand.id,c.id);setSelHand(null);setSelFU(null);}else{setSelFU(selFU?.id===c.id?null:c);setSelHand(null);}};
  return(
    <div style={{position:"absolute",inset:0,zIndex:100,background:"rgba(5,20,10,0.97)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:36}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontFamily:"'Palatino Linotype',serif",fontSize:28,color:"#d4a017",letterSpacing:3,marginBottom:8}}>PRÉPAREZ VOS CARTES</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,0.4)",letterSpacing:1}}>Échangez vos cartes de main avec vos cartes face visible</div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:28,alignItems:"center",width:"100%"}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
          <div style={{fontSize:11,color:"#d4a017",letterSpacing:2}}>{selFU?"FACE VISIBLE — cliquez sur une carte en main pour échanger":"FACE VISIBLE — cliquez pour sélectionner"}</div>
          <div style={{display:"flex",justifyContent:"center",gap:10}}>{player.faceUpCards.map((c,i)=><PlayingCard key={c.id} card={c} selected={selFU?.id===c.id} onClick={()=>onFU(c)} glow={!!selHand} dealIdx={i}/>)}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
          <div style={{fontSize:11,color:"#7ec8a0",letterSpacing:2}}>{selHand?"MAIN — cliquez sur une carte visible pour échanger":"MAIN — cliquez pour sélectionner"}</div>
          <div style={{display:"flex",justifyContent:"center",gap:10}}>{player.handCards.map((c,i)=><PlayingCard key={c.id} card={c} selected={selHand?.id===c.id} onClick={()=>onHand(c)} glow={!!selFU} dealIdx={i+3}/>)}</div>
        </div>
      </div>
      <button onClick={onConfirm} style={{background:"linear-gradient(135deg,#d4a017,#a07010)",border:"none",borderRadius:30,padding:"14px 48px",fontSize:14,fontWeight:700,color:"#1a0f00",cursor:"pointer",letterSpacing:2,fontFamily:"'Georgia',serif",boxShadow:"0 4px 20px rgba(212,160,23,0.4)",transition:"transform 0.15s,box-shadow 0.15s"}}
        onMouseEnter={e=>{e.target.style.transform="scale(1.05)";e.target.style.boxShadow="0 6px 24px rgba(212,160,23,0.6)";}}
        onMouseLeave={e=>{e.target.style.transform="scale(1)";e.target.style.boxShadow="0 4px 20px rgba(212,160,23,0.4)";}}>
        ✓ CONFIRMER
      </button>
    </div>
  );
}

function FinishedScreen({state,onRestart}){
  const winner=state.players.find(p=>p.id===state.winner);
  const shithead=state.players.find(p=>p.id===state.shithead);
  return(
    <div style={{position:"absolute",inset:0,zIndex:100,background:"rgba(5,15,8,0.97)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:24}}>
      <div style={{fontSize:64}}>🏆</div>
      <div style={{fontFamily:"'Palatino Linotype',serif",fontSize:32,color:"#d4a017",letterSpacing:3}}>{winner?.name} GAGNE !</div>
      <div style={{fontSize:48}}>💩</div>
      <div style={{fontFamily:"'Palatino Linotype',serif",fontSize:22,color:"#8b4040",letterSpacing:2}}>{shithead?.name} est le SHITHEAD</div>
      <button onClick={onRestart} style={{marginTop:16,background:"linear-gradient(135deg,#d4a017,#a07010)",border:"none",borderRadius:30,padding:"14px 48px",fontSize:14,fontWeight:700,color:"#1a0f00",cursor:"pointer",letterSpacing:2,fontFamily:"'Georgia',serif",boxShadow:"0 4px 20px rgba(212,160,23,0.4)"}}>REJOUER</button>
    </div>
  );
}

function DealScreen({playerCount,onDone}){
  const[step,setStep]=useState(0);
  const total=playerCount*9;
  useEffect(()=>{
    if(step>=total){const t=setTimeout(onDone,300);return()=>clearTimeout(t);}
    const t=setTimeout(()=>setStep(s=>s+1),55);
    return()=>clearTimeout(t);
  },[step,total,onDone]);
  return(
    <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 50% 40%,#0d2e12,#061008 60%,#030806)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:24}}>
      <div style={{fontSize:13,color:"rgba(255,255,255,0.3)",letterSpacing:4,fontFamily:"'Georgia',serif"}}>DISTRIBUTION DES CARTES</div>
      <div style={{position:"relative",width:200,height:200}}>
        {Array.from({length:step}).map((_,i)=>{
          const angle=(i/total)*360;
          const r=55+(i%9)*12;
          const x=Math.cos((angle*Math.PI)/180)*r;
          const y=Math.sin((angle*Math.PI)/180)*r*0.65;
          return(
            <div key={i} style={{position:"absolute",left:`calc(50% + ${x}px - 35px)`,top:`calc(50% + ${y}px - 49px)`,animation:`dealCard 0.32s cubic-bezier(0.22,1,0.36,1) ${i*45}ms both`}}>
              <PlayingCard card={{suit:null,value:""}} facedown/>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ShitheadGame(){
  const[state,setState]=useState(null);
  const[pendingCount,setPendingCount]=useState(null);
  const[dealing,setDealing]=useState(false);
  const[selectedCards,setSelectedCards]=useState([]);
  const[botThinking,setBotThinking]=useState(false);
  const[flyingCards,setFlyingCards]=useState([]);
  const discardRef=useRef(null);
  const cardRefs=useRef({});

  const startGame=count=>{setPendingCount(count);setDealing(true);};

  const handleDealDone=()=>{
    const names=["Vous","Bot Alpha","Bot Beta","Bot Gamma"].slice(0,pendingCount);
    setState(initGame(names));
    setSelectedCards([]);
    setDealing(false);
  };

  useEffect(()=>{
    if(!state||state.status!=="playing")return;
    const cur=state.players[state.currentPlayerIndex];
    if(cur.isHuman)return;
    setBotThinking(true);
    const delay=900+Math.random()*600;
    const timer=setTimeout(()=>{
      const move=getBotMove(state,state.currentPlayerIndex);
      if(move.type==="play")setState(s=>applyPlay(s,move.cards));
      else setState(s=>applyPickUp(s));
      setBotThinking(false);
    },delay);
    return()=>clearTimeout(timer);
  },[state]);

  const handleSwap=(handId,fuId)=>{
    setState(s=>{const ns=JSON.parse(JSON.stringify(s));const p=ns.players[0];const hi=p.handCards.findIndex(c=>c.id===handId);const fi=p.faceUpCards.findIndex(c=>c.id===fuId);if(hi!==-1&&fi!==-1){[p.handCards[hi],p.faceUpCards[fi]]=[p.faceUpCards[fi],p.handCards[hi]];p.handCards=sortCards(p.handCards);}return ns;});
  };

  const handleConfirmSetup=()=>{setState(s=>({...s,status:"playing",log:[...s.log,"C'est parti !"]}));};

  const handlePlaySelected=()=>{
    if(selectedCards.length===0)return;
    const toRect=discardRef.current?.getBoundingClientRect();
    const flies=selectedCards.map(card=>{const el=cardRefs.current[card.id];return{card,fromRect:el?.getBoundingClientRect()||null,toRect:toRect||null};});
    try{
      setState(s=>applyPlay(s,selectedCards));
      setSelectedCards([]);
      if(toRect)setFlyingCards(prev=>[...prev,...flies]);
    }catch(e){alert(e.message);}
  };

  const handlePickUp=()=>{setState(s=>applyPickUp(s));setSelectedCards([]);};

  const toggleCard=card=>{
    if(human.phase!=="face_down"){
      const zone=human.phase==="hand"?human.handCards:human.faceUpCards;
      const group=zone.filter(c=>c.value===card.value);
      if(!canPlayGroup(group,state,zone))return;
    }
    setSelectedCards(prev=>{
      if(prev.some(c=>c.id===card.id))return prev.filter(c=>c.id!==card.id);
      if(prev.length>0&&prev[0].value!==card.value)return[card];
      return[...prev,card];
    });
  };

  if(!state&&!dealing){
    return(
      <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#0a1a0d,#050e06)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:40,fontFamily:"'Georgia',serif"}}>
        <div style={{position:"fixed",inset:0,zIndex:0,backgroundImage:"radial-gradient(circle at 50% 50%,rgba(30,80,30,0.3),transparent 70%)",pointerEvents:"none"}}/>
        <div style={{position:"relative",zIndex:1,textAlign:"center"}}>
          <div style={{fontSize:60,marginBottom:8}}>🃏</div>
          <div style={{fontFamily:"'Palatino Linotype','Book Antiqua',serif",fontSize:42,color:"#d4a017",letterSpacing:6,textShadow:"0 0 40px rgba(212,160,23,0.3)"}}>SHITHEAD</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.25)",letterSpacing:4,marginTop:4}}>THE CARD GAME</div>
        </div>
        <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",gap:12,alignItems:"center"}}>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.35)",letterSpacing:3,marginBottom:8}}>NOMBRE DE JOUEURS</div>
          {[2,3,4].map(n=>(
            <button key={n} onClick={()=>startGame(n)} style={{background:"rgba(212,160,23,0.08)",border:"1px solid rgba(212,160,23,0.3)",borderRadius:30,padding:"12px 56px",fontSize:15,color:"#d4a017",cursor:"pointer",letterSpacing:3,fontFamily:"'Georgia',serif",transition:"all 0.2s",width:220}}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(212,160,23,0.2)";e.currentTarget.style.boxShadow="0 0 20px rgba(212,160,23,0.2)";}}
              onMouseLeave={e=>{e.currentTarget.style.background="rgba(212,160,23,0.08)";e.currentTarget.style.boxShadow="none";}}
            >{n} Joueurs</button>
          ))}
        </div>
      </div>
    );
  }

  if(dealing)return <DealScreen playerCount={pendingCount} onDone={handleDealDone}/>;

  const human=state.players[0];
  const bots=state.players.slice(1);
  const isMyTurn=state.status==="playing"&&state.currentPlayerIndex===0;
  const effectiveVal=getEffectiveDiscardValue(state.discard);
  const selectedPlayable=(()=>{
    if(selectedCards.length===0)return false;
    const zone=human.phase==="hand"?human.handCards:human.phase==="face_up"?human.faceUpCards:human.faceDownCards;
    return canPlayGroup(selectedCards,state,zone);
  })();
  const canPlay=isMyTurn&&selectedPlayable;
  const humanActiveZone=human.phase==="hand"?human.handCards:human.phase==="face_up"?human.faceUpCards:null;
  const hasAnyPlayable=human.phase==="face_down"||hasPlayableMove(humanActiveZone??[],state);
  const canPickUp=isMyTurn&&!hasAnyPlayable;
  const humanZoneLabel=human.phase==="hand"?"VOTRE MAIN":human.phase==="face_up"?"CARTES FACE VISIBLE":"CARTES FACE CACHÉE — Bonne chance 🙏";
  const botPositions=bots.length===1?["top"]:bots.length===2?["left","right"]:["left","top","right"];

  return(
    <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 50% 40%,#0d2e12,#061008 60%,#030806)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"space-between",padding:"20px 24px 24px",fontFamily:"'Georgia',serif",position:"relative",overflow:"hidden",userSelect:"none"}}>
      <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",backgroundImage:`radial-gradient(circle at 50% 50%,rgba(20,60,20,0.4),transparent 70%),repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.005) 2px,rgba(255,255,255,0.005) 3px),repeating-linear-gradient(90deg,transparent,transparent 2px,rgba(255,255,255,0.005) 2px,rgba(255,255,255,0.005) 3px)`}}/>
      {state.status==="setup"&&<SetupScreen state={state} onSwap={handleSwap} onConfirm={handleConfirmSetup}/>}
      {state.status==="finished"&&<FinishedScreen state={state} onRestart={()=>setState(null)}/>}
      {flyingCards.map((fc,i)=>(
        <FlyingCard key={`fly-${fc.card.id}-${i}`} card={fc.card} fromRect={fc.fromRect} toRect={fc.toRect}
          onDone={()=>setFlyingCards(prev=>prev.filter((_,j)=>j!==i))}/>
      ))}
      <div style={{position:"relative",zIndex:1,display:"flex",justifyContent:"center",width:"100%",minHeight:120}}>
        {botPositions.includes("top")&&<BotPlayerZone player={bots[botPositions.indexOf("top")]} isActive={state.currentPlayerIndex===1+botPositions.indexOf("top")} position="top"/>}
      </div>
      <div style={{position:"relative",zIndex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:32,width:"100%"}}>
        <div style={{minWidth:100,display:"flex",justifyContent:"center"}}>
          {botPositions.includes("left")&&<BotPlayerZone player={bots[botPositions.indexOf("left")]} isActive={state.currentPlayerIndex===1+botPositions.indexOf("left")} position="left"/>}
        </div>
        <div style={{background:"radial-gradient(ellipse at center,rgba(15,50,15,0.9),rgba(8,30,8,0.95))",border:"3px solid rgba(212,160,23,0.2)",borderRadius:24,padding:"24px 32px",display:"flex",flexDirection:"column",alignItems:"center",gap:20,boxShadow:"0 0 60px rgba(0,0,0,0.7),inset 0 0 40px rgba(0,0,0,0.3)",minWidth:300}}>
          <div style={{display:"flex",alignItems:"center",gap:12,background:"rgba(0,0,0,0.3)",borderRadius:20,padding:"6px 16px"}}>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",letterSpacing:2}}>SENS {state.direction===1?"↻":"↺"}</div>
            <div style={{width:1,height:12,background:"rgba(255,255,255,0.1)"}}/>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",letterSpacing:1}}>Pioche: <span style={{color:"rgba(255,255,255,0.6)"}}>{state.pile.length}</span></div>
            {botThinking&&<><div style={{width:1,height:12,background:"rgba(255,255,255,0.1)"}}/><div style={{fontSize:11,color:"#d4a017",letterSpacing:1}}>Bot réfléchit...</div></>}
          </div>
          <div style={{display:"flex",gap:32,alignItems:"center"}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
              <div style={{fontSize:10,letterSpacing:2,color:"rgba(255,255,255,0.3)",textTransform:"uppercase"}}>Pioche</div>
              {state.pile.length>0
                ?<PlayingCard card={state.pile[0]} facedown disabled/>
                :<div style={{width:70,height:98,borderRadius:8,border:"2px dashed rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.1)",fontSize:11}}>vide</div>}
            </div>
            <div ref={discardRef}><DiscardPile discard={state.discard} effectiveValue={effectiveVal} mustPlayLower={state.mustPlayLower}/></div>
          </div>
          <div style={{fontSize:12,letterSpacing:2,color:isMyTurn?"#7ec8a0":"rgba(255,255,255,0.3)",transition:"color 0.3s"}}>
            {isMyTurn?"▶ VOTRE TOUR":`Tour de ${state.players[state.currentPlayerIndex]?.name}`}
          </div>
        </div>
        <div style={{minWidth:100,display:"flex",justifyContent:"center"}}>
          {botPositions.includes("right")&&<BotPlayerZone player={bots[botPositions.indexOf("right")]} isActive={state.currentPlayerIndex===1+botPositions.indexOf("right")} position="right"/>}
        </div>
      </div>
      <div style={{position:"fixed",bottom:16,right:16,zIndex:20}}><GameLog log={state.log}/></div>
      <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:12,width:"100%"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{background:isMyTurn?"rgba(126,200,160,0.15)":"rgba(0,0,0,0.3)",border:`1px solid ${isMyTurn?"rgba(126,200,160,0.4)":"rgba(255,255,255,0.08)"}`,borderRadius:20,padding:"5px 16px",fontSize:13,fontWeight:700,color:isMyTurn?"#7ec8a0":"rgba(255,255,255,0.4)",letterSpacing:2,transition:"all 0.3s"}}>
            {isMyTurn&&<span style={{marginRight:6}}>▶</span>}VOUS{human.isShithead&&" 💩"}
          </div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.25)",letterSpacing:1}}>Phase: {humanZoneLabel}</div>
        </div>
        {human.phase!=="hand"&&(
          <div style={{display:"flex",gap:20,alignItems:"flex-start"}}>
            {human.faceDownCards.length>0&&(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                <div style={{fontSize:9,letterSpacing:2,color:"rgba(255,255,255,0.2)"}}>CACHÉES</div>
                <div style={{display:"flex",gap:6}}>
                  {human.faceDownCards.map(c=>(
                    <div key={c.id} ref={el=>{if(el)cardRefs.current[c.id]=el;}}>
                      <FaceDownCard card={c} isPlayable={isMyTurn&&canPlayValue(c.value,state)} selected={selectedCards.some(s=>s.id===c.id)} onClick={human.phase==="face_down"&&isMyTurn?()=>toggleCard(c):undefined} disabled={human.phase!=="face_down"||!isMyTurn}/>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {human.faceUpCards.length>0&&(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                <div style={{fontSize:9,letterSpacing:2,color:"rgba(255,255,255,0.2)"}}>VISIBLES</div>
                <div style={{display:"flex",gap:6}}>
                  {human.faceUpCards.map(c=>{
                    const fuGroup=human.faceUpCards.filter(x=>x.value===c.value);
                    const fuPlayable=isMyTurn&&human.phase==="face_up"&&canPlayGroup(fuGroup,state,human.faceUpCards);
                    const fuSel=selectedCards.some(s=>s.id===c.id);
                    return(
                      <div key={c.id} ref={el=>{if(el)cardRefs.current[c.id]=el;}}>
                        <PlayingCard card={c} selected={fuSel} glow={fuPlayable&&!fuSel} onClick={human.phase==="face_up"&&isMyTurn?()=>toggleCard(c):undefined} disabled={human.phase!=="face_up"||!isMyTurn||!fuPlayable}/>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        {human.phase==="hand"&&(
          <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center",maxWidth:600}}>
            {human.handCards.map(c=>{
              const handGroup=human.handCards.filter(x=>x.value===c.value);
              const playable=isMyTurn&&canPlayGroup(handGroup,state,human.handCards);
              const sel=selectedCards.some(s=>s.id===c.id);
              return(
                <div key={c.id} ref={el=>{if(el)cardRefs.current[c.id]=el;}}>
                  <PlayingCard card={c} selected={sel} onClick={isMyTurn?()=>toggleCard(c):undefined} disabled={!isMyTurn} glow={playable&&!sel&&isMyTurn}/>
                </div>
              );
            })}
          </div>
        )}
        <div style={{display:"flex",gap:12,marginTop:4}}>
          <button onClick={handlePlaySelected} disabled={!canPlay||!isMyTurn} style={{background:canPlay&&isMyTurn?"linear-gradient(135deg,#d4a017,#a07010)":"rgba(255,255,255,0.05)",border:canPlay&&isMyTurn?"none":"1px solid rgba(255,255,255,0.08)",borderRadius:30,padding:"11px 32px",fontSize:13,fontWeight:700,color:canPlay&&isMyTurn?"#1a0f00":"rgba(255,255,255,0.2)",cursor:canPlay&&isMyTurn?"pointer":"not-allowed",letterSpacing:2,fontFamily:"'Georgia',serif",transition:"all 0.2s",boxShadow:canPlay&&isMyTurn?"0 4px 16px rgba(212,160,23,0.3)":"none"}}>
            JOUER {selectedCards.length>0?`(${selectedCards.length})`:""}
          </button>
          <button onClick={handlePickUp} disabled={!canPickUp} style={{background:canPickUp?"rgba(200,80,60,0.15)":"rgba(255,255,255,0.03)",border:`1px solid ${canPickUp?"rgba(200,80,60,0.4)":"rgba(255,255,255,0.06)"}`,borderRadius:30,padding:"11px 28px",fontSize:13,color:canPickUp?"#ff9070":"rgba(255,255,255,0.15)",cursor:canPickUp?"pointer":"not-allowed",letterSpacing:2,fontFamily:"'Georgia',serif",transition:"all 0.2s"}}>
            RAMASSER LE TALON
          </button>
        </div>
      </div>
    </div>
  );
}
```
