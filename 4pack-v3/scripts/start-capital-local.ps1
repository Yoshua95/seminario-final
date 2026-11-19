param([ValidatePattern('^[a-zA-Z0-9-]+$')][string]$Name='capital-admin',[ValidateRange(1024,65535)][int]$Port=3015)
$ErrorActionPreference='Stop'
$taskRoot=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $taskRoot
if(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue){throw "El puerto $Port ya esta ocupado. No se cierra el servidor existente."}
# A clean local adapter, never a hosted connection or another block's data.
$env:FOURPACK_CAPITAL_ADMIN='1'
$env:FOURPACK_MULTIROLE_DEMO='1'
$env:FOURPACK_DEMO_DIRECTORY=Join-Path $taskRoot ('.4pack-demo/'+$Name)
$env:NEXT_PUBLIC_SUPABASE_URL=''
$env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=''
$env:FOURPACK_TURBOPACK_ROOT=(& node -p "require('path').dirname(require('path').dirname(require('path').dirname(require.resolve('next/package.json'))))").Trim()
& node scripts/prepare-capital-demo.mjs
if($LASTEXITCODE -ne 0){throw 'No se pudo preparar el esquema local'}
$taskNext=(& node -p "require.resolve('next/dist/bin/next')").Trim()
& node $taskNext dev apps/web --hostname 127.0.0.1 --port $Port
