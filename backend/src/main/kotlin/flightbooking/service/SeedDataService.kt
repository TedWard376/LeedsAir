package flightbooking.service

import flightbooking.db.table.AircraftTable
import flightbooking.db.table.AirportsTable
import flightbooking.db.table.FlightsTable
import flightbooking.db.table.SeatsTable
import org.apache.commons.csv.CSVFormat
import org.apache.commons.csv.CSVParser
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.SortOrder
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import java.io.InputStreamReader
import java.math.BigDecimal
import java.math.RoundingMode
import java.nio.file.Files
import java.nio.file.Path
import java.time.DayOfWeek
import java.time.Duration
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import kotlin.math.ceil

object SeedDataService {

    private const val AIRPORTS_CSV_PATH = "data/airports.csv"
    private const val FLIGHT_SCHEDULE_RESOURCE_PATH = "data/flight_schedule.csv"
    private val scheduleTimeFormatter: DateTimeFormatter = DateTimeFormatter.ofPattern("H:mm")

    fun seedAll() {
        seedAirports()
        seedFlights()
    }

    fun seedAirports() {
        val reader = InputStreamReader(
            javaClass.classLoader.getResourceAsStream(AIRPORTS_CSV_PATH)
                ?: throw IllegalStateException("airports.csv not found at $AIRPORTS_CSV_PATH")
        )

        reader.use {
            CSVParser.parse(it, csvFormat()).use { parser ->
                transaction {
                    parser.forEach { record ->
                        val code = record.get("iata_code").trim().uppercase()
                        if (code.isBlank()) return@forEach

                        val exists = AirportsTable
                            .selectAll()
                            .where { AirportsTable.code eq code }
                            .limit(1)
                            .any()

                        if (!exists) {
                            AirportsTable.insert { row ->
                                row[AirportsTable.code] = code
                                row[AirportsTable.name] = record.get("name").trim().ifBlank { null }
                                row[AirportsTable.city] = record.get("municipality").trim().ifBlank { null }
                                row[AirportsTable.country] = record.get("iso_country").trim().ifBlank { null }
                            }
                        }
                    }
                }
            }
        }
    }

    fun seedFlights() {
        openFlightScheduleReader().use { reader ->
            CSVParser.parse(reader, csvFormat()).use { parser ->
                transaction {
                    val airportIdsByCode = AirportsTable
                        .selectAll()
                        .associate { row -> row[AirportsTable.code].uppercase() to row[AirportsTable.id] }
                        .toMutableMap()

                    val aircraftIdsByKey = AircraftTable
                        .selectAll()
                        .associate { row -> aircraftKey(row[AircraftTable.model], row[AircraftTable.totalSeats]) to row[AircraftTable.id] }
                        .toMutableMap()

                    parser.forEach { record ->
                        val departureCode = record.get("from").trim().uppercase()
                        val arrivalCode = record.get("to").trim().uppercase()
                        val departureAirportId = airportIdsByCode[departureCode] ?: return@forEach
                        val arrivalAirportId = airportIdsByCode[arrivalCode] ?: return@forEach

                        val aircraftModel = record.get("airline").trim().ifBlank { "Default Aircraft" } + " Standard Fleet"
                        val totalSeats = record.get("availableSeats").trim().toIntOrNull() ?: 189
                        val aircraftId = aircraftIdsByKey.getOrPut(aircraftKey(aircraftModel, totalSeats)) {
                            createAircraftWithSeats(aircraftModel, totalSeats)
                        }

                        val departureDate = nextOperatingDate(
                            startDate = LocalDate.now(),
                            operateDays = record.get("operateDays").trim()
                        )
                        val departureDateTime = LocalDateTime.of(
                            departureDate,
                            parseTime(record.get("departureTime"))
                        )
                        val arrivalDateTime = resolveArrivalDateTime(
                            departureDateTime = departureDateTime,
                            arrivalTime = record.get("arrivalTime").trim(),
                            durationValue = record.get("duration").trim()
                        )
                        val basePrice = parsePrice(record.get("price").trim(), record.get("duration").trim(), record.get("stops").trim())
                        val flightNumber = record.get("flightNumber").trim()

                        val exists = FlightsTable
                            .selectAll()
                            .where {
                                (FlightsTable.flightNumber eq flightNumber) and
                                    (FlightsTable.departureTime eq departureDateTime)
                            }
                            .limit(1)
                            .any()

                        if (!exists) {
                            FlightsTable.insert { row ->
                                row[FlightsTable.flightNumber] = flightNumber
                                row[FlightsTable.departureAirportId] = departureAirportId
                                row[FlightsTable.arrivalAirportId] = arrivalAirportId
                                row[FlightsTable.departureTime] = departureDateTime
                                row[FlightsTable.arrivalTime] = arrivalDateTime
                                row[FlightsTable.aircraftId] = aircraftId
                                row[FlightsTable.basePrice] = basePrice
                                row[FlightsTable.status] = "scheduled"
                            }
                        }
                    }
                }
            }
        }
    }

    private fun openFlightScheduleReader(): InputStreamReader {
        val resourceStream = javaClass.classLoader.getResourceAsStream(FLIGHT_SCHEDULE_RESOURCE_PATH)
        if (resourceStream != null) {
            return InputStreamReader(resourceStream)
        }

        val candidatePaths = listOf(
            Path.of("FlightSchedule.csv"),
            Path.of("backend", "FlightSchedule.csv"),
            Path.of("..", "FlightSchedule.csv")
        )

        val filePath = candidatePaths.firstOrNull { Files.exists(it) }
            ?: throw IllegalStateException(
                "FlightSchedule.csv not found. Put it in the project root or add it to resources as $FLIGHT_SCHEDULE_RESOURCE_PATH"
            )

        return InputStreamReader(filePath.toFile().inputStream())
    }

    private fun createAircraftWithSeats(modelName: String, totalSeats: Int): Int {
        AircraftTable.insert { row ->
            row[AircraftTable.model] = modelName
            row[AircraftTable.totalSeats] = totalSeats
        }

        val aircraftId = AircraftTable
            .selectAll()
            .where {
                (AircraftTable.model eq modelName) and
                    (AircraftTable.totalSeats eq totalSeats)
            }
            .orderBy(AircraftTable.id, SortOrder.DESC)
            .limit(1)
            .first()[AircraftTable.id]

        generateSeatDefinitions(totalSeats).forEach { seat ->
            SeatsTable.insert { row ->
                row[SeatsTable.aircraftId] = aircraftId
                row[SeatsTable.seatNumber] = seat.number
                row[SeatsTable.seatClass] = seat.seatClass
            }
        }

        return aircraftId
    }

    private fun generateSeatDefinitions(totalSeats: Int): List<SeatDefinition> {
        if (totalSeats <= 0) return emptyList()

        val seatsPerRow = 6
        val rows = ceil(totalSeats / seatsPerRow.toDouble()).toInt()
        val seatLetters = listOf('A', 'B', 'C', 'D', 'E', 'F')
        val definitions = mutableListOf<SeatDefinition>()
        var created = 0

        for (row in 1..rows) {
            for (seatLetter in seatLetters) {
                if (created >= totalSeats) return definitions

                val seatClass = when {
                    row <= 3 -> "business"
                    row <= 8 -> "premium_economy"
                    else -> "economy"
                }
                definitions += SeatDefinition("$row$seatLetter", seatClass)
                created++
            }
        }

        return definitions
    }

    private fun nextOperatingDate(startDate: LocalDate, operateDays: String): LocalDate {
        if (operateDays.length != 7 || operateDays.none { it == '1' }) {
            return startDate
        }

        for (offset in 0..13) {
            val candidate = startDate.plusDays(offset.toLong())
            val operateIndex = candidate.dayOfWeek.toOperateDaysIndex()
            if (operateDays[operateIndex] == '1') {
                return candidate
            }
        }

        return startDate
    }

    private fun DayOfWeek.toOperateDaysIndex(): Int = when (this) {
        DayOfWeek.MONDAY -> 0
        DayOfWeek.TUESDAY -> 1
        DayOfWeek.WEDNESDAY -> 2
        DayOfWeek.THURSDAY -> 3
        DayOfWeek.FRIDAY -> 4
        DayOfWeek.SATURDAY -> 5
        DayOfWeek.SUNDAY -> 6
    }

    private fun resolveArrivalDateTime(
        departureDateTime: LocalDateTime,
        arrivalTime: String,
        durationValue: String,
    ): LocalDateTime {
        val duration = parseDuration(durationValue)
        if (duration != null) {
            return departureDateTime.plus(duration)
        }

        val parsedArrivalTime = parseTime(arrivalTime)
        var arrivalDateTime = LocalDateTime.of(departureDateTime.toLocalDate(), parsedArrivalTime)
        if (!arrivalDateTime.isAfter(departureDateTime)) {
            arrivalDateTime = arrivalDateTime.plusDays(1)
        }
        return arrivalDateTime
    }

    private fun parseTime(value: String): LocalTime =
        LocalTime.parse(value.trim(), scheduleTimeFormatter)

    private fun parseDuration(value: String): Duration? {
        val cleaned = value.lowercase().replace(" ", "")
        if (cleaned.isBlank()) return null

        val hourPart = Regex("(\\d+)h").find(cleaned)?.groupValues?.get(1)?.toLongOrNull() ?: 0L
        val minutePart = Regex("(\\d+)m").find(cleaned)?.groupValues?.get(1)?.toLongOrNull() ?: 0L
        if (hourPart == 0L && minutePart == 0L) return null

        return Duration.ofHours(hourPart).plusMinutes(minutePart)
    }

    private fun parsePrice(price: String, durationValue: String, stopsValue: String): BigDecimal {
        price.toBigDecimalOrNull()?.let { return it.setScale(2, RoundingMode.HALF_UP) }

        val durationMinutes = parseDuration(durationValue)?.toMinutes()?.toInt() ?: 90
        val stops = stopsValue.toIntOrNull() ?: 0
        val derivedPrice = 59.99 + (durationMinutes * 0.45) + (stops * 35)
        return BigDecimal.valueOf(derivedPrice).setScale(2, RoundingMode.HALF_UP)
    }

    private fun csvFormat(): CSVFormat =
        CSVFormat.DEFAULT.builder()
            .setHeader()
            .setSkipHeaderRecord(true)
            .setIgnoreSurroundingSpaces(true)
            .build()

    private fun aircraftKey(model: String?, totalSeats: Int): String =
        "${model.orEmpty().trim()}::$totalSeats"

    private data class SeatDefinition(
        val number: String,
        val seatClass: String,
    )
}
