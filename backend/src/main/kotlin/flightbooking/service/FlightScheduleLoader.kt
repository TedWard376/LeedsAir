package flightbooking.service

import org.apache.commons.csv.CSVFormat
import org.apache.commons.csv.CSVParser
import java.io.File
import java.io.FileInputStream
import java.io.InputStream
import java.io.InputStreamReader

data class FlightScheduleRow(
    val flightNumber: String,
    val from: String,
    val to: String,
    val departureTime: String,
    val arrivalTime: String,
    val price: String
)

object FlightScheduleLoader {

    private const val CSV_PATH = "data/FlightSchedule.csv"

    fun loadFromCsv(): List<FlightScheduleRow> {
        val input = openCsvStream()
        return InputStreamReader(input).use { reader ->
            CSVParser.parse(reader, CSVFormat.DEFAULT.builder().setHeader().setSkipHeaderRecord(true).build()).use { parser ->
                parser.mapNotNull { record ->
                    val flightNumber = record.get("flightNumber").trim()
                    val from = record.get("from").trim().uppercase()
                    val to = record.get("to").trim().uppercase()
                    val departureTime = record.get("departureTime").trim()
                    val arrivalTime = record.get("arrivalTime").trim()
                    val price = record.get("price").trim()

                    if (flightNumber.isBlank() || from.isBlank() || to.isBlank() || departureTime.isBlank() || arrivalTime.isBlank()) {
                        null
                    } else {
                        FlightScheduleRow(flightNumber, from, to, departureTime, arrivalTime, price)
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

