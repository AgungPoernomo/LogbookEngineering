# backend/scripts/rbac-audit.ps1
# RBAC Audit Script — Fase 6 Hardening
# Kompatibel PowerShell 5.1 & 7+
# Usage: .\scripts\rbac-audit.ps1

param(
    [string]$BaseUrl = "http://localhost:3000/api/v1",
    [string]$TeknisiToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTUwMDAzLCJuaWsiOiIzMDAwMSIsImVtYWlsIjoidGVrLnVqaTFAZ21haWwuY29tIiwiZnVsbF9uYW1lIjoidGVrLnVqaTEiLCJyb2xlIjoiVGVrbmlzaSIsInJvbGVfaWQiOjMsInBsYW50X2lkIjoxLCJwbGFudF9uYW1lIjoiTGluZSAxIiwiZ3JvdXBfaWQiOjEsImdyb3VwX25hbWUiOiJBIiwicGhvdG9fdXJsIjpudWxsLCJpYXQiOjE3OTQyOTQyMTgsImV4cCI6MTc5NDM4MDYxOH0.heRZL8ubapTRs4aS28V-zG5B0W-aYgjvW1r6nviRFz0",
    [string]$SpvToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTUwMDAyLCJuaWsiOiIyMDAwMSIsImVtYWlsIjoic3B2LnVqaUBnbWFpbC5jb20iLCJmdWxsX25hbWUiOiJzcHYudWppIiwicm9sZSI6IlN1cGVydmlzb3IiLCJyb2xlX2lkIjoyLCJwbGFudF9pZCI6MzAwMDEsInBsYW50X25hbWUiOiJHZW5lcmFsIiwiZ3JvdXBfaWQiOjMwMDAxLCJncm91cF9uYW1lIjoiTk9OIEdST1VQIiwicGhvdG9fdXJsIjpudWxsLCJpYXQiOjE3OTQyOTQzNzcsImV4cCI6MTc5NDM4MDc3N30.1j1tWVIC-3eqlexqTjzQuEpOh1kb9X22rp78yA_GaH8",
    [string]$AdminToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTUwMDAxLCJuaWsiOiIxMDAwMSIsImVtYWlsIjoiYWRtaW4udWppQGdtYWlsLmNvbSIsImZ1bGxfbmFtZSI6ImFkbWluLnVqaSIsInJvbGUiOiJBZG1pbiIsInJvbGVfaWQiOjEsInBsYW50X2lkIjozMDAwMSwicGxhbnRfbmFtZSI6IkdlbmVyYWwiLCJncm91cF9pZCI6NjAwMDEsImdyb3VwX25hbWUiOiJBZG1pbiIsInBob3RvX3VybCI6bnVsbCwiaWF0IjoxNzk0Mjk0Mzg4LCJleHAiOjE3OTQzODA3ODh9.CGwwCpB9zzUt1UVjQYKXpBe8hdVZev8gRQncns1dMzg"
)

$ErrorActionPreference = "Continue"

function Test-Api {
    param($Name, $Method, $Url, $Token, $Body, $ExpectedCode)
    
    $headers = @{}
    if ($Token -and $Token.Trim() -ne "") { $headers["Authorization"] = "Bearer $Token" }
    
    $code = "NET_ERR"
    try {
        $params = @{
            Method          = $Method
            Uri             = $Url
            Headers         = $headers
            UseBasicParsing = $true
            ErrorAction     = "Stop"
        }
        if ($Body) {
            $params.ContentType = "application/json"
            $params.Body = $Body
        }
        $response = Invoke-WebRequest @params
        $code = [int]$response.StatusCode
    } catch {
        if ($_.Exception.Response) {
            $code = [int]$_.Exception.Response.StatusCode
        }
    }
    
    $pass = ($code -eq $ExpectedCode)
    $symbol = if ($pass) { "PASS" } else { "FAIL" }
    $color = if ($pass) { "Green" } else { "Red" }
    Write-Host ("[{0}] {1} => {2} (expected {3})" -f $symbol, $Name, $code, $ExpectedCode) -ForegroundColor $color
    return $pass
}

Write-Host "`n=== H2 RBAC AUDIT ===" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl`n"

$results = @()

# Test 1-4: Basic
$results += Test-Api "1. Teknisi GET QR"              "GET"    "$BaseUrl/machines/1/qr"          $TeknisiToken $null 403
$results += Test-Api "2. SPV GET Radar"               "GET"    "$BaseUrl/admin/unmapped-assets"  $SpvToken     $null 403
$results += Test-Api "3. Teknisi GET Sparepart"       "GET"    "$BaseUrl/master/spareparts"      $TeknisiToken $null 200
$results += Test-Api "4. No token GET QR"             "GET"    "$BaseUrl/machines/1/qr"          $null         $null 401

# Test 3A-3D: Write operations harus 403 untuk non-Admin
$results += Test-Api "3A. Teknisi POST Sparepart"     "POST"   "$BaseUrl/master/spareparts"      $TeknisiToken '{"part_name":"TestRBAC","item_type":"MACHINE_PART"}' 403
$results += Test-Api "3B. Teknisi PUT Sparepart"      "PUT"    "$BaseUrl/master/spareparts/1"    $TeknisiToken '{"part_name":"Hacked"}' 403
$results += Test-Api "3C. Teknisi DELETE Sparepart"   "DELETE" "$BaseUrl/master/spareparts/1"    $TeknisiToken $null 403
$results += Test-Api "3D. SPV POST Sparepart"         "POST"   "$BaseUrl/master/spareparts"      $SpvToken     '{"part_name":"TestRBAC","item_type":"MACHINE_PART"}' 403

# Test 3E-3G: Admin akses harus 200
$results += Test-Api "3E. Admin GET Sparepart"        "GET"    "$BaseUrl/master/spareparts"      $AdminToken   $null 200
$results += Test-Api "3F. Admin GET Radar"            "GET"    "$BaseUrl/admin/unmapped-assets"  $AdminToken   $null 200
$results += Test-Api "3G. Admin GET QR"               "GET"    "$BaseUrl/machines/1/qr"          $AdminToken   $null 200

$passed = ($results | Where-Object { $_ -eq $true }).Count
$total = $results.Count
$color = if ($passed -eq $total) { "Green" } else { "Red" }
Write-Host "`n=== RESULT: $passed / $total PASSED ===" -ForegroundColor $color