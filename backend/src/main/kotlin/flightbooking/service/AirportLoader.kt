package flightbooking.service

import flightbooking.Airport
import org.apache.commons.csv.CSVFormat
import org.apache.commons.csv.CSVParser
import java.io.InputStreamReader

/**
 * Loads airport data from CSV (OurAirports format).
 * Source: https://davidmegginson.github.io/ourairports-data/airports.csv
 * Filtered: large_airport, medium_airport with IATA codes.
 */
object AirportLoader {

    private const val CSV_PATH = "data/airports.csv"

    fun loadFromCsv(): List<Airport> {
        val reader = InputStreamReader(
            javaClass.classLoader.getResourceAsStream(CSV_PATH)
                ?: throw IllegalStateException("airports.csv not found at $CSV_PATH")
        )
        return reader.use {
            CSVParser.parse(it, CSVFormat.DEFAULT.builder().setHeader().setSkipHeaderRecord(true).build()).use { parser ->
                parser.mapNotNull { record ->
                    val iataCode = record.get("iata_code").trim()
                    if (iataCode.isBlank()) return@mapNotNull null
                    val name = record.get("name").ifBlank { record.get("ident") }
                    val ident = record.get("ident")
                    Airport(
                        name = name,
                        latitude_deg = record.get("latitude_deg").toDoubleOrNull() ?: 0.0,
                        longitude_deg = record.get("longitude_deg").toDoubleOrNull() ?: 0.0,
                        continent = record.get("continent").ifBlank { "XX" },
                        iso_country = record.get("iso_country").ifBlank { "XX" },
                        municipality = record.get("municipality"),
                        icao_code = record.get("icao_code").ifBlank { ident },
                        iata_code = iataCode.ifBlank { ident }
                    )
                }
            }
        }
    }
}
