[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-z]{20}$')]
    [string]$ProjectRef,
    [switch]$Criar
)

$ErrorActionPreference = 'Stop'
$adminHelperPath = Join-Path $PSScriptRoot 'i3-user-admin.mjs'
$adminSecretInput = $null
$adminSecretText = $null
$adminPayload = $null
try {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node indisponivel.' }
    if ($Criar) {
        Write-Host 'Modo CRIAR: usar somente apos autorizacao especifica para um unico usuario.'
    } else {
        Write-Host 'Modo PREVIA: somente leitura, sem criar usuario.'
    }
    Write-Host 'Informe valores apenas neste terminal local; nao os envie ao chat.'
    $adminEmailInput = Read-Host 'Email Google escolhido'
    $adminSecretInput = Read-Host 'Chave sb_secret do projeto (entrada oculta)' -AsSecureString
    $adminSecretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminSecretInput)
    try { $adminSecretText = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($adminSecretPointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($adminSecretPointer) }
    $adminPayload = @{projectRef = $ProjectRef; email = $adminEmailInput; secret = $adminSecretText; create = [bool]$Criar} | ConvertTo-Json -Compress
    # Pipe private input through stdin, never through command arguments or .env files.
    $adminPayload | & node $adminHelperPath
    if ($LASTEXITCODE -ne 0) { throw 'Procedimento interrompido; siga a mensagem sanitizada acima.' }
} catch {
    # Do not print the underlying exception or input values.
    Write-Host 'Procedimento interrompido. Nao repita uma tentativa de criacao sem conferir o projeto.'
    exit 1
} finally {
    $adminPayload = $null
    $adminSecretText = $null
    $adminEmailInput = $null
    if ($null -ne $adminSecretInput) { $adminSecretInput.Dispose() }
}
