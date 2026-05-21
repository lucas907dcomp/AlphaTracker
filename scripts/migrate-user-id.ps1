# AlphaTracker — User ID migration script
# Usage: .\scripts\migrate-user-id.ps1 -NewUserId "NEW-UUID-HERE"

param(
    [Parameter(Mandatory=$true)]
    [string]$NewUserId
)

$OldUserId = "b6c2495e-d135-4835-9d5a-584e085e8bfc"
$InputFile = "local_data.sql"
$OutputFile = "local_data_migrated.sql"

if (-not (Test-Path $InputFile)) {
    Write-Error "File not found: $InputFile"
    exit 1
}

Write-Host "Replacing user_id..."
Write-Host "  Old: $OldUserId"
Write-Host "  New: $NewUserId"

$content = Get-Content $InputFile -Raw -Encoding UTF8

# Extract only the public schema inserts (casas, operacoes, apostas)
$lines = $content -split "`n"
$publicStart = $false
$outputLines = @()
$outputLines += "SET session_replication_role = replica;"
$outputLines += ""

foreach ($line in $lines) {
    if ($line -match '-- Data for Name: (casas|operacoes|apostas)') {
        $publicStart = $true
    }
    if ($publicStart) {
        $outputLines += $line
    }
    # Stop after apostas block ends (next schema section that's not public)
    if ($publicStart -and $line -match '-- Data for Name: buckets') {
        break
    }
}

$output = $outputLines -join "`n"

# Replace old user_id with new one
$output = $output -replace $OldUserId, $NewUserId

Set-Content -Path $OutputFile -Value $output -Encoding UTF8

$casasCount  = ([regex]::Matches($output, "INSERT INTO `"public`".`"casas`"")).Count
$opCount     = ([regex]::Matches($output, "INSERT INTO `"public`".`"operacoes`"")).Count
$apostasLine = ([regex]::Matches($output, "INSERT INTO `"public`".`"apostas`"")).Count

Write-Host ""
Write-Host "Done! Output: $OutputFile"
Write-Host "  Tables included: casas ($casasCount block), operacoes ($opCount block), apostas ($apostasLine block)"
Write-Host ""
Write-Host "Next step: paste the contents of $OutputFile into the Supabase SQL Editor:"
Write-Host "  https://supabase.com/dashboard/project/clmkcxsrxumnernbdepd/sql/new"
