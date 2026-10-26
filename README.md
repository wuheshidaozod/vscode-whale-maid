# vscode-whale-maid · 深海女仆工坊 VS Code 版

把 [dsh-deep-whale](https://github.com/Small-tailqwq/dsh-deep-whale) 的 **maid-atelier（深海女仆工坊）** 皮肤移植到 VS Code：

- **舞台**：编辑区背后是夜之宫殿和两位鲸鱼娘女仆，代码区半透明叠在上面
- **侧边栏**：金框深蓝面板、四角金色角花、深蓝缎带选中行、底部 Q 版鲸鱼娘和蕾丝垂花
- **顶部**：深蓝金线饰带 + 白蕾丝 + 蝴蝶结；**底部**：金线与金色徽饰
- **配色**：深海蓝 + 金色，含欢迎页、终端、弹窗、状态栏
- **看板娘扩展**：资源管理器里的鲸鱼娘，会跟着你的状态换表情（打字认真、保存开心、报错晕倒、闲置打瞌睡、点她被摸头），状态栏显示台词

> 装饰部分靠 [Custom CSS and JS Loader](https://marketplace.visualstudio.com/items?itemName=be5invis.vscode-custom-css) 注入 CSS。它会修改 VS Code 的安装文件：VS Code 会提示"安装似乎损坏"（可选"不再显示"），且**每次 VS Code 更新后要重新启用一次**。只想要配色和看板娘的话，跳过第 3、4 步即可。

## 安装（Windows）

1. 克隆到用户目录：

   ```sh
   git clone https://github.com/wuheshidaozod/vscode-whale-maid "%USERPROFILE%\.vscode-whale"
   ```

2. 安装看板娘扩展和 CSS 注入扩展：

   ```sh
   code --install-extension "%USERPROFILE%\.vscode-whale\whale-maid-0.1.0.vsix"
   code --install-extension be5invis.vscode-custom-css
   ```

3. 打开 VS Code 用户设置 JSON（`Ctrl+Shift+P` → **Preferences: Open User Settings (JSON)**），把 [`settings.example.jsonc`](settings.example.jsonc) 里的两项合并进去，并把路径里的 `<你的用户名>` 换掉。

4. `Ctrl+Shift+P` → **Enable Custom CSS and JS**，按提示重启 VS Code。

macOS / Linux：克隆到 `~/.vscode-whale`，`vscode_custom_css.imports` 写 `file:///Users/<你>/.vscode-whale/whale.css`（Linux 为 `/home/<你>/...`）。

## 调整

`whale.template.css` 开头的参数：

| 参数 | 作用 |
|---|---|
| `--whale-stage-veil` | 盖在女仆上的深蓝薄纱：越大代码越清楚、女仆越淡 |
| `--whale-palace-veil` | 宫殿背景的明暗 |
| `--whale-editor-glass` | 代码区底色不透明度 |
| `--whale-sidebar-mascot` | 侧边栏 Q 版女仆不透明度 |

改完重新生成并重载：

```sh
pip install pillow
python build.py
```

然后在 VS Code 里执行 **Reload Custom CSS and JS**。看板娘的台词在 `mascot/extension.js` 开头的 `LINES` 里，改完 `python build.py` 后重新安装生成的 `.vsix`。睡着前的分钟数、是否显示状态栏台词可以在设置里搜"鲸鱼娘"。

`python build.py --import <dsh-deep-whale>/maid-atelier/assets` 可以从原仓库重新导入素材。

## 文件

| 文件 | 说明 |
|---|---|
| `whale.template.css` | 装饰样式源码，素材用 `art(名字)` 占位 |
| `whale.css` | 生成结果（素材内嵌为 data URI），VS Code 加载的就是它 |
| `mascot/` | 看板娘扩展源码 |
| `whale-maid-0.1.0.vsix` | 打包好的看板娘扩展 |
| `art/` | 处理过的素材 |
| `build.py` | 导入素材、生成 CSS、打包 vsix |
| `settings.example.jsonc` | 配色和 CSS 路径设置 |

## 授权

- 代码：MIT，见 [LICENSE](LICENSE)
- 美术素材：**CC BY-NC-SA 4.0，仅限非商业使用**，署名链见 [NOTICE.md](NOTICE.md)

原角色：上善（鲸鱼娘原案）· ZipZipPipe（女仆改设）· Small-tailqwq（dsh-deep-whale 皮肤）
