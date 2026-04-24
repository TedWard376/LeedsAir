package flightbooking.service

import flightbooking.db.table.AircraftTable
import flightbooking.db.table.AirportsTable
import flightbooking.db.table.FlightSchedulesTable
import flightbooking.db.table.ScheduledFlightsTable
import flightbooking.db.table.SeatsTable
import org.apache.commons.csv.CSVFormat
import org.apache.commons.csv.CSVParser
import org.jetbrains.exposed.sql.SortOrder
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import java.io.InputStreamReader
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.DayOfWeek
import java.time.Duration
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import kotlin.math.ceil

object SeedDataService {

    private const val AIRPORTS_CSV_PATH = "data/airports.csv"
    private val scheduleTimeFormatter: DateTimeFormatter = DateTimeFormatter.ofPattern("H:mm")

    fun seedAll() {
        val schedules = FlightScheduleLoader.loadFromCsv()
        seedAirports(schedules)
        seedFlightSchedules(schedules)
        seedScheduledFlights()
    }

    private fun seedAirports(schedules: List<FlightScheduleRow>) {
        val requiredCodes = schedules
            .flatMap { listOf(it.from, it.to) }
            .map { it.trim().uppercase() }
            .filter { it.isNotBlank() }
            .toSet()

        if (requiredCodes.isEmpty()) return

        val reader = InputStreamReader(
            javaClass.classLoader.getResourceAsStream(AIRPORTS_CSV_PATH)
                ?: throw IllegalStateException("airports.csv not found at $AIRPORTS_CSV_PATH")
        )

        reader.use {
            CSVParser.parse(it, csvFormat()).use { parser ->
                transaction {
                    val existingCodes = AirportsTable
                        .selectAll()
                        .map { row -> row[AirportsTable.code].uppercase() }
                        .toMutableSet()

                    parser.forEach { record ->
                        val code = record.get("iata_code").trim().uppercase()
                        if (code.isBlank() || code !in requiredCodes || code in existingCodes) return@forEach

                        AirportsTable.insert { row ->
                            row[AirportsTable.code] = code
                            row[AirportsTable.name] = record.get("name").trim().ifBlank { null }
                            row[AirportsTable.city] = record.get("municipality").trim().ifBlank { null }
                            row[AirportsTable.country] = record.get("iso_country").trim().ifBlank { null }
                        }
                        existingCodes += code
                    }
                }
            }
        }
    }

    private fun seedFlightSchedules(schedules: List<FlightScheduleRow>) {
        transaction {
            val airportIdsByCode = AirportsTable
                .selectAll()
                .associate { row -> row[AirportsTable.code].uppercase() to row[AirportsTable.id] }

            val existingFlightNumbers = FlightSchedulesTable
                .selectAll()
                .map { row -> row[FlightSchedulesTable.flightNumber].uppercase() }
                .toMutableSet()

            schedules.forEach { schedule ->
                if (schedule.flightNumber.uppercase() in existingFlightNumbers) return@forEach

                val departureAirportId = airportIdsByCode[schedule.from] ?: return@forEach
                val arrivalAirportId = airportIdsByCode[schedule.to] ?: return@forEach

                FlightSchedulesTable.insert { row ->
                    row[FlightSchedulesTable.flightNumber] = schedule.flightNumber
                    row[FlightSchedulesTable.airline] = schedule.airline.ifBlank { "Demo Air" }
                    row[FlightSchedulesTable.departureAirportId] = departureAirportId
                    row[FlightSchedulesTable.arrivalAirportId] = arrivalAirportId
                    row[FlightSchedulesTable.departureTime] = parseTime(schedule.departureTime)
                    row[FlightSchedulesTable.arrivalTime] = parseTime(schedule.arrivalTime)
                    row[FlightSchedulesTable.operateDays] = normalizedOperateDays(schedule.operateDays)
                    row[FlightSchedulesTable.durationMinutes] = parseDurationMinutes(
                        durationValue = schedule.duration,
                        departureTimeValue = schedule.departureTime,
                        arrivalTimeValue = schedule.arrivalTime
                    )
                    row[FlightSchedulesTable.stops] = schedule.stops
                }
                existingFlightNumbers += schedule.flightNumber.uppercase()
            }
        }
    }

    private fun seedScheduledFlights() {
        transaction {
            val scheduleRows = FlightSchedulesTable.selectAll().toList()

            val existingFlightsByScheduleAndDeparture = ScheduledFlightsTable
                .selectAll()
                .associateBy { row -> row[ScheduledFlightsTable.scheduleId] to row[ScheduledFlightsTable.departureTime] }
                .toMutableMap()

            val aircraftIdsByKey = AircraftTable
                .selectAll()
                .associate { row -> aircraftKey(row[AircraftTable.model], row[AircraftTable.totalSeats]) to row[AircraftTable.id] }
                .toMutableMap()

            val scheduleSourceByFlightNumber = FlightScheduleLoader.loadFromCsv()
                .associateBy { it.flightNumber.uppercase() }

            scheduleRows.forEach { scheduleRow ->
                val scheduleId = scheduleRow[FlightSchedulesTable.id]
                val source = scheduleSourceByFlightNumber[scheduleRow[FlightSchedulesTable.flightNumber].uppercase()]
                    ?: return@forEach

                val totalSeats = source.availableSeats ?: 189
                val aircraftModel = scheduleRow[FlightSchedulesTable.airline].ifBlank { "Default Aircraft" } + " Standard Fleet"
                val aircraftId = aircraftIdsByKey.getOrPut(aircraftKey(aircraftModel, totalSeats)) {
                    createAircraftWithSeats(aircraftModel, totalSeats)
                }

                val departureDate = nextOperatingDate(LocalDate.now(), scheduleRow[FlightSchedulesTable.operateDays])
                val departureDateTime = LocalDateTime.of(departureDate, scheduleRow[FlightSchedulesTable.departureTime])
                val arrivalDateTime = departureDateTime.plusMinutes(scheduleRow[FlightSchedulesTable.durationMinutes].toLong())
                val flightKey = scheduleId to departureDateTime

                if (flightKey in existingFlightsByScheduleAndDeparture) return@forEach

                ScheduledFlightsTable.insert { row ->
                    row[ScheduledFlightsTable.scheduleId] = scheduleId
                    row[ScheduledFlightsTable.departureTime] = departureDateTime
                    row[ScheduledFlightsTable.arrivalTime] = arrivalDateTime
                    row[ScheduledFlightsTable.aircraftId] = aircraftId
                    row[ScheduledFlightsTable.basePrice] = parsePrice(source.price, scheduleRow[FlightSchedulesTable.durationMinutes], source.stops)
                    row[ScheduledFlightsTable.availableSeats] = source.availableSeats ?: totalSeats
                    row[ScheduledFlightsTable.status] = "scheduled"
                }
            }
        }
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

    private fun normalizedOperateDays(value: String): String {
        val cleaned = value.trim()
        return if (cleaned.length == 7 && cleaned.any { it == '1' }) cleaned else "1111111"
    }

    private fun nextOperatingDate(startDate: LocalDate, operateDays: String): LocalDate {
        val normalized = normalizedOperateDays(operateDays)

        for (offset in 0..13) {
            val candidate = startDate.plusDays(offset.toLong())
            val operateIndex = candidate.dayOfWeek.toOperateDaysIndex()
            if (normalized[operateIndex] == '1') {
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

    private fun parseDurationMinutes(
        durationValue: String,
        departureTimeValue: String,
        arrivalTimeValue: String,
    ): Int {
        parseDuration(durationValue)?.toMinutes()?.toInt()?.let { return it }

        val departureTime = parseTime(departureTimeValue)
        var arrivalDateTime = LocalDateTime.of(LocalDate.now(), parseTime(arrivalTimeValue))
        val departureDateTime = LocalDateTime.of(LocalDate.now(), departureTime)
        if (!arrivalDateTime.isAfter(departureDateTime)) {
            arrivalDateTime = arrivalDateTime.plusDays(1)
        }

        return Duration.between(departureDateTime, arrivalDateTime).toMinutes().toInt().coerceAtLeast(0)
    }

    private fun parsePrice(price: String, durationMinutes: Int, stops: Int): BigDecimal {
        price.toBigDecimalOrNull()?.let { return it.setScale(2, RoundingMode.HALF_UP) }

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
