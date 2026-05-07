$envPath = "..\.env"
if (Test-Path $envPath) {
    Write-Host "Loading environment variables from $envPath"
    Get-Content $envPath | ForEach-Object {
        if ($_ -match '^\s*([^#=]+)\s*=\s*(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim(" `"'")
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

.\gradlew.bat run
