export const majorNames=['愚者','魔术师','女祭司','皇后','皇帝','教皇','恋人','战车','力量','隐者','命运之轮','正义','倒吊人','死神','节制','恶魔','高塔','星星','月亮','太阳','审判','世界'];
const ranks=['王牌','二','三','四','五','六','七','八','九','十','侍从','骑士','王后','国王'];
export const tarotCards=[...majorNames.map((name,i)=>({id:`major-${i}`,name,suit:'major',rank:i})),...['权杖','圣杯','宝剑','星币'].flatMap((name,s)=>ranks.map((rank,i)=>({id:`${s}-${i}`,name:name+rank,suit:['wand','cup','sword','coin'][s],rank:i+1})))];
export function randomUnit(){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]/4294967296;}
export function shuffleDeck(reversals=false,random=randomUnit){const deck=tarotCards.map(card=>({...card,reversed:reversals&&random()<.5}));for(let i=deck.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}return deck;}
export const positions=count=>count===3?['现状','阻碍','建议']:['这一张'];
export function interpretationText(question,cards,includeQuestion=true){return `${includeQuestion&&question.trim()?`这次想问：${question.trim()}\n`:'没有提供问题，请围绕牌面做开放式解读。\n'}牌阵：${cards.length===3?'现状 · 阻碍 · 建议':'单张'}\n${cards.map((c,i)=>`${positions(cards.length)[i]}：${c.name}（${c.reversed?'逆位':'正位'}）`).join('\n')}\n这些牌是我亲手选择、翻开的。请只解读以上结果，不重新抽牌；把它作为自我思考的提示，不作确定的预言。`;}
