# Two Crowns 二つの王冠　双雄争霸
ターン制ストラテジー（単一HTMLゲーム）

盤面で青軍（人間）と赤軍（CPU）が争う、ブラウザだけで動くターン制ストラテジーです。
**`index.html` 1ファイルだけ**で完結します（外部ライブラリ・ネットワーク接続不要・オフライン可）。
日本語 / English / 中文 に対応し、進行状況は端末内に自動保存されます。
効果音（合成音・ファイル不要）は ON/OFF でき、画面が小さい端末では盤面をスライドして見られます。

## 遊び方

1. `index.html` をダブルクリックしてブラウザで開く
   （またはブラウザのアドレスバーにドラッグ＆ドロップ）
2. スマホでは Chrome / Safari / Edge で開けばそのままタップ操作できます
3. 画面右上の「ルール」ボタンに遊び方の一覧があります

## 言語

- 起動時にブラウザの表示言語を見て **日本語 / English / 中文** を自動選択します。
- 下部の言語セレクトでいつでも切り替え可能。**選択した言語は保存され、ルール文・兵科名・ログまで全部その言語に置き換わります**（対局中のログも遡って翻訳されます）。

## セーブ（ローカル保存）

- 手番の切り替わりごとに **この端末のブラウザ保存領域（localStorage）へ自動保存**します。ネットワークへは何も送信しません。
- 途中で行き止まっても、次に開けば「セーブデータを発見」から**続きを再開**できます（決着した対局の続きは残しません）。
- ステージのクリア状況・最短ターン数も保存し、次のステージの解禁に使います。
- 「ステージ」画面の「セーブデータを消去」で、進行状況をまとめて削除できます。
- 保存領域が使えない環境（シークレットモード等）でもエラーにならず、その場対戦として遊べます。

## ステージ（全7種）

| # | ステージ | 特徴 |
| --- | --- | --- |
| 1 | ランダム戦 | 毎回自動生成される上下対称マップ |
| 2 | 二つの橋 | 河を挟んで橋が2つ。渡り口を制圧しろ |
| 3 | 森の迷路 | 森が多く、守る側が有利 |
| 4 | 山の峠 | 山岳が騎兵を分断する（騎兵は回り込み必須） |
| 5 | 穀倉地帯 | 村が多く資金勝負。兵数上限10 |
| 6 | 峡谷 | 狭い回廊での接近戦。兵数上限6 |
| 7 | 沿岸の道 | 本営が盤面左端。横向きの地形で本営HP40 |

1に勝つと2、2に勝つと3…と解禁されます。「ステージ」ボタンから選ぶと、進行中の対局はそのステージでやり直しになります。

### 操作

| 操作 | マウス / タッチ | キーボード |
| --- | --- | --- |
| 兵を選ぶ | 兵をタップ | クリック |
| 移動 | 緑のマスへタップ | クリック |
| 攻撃 | 黄色のマスへタップ | クリック |
| 選択解除 | 同じ兵をもう一度タップ | Esc |
| ターン終了 | 「ターン終了」ボタン | Space |
| 一手戻す | 「戻す」ボタン | U |
| ステージ選択 | 「ステージ」ボタン | ― |
| 言語切替 | 言語セレクト | ― |
| 効果音 ON/OFF | 「🔊 音」ボタン | ― |
| 盤面の表示範囲をずらす | 盤面を指でスライド / マウスホイール | ― |

PCでもスマホでも同じUIです。盤面は画面サイズに応じて自動でサイズ調整されます。

## 画面表示（スマホ対応）

- 盤面の升目は `30px`（最小）〜 `66px`（最大）の範囲で自動決定します。
- **上下のHUDや操作バーと盤面が重なるときは、盤面エリアだけがスクロールします**（本体ページは固定のまま）。
  重なる場合は盤面の下側に「↕ 盤面をスライド」の案内が出て、指のスライド／ホイールで隠れた行まで動かせます。
- 選択中の兵や攻撃の相手は、盤面がはみ出しているとき自動的にスクロールして視界に入る位置に寄せます。
- 横持ちなど縦に短い画面では、HUD・ログ・操作バーの余白を詰めたCompact表示に切り替えて盤面により多くの空間を確保します。
- iPhoneノッチ対応の `safe-area-inset` を上下のバーに反映しています。

## サウンド

- 選択・移動・攻撃・反撃・撃破・本営攻撃・ターン交代・採用・エラー・勝敗の**効果音を WebAudio で合成**しています（音声ファイルなし／ネットワーク不要）。
- 下部の「🔊 音」ボタンで ON/OFF。**設定は端末内に保存され、次回起動時も同じ状態**で始まります（古いセーブデータは ON 扱い）。
- ブラウザの制約に従い、音源は**最初のタップで起動**します。それ之前に音を出そうとしてもエラーにはなりません。
- 効果音が出ない環境（非対応ブラウザ・自動再生のブロック）でも、無音でそのまま遊べます。


## ルール要約

- **勝利条件**：敵の本営（標準HP 48）を破壊する。13ターン目から本営へのダメージが2倍、25ターン目から3倍…と増加し、長引けば必ず決着します。また30ターン目以降は兵へのダメージも増加（最大約3.5倍）するため、膠着すれば消耗戦で決着します。
  または、敵の兵を全滅させ、かつ資金ゼロにする。
- **1ターン**：資金収入（本営+5、村1つ+2、8ターンごと+1）→ 兵の移動と攻撃（1兵1回）→ 採用（新兵の配置）。
- **兵科**：歩兵（費2/移3/程1/攻6/HP20）、弓兵（3/2/2/7/16）、騎兵（5/4/1/9/26・山入れない）、槍兵（4/3/1/8/34）。
  騎兵>歩兵>弓兵>…の相性関係と、槍兵が騎兵を強く受ける三すくみになっています。
- **反撃**：隣接攻撃をすると、生き残った相手から同火力の反撃を受けます（遠隔攻撃は反撃なし）。
- **地形**：森（コスト2/防御+2）、山（コスト3/防御+3/騎兵不可）、河（渡れない）、村（収入源・占領できる）。
- **難易度**：やさしい＝敵の資金が少なくうっかり手が多い／ふつう＝やや潤沢な資金／むずかしい＝敵の資金が約1.6倍でミスらない。
  敵は本営までの「歩ける距離」で前進を評価するので、正面を塞がれれば遠回りして側面を取りにきます。

## 開発・テスト

ロジック検証用のヘッドレステスト同梱（ブラウザ不要）：

```
cd two-crowns
node tests/headless-test.js 60      # 60試合約15秒
```

- 盤面の不変条件（兵が河にいない・騎兵が山にいない・重複配置なし・上下対称の地形など）を全アクション後に検査
- ダメージ計算・移動コスト（Dijkstra）・射程の単位検証
- **全ステージ**の定義検証（地形の対称性、初期配置マスの合法性、本営同士の陸続き、徴兵場所の有無）と各ステージでの実戦決着
- **セーブ往復**の検証（保存→別盤面→読み出しで状態が完全一致、決着後は保存が消えプロファイルにクリアと最短ターンが記録される）
- **多言語**の検証（ja/en/zh のキー網羅、プレースホルダ残りの検出、兵科・陣営コードの解決、言語切替でログが追随）
- **UI配線**の実動作検証（兵をタップ→選択→タップ移動、戻る、採用→徴兵マスタップ、ターン終了→AI手番→自軍手番へ復帰、オーバーレイ開閉、言語セレクト、保存と消去、`pagehide` 退避保存）
- マークアップ突合（JS から参照する ID・`data-i18n`・翻訳キーが実在するか）
- **画面レイアウト**の検証（十分な空間なら中央配置、狭い画面では最小セルサイズを保ったまま「スクロール表示」に切り替わるか、はみ出し時に選択中の兵へ自動フォロースクロールするか、寸法が読めない環境でも安全に動くか）
- **サウンド**の検証（全効果音キューが音源の無い環境で例外を出さない／音源を模した環境では発音ノードが実際に生成される／OFF中は一切鳴らない／ON-OFF がプロファイルに保存され再起動後も復元、`sound` の無い旧プロファイルは ON）
- 膠着防止の消耗増加（30ターン目以降）が単調で上限付きかの検証。全ステージ・全難易度で90ターン以内に決着することも確認
- 3難易度で実戦シミュレーションを行い、勝率・平均ターン数・決着率を出力

環境変数 `DIAG=1` で攻撃内訳と兵の位置集計、`DIFFONLY=hard` で難易度を固定できます。

## English

Two Crowns is a turn-based strategy game that runs in your browser. The blue army (you) fights the red CPU army on a tactical board.
The entire game is contained in **one file, `index.html`**. No external libraries or network connection are required, and the game can be played offline.
The interface is available in Japanese, English, and Chinese. Progress is saved automatically on your device.

### How to play

1. Double-click `index.html` to open it in a browser (or drag and drop it into the browser address bar).
2. On a phone or tablet, open it in Chrome, Safari, or Edge and use touch controls.
3. Use the **Rules** button in the upper-right area for an in-game guide.

### Language

- The game selects Japanese, English, or Chinese based on your browser's display language at startup.
- Change the language at any time with the selector on the bottom bar. Your choice is saved, and rules, unit names, and logs are translated, including logs from earlier turns.

### Local saves

- The game automatically saves to the browser's local storage on this device whenever turns change. No data is sent over the network.
- If you leave during a game, choose **Continue** when you reopen the game to resume. Completed games are not resumed.
- Stage progress and best turn counts are saved and used to unlock later stages.
- Choose **Delete saved game** on the Stages screen to erase saved progress.
- The game still works as a local two-player match if browser storage is unavailable (for example, in private browsing).

### Stages (7 total)

| # | Stage | Description |
| --- | --- | --- |
| 1 | Random Skirmish | A new, vertically symmetrical map is generated each time |
| 2 | Two Bridges | Two crossings divide the river; seize them |
| 3 | Forest Maze | Dense forests favor the defender |
| 4 | Mountain Pass | Mountains split the cavalry; use a detour |
| 5 | Granary | Many villages make this a contest for income; unit cap 10 |
| 6 | Canyon | Close combat in narrow corridors; unit cap 6 |
| 7 | Coastal Road | The base is on the left edge; base HP 40 |

Stages unlock in order: win stage 1 to unlock stage 2, and so on. Choosing a stage from the **Stages** button starts a new game on that map.

### Controls

| Action | Mouse / Touch | Keyboard |
| --- | --- | --- |
| Select a unit | Tap the unit | Click |
| Move | Tap a green tile | Click |
| Attack | Tap a yellow tile | Click |
| Deselect | Tap the selected unit again | Esc |
| End turn | **End turn** button | Space |
| Undo one move | **Undo** button | U |
| Choose a stage | **Stages** button | — |
| Change language | Language selector | — |
| Toggle sound | **Sound** button | — |
| Scroll the board | Swipe the board / mouse wheel | — |

The same interface works on desktop and mobile. The board resizes automatically to fit the screen.

### Mobile layout

- Tile sizes are adjusted automatically between `30px` (minimum) and `66px` (maximum).
- If the board does not fit between the HUD and control bar, only the board area scrolls; the page itself stays fixed. A swipe hint appears at the bottom of the board.
- When the board overflows, the view automatically scrolls to keep the selected unit or attack target visible.
- Short landscape screens use a compact layout to leave more room for the board.
- Safe-area insets are applied to the top and bottom bars for iPhone notches.

### Sound

- Web Audio synthesizes sound effects for selection, movement, attacks, counterattacks, defeats, base attacks, turn changes, recruitment, errors, and victory or defeat. No audio files or network connection are needed.
- Toggle effects with the **Sound** button on the bottom bar. The setting is saved on the device and restored at the next launch (older saves default to sound on).
- Audio starts after the first tap, as required by browser policies.
- The game remains playable without sound in unsupported browsers or when autoplay is blocked.

### Rules summary

- **Victory:** Destroy the enemy base (standard HP: 48). Base damage doubles from turn 13 and triples from turn 25, increasing further in longer games. Unit damage also increases from turn 30 (up to about 3.5x), so stalled games eventually become a war of attrition. Alternatively, eliminate all enemy units and leave the enemy with no coins.
- **A turn:** Receive income (base +5, +2 per owned village, and +1 every 8 turns), move and attack with units (each unit acts once), then recruit.
- **Units:** Infantry (cost 2 / move 3 / range 1 / attack 6 / HP 20), Archer (3 / 2 / 2 / 7 / 16), Cavalry (5 / 4 / 1 / 9 / 26; cannot enter mountains), and Spearman (4 / 3 / 1 / 8 / 34). Cavalry beats infantry, infantry beats archers, and spearmen are especially effective against cavalry.
- **Counterattacks:** Adjacent attacks trigger a counterattack at the defender's full attack strength if it survives. Ranged attacks do not trigger counterattacks.
- **Terrain:** Forest (move cost 2 / defense +2), mountain (cost 3 / defense +3 / cavalry cannot enter), river (impassable), and village (can be captured and provides income).
- **Difficulty:** Easy gives the enemy less income and more careless moves; Normal gives it somewhat more income; Hard gives it about 1.6 times your base income and avoids mistakes. The enemy evaluates walkable distance to your base and may flank around a blocked front.

### Development and tests

The repository includes headless logic tests (no browser required):

```
cd two-crowns
node tests/headless-test.js 60      # about 15 seconds for 60 games
```

The tests cover board invariants, damage and movement calculations, all stage definitions and matches, save/load behavior, translations, UI wiring, responsive layouts, sound behavior, and endgame safeguards. They also simulate matches at all three difficulty levels and report win rates, average turns, and completion rates.

Set `DIAG=1` to print attack breakdowns and unit position summaries. Set `DIFFONLY=hard` to run only the selected difficulty.

## 简体中文

《双雄争霸》是一款在浏览器中运行的回合制策略游戏。蓝色军队（玩家）将在战术棋盘上与红色 CPU 军队交战。
整个游戏仅由 **一个文件 `index.html`** 组成，无需外部库或网络连接，也可以离线游玩。
界面支持日语、英语和中文，游戏进度会自动保存在本机。

### 开始游戏

1. 双击 `index.html`，用浏览器打开（也可以将文件拖到浏览器地址栏）。
2. 在手机或平板上使用 Chrome、Safari 或 Edge 打开，即可触屏操作。
3. 点击右上方的“规则”按钮查看游戏说明。

### 语言

- 启动时会根据浏览器的显示语言，在日语、英语和中文之间自动选择。
- 可通过底部栏的语言选择器随时切换。选择会被保存，规则、兵种名称和战斗日志都会切换为对应语言，之前的日志也会翻译。

### 本地存档

- 每次切换回合时，游戏都会自动将进度保存到本设备浏览器的 localStorage，不会向网络发送任何数据。
- 中途退出后，再次打开游戏时可选择“继续”恢复对局。已结束的对局不会继续保存。
- 通关进度和最少回合数也会保存，用于解锁后续关卡。
- 在“关卡”页面点击“删除存档”即可清除保存的进度。
- 即使浏览器存储不可用（例如无痕模式），游戏也不会报错，仍可作为本地双人对战游玩。

### 关卡（共 7 个）

| # | 关卡 | 特点 |
| --- | --- | --- |
| 1 | 随机战 | 每次自动生成上下对称的地图 |
| 2 | 双桥 | 河流阻隔战场，争夺两座桥头 |
| 3 | 森林迷宫 | 森林密布，防守方更有利 |
| 4 | 山地隘口 | 山脉阻断骑兵，需要绕行 |
| 5 | 粮仓地带 | 村庄众多，争夺收入；兵力上限 10 |
| 6 | 峡谷 | 在狭窄通道中近距离交战；兵力上限 6 |
| 7 | 沿海道路 | 大本营位于棋盘左侧；大本营 HP 为 40 |

关卡依次解锁：通过第 1 关可解锁第 2 关，以此类推。点击“关卡”按钮选择地图后，会在该地图上开始新对局。

### 操作

| 操作 | 鼠标 / 触屏 | 键盘 |
| --- | --- | --- |
| 选择士兵 | 点击士兵 | 单击 |
| 移动 | 点击绿色格子 | 单击 |
| 攻击 | 点击黄色格子 | 单击 |
| 取消选择 | 再次点击已选士兵 | Esc |
| 结束回合 | “结束回合”按钮 | Space |
| 撤销一步 | “撤销”按钮 | U |
| 选择关卡 | “关卡”按钮 | — |
| 切换语言 | 语言选择器 | — |
| 开关音效 | “音效”按钮 | — |
| 移动棋盘视野 | 滑动棋盘 / 鼠标滚轮 | — |

电脑和手机使用相同的界面，棋盘会根据屏幕尺寸自动调整。

### 手机屏幕适配

- 棋盘格会在 `30px`（最小）到 `66px`（最大）之间自动调整大小。
- 当棋盘无法完整显示在状态栏和操作栏之间时，只有棋盘区域可以滚动，页面本身保持固定；棋盘底部会显示滑动提示。
- 棋盘超出可视区域时，会自动滚动以显示当前选中的士兵或攻击目标。
- 横屏等高度较短的屏幕会切换为紧凑布局，为棋盘留出更多空间。
- 上下栏会适配 iPhone 刘海屏的安全区域。

### 音效

- 游戏使用 Web Audio 合成选择、移动、攻击、反击、击败、大本营受击、回合切换、征兵、错误和胜负音效，无需音频文件或网络连接。
- 点击底部栏的“音效”按钮即可开关音效。设置会保存在本机，下次启动时恢复（旧存档默认开启音效）。
- 根据浏览器策略，音频会在首次点击后启动。
- 即使浏览器不支持音效或阻止自动播放，也可以继续无声游玩。

### 规则概要

- **胜利条件：** 摧毁敌方大本营（标准 HP：48）。从第 13 回合起，大本营受到的伤害变为 2 倍；从第 25 回合起变为 3 倍，之后还会继续增加。第 30 回合起，对士兵造成的伤害也会逐步增加（最高约 3.5 倍），因此僵持战最终会以消耗战结束。另一种获胜方式是消灭敌方全部士兵，并使敌方资金归零。
- **回合流程：** 获得收入（大本营 +5，每座己方村庄 +2，每 8 回合 +1）→ 士兵移动和攻击（每名士兵每回合行动一次）→ 征兵。
- **兵种：** 步兵（费用 2 / 移动 3 / 射程 1 / 攻击 6 / HP 20）、弓兵（3 / 2 / 2 / 7 / 16）、骑兵（5 / 4 / 1 / 9 / 26；不能进入山地）和枪兵（4 / 3 / 1 / 8 / 34）。骑兵克制步兵，步兵克制弓兵，枪兵尤其克制骑兵。
- **反击：** 邻接攻击后，如果防守方存活，会以完整攻击力反击。远程攻击不会受到反击。
- **地形：** 森林（移动消耗 2 / 防御 +2）、山地（消耗 3 / 防御 +3 / 骑兵无法进入）、河流（无法通行）、村庄（可占领并提供收入）。
- **难度：** 简单模式下敌军收入较少且容易失误；普通模式下敌军收入略高；困难模式下敌军基础收入约为玩家的 1.6 倍且不会失误。敌军会根据到达玩家大本营的可通行距离决定前进路线，正面受阻时可能绕路侧袭。

### 开发与测试

仓库内包含无需浏览器即可运行的无头逻辑测试：

```
cd two-crowns
node tests/headless-test.js 60      # 运行 60 场约需 15 秒
```

测试覆盖棋盘状态不变量、伤害和移动计算、全部关卡定义与实战、存档读写、多语言、UI 交互、屏幕布局、音效行为和防止对局僵持的机制。测试还会在三种难度下模拟对局，并输出胜率、平均回合数和结束率。

设置 `DIAG=1` 可输出攻击详情和士兵位置统计；设置 `DIFFONLY=hard` 可只运行指定难度。

