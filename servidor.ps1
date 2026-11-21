# Servidor local de SENAL: sirve esta carpeta en http://127.0.0.1:5500/
# Solo escucha en tu propio PC (127.0.0.1). Cierra la ventana para apagarlo.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 5500
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
  '.json'='application/json'; '.mp3'='audio/mpeg'; '.txt'='text/plain; charset=utf-8'
}

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    $client.ReceiveTimeout = 3000
    $stream = $client.GetStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $line = $reader.ReadLine()
    while ($true) { $h = $reader.ReadLine(); if ($h -eq $null -or $h -eq '') { break } }
    $path = '/'
    if ($line -match '^GET (\S+)') { $path = $Matches[1] }
    $path = [Uri]::UnescapeDataString(($path -split '\?')[0])
    if ($path -eq '/') { $path = '/index.html' }
    $full = [System.IO.Path]::GetFullPath((Join-Path $root $path.TrimStart('/')))
    if ($full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $full -PathType Leaf)) {
      $bytes = [System.IO.File]::ReadAllBytes($full)
      $ct = $types[[System.IO.Path]::GetExtension($full).ToLower()]
      if (-not $ct) { $ct = 'application/octet-stream' }
      $head = "HTTP/1.1 200 OK`r`nContent-Type: $ct`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
    } else {
      $bytes = [System.Text.Encoding]::UTF8.GetBytes('No encontrado')
      $head = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`n`r`n"
    }
    $hb = [System.Text.Encoding]::ASCII.GetBytes($head)
    $stream.Write($hb, 0, $hb.Length)
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Flush()
  } catch { } finally { $client.Close() }
}
