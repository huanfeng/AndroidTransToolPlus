#!/usr/bin/env pwsh
# Just 环境测试脚本 - Windows 版本

Write-Host "🔍 测试 Just 环境配置..." -ForegroundColor Cyan
Write-Host ""

$allPassed = $true

# 测试 1: 检查 PowerShell 版本
Write-Host "1️⃣  检查 PowerShell 版本..." -ForegroundColor Yellow
$psVersion = $PSVersionTable.PSVersion
Write-Host "   版本: $psVersion"
if ($psVersion.Major -ge 5) {
    Write-Host "   ✅ PowerShell 版本符合要求" -ForegroundColor Green
} else {
    Write-Host "   ❌ PowerShell 版本过低，需要 5.0+" -ForegroundColor Red
    $allPassed = $false
}
Write-Host ""

# 测试 2: 检查 Just 是否安装
Write-Host "2️⃣  检查 Just 是否安装..." -ForegroundColor Yellow
if (Get-Command just -ErrorAction SilentlyContinue) {
    $justVersion = just --version
    Write-Host "   版本: $justVersion"
    Write-Host "   ✅ Just 已安装" -ForegroundColor Green
} else {
    Write-Host "   ❌ Just 未安装" -ForegroundColor Red
    Write-Host "   💡 安装方法：scoop install just" -ForegroundColor Yellow
    $allPassed = $false
}
Write-Host ""

# 测试 3: 检查 Node.js
Write-Host "3️⃣  检查 Node.js..." -ForegroundColor Yellow
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node --version
    Write-Host "   版本: $nodeVersion"
    Write-Host "   ✅ Node.js 已安装" -ForegroundColor Green
} else {
    Write-Host "   ❌ Node.js 未安装" -ForegroundColor Red
    $allPassed = $false
}
Write-Host ""

# 测试 4: 检查 pnpm
Write-Host "4️⃣  检查 pnpm..." -ForegroundColor Yellow
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    $pnpmVersion = pnpm --version
    Write-Host "   版本: $pnpmVersion"
    Write-Host "   ✅ pnpm 已安装" -ForegroundColor Green
} else {
    Write-Host "   ❌ pnpm 未安装" -ForegroundColor Red
    Write-Host "   💡 安装方法：npm install -g pnpm" -ForegroundColor Yellow
    $allPassed = $false
}
Write-Host ""

# 测试 5: 检查 Git
Write-Host "5️⃣  检查 Git..." -ForegroundColor Yellow
if (Get-Command git -ErrorAction SilentlyContinue) {
    $gitVersion = git --version
    Write-Host "   版本: $gitVersion"
    Write-Host "   ✅ Git 已安装" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Git 未安装（可选）" -ForegroundColor Yellow
}
Write-Host ""

# 测试 6: 检查 justfile
Write-Host "6️⃣  检查 justfile..." -ForegroundColor Yellow
if (Test-Path "justfile") {
    Write-Host "   ✅ justfile 存在" -ForegroundColor Green

    # 尝试运行 just 命令
    try {
        $output = just --list 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ justfile 格式正确" -ForegroundColor Green
        } else {
            Write-Host "   ❌ justfile 格式错误" -ForegroundColor Red
            $allPassed = $false
        }
    } catch {
        Write-Host "   ❌ 无法解析 justfile" -ForegroundColor Red
        $allPassed = $false
    }
} else {
    Write-Host "   ❌ justfile 不存在" -ForegroundColor Red
    $allPassed = $false
}
Write-Host ""

# 测试 7: 检查项目结构
Write-Host "7️⃣  检查项目结构..." -ForegroundColor Yellow
$requiredDirs = @("src", "docs", "public")
$missingDirs = @()
foreach ($dir in $requiredDirs) {
    if (-not (Test-Path $dir)) {
        $missingDirs += $dir
    }
}
if ($missingDirs.Count -eq 0) {
    Write-Host "   ✅ 项目结构完整" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  缺少目录: $($missingDirs -join ', ')" -ForegroundColor Yellow
}
Write-Host ""

# 测试 8: 检查 package.json
Write-Host "8️⃣  检查 package.json..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    Write-Host "   ✅ package.json 存在" -ForegroundColor Green
} else {
    Write-Host "   ❌ package.json 不存在" -ForegroundColor Red
    $allPassed = $false
}
Write-Host ""

# 测试 9: 检查执行策略
Write-Host "9️⃣  检查 PowerShell 执行策略..." -ForegroundColor Yellow
$policy = Get-ExecutionPolicy -Scope CurrentUser
Write-Host "   当前策略: $policy"
if ($policy -in @("RemoteSigned", "Unrestricted", "Bypass")) {
    Write-Host "   ✅ 执行策略允许运行脚本" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  执行策略可能阻止脚本运行" -ForegroundColor Yellow
    Write-Host "   💡 运行: Set-ExecutionPolicy RemoteSigned -Scope CurrentUser" -ForegroundColor Yellow
}
Write-Host ""

# 测试 10: 测试 Just 命令
Write-Host "🔟 测试 Just 命令..." -ForegroundColor Yellow
if (Get-Command just -ErrorAction SilentlyContinue) {
    try {
        Write-Host "   测试 'just help'..."
        $null = just help 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ Just 命令运行正常" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Just 命令运行失败" -ForegroundColor Red
            $allPassed = $false
        }
    } catch {
        Write-Host "   ❌ Just 命令执行出错" -ForegroundColor Red
        $allPassed = $false
    }
} else {
    Write-Host "   ⏭️  跳过（Just 未安装）" -ForegroundColor Gray
}
Write-Host ""

# 总结
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "✅ 所有测试通过！环境配置正确。" -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 下一步：" -ForegroundColor Yellow
    Write-Host "   1. 运行 'just init' 初始化项目"
    Write-Host "   2. 运行 'just dev' 启动开发服务器"
    Write-Host "   3. 运行 'just help' 查看所有命令"
} else {
    Write-Host "❌ 部分测试失败，请检查上述问题。" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 常见解决方案：" -ForegroundColor Yellow
    Write-Host "   1. 安装 Just: scoop install just"
    Write-Host "   2. 安装 Node.js: https://nodejs.org/"
    Write-Host "   3. 安装 pnpm: npm install -g pnpm"
    Write-Host "   4. 设置执行策略: Set-ExecutionPolicy RemoteSigned -Scope CurrentUser"
}
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# 返回状态码
if ($allPassed) {
    exit 0
} else {
    exit 1
}
