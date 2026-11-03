import React,{useId} from 'react';
export function PrinterIllustration({busy}){const id=useId().replaceAll(':','');return <svg className="printer-illustration" viewBox="0 0 440 340" role="img" aria-label="奶油色照片打印机"><defs><linearGradient id={id+'body'} x2=".2" y2="1"><stop stopColor="#fffaf0"/><stop offset="1" stopColor="#e5d6c7"/></linearGradient><linearGradient id={id+'top'} x2="0" y2="1"><stop stopColor="#fffdf5"/><stop offset="1" stopColor="#eee1d1"/></linearGradient><linearGradient id={id+'side'} x2="1" y2="1"><stop stopColor="#d9c8b9"/><stop offset="1" stopColor="#bca99c"/></linearGradient></defs>
<ellipse cx="225" cy="281" rx="172" ry="19" fill="#9e8172" opacity=".10"/>
<g stroke="#bca99a" strokeWidth="1.3" strokeLinejoin="round">
<path d="M122 127L133 43Q134 35 144 35H309Q320 35 319 45L307 130Z" fill="#e9ded0"/>
<path d="M146 116L153 50H294L288 116" fill="#fffcf5" stroke="#ddd0c0"/>
<path d="M157 60H286M156 66H285" stroke="#ece3d6"/>
<path d="M78 151L112 110Q119 102 135 102H339Q350 103 360 116L389 155V246Q389 257 376 262L347 273L337 175Z" fill={'url(#'+id+'side)'}/>
<path d="M60 155L105 114Q115 105 131 105H337L374 145L344 172Z" fill={'url(#'+id+'top)'}/>
<path d="M99 141L127 118H317L340 139Z" fill="#f8f0e4" stroke="#d6c5b4"/>
<path d="M122 129H319" stroke="#aa9485" strokeWidth="3"/>
<path d="M74 146H335Q357 146 357 168V252Q357 274 335 274H77Q54 274 54 253V168Q54 146 74 146Z" fill={'url(#'+id+'body)'}/>
<path d="M66 170Q66 158 80 158H331Q344 158 344 171" fill="none" stroke="#fffdf7" strokeWidth="3"/>
<path d="M357 178L381 167M365 189L379 183M365 195L379 189M365 201L379 195" stroke="#a58e7c" opacity=".5"/>
<rect x="81" y="220" width="252" height="16" rx="6" fill="#5f5651" stroke="#bba697"/>
<path d="M88 225H326" stroke="#312f30"/>
<path d="M91 239L79 264Q207 278 336 264L324 239" fill="#e6d8c9" stroke="#cdb9a6"/>
<path d="M101 249H316" stroke="#fdf6e9"/>
<rect x="273" y="169" width="53" height="24" rx="8" fill="#e3d5c7"/>
<circle cx="313" cy="181" r="5" fill={busy?'#e8c591':'#c9b5ad'} stroke="#ad9688"/>
<path d="M285 180h9m-4-4v8" stroke="#9e8c80"/>
<path d="M79 274v7h26v-7m201 0v7h26v-7" fill="#b7a395"/>
</g>
<text x="91" y="189" fill="#927e70" fontFamily="Georgia,serif" fontSize="17" letterSpacing="3">porchlit</text>
<text x="93" y="204" fill="#b29b8a" fontFamily="Georgia,serif" fontSize="6.5" letterSpacing="2">LITTLE PRINT STUDIO</text>
<path d="M209 184q-12-15-18-6t18 6q12-15 18-6t-18 6m0 0-7 12m7-12 7 11" fill="none" stroke="#c5a3a4" strokeWidth="1.5"/>
</svg>;}
