---
title: 把 VitePress 博客搬到自己的服务器
date: 2026-09-24
description: 从 GitHub Pages 换到自有服务器的完整过程，记录 cleanUrls 失效、CentOS 7 的 glibc 过旧、服务器上残留宝塔 Nginx 这几个坑。
tags: [运维, Nginx, VitePress]
---

# 把 VitePress 博客搬到自己的服务器

这个博客一开始是托管在 GitHub Pages 上的，推送到 `main` 分支就自动发布，省心得很。但静态托管终究有些限制：想加个自己写的接口、想控制缓存策略、想折腾点服务端的小东西，都不太方便。所以趁着手上有一台闲置的云服务器，把站点整个搬了过去。

整个过程比想象中顺利，但也踩了几个不踩不知道的坑，记在这里。

## 整体思路：本地构建，服务器只做托管

最开始我想的是老路子——服务器上 `git clone` 一份代码，装好 Node 再 `npm run build`。动手之后才发现不通，因为这个博客的 `.gitignore` 里忽略了 `docs/.vitepress/dist`，也就是说仓库里**根本没有构建产物**，服务器拉下来的只是源码。

那就在服务器上构建吧。又遇到第二个问题：这台服务器是 CentOS 7，系统自带的 glibc 是 2.17，而 Node.js 18 以上的官方二进制包要求 glibc 2.28。NodeSource 早就不支持 CentOS 7 了，直接从官网下官方包，运行时会报 `GLIBC_2.28 not found`。

绕了一圈，最后选了最省事的方案：**构建在本地做，服务器只负责托管静态文件**。理由是本地构建只要两三秒，产物压缩完才 1 MB 左右，传上去比在服务器上下载几十兆的 Node 快得多，服务器上也不用装任何运行时。

## 踩坑一：cleanUrls 让所有文章页 404

这个坑最典型。Nginx 配置好、首页能打开，但点开任何一篇文章都是 404，只有首页正常。

原因是 VitePress 开了 `cleanUrls: true`，构建出来的是 `posts/hello-world.html`，但访问地址是 `/posts/hello-world`（没有 `.html` 后缀）。Nginx 默认只会去找 `/posts/hello-world` 这个文件或者目录，两者都不存在，于是 404。

解决办法是在 `location /` 里加一行：

```nginx
location / {
    try_files $uri $uri.html $uri/ =404;
}
```

它的意思是：先按原样找，找不到就加 `.html` 再找，再找不到就当成目录找，最后都没有才返回 404。

::: warning 别照搬 SPA 的写法
网上很多 Nginx 教程会写 `try_files $uri $uri/ /index.html;`，那是给单页应用用的。静态博客千万别这么写，否则任何不存在的地址都会返回首页内容，搜索引擎也会被这套假页面搞糊涂。
:::

## 踩坑二：CentOS 7 上的 Node 装不上

前面提过，官方 Node 18+ 需要 glibc 2.28，而 CentOS 7 停在 2.17。除了改用本地构建，其实还有一条路：Node 官方提供了一组为非 glibc 2.28 系统单独编译的版本，文件名里带 `glibc-217` 字样。

比如 `node-v20.20.2-linux-x64-glibc-217.tar.gz`，下载解压后把 `bin` 目录里的可执行文件软链到 `/usr/local/bin` 就能用。缺点是这些包体积有四十多兆，如果服务器访问境外站点很慢，下载会很煎熬——这也是我最终选择本地构建的原因之一。

顺便记一个判断方法，遇到二进制跑不起来时先看系统支持到哪个版本：

```bash
ldd --version | head -1
```

## 踩坑三：服务器上残留的宝塔 Nginx

这台服务器之前装过宝塔面板，虽然不打算用面板管理网站，但它的 Nginx 还在跑。麻烦的地方在于它不走标准布局：没有 `/etc/nginx/nginx.conf`，主配置在 `/www/server/nginx/conf/nginx.conf`，站点配置要去 `/www/server/panel/vhost/nginx/` 里加。

查清楚它在哪，靠的是 `nginx -V` 输出了编译参数：

```bash
nginx -V 2>&1 | tr ' ' '\n' | grep -E "conf-path|prefix"
```

这里有个细节值得记下来：`nginx -v` 只打印版本号，不读配置文件，所以即使配置目录整个不存在它也能正常输出。判断一个 Nginx 是包管理器装的还是别处编译的，得看 `-V`。

另外宝塔残留的 Nginx 会带一个 `server_name 127.0.0.1` 的 php-fpm 状态页，它占着 80 端口又是第一个 server 块。这种情况下新加的站点必须显式写上 `server_name`（用服务器 IP 或域名），靠精确匹配命中，而不是去和它争默认站点。

## 踩坑四：端口在服务器上通，在外面不通

配置改完，在服务器里 `curl` 自己是一路 200，但浏览器打开就是转圈。这种“内通外不通”基本只有两个可能：服务器本机防火墙，或者云厂商的安全组。

排查顺序是先看本机：

```bash
iptables -L INPUT -n --line-numbers | head -20
systemctl is-active firewalld
```

本机干净的话，问题就在安全组。去云控制台的实例安全组里加一条入方向规则：协议选**自定义 TCP**，端口 `80/80`，授权对象 `0.0.0.0/0`。

::: tip 别图省事选「全部 TCP」
「全部 TCP」等于把 1 到 65535 所有端口对全网开放，数据库、面板、缓存服务会一起暴露出去。安全组规则应该一个一个按需要加，不要开全量。
:::

## 日常发布流程

搬完之后，更新文章就三步：

1. 在 `docs/posts/` 下新建 Markdown 文件，写好 frontmatter
2. 本地 `npm run dev` 预览，确认排版没问题
3. 跑发布脚本：本地构建、打包、上传、服务器解压覆盖

打包这里有个小细节，用 `tar` 而不是 `zip`，因为 `tar` 在几乎所有 Linux 发行版上都自带，不需要额外装 `unzip`：

```bash
tar -czf dist.tar.gz -C docs/.vitepress/dist .
```

上传完成后到服务器上解压：

```bash
mkdir -p /var/www/blog && tar -xzf dist.tar.gz -C /var/www/blog
```

## 小结

搬家的成本主要不在 Nginx，而在“搞清这台机器当前的状况”。同样是 Nginx，包管理器装的、源码编译的、面板附带的，配置位置和行为都不一样，动手前先用 `nginx -V` 和 `ss -lntp` 把现状摸清楚，能省掉大半的试错时间。

至于构建到底放本地还是放服务器，我的结论是看两边谁更快。对一个小博客来说，本地两秒构建加一兆上传，比在服务器上折腾 Node 环境划算得多。真等到需要服务器端渲染的功能，再考虑把 Node 装回去也不迟。
