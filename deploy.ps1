# 一键发布：本地构建前端 -> 打包 -> 上传服务器 -> 安装依赖 -> 重启服务
#
# 用法（在 PowerShell 里执行）：
#   powershell -ExecutionPolicy Bypass -File C:\Users\panyu\Desktop\codex1\blog\deploy.ps1
#   powershell -ExecutionPolicy Bypass -File .\deploy.ps1 -SkipBuild    # 不想重新构建时
#
# 前提：服务器已按 README 的「部署到自己的服务器」准备好（Node 24 + nginx + pm2）。
# 说明：脚本只覆盖代码，服务器上的 data/ 目录（数据库 + 上传的图片视频）不会被碰。

param(
  [string]$Server = 'root@47.111.131.17',
  [string]$RemoteDir = '/var/www/blog-app',
  [string]$Pm2Name = 'blog',
  [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'

$SiteDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TarPath = Join-Path (Split-Path -Parent $SiteDir) 'dist.tar.gz'

function Invoke-Remote([string]$Command) {
  ssh -o StrictHostKeyChecking=accept-new $Server $Command
  if ($LASTEXITCODE -ne 0) { throw "远程命令执行失败: $Command" }
}

if (-not $SkipBuild) {
  Write-Host '[1/6] 构建前端...' -ForegroundColor Cyan
  Push-Location $SiteDir
  npm run build
  if ($LASTEXITCODE -ne 0) { Pop-Location; throw '构建失败，已中止发布' }
  Pop-Location
} else {
  Write-Host '[1/6] 跳过构建（沿用上一次的 web/dist）' -ForegroundColor DarkGray
}

Write-Host '[2/6] 打包后端与前端产物...' -ForegroundColor Cyan
Push-Location $SiteDir
tar -czf $TarPath server web/dist scripts package.json package-lock.json
if ($LASTEXITCODE -ne 0) { Pop-Location; throw '打包失败，已中止发布' }
Pop-Location
$size = [math]::Round((Get-Item -LiteralPath $TarPath).Length / 1KB, 1)

Write-Host "[3/6] 上传 $size KB 到 $Server ..." -ForegroundColor Cyan
scp -o StrictHostKeyChecking=accept-new $TarPath "${Server}:/root/dist.tar.gz"
if ($LASTEXITCODE -ne 0) { throw '上传失败，已中止发布' }

Write-Host '[4/6] 服务器端解压...' -ForegroundColor Cyan
Invoke-Remote "mkdir -p $RemoteDir && tar -xzf /root/dist.tar.gz -C $RemoteDir"

Write-Host '[5/6] 安装生产依赖（第一次会慢一些）...' -ForegroundColor Cyan
Invoke-Remote "cd $RemoteDir && npm ci --omit=dev --no-audit --no-fund"

Write-Host '[6/6] 重启服务...' -ForegroundColor Cyan
Invoke-Remote "cd $RemoteDir && (pm2 reload $Pm2Name --update-env || pm2 start server/index.js --name $Pm2Name)"
Invoke-Remote 'pm2 save'

Write-Host ''
Write-Host '发布完成，打开 http://47.111.131.17/ 看看' -ForegroundColor Green
Write-Host "查看日志： ssh $Server `"pm2 logs $Pm2Name`"" -ForegroundColor DarkGray
