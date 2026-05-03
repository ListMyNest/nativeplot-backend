# Runs the Spring Boot fat JAR directly after a one-shot Gradle build.
# Gradle exits before Java starts, so the IDE terminal does not stay on "EXECUTING".
# Usage (from repo): .\scripts\run-local.ps1
# Same env as bootRun: Spring picks up application-local.yml when PROFILE/local defaults apply.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "Building bootJar (Gradle will exit when done)..."
.\gradlew.bat bootJar -x test --no-daemon
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$jar = Get-ChildItem -Path "build\libs\*.jar" -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -notmatch "plain" } |
  Select-Object -First 1
if (-not $jar) {
  Write-Error "No executable jar found under build\libs (run bootJar first)."
  exit 1
}

Write-Host ""
Write-Host "Starting JVM (no Gradle progress bar from here): $($jar.Name)"
Write-Host ""

java -jar $jar.FullName @args
