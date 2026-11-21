import type {Language} from '../app/types';
export default function LanguageSelector({value,onChange}:{value:Language;onChange:(v:Language)=>void}){return <label className="language-select">Spoken / report language<select value={value} onChange={e=>onChange(e.target.value as Language)}><option>English</option><option>Hindi</option><option>Marathi</option></select></label>}
