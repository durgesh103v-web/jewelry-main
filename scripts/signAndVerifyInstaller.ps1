$ErrorActionPreference = 'Stop'

$Thumbprint = "8E9D7F442924F59F09CCFEE63D1123F5960E57F7"
$FilePath = "dist\jewellery-erp-desktop-1.0.0-setup.exe"

Write-Host "--- Windows Authenticode Code Signing Verification ---"
$cert = Get-ChildItem "Cert:\CurrentUser\My\$Thumbprint" -ErrorAction SilentlyContinue

if (-not $cert) {
    Write-Error "Certificate with thumbprint $Thumbprint not found in Cert:\CurrentUser\My"
}

if (-not (Test-Path $FilePath)) {
    Write-Error "Installer file not found at: $FilePath"
}

Write-Host "Applying SHA256 Authenticode Signature to: $FilePath"
$sig = Set-AuthenticodeSignature -FilePath $FilePath -Certificate $cert -HashAlgorithm SHA256

Write-Host "Set-AuthenticodeSignature Result: $($sig.Status)"
Write-Host "Signer Subject: $($sig.SignerCertificate.Subject)"

Write-Host "`nVerifying Authenticode Signature from Disk..."
$verify = Get-AuthenticodeSignature -FilePath $FilePath

Write-Host "StatusMessage: $($verify.StatusMessage)"
Write-Host "Signature Status: $($verify.Status)"
Write-Host "Certificate Subject: $($verify.SignerCertificate.Subject)"
Write-Host "Certificate Thumbprint: $($verify.SignerCertificate.Thumbprint)"
Write-Host "--------------------------------------------------------"
