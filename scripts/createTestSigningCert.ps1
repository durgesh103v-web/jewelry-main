$ErrorActionPreference = 'Stop'
$subject = "CN=Jewellery ERP Commercial Systems, O=Jewellery ERP, C=IN"
$cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject $subject -CertStoreLocation "Cert:\CurrentUser\My" -NotAfter (Get-Date).AddYears(2)
Write-Host "Generated Certificate Thumbprint: $($cert.Thumbprint)"
$password = ConvertTo-SecureString -String "TestSignPass2026!" -Force -AsPlainText
$outPfx = Join-Path $env:TEMP "jewellery_test_codesign.pfx"
Export-PfxCertificate -Cert $cert -FilePath $outPfx -Password $password | Out-Null
Write-Host "Exported test code-signing PFX to: $outPfx"
