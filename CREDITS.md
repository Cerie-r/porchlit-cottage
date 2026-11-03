# Credits · 鸣谢

Porchlit's code is released under the GNU Affero General Public License, version 3 or (at your option) any later
version: see [LICENSE](LICENSE). This file says where the pictures, models and sounds came from.

Porchlit 的代码按 AGPL-3.0（或更新的版本）发布，见 [LICENSE](LICENSE)。这份写的是图、模型和声音从哪儿来。

## Pictures · 图

- **The exploring book** (`public/explore/`): the cover, the map, every page's backdrops, ground, paper pieces,
  finds and animals were generated with **ChatGPT**. A few were cut out or trimmed by hand afterwards.

  **出门那本书**（`public/explore/`）：封面、地图、每一页的背景、地面、纸片、能捡到的东西和小动物，都是用
  **ChatGPT** 生成的，少数几张之后手工裁过。
- **Wardrobe cards** (`public/wardrobe/`): photographed from Porchlit's own 3D outfits and headwear
  (`npm run wardrobe:pictures`).

  **衣柜卡片**（`public/wardrobe/`）：照着 Porchlit 自己做的 3D 衣服和头饰拍的。
- **Tarot** (`public/art/tarot/`): the compositions were drawn as SVG with **ChatGPT** and are kept as the editable
  source (`scripts/tarot-compositions.jsx`, exported by `scripts/export-tarot.mjs`). The cards themselves are those
  compositions repainted offline with seeded pen strokes and washes, using the penwash engine of
  [pencil-case](https://github.com/Qizhan7/pencil-case) by Sienna Qi (戚盏), made by 盏 & North, which is licensed
  under the PolyForm Noncommercial License 1.0.0. The engine itself is not part of this release. The cards are
  symbolic compositions, not reproductions of the 1909 Rider–Waite–Smith illustrations.

  **塔罗**（`public/art/tarot/`）：构图是用 **ChatGPT** 画的 SVG，留作可以改的原稿（`scripts/tarot-compositions.jsx`，
  用 `scripts/export-tarot.mjs` 导出）。牌面是把这些构图离线重画一遍的笔触和水彩，用的是
  [pencil-case](https://github.com/Qizhan7/pencil-case) 的 penwash 画笔（作者戚盏，盏与 North 一起做的，PolyForm
  Noncommercial 1.0.0 授权），画笔本身不在这份发布里。塔罗牌是象征性的构图，不是 1909 年 Rider–Waite–Smith 那套画的复制。
- **Stationery** (`public/art/stationery/`): Porchlit's own pictures, painted offline with the same penwash engine.

  **信纸**（`public/art/stationery/`）：Porchlit 自己的图，也是用这支 penwash 画笔离线画的。

## Models · 模型

- The houses (`porchlit-house`, the castles, the haunted house) are built by scripts in `scripts/` when the project
  is built.

  房子（小屋、两座城堡、鬼屋）都是构建时用 `scripts/` 里的脚本搭出来的。
- The residents' body (`public/models/resident-body.glb`) was sculpted for Porchlit. Some of its parts still carry
  old node names such as `purchased-head`, kept so the code that reads them didn't have to change; the geometry is
  Porchlit's own.

  小人的身子（`public/models/resident-body.glb`）是为 Porchlit 捏的。里面有的部位还叫 `purchased-head` 这类
  旧名字，是为了不改读它的代码；形状是 Porchlit 自己的。
- Furniture, outfits, dolls, flowers, desserts, dishes and builds are made in code.

  家具、衣服、玩偶、花、甜品、菜和拼搭都是代码搭的。

## Sounds and fonts · 声音和字体

The sounds and music are synthesized in the page (`src/sounds.js`, `src/music.js`); there are no audio files. No
font files are included.

声音和音乐都是页面里现场合成的（`src/sounds.js`、`src/music.js`），没有音频文件，也没有字体文件。

## Libraries · 依赖

The libraries in `package.json` (three.js, React, @react-three/fiber, node-postgres and the rest) come under their
own licenses.

`package.json` 里的依赖（three.js、React、@react-three/fiber、node-postgres 等）各自按自己的许可证。
