// Default templates; each household saves its overrides separately.
export const palette = {
  cream: "#efe0d5",
  ivory: "#fff8f1",
  roof: "#777484",
  rose: "#cf9bad",
  roseDeep: "#a66e85",
  sage: "#7f927f",
  wood: "#806c65",
  amber: "#f3c879",
  lawn: "#d9decf",
  stone: "#d7c9c0"
};

export const roomData = {
  "1F": [
    { id: "overview", label: "全景" },
    { id: "living", label: "客厅" },
    { id: "kitchen", label: "厨房" }
  ],
  "2F": [
    { id: "bedroom", label: "卧室" },
    { id: "study", label: "书房" }
  ]
};

export const interiorThemes = {
  creamRose: {
    label: "奶油白",
    wall: "#ded5c9", wallSide: "#d2c8bb", trim: "#fff9ef",
    sofa: "#f6eee4", sofaDeep: "#eadfD3", cushion: "#fff8ef",
    curtainA: "#eee3d8", curtainB: "#f8f0e7", curtainHem: "#cdb8a9",
    cabinet: "#eee5da", cabinetDoor: "#faf3e9", island: "#ede2d5",
    chair: "#f3eadf", rug: "#e9ddd1", accent: "#b78391", wood: "#9a7867"
  }
};

export const floorFinishes = {
  oak: { label: "白橡木", kind: "plank", a: "#eadfd4", b: "#f0e6dc", line: "#d6c4b7" },
  blushTile: { label: "腮红砖", kind: "tile", a: "#ead9da", b: "#f3e7e3", line: "#d3bec0" },
  walnut: { label: "胡桃木", kind: "plank", a: "#ad9285", b: "#bda397", line: "#8f756c" }
};

export const furnitureCatalog = {
  rug: { label: "地毯", radius: 2.35, placement: "floor", interactions: ["move", "rotate"] },
  sofa: { label: "沙发", radius: 1.42, placement: "floor", interactions: ["sit", "stash-cushion"] },
  coffeeTable: { label: "茶几", radius: 1.2, placement: "floor", interactions: ["surface"] },
  coffeeTray: { label: "小托盘", radius: .42, placement: "surface", supportId: "coffeeTable", interactions: ["surface"] },
  coffeeMug: { label: "小茶杯", radius: .2, placement: "surface", supportId: "coffeeTable", interactions: ["drink", "stash-note"] },
  greenBook: { label: "奶油色封皮书", radius: .34, placement: "surface", supportId: "coffeeTable", interactions: ["read", "stash-note"] },
  roseBook: { label: "粉皮书", radius: .34, placement: "surface", supportId: "coffeeTable", interactions: ["read", "stash-note"] },
  armchair: { label: "单椅", radius: .72, placement: "floor", interactions: ["sit"] },
  tvUnit: { label: "电视与电视柜", radius: 1.08, placement: "wall", interactions: ["power", "storage-left", "storage-right"] },
  lamp: { label: "落地灯", radius: .56, placement: "floor", interactions: ["power"] },
  floorPlant: { label: "绿植", radius: .52, placement: "floor", interactions: ["move", "rotate"] },
  gramophone: { label: "留声机", radius: .42, placement: "floor", interactions: ["music", "move", "rotate"] }
};

