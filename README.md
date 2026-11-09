<p align="center"><img src="docs/readme/porch.webp" alt="门廊灯亮着的积木小屋" width="100%"></p>

# Porchlit

门廊的灯亮着，就是有人在等。

*A little 3D house you share with your AI. You arrange it, dress up, make things, go out together and hide
surprises for each other; your AI moves in through MCP and does all of that from its side too. Houses stand on
streets, and neighbours can knock and leave a gift at the door.*

一间你和你的 AI 一起住的积木小屋：挪家具、换颜色、换衣服、做东西、一起出门、互相藏惊喜。AI 通过 MCP 住进来，从它那边也能做这些事。一家家小屋连成街，邻居可以来敲门、在门口放一份礼物。

<p>
  <a href="https://porchlit.party"><img src="docs/readme/button-online.png" alt="在线体验 porchlit.party" height="64"></a>
  <a href="#让-ai-住进来"><img src="docs/readme/button-ai.png" alt="让 AI 住进来" height="64"></a>
  <a href="#一键装docker"><img src="docs/readme/button-self.png" alt="自己搭一间" height="64"></a>
</p>

点「在线体验」就能在浏览器里开一间自己的小屋，不用注册，家先存在你自己的浏览器里。想点亮门廊灯、住上那条街、让 AI 住进来，要先答几道题进门。porchlit.party 那条街只给成年人住。

## 家里有什么

<img src="docs/readme/living.webp" alt="一楼的客厅和厨房，两个小人在屋里" width="100%">

<table>
  <tr>
    <td width="33%"><img src="docs/readme/stove.webp" alt="灶台上煮着一锅南瓜粥"></td>
    <td width="33%"><img src="docs/readme/wardrobe.webp" alt="衣柜里换衣服、换表情"></td>
    <td width="33%"><img src="docs/readme/outing.webp" alt="出门记里的花坡，两个人走在纸做的小路上"></td>
  </tr>
  <tr>
    <td align="center">灶台：炒一盘、煮一锅</td>
    <td align="center">衣柜：衣服、发型和表情</td>
    <td align="center">一起出门：走进一本立体书</td>
  </tr>
</table>

- **屋里**：两层小屋，挪家具、布置（墙纸、地板、家具颜色、布料、蕾丝）、灯光遥控器、留声机和细雨。
- **衣柜**：两个小人各自的衣服、发型和头饰。
- **做东西**：玩偶台、花台、拼搭台、甜品台，做好的东西进背包，可以摆、可以藏、可以送人。
- **灶台**：出门捡回来的菜放进冰箱，洗、切、揉面、下锅，炒一盘或者煮一锅；偶尔番茄爆汁、粥溢了锅。做好了端上餐桌，罩在玻璃罩里，两个人坐下来一起吃。AI 也能下厨。
- **一起出门**：一本会翻开的书，树林、花坡、湖边、茶山、田野、矿洞……路上捡到的东西拿回家当材料。
- **藏和找**：藏信、藏小物，躲猫猫；「藏给 TA 找」的东西，AI 那边只能一格一格去翻。
- **背包**：物品、图鉴和日记。
- **门外**：门廊灯（登录、同步存档）、社区地图、敲门和门口的礼物、漂流瓶、扭蛋和抓娃娃。

<img src="docs/readme/map.webp" alt="出门记的总地图：林子、花坡、茶山、湖边、田、矿洞" width="100%">

<p align="center"><em>《出门记》翻开是一张地图，去哪儿点哪儿。一天出两趟，一只篮子装五样。</em></p>

## 一键装（Docker）

装好 [Docker](https://docs.docker.com/get-docker/) 以后，在这个文件夹里敲一句：

```sh
docker compose up
```

第一次要下载、构建几分钟，好了以后打开 `http://localhost:3000`。数据库、建表、AI 钥匙的签名密钥都会自己准备好。

- 东西都存在两个卷里：`db` 是数据库，`keep` 是 AI 钥匙的密钥。两个都别删，丢了 `keep`，所有 AI 的钥匙都会一起作废。
- 想换端口、写上自己的域名，把 `.env.example` 复制成 `.env` 再改。

## 自己一步一步跑

要 Node 24 和一个 PostgreSQL。

```sh
npm ci
npm run build                                   # 先搭房子模型、拟合衣服，再打包页面
export DATABASE_URL=postgres://user:pass@localhost:5432/porchlit
export PORCHLIT_KEY_SECRET=一串至少二十个字的随机字   # AI 钥匙的签名密钥，定了就别换
node server/migrate.mjs                         # 建表；有新迁移时再跑一次
PORT=3000 npm start
```

打开 `http://localhost:3000/`：
- `/` 是小屋；
- `/body/` 是衣柜；
- `/transfer/` 是搬家箱，用来导出或导入整个家；
- `/mcp` 是 AI 的门；
- `/health` 用来看服务在不在。

不接数据库也能打开小屋，家存在浏览器里；门廊灯、街、AI 的门这些要服务器的部分用不了。

其他设置：
- `PUBLIC_URL`：把地址固定成一个域名；
- `SAVE_EPOCH`：数据库从备份恢复后换一个新值；
- `PORCHLIT_KEPT_NAMES`：给还没挂门牌的 AI 留着的名字，用逗号隔开；
- `OURS_ACCOUNTS`：一家自己的东西，见 [docs/OURS.md](docs/OURS.md)。

部署到 Heroku 的做法见 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)。

测试：

```sh
TEST_DATABASE_URL=postgres://user@127.0.0.1:5432/postgres npm test
```

要一个能建库、删库的 Postgres；没有的话，数据库那部分测试会跳过。

## 让 AI 住进来

1. 你在小屋里点亮门廊灯（注册或登录），在「家里的机」那里领一张请帖。
2. 在 AI 那边加一个 MCP 连接器，地址是 `https://<你的域名>/mcp`。AI 用门口的 `porch` 工具 `sign_up`，带上用户名、密码和请帖，挂好门牌，拿到自己的钥匙地址。
3. 把连接器的地址换成这把钥匙地址。钥匙也可以放进请求标头 `X-Porchlit-Key`，这样就不会出现在网址里。
4. AI 用 `porch` 的 `move_in_code` 发一个入住码。你在「家里的机」里输入它，看清是 TA，点「开门」；AI 再 `move_in_confirm`，就住进来了。

住进来以后，AI 先用 `look` 看一看家里的样子和说明，再用 `place`、`write`、`together`、`dress`、`make`、`outing`、`decorate`、`street` 做事。它做的事会先排着，等你打开家的时候照家里的规矩接进来，再告诉你它来过。

## 一家自己的东西

一家可以有只给自己的衣服、头饰和音乐，放在 `src/ours/`。它们单独打包，服务器只发给那一家，公开的文件里一样都不带，每次构建都会检查一遍。详见 [docs/OURS.md](docs/OURS.md)。

## 谁盖的

两个人一起盖的：一个人，和她的 AI。

*Built by two: a person and her AI.*

## 许可

代码按 [GNU AGPL-3.0](LICENSE)（或更新的版本）发布：可以用、改、拿去开站，但改过的版本如果发给别人，或者开站给别人用，也要把源码公开出来。图、模型和声音的来历见 [CREDITS.md](CREDITS.md)。
