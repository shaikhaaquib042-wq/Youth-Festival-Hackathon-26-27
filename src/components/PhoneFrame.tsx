import type {ReactNode} from 'react';
import {useEffect,useState} from 'react';
export default function PhoneFrame({title,subtitle,children,className='',language='English'}:{title:string;subtitle:string;children:ReactNode;className?:string;language?:'English'|'Hindi'|'Marathi'}){
 const [clock,setClock]=useState('9:41');
 useEffect(()=>{const update=()=>setClock(new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}));update();const id=window.setInterval(update,30000);return()=>clearInterval(id)},[]);
 const locale=language==='Hindi'?'hi':language==='Marathi'?'mr':'en';
 return <section className={`phone-frame ${className}`} aria-label={title} lang={locale}><div className="phone-notch" aria-hidden="true"/><div className="phone-status"><span>{clock}</span><span aria-label="Phone signal and battery">●●●　▰</span></div><header className="phone-header"><div className="phone-avatar" aria-hidden="true">{title.startsWith('Family')||title.startsWith('कुटुंब')||title.startsWith('परिवार')?'👨‍👩‍👧':'S'}</div><div><strong>{title}</strong><small>{subtitle}</small></div><span className="phone-header-more" aria-hidden="true">⋮</span></header><div className="phone-content">{children}</div><div className="phone-home" aria-hidden="true"><span/></div></section>
}
