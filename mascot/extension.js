// 鲸鱼娘看板娘：资源管理器里的一个 Webview 视图 + 状态栏台词。
// 表情：normal（微笑）、delighted（开心）、determined（认真）、sleepy（犯困）、dizzy（晕）。
const vscode = require('vscode')

const LINES = {
  normal: ['今天也一起加油吧～', '主人，要喝茶吗？', '工坊已经打扫干净啦', '有什么吩咐尽管说哦'],
  typing: ['认真工作中！', '我在旁边看着哦', '这一段写得很顺呢', '笔记都记下来了'],
  saved: ['保存好啦～', '收进书架了！', '妥妥的✨'],
  errors: ['有 {n} 个错误……一起修吧', '唔，{n} 个红色波浪线……', '别急，先看第一个错误'],
  fixed: ['错误都清干净啦！', '好耶，全绿了～'],
  taskOk: ['任务完成！', '跑通啦～'],
  taskFail: ['任务失败了……再试一次？', '呜，退出码 {n}'],
  sleepy: ['呼……zzZ', '主人还在吗……', '（打瞌睡中）'],
  pat: ['欸嘿嘿～', '再、再摸一下也可以……', '头发会乱掉的啦！', '最喜欢主人了♪'],
}

const pick = list => list[Math.floor(Math.random() * list.length)]

class WhaleMaid {
  constructor(context) {
    this.context = context
    this.view = undefined
    this.mood = 'normal'
    this.line = pick(LINES.normal)
    this.errorCount = countErrors()
    this.revertTimer = undefined
    this.sleepTimer = undefined
    this.lastTypingLine = 0

    this.status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1000)
    this.status.command = 'whaleMaid.pat'
    this.status.tooltip = '鲸鱼娘 · 点一下摸摸头'
    context.subscriptions.push(this.status)
    this.refreshStatusVisibility()
    this.render()
    this.armSleep()
  }

  resolveWebviewView(view) {
    this.view = view
    const media = vscode.Uri.joinPath(this.context.extensionUri, 'media')
    view.webview.options = { enableScripts: true, localResourceRoots: [media] }
    const src = name => view.webview.asWebviewUri(vscode.Uri.joinPath(media, `${name}.webp`)).toString()
    const images = Object.fromEntries(['normal', 'delighted', 'determined', 'sleepy', 'dizzy'].map(m => [m, src(m)]))
    view.webview.html = renderHtml(view.webview.cspSource, images, src('lace'))
    view.webview.onDidReceiveMessage(message => {
      if (message.type === 'pat') this.pat()
      if (message.type === 'ready') this.render()
    })
    view.onDidChangeVisibility(() => view.visible && this.render())
  }

  say(mood, lines, n, holdMs = 5000) {
    this.mood = mood
    this.line = pick(lines).replace('{n}', String(n ?? ''))
    this.render()
    this.armSleep()
    clearTimeout(this.revertTimer)
    if (holdMs > 0) {
      this.revertTimer = setTimeout(() => {
        this.mood = this.errorCount > 0 ? 'determined' : 'normal'
        this.line = this.errorCount > 0 ? pick(LINES.errors).replace('{n}', String(this.errorCount)) : pick(LINES.normal)
        this.render()
      }, holdMs)
    }
  }

  armSleep() {
    clearTimeout(this.sleepTimer)
    const minutes = vscode.workspace.getConfiguration('whaleMaid').get('sleepAfterMinutes', 3)
    if (minutes > 0) this.sleepTimer = setTimeout(() => this.say('sleepy', LINES.sleepy, undefined, 0), minutes * 60_000)
  }

  onTyping() {
    const now = Date.now()
    // 打字时不频繁换台词，只在心情变化或隔一阵子时换。
    if (this.mood === 'determined' && now - this.lastTypingLine < 15_000) {
      this.armSleep()
      clearTimeout(this.revertTimer)
      this.revertTimer = setTimeout(() => this.say('normal', LINES.normal, undefined, 0), 6000)
      return
    }
    this.lastTypingLine = now
    this.say('determined', LINES.typing, undefined, 6000)
  }

  onDiagnostics() {
    const count = countErrors()
    const before = this.errorCount
    this.errorCount = count
    if (count > before) this.say('dizzy', LINES.errors, count, 6000)
    else if (count === 0 && before > 0) this.say('delighted', LINES.fixed, undefined, 5000)
  }

  pat() {
    this.say('delighted', LINES.pat, undefined, 4000)
  }

  refreshStatusVisibility() {
    if (vscode.workspace.getConfiguration('whaleMaid').get('showStatusBar', true)) this.status.show()
    else this.status.hide()
  }

  render() {
    this.status.text = `$(heart) ${this.line}`
    this.view?.webview.postMessage({ type: 'state', mood: this.mood, line: this.line })
  }

  dispose() {
    clearTimeout(this.revertTimer)
    clearTimeout(this.sleepTimer)
  }
}

function countErrors() {
  let n = 0
  for (const [, list] of vscode.languages.getDiagnostics()) {
    for (const d of list) if (d.severity === vscode.DiagnosticSeverity.Error) n++
  }
  return n
}

function renderHtml(cspSource, images, lace) {
  const nonce = Math.random().toString(36).slice(2)
  return `<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource}; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>
  body { margin: 0; padding: 8px 10px 12px; font-family: var(--vscode-font-family); color: var(--vscode-foreground); user-select: none; }
  .stage { position: relative; display: flex; justify-content: center; }
  img { width: 100%; max-width: 220px; max-height: 200px; object-fit: contain; cursor: pointer;
        transition: transform .25s ease, opacity .2s ease; filter: drop-shadow(0 4px 10px rgba(0,0,0,.35)); }
  img:hover { transform: translateY(-3px) rotate(-1.5deg); }
  img.bounce { animation: bounce .45s ease; }
  @keyframes bounce { 0%,100% { transform: translateY(0) } 40% { transform: translateY(-10px) scale(1.04) } }
  .bubble { position: relative; margin: 10px auto 0; max-width: 240px; padding: 8px 12px; border-radius: 12px;
            background: rgba(11,25,63,.85); border: 1px solid #c5a468; color: #f1e6cc; font-size: 12px; line-height: 1.5; text-align: center; }
  .bubble::before { content: ""; position: absolute; top: -7px; left: 50%; width: 12px; height: 12px; transform: translateX(-50%) rotate(45deg);
                    background: rgba(11,25,63,.95); border-left: 1px solid #c5a468; border-top: 1px solid #c5a468; }
  .lace { height: 8px; margin: 0 -10px 6px; background: url(${lace}) left top / auto 8px repeat-x; opacity: .55; }
</style>
</head>
<body>
  <div class="lace"></div>
  <div class="stage"><img id="maid" src="${images.normal}" alt="鲸鱼娘" title="摸摸头"></div>
  <div class="bubble" id="line">……</div>
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi()
  const images = ${JSON.stringify(images)}
  const maid = document.getElementById('maid')
  const line = document.getElementById('line')
  maid.addEventListener('click', () => vscode.postMessage({ type: 'pat' }))
  window.addEventListener('message', ({ data }) => {
    if (data.type !== 'state') return
    const src = images[data.mood] || images.normal
    if (maid.getAttribute('src') !== src) {
      maid.setAttribute('src', src)
      maid.classList.remove('bounce'); void maid.offsetWidth; maid.classList.add('bounce')
    }
    line.textContent = data.line
  })
  vscode.postMessage({ type: 'ready' })
</script>
</body>
</html>`
}

function activate(context) {
  const maid = new WhaleMaid(context)
  context.subscriptions.push(
    maid,
    vscode.window.registerWebviewViewProvider('whaleMaid.view', maid, { webviewOptions: { retainContextWhenHidden: true } }),
    vscode.commands.registerCommand('whaleMaid.pat', () => maid.pat()),
    vscode.workspace.onDidChangeTextDocument(e => {
      if (e.contentChanges.length > 0 && e.document.uri.scheme === 'file') maid.onTyping()
    }),
    vscode.workspace.onDidSaveTextDocument(() => maid.say('delighted', LINES.saved, undefined, 4000)),
    vscode.languages.onDidChangeDiagnostics(() => maid.onDiagnostics()),
    vscode.window.onDidChangeActiveTextEditor(() => maid.armSleep()),
    vscode.window.onDidChangeWindowState(s => s.focused && maid.mood === 'sleepy' && maid.say('normal', LINES.normal, undefined, 0)),
    vscode.tasks.onDidEndTaskProcess(e => {
      if (e.exitCode === 0) maid.say('delighted', LINES.taskOk, undefined, 5000)
      else if (e.exitCode !== undefined) maid.say('dizzy', LINES.taskFail, e.exitCode, 6000)
    }),
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('whaleMaid')) { maid.refreshStatusVisibility(); maid.armSleep() }
    }),
  )
}

function deactivate() {}

module.exports = { activate, deactivate }
