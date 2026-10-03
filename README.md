# 一任阶前 · 多用户博客平台

从原来的 VitePress 静态站改造成可以多人一起写的博客平台：注册账号、登录后管理自己的文章，
也能访问别人的主页看他们写了什么；写文章时支持 Markdown 排版、实时预览，图片可以直接拖进来，
视频可以上传或粘贴 B 站 / YouTube 链接。

## 功能一览

- **账号体系**：注册 / 登录 / 退出，密码用 scrypt 加盐散列存储，登录态走 HttpOnly Cookie
- **个人主页**：`/u/用户名`，显示头像、昵称、简介、文章数与阅读量
- **我的博客**：`/me`，草稿与已发布分开管理，能看到每篇的阅读量，支持搜索
- **在线写作**：`/write`，Markdown 工具栏 + 实时预览（编辑 / 并排 / 预览三种模式）
  - 图片：点工具栏上传、拖拽进编辑器、从剪贴板粘贴，三种方式都可以
  - 视频：上传 mp4/webm，或粘贴 B 站、YouTube、Vimeo 链接自动转成播放器
  - 排版：标题、加粗、斜体、删除线、引用、列表、代码块、表格、分隔线、链接
  - 快捷键：`Ctrl+B` 加粗、`Ctrl+I` 斜体、`Ctrl+K` 链接、`Ctrl+S` 保存
  - 草稿自动备份到浏览器本地，误关页面还能恢复
- **浏览别人的博客**：`/users` 博主列表，`/explore` 全部文章（支持关键词与标签筛选）
- **分享卡片**：文章页由服务端注入标题、摘要、封面，微信 / 搜索引擎能拿到正确信息

## 本地开发

需要 **Node.js 24 或更高版本**。项目用的是 Node 24 内置的 `node:sqlite`，所以整个项目没有任何
需要编译的原生依赖，换机器、换服务器都不用折腾编译环境。

```bash
npm install
npm run seed     # 首次运行：创建管理员账号，并把 server/seed/posts 里的文章导入数据库
npm run dev      # 同时启动后端 3000 和前端 5173
```

打开 <http://localhost:5173> 即可。`npm run seed` 会打印初始账号和密码
（默认 `panyu` / `blog123456`，**登录后请到「设置」里改掉**）。

其它命令：

```bash
npm run build              # 构建前端到 web/dist
npm start                  # 生产模式：Node 同时提供接口和页面（默认 3000 端口）
npm run seed -- --force    # 强制重新导入种子文章
```

## 目录结构

```
blog/
├─ server/                    # 后端（Express）
│  ├─ index.js                # 入口：接口挂载、静态资源、页面 meta 注入
│  ├─ config.js               # 端口、数据目录、体积上限等配置
│  ├─ db.js                   # SQLite 建表与查询封装（node:sqlite）
│  ├─ auth.js                 # 密码散列、会话、登录限流
│  ├─ serialize.js            # 数据库行 -> 对外的 JSON 结构
│  ├─ routes/                 # 接口：auth / users / posts / me / uploads
│  ├─ seed.js                 # 初始化账号并导入种子文章
│  └─ seed/posts/*.md         # 原来 VitePress 的文章，作为初始内容
├─ web/                       # 前端（Vue 3 + Vite）
│  ├─ src/components/         # 顶栏、文章卡片、Markdown 编辑器、视频弹窗…
│  ├─ src/views/              # 首页 / 文章 / 博主 / 编辑器 / 仪表盘 / 设置…
│  ├─ src/utils/markdown.js   # Markdown 渲染 + 代码高亮 + XSS 清洗 + 视频白名单
│  └─ dist/                   # 构建产物（git 忽略）
├─ data/                      # 运行时数据（git 忽略，备份就备份这个目录）
│  ├─ blog.sqlite             # 数据库：用户、文章、会话
│  └─ uploads/                # 用户上传的图片和视频
├─ deploy/                    # 部署辅助：服务器初始化脚本、nginx 示例、systemd 服务
├─ deploy.ps1                 # 一键发布脚本
└─ legacy-vitepress/          # 改造前的 VitePress 站点，留档用，不参与构建
```

## 写文章

1. 登录后点右上角「写文章」
2. 填标题、正文；想改链接后缀、标签、摘要、封面，点「文章设置」
3. 「存草稿」只有自己能看到；「发布文章」后出现在首页、`/explore` 和自己的主页

插入图片有三种方式：点工具栏的图片按钮选文件、把图片拖进编辑区、截图后 `Ctrl+V` 粘贴。

插入视频：点工具栏的「插入视频」，可以上传本地视频文件，也可以粘贴 B 站视频链接
（`https://www.bilibili.com/video/BVxxxx` 或直接填 `BVxxxx`），识别成功会先给出预览。

正文是 Markdown，渲染前会用 DOMPurify 清洗，iframe 只放行 B 站、YouTube、Vimeo 等白名单域名。

## 配置项

后端配置都可以用环境变量覆盖（见 `server/config.js`）：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3000` | 监听端口 |
| `DATA_DIR` | `./data` | 数据库与上传文件的位置 |
| `SITE_NAME` | `一任阶前` | 站点名（浏览器标题、meta） |
| `SITE_URL` | 空 | 例如 `https://example.com`，用于生成 canonical |
| `SESSION_DAYS` | `30` | 登录状态保持天数 |
| `COOKIE_SECURE` | `0` | 跑在 HTTPS 后面时设为 `1` |
| `REGISTRATION_OPEN` | `1` | 设为 `0` 关闭注册 |
| `MAX_IMAGE_MB` | `10` | 单张图片上限 |
| `MAX_VIDEO_MB` | `300` | 单个视频上限（nginx 的 `client_max_body_size` 要同步放大） |
| `SEED_USER` / `SEED_NAME` / `SEED_PASSWORD` | `panyu` / `一任阶前` / `blog123456` | `npm run seed` 创建账号时用 |

## 部署到自己的服务器

服务器推荐 **Ubuntu 22.04 / 24.04 LTS**（CentOS 7 的 glibc 太旧，装不了 Node 24）。

**第一次部署**

```bash
# 1. 服务器上执行（把 deploy/ 目录传上去，或在服务器上 git clone）
bash server-setup.sh          # 装 Node 24 + nginx + pm2，并写好反向代理

# 2. 本地执行
powershell -ExecutionPolicy Bypass -File .\deploy.ps1
```

**以后每次更新**

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy.ps1
```

脚本做五件事：本地构建前端 → 打包 `server/ web/dist/ scripts/ package.json` → 上传 →
服务器上 `npm ci --omit=dev` → `pm2 reload blog`。服务器上的 `data/` 不会被覆盖。

常用运维命令：

```bash
pm2 logs blog          # 看日志
pm2 restart blog       # 重启
pm2 monit              # 资源占用
```

**换成域名 + HTTPS**：用宝塔面板或 `certbot --nginx` 签证书，然后给服务加上环境变量
`COOKIE_SECURE=1`、`SITE_URL=https://你的域名` 再重启（`deploy.ps1` 用的是
`pm2 reload --update-env`，会带上新变量）。

**备份**：只要备份服务器上的 `data/` 目录就够了，里面是全部用户、文章和上传的图片视频。

```bash
tar -czf blog-data-$(date +%F).tar.gz -C /var/www/blog-app data
```

## 安全设计

- 密码：`node:crypto` 的 scrypt 加随机盐，校验用 `timingSafeEqual`
- 登录态：随机 token 存库（只存哈希，不存明文），Cookie 为 `HttpOnly` + `SameSite=Lax`，30 天滑动续期
- 登录限流：同一 IP + 用户名，10 分钟内失败 8 次即拒绝
- CSRF：改动数据的请求会校验 `Origin` 与当前 Host 一致
- 上传：只放行图片（jpg/png/gif/webp/avif）与视频（mp4/webm/ogv/mov/m4v）后缀，HTML/SVG 一律拒绝
- 正文：Markdown 渲染结果经 DOMPurify 清洗，iframe 仅允许白名单视频站点

## 关于旧版

改造前的 VitePress 站点（主题、配置、图片）整体移到了 `legacy-vitepress/`，只作留档，
不参与构建。原来的三篇文章已经通过 `npm run seed` 导入数据库，归属到 `panyu` 账号名下。
