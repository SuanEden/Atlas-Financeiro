[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-z]{20}$')]
    [string]$ProjectRef,
    [switch]$Criar,
    [switch]$AlvoPrivado,
    [switch]$SalvarResultado
)

$ErrorActionPreference = 'Stop'
try { $Host.UI.RawUI.WindowTitle = 'Atlas I3 - chave privada' } catch { }
$adminHelperPath = Join-Path $PSScriptRoot 'i3-user-admin.mjs'
$adminPrivateDir = Join-Path (Split-Path $PSScriptRoot -Parent) '.private/i3-admin'
$adminSecretInput = $null
$adminSecretText = $null
$adminPayload = $null
function Write-AdminOutcome([string]$Status) {
    if ($SalvarResultado) {
        New-Item -ItemType Directory -Path $adminPrivateDir -Force | Out-Null
        @{status = $Status; observedAt = [DateTime]::UtcNow.ToString('o')} |
            ConvertTo-Json -Compress |
            Set-Content -LiteralPath (Join-Path $adminPrivateDir 'resultado.json') -Encoding UTF8
    }
}
try {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node indisponivel.' }
    if ($Criar) {
        Write-Host 'Modo CRIAR: usar somente apos autorizacao especifica para um unico usuario.'
    } else {
        Write-Host 'Modo PREVIA: somente leitura, sem criar usuario.'
    }
    Write-Host 'Informe valores apenas neste terminal local; nao os envie ao chat.'
    if ($AlvoPrivado) {
        $adminTarget = Get-Content -LiteralPath (Join-Path $adminPrivateDir 'alvo.json') -Raw | ConvertFrom-Json
        if ($adminTarget.projectRef -cne $ProjectRef -or $adminTarget.email -isnot [string]) {
            throw 'Alvo privado invalido.'
        }
        $adminEmailInput = $adminTarget.email
        Write-Host 'Conta escolhida ja preenchida pelo procedimento privado.'
    } else {
        $adminEmailInput = Read-Host 'Email Google escolhido'
    }
    $adminSecretInput = Read-Host 'Chave sb_secret do projeto (entrada oculta)' -AsSecureString
    $adminSecretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminSecretInput)
    try { $adminSecretText = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($adminSecretPointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($adminSecretPointer) }
    $adminPayload = @{projectRef = $ProjectRef; email = $adminEmailInput; secret = $adminSecretText; create = [bool]$Criar} | ConvertTo-Json -Compress
    # Pipe private input through stdin, never through command arguments or .env files.
    $adminNodeOutput = $adminPayload | & node $adminHelperPath
    if ($LASTEXITCODE -ne 0) { throw 'Procedimento interrompido; siga a mensagem sanitizada acima.' }
    $adminOutcome = $adminNodeOutput | ConvertFrom-Json
    if ($adminOutcome.status -notin @('PREVIA_OK_SEM_CRIACAO', 'USUARIO_CRIADO_E_CONFERIDO')) {
        throw 'Resultado inesperado.'
    }
    Write-AdminOutcome $adminOutcome.status
    Write-Host $adminOutcome.status
} catch {
    # Do not print the underlying exception or input values.
    Write-Host 'Procedimento interrompido. Nao repita uma tentativa de criacao sem conferir o projeto.'
    try { Write-AdminOutcome 'INTERROMPIDO_CONFERIR' } catch { }
    exit 1
} finally {
    $adminPayload = $null
    $adminSecretText = $null
    $adminEmailInput = $null
    if ($null -ne $adminSecretInput) { $adminSecretInput.Dispose() }
}
