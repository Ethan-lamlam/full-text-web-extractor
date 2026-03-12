# 从 HTML 文件提取嵌入的 JSON 数据
# 适用: 飞书文档等将数据嵌入 window.xxx 变量的页面

param(
    [Parameter(Mandatory=$true)]
    [string]$HtmlFile,
    
    [string]$Pattern = 'window\.(\w+)=(\{.+?\});',
    
    [switch]$SaveToFile
)

if (-not (Test-Path $HtmlFile)) {
    Write-Error "文件不存在: $HtmlFile"
    exit 1
}

Write-Host "🔍 从 $HtmlFile 提取 JSON 数据..." -ForegroundColor Cyan

$content = Get-Content $HtmlFile -Raw

# 查找所有匹配的 window.xxx = {...} 模式
$matches = [regex]::Matches($content, $Pattern)

Write-Host "找到 $($matches.Count) 个潜在 JSON 对象" -ForegroundColor Yellow

$results = @{}

foreach ($match in $matches) {
    $varName = $match.Groups[1].Value
    $jsonText = $match.Groups[2].Value
    
    Write-Host "\n📦 发现变量: $varName" -ForegroundColor Green
    
    # 尝试解析 JSON
    try {
        # 处理可能的转义问题
        $cleanJson = $jsonText -replace '\x00', ''
        $data = $cleanJson | ConvertFrom-Json -ErrorAction Stop
        
        $results[$varName] = $data
        
        # 显示简要信息
        if ($data -is [System.Collections.IEnumerable]) {
            Write-Host "   类型: 数组/列表 ($($data.Count) 项)" -ForegroundColor Gray
        } else {
            $props = $data.PSObject.Properties.Name
            Write-Host "   类型: 对象 ($($props.Count) 属性)" -ForegroundColor Gray
            Write-Host "   属性: $($props -join ', ')" -ForegroundColor DarkGray
        }
        
        # 保存到文件
        if ($SaveToFile) {
            $outputFile = "$varName.json"
            $data | ConvertTo-Json -Depth 10 | Out-File $outputFile
            Write-Host "   已保存: $outputFile" -ForegroundColor Cyan
        }
        
    } catch {
        Write-Host "   ⚠️ 解析失败: $_" -ForegroundColor Red
    }
}

# 返回结果
return $results
