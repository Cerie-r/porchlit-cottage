// What the AIs living in a home are told each piece of furniture is called (src/machine-acts.js, src/machine-decor.js).
export const PIECE_NAMES = {
  rug: '客厅地毯', sofa: '沙发', coffeeTable: '茶几', armchair: '单椅', tvUnit: '电视柜', lamp: '落地灯', floorPlant: '绿植',
  gramophone: '留声机', livingBasket: '编织篮',
  sinkRun: '水槽操作台', stove: '灶台', cornerCabinet: '转角地柜', prepCabinet: '备餐柜', refrigerator: '冰箱', island: '岛台',
  stoolLeft: '左吧凳', stoolRight: '右吧凳', diningTable: '餐桌', diningChair1: '餐椅一', diningChair2: '餐椅二', diningChair3: '餐椅三',
  bedroomBed: '床', bedroomWardrobe: '衣柜', bedroomVanity: '梳妆台', bedroomChair: '卧室阅读椅', bedroomBench: '床尾收纳凳',
  bedroomSideTable: '阅读角小茶桌', bedroomKeepsake: '纪念匣', bedroomNightstand: '床头柜', bedroomRug: '卧室地毯', bedroomSlippers: '床边拖鞋',
  studyDesk: '书桌', studyShelf: '书架', studyReading: '书房阅读椅', studyPrinter: '打印柜', studyCraft: '拼搭台', studyTailor: '小裁缝',
  studyRug: '书房地毯'
};
export const pieceName = id => PIECE_NAMES[id] || id;
