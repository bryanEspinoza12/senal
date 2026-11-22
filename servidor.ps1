# Servidor local de SENAL: sirve esta carpeta en http://127.0.0.1:5500/
# Solo escucha en tu propio PC (127.0.0.1). Cierra la ventana para apagarlo.
# v2.0: tambien entrega el manifiesto de la app (.webmanifest) para poder instalarla.
# v1.4.2: solo entrega archivos DENTRO de esta carpeta (sin carpetas vecinas
# ni archivos ocultos) y solo responde a 127.0.0.1 / localhost (anti DNS rebinding).
$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Split-Path -Parent $MyInvocation.MyCommand.Path)).TrimEnd('\', '/')
$rootPrefix = $root + [System.IO.Path]::DirectorySeparatorChar
$port = 5500
$allowedHosts = @("127.0.0.1:$port", "localhost:$port")
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse('127.0.0.1'), $port)
try { $listener.Start() } catch {
  Write-Host "No se pudo usar el puerto $port. Puede que SENAL o Live Server ya esten abiertos." -ForegroundColor Red
  Read-Host 'Presiona Enter para salir'
  exit 1
}
Write-Host ""
Write-Host "  SENAL esta funcionando en http://127.0.0.1:$port/" -ForegroundColor Green
Write-Host "  Deja esta ventana abierta mientras la usas. Cierrala para apagarla."
Write-Host ""
Start-Process "http://127.0.0.1:$port/"

$types = @{
  '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8';
  '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.svg'='image/svg+xml'; '.ico'='image/x-icon';
  '.json'='application/json'; '.mp3'='audio/mpeg'; '.txt'='text/plain; charset=utf-8';
  '.webmanifest'='application/manifest+json'; '.woff2'='font/woff2'; '.rules'='text/plain; charset=utf-8'
}
$secHeaders = "X-Content-Type-Options: nosniff`r`nX-Frame-Options: DENY`r`n"

function Send-Text($stream, $code, $text) {
  $b = [System.Text.Encoding]::UTF8.GetBytes($text)
  $h = "HTTP/1.1 $code`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($b.Length)`r`n$secHeaders" + "Connection: close`r`n`r`n"
  $hb = [System.Text.Encoding]::ASCII.GetBytes($h)
  $stream.Write($hb, 0, $hb.Length); $stream.Write($b, 0, $b.Length); $stream.Flush()
}

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $client.ReceiveTimeout = 3000
    $stream = $client.GetStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $line = [string]$reader.ReadLine()
    $hostHdr = ''
    while ($true) {
      $h = $reader.ReadLine()
      if ($h -eq $null -or $h -eq '') { break }
      if ($h -match '^Host:\s*(.+)$') { $hostHdr = $Matches[1].Trim().ToLower() }
    }

    # 1) Solo peticiones GET
    $reqPath = $null
    if ($line -match '^GET (\S+) HTTP/1\.[01]$') { $reqPath = $Matches[1] }
    if (-not $reqPath) { Send-Text $stream '405 Method Not Allowed' 'Metodo no permitido'; continue }
    # 2) Solo si el navegador pide 127.0.0.1 o localhost (bloquea DNS rebinding)
    if ($allowedHosts -notcontains $hostHdr) { Send-Text $stream '403 Forbidden' 'Prohibido'; continue }

    $path = [Uri]::UnescapeDataString(($reqPath -split '\?')[0])
    if ($path -eq '/') { $path = '/index.html' }
    # 3) Rechaza rutas raras: '..', ':' (otra unidad o flujo NTFS), barras dobles, caracteres de control
    #    y archivos o carpetas ocultos (.git, .env, .gitignore...)
    if ($path -match '\.\.|:|\\\\|//|[\x00-\x1f]' -or $path -match '(^|[\\/])\.') { Send-Text $stream '404 Not Found' 'No encontrado'; continue }

    $full = [System.IO.Path]::GetFullPath((Join-Path $root $path.TrimStart('/', '\')))
    # 4) Debe quedar DENTRO de la carpeta. Con la barra final, 'SENAL-copia' ya no pasa por 'SENAL'.
    if (-not $full.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $full -PathType Leaf)) {
      Send-Text $stream '404 Not Found' 'No encontrado'; continue
    }

    $bytes = [System.IO.File]::ReadAllBytes($full)
    $ct = $types[[System.IO.Path]::GetExtension($full).ToLower()]
    if (-not $ct) { $ct = 'application/octet-stream' }
    $head = "HTTP/1.1 200 OK`r`nContent-Type: $ct`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-cache`r`n$secHeaders" + "Connection: close`r`n`r`n"
    $hb = [System.Text.Encoding]::ASCII.GetBytes($head)
    $stream.Write($hb, 0, $hb.Length)
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Flush()
  } catch { } finally { $client.Close() }
}
