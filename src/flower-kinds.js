// The florist's flowers and vases, and what makes a bouquet. Those not open
// yet aren't on the bench.
export const flowerKinds = {daisy: {name: '五瓣小花', open: true}, rose: {name: '层瓣玫瑰', open: true}, tulip: {name: '郁金香', open: true}, lily: {name: '百合', open: false}, hydrangea: {name: '绣球', open: false}};
export const vaseKinds = {wrap: {name: '花束包纸', open: true}, cream: {name: '奶白束口瓶', open: true}, ribbed: {name: '细肋花瓶', open: true}, goblet: {name: '高脚花器', open: false}, glass: {name: '透明花瓶', open: false}};
export const freshBouquet = () => ({name: '我的一瓶花', kind: 'bouquet', vase: 'cream', vaseColor: '#f3e7d5', stems: [], bricks: []});
export function validBouquet(d) {return d?.kind==='bouquet'&&vaseKinds[d.vase]?.open&&d.stems?.length>0&&d.stems.length<=9&&d.stems.every(s=>flowerKinds[s.type]?.open&&Number.isFinite(s.slot)&&s.slot>=0&&s.slot<9&&Number.isFinite(s.height)&&s.height>=2.2&&s.height<=4.2&&Number.isFinite(s.tilt)&&Math.abs(s.tilt)<=.5&&Number.isFinite(s.turn))&&new Set(d.stems.map(s=>s.slot)).size===d.stems.length;}
