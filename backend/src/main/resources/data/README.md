# Airport Data

## Source

Data from **OurAirports** (Public Domain):
- https://ourairports.com/data/
- https://davidmegginson.github.io/ourairports-data/airports.csv

## Files

| File | Description |
|------|-------------|
| `airports.csv` | Filtered: large_airport + medium_airport with IATA codes (~4.5k) |

## Refresh Data

To update from OurAirports:

```powershell
cd backend/src/main/resources/data
Invoke-WebRequest -Uri "https://davidmegginson.github.io/ourairports-data/airports.csv" -OutFile "airports_raw.csv" -UseBasicParsing
$csv = Import-Csv "airports_raw.csv"
$filtered = $csv | Where-Object { ($_.type -eq "large_airport" -or $_.type -eq "medium_airport") -and $_.iata_code -ne "" }
$filtered | Export-Csv "airports.csv" -NoTypeInformation -Encoding UTF8
```
