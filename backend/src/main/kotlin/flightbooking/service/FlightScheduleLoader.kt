package flightbooking.service

import org.apache.commons.csv.CSVFormat
import org.apache.commons.csv.CSVParser
import java.io.File
import java.io.FileInputStream
import java.io.InputStream
import java.io.InputStreamReader

data class FlightScheduleRow(
    val flightNumber: String,
    val airline: String,
    val from: String,
    val to: String,
    val departureTime: String,
    val arrivalTime: String,
    val duration: String,
    val stops: Int,
    val price: String,
    val availableSeats: Int?
)

object FlightScheduleLoader {

    private const val CSV_PATH = "data/FlightSchedule.csv"

    fun loadFromCsv(): List<FlightScheduleRow> {
        val input = openCsvStream()
        return InputStreamReader(input).use { reader ->
            CSVParser.parse(reader, CSVFormat.DEFAULT.builder().setHeader().setSkipHeaderRecord(true).build()).use { parser ->
                parser.mapNotNull { record ->
                    val flightNumber = record.get("flightNumber").trim()
                    val airline = record.get("airline").trim()
                    val from = record.get("from").trim().uppercase()
                    val to = record.get("to").trim().uppercase()
                    val departureTime = record.get("departureTime").trim()
                    val arrivalTime = record.get("arrivalTime").trim()
                    val duration = record.get("duration").trim()
                    val stops = record.get("stops").trim().toIntOrNull() ?: 0
                    val price = record.get("price").trim()
                    val availableSeats = record.get("availableSeats").trim().toIntOrNull()

                    if (flightNumber.isBlank() || from.isBlank() || to.isBlank() || departureTime.isBlank() || arrivalTime.isBlank()) {
                        null
                    } else {
                        FlightScheduleRow(
                            flightNumber = flightNumber,
                            airline = airline,
                            from = from,
                            to = to,
                            departureTime = departureTime,
                            arrivalTime = arrivalTime,
                            duration = duration,
                            stops = stops,
                            price = price,
                            availableSeats = availableSeats
                        )
                    }
                }.toList()
            }
        }
    }

    private fun openCsvStream(): InputStream {
        return javaClass.classLoader.getResourceAsStream(CSV_PATH)
            ?: javaClass.classLoader.getResourceAsStream("FlightSchedule.csv")
            ?: if (File(CSV_PATH).exists()) FileInputStream(File(CSV_PATH))
            else if (File("FlightSchedule.csv").exists()) FileInputStream(File("FlightSchedule.csv"))
            else throw IllegalStateException("FlightSchedule.csv not found in classpath or filesystem")
    }
}

