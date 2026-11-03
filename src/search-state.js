export const clamp=v=>Math.max(0,Math.min(1,Number(v)||0));
export function searchParts(kind){
 if(kind==='bedroom-vanity')return [['open','首饰盒盖'],['drawerLeft','左抽屉'],['drawerRight','右抽屉']];
 if(kind==='curtain')return [['left','左窗帘'],['right','右窗帘']];
 if(kind==='study-shelf')return [...[0,1,2,3].map(i=>['shelf'+i,'第'+(i+1)+'层书']),['drawer','底部抽屉']];
 if(kind==='bedroom-nightstand')return [['open','上抽屉'],['lower','下抽屉']];
 if(kind==='study-printer')return [0,1,2,3].map(i=>['drawer'+i,'第'+(i+1)+'个抽屉']);
 if(['diorama-keepsake','diorama-basket','book'].includes(kind))return [['open',kind==='book'?'封面':kind==='diorama-basket'?'折毯':'盒盖']];
 if(['study-rug','living-rug'].includes(kind))return [['left','左侧毯角'],['right','右侧毯角']];
 if(kind==='sofa')return [['left','左坐垫'],['middle','中间坐垫'],['right','右坐垫'],['pillow0','左抱枕'],['pillow1','右抱枕']];
 if(kind==='bedroom-bed')return [['left','左枕头'],['right','右枕头'],['quilt','被角']];
 if(kind==='bedroom-wardrobe')return [['left','左柜门'],['right','右柜门']];
 if(['fridge','freezer','cupboard','tv','kitchen','study-desk','study-craft','bedroom-shelf','bedroom-vanity','study-box','bedroom-nightstand','bedroom-bench','bedroom-chair','armchair','study-reading'].includes(kind))return [['open',kind.includes('box')?'盒盖':kind.includes('chair')||kind==='study-reading'?'坐垫':kind==='cupboard'?'柜门':'把手']];
 return [];
}
export function slotVisible(kind,values,slot=0,angle=0){
 if(!searchParts(kind).length)return true;
 if(kind==='bedroom-nightstand')return clamp(values[slot<4?'open':'lower'])>.62;
 if(kind==='bedroom-vanity')return clamp(values[slot<4?'open':slot<8?'drawerLeft':'drawerRight'])>.62;
 if(kind==='study-printer')return true;
 if(kind==='study-shelf')return slot>=4?Math.cos(angle)<-.25:clamp(values['shelf'+slot])>.62;
 if(kind==='bedroom-bed'&&slot>1)return clamp(values.quilt)>.62;
 const side=slot%2?'right':'left';
 const key=['curtain','study-rug','living-rug','sofa','bedroom-bed','bedroom-wardrobe'].includes(kind)?side:'open';
 return clamp(values[key])>.62;
}
// A new home's curtains start drawn back, so its windows let the light in.
// Whatever was saved still wins.
export const searchDefaults={'hide:livingWindow':{left:1,right:1},'hide:bedroomWindow':{left:1,right:1}};
export function loadSearch(id){let saved={};try{saved=JSON.parse(localStorage.getItem('porchlit-search-v1:'+id))||{};}catch{}return {...searchDefaults[id],...saved};}

export function searchHint(kind){
 if(clickSearchPart(kind,'open'))return '点柜门、抽屉前板或盒盖打开，再点一次关上；拖空白处转动视角。';
 const hints={
  curtain:'把左帘向左、右帘向右拨开，露出窗台藏点；反向拖动合上。',
  'coffee-table':'这里是茶几桌面，可以留下信或放一件小物。',
  'bedroom-bench':'向上拖动凳面，打开收纳凳。',
  'bedroom-chair':'向上拖动坐垫，看看下面。',
  sofa:'向上拖动坐垫，向右拖动抱枕，看看下面藏着什么。',
  armchair:'按住坐垫向上拖，抬起后看看下面。',
  'study-reading':'按住坐垫向上拖，抬起后看看下面。',
  'study-rug':'按住左边或右边的毯角向上拖，慢慢掀开。',
  'living-rug':'按住左边或右边的毯角向上拖，慢慢掀开。',
  'bedroom-bed':'向上拖动枕头或被角，看看下面。',
  'bedroom-wardrobe':'按住左侧或右侧柜门向右拖，打开对应一侧。',
  cupboard:'按住柜门向右拖，慢慢打开。',
  fridge:'按住冰箱门向右拖，慢慢打开。',
  freezer:'按住冷冻室门向右拖，慢慢打开。',
  tv:'按住抽屉前板向下拖，把抽屉拉出来。',
  kitchen:'按住抽屉前板向下拖，把抽屉拉出来。',
  'study-desk':'按住抽屉把手向下拖，把抽屉拉出来。',
  'bedroom-nightstand':'按住上层或下层把手向下拖，拉开抽屉。',
  'bedroom-shelf':'向上拖动层架上小盒子的盖子。',
  'bedroom-vanity':'向上掀开首饰盒；向下拖动左右抽屉把手。',
  'study-box':'按住盒盖向上拖，慢慢掀开。',
  'diorama-keepsake':'按住盒盖向上拖，慢慢掀开。',
  'diorama-basket':'按住篮子里的折毯向上拖，挪开后看看里面。',
  'study-printer':'向下拖动左侧把手拉开抽屉；右侧开放层架可以放东西。',
  'study-craft':'向下拖动把手拉开抽屉。',
  'study-shelf':'向右拖动书本露出书后藏点；点击底部抽屉开关；转到背面可以往背板的小袋里藏东西。',
  book:'按住封面向上拖，把书翻开。'
 };
 return hints[kind]?hints[kind]+'反向拖动放回；拖空白处转动视角。':'拖动物件，换个角度看看。';
}

// Rigid storage parts toggle; loose fabrics and books retain tactile searching.
export function clickSearchPart(kind,id){
 if(kind==='study-shelf')return id==='drawer';
 return ['bedroom-wardrobe','cupboard','fridge','freezer','tv','kitchen','study-desk','study-craft','bedroom-nightstand','bedroom-shelf','bedroom-vanity','study-box','study-printer','diorama-keepsake','bedroom-bench'].includes(kind);
}
