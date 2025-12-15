param(
  [string]$OutCandidates = "overpass_candidates.json"
)

$ErrorActionPreference = "Stop"

$queryPath = "overpass.q"
if (!(Test-Path $queryPath)) {
  throw "Missing $queryPath. Create it first."
}

$overpassUrl = "https://overpass-api.de/api/interpreter"

Write-Host "Fetching Overpass candidates..." -ForegroundColor Cyan
$q = Get-Content $queryPath -Raw

# Invoke-RestMethod로 직접 form-data 전송 (curl.exe 인코딩/파일참조 이슈 회피)
$res = Invoke-RestMethod -Method Post -Uri $overpassUrl -Body @{ data = $q }
$res | ConvertTo-Json -Depth 100 | Out-File -Encoding utf8 $OutCandidates

$elements = $res.elements

Write-Host ("Found elements: " + ($elements | Measure-Object).Count) -ForegroundColor Green
$elements | Select-Object type,id,tags,center | ConvertTo-Json -Depth 20


