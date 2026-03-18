package flightbooking.service

import flightbooking.db.table.AircraftTable
import flightbooking.db.table.AirportsTable
import flightbooking.db.table.FlightsTable
import flightbooking.db.table.AirportsTable.code
import flightbooking.db.table.AirportsTable.id
import flightbooking.db.table.FlightsTable.basePrice
import flightbooking.db.table.FlightsTable.flightNumber
import flightbooking.db.table.FlightsTable.departureAirportId
import flightbooking.db.table.FlightsTable.arrivalAirportId
import flightbooking.db.table.FlightsTable.departureTime
import flightbooking.db.table.FlightsTable.arrivalTime
import flightbooking.db.table.FlightsTable.aircraftId
import flightbooking.db.table.FlightsTable.status
import flightbooking.db.table.AirportsTable.city
import flightbooking.db.table.AirportsTable.name
import flightbooking.db.table.AirportsTable.country
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.SortOrder
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.insertAndGetId
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.select
import org.jetbrains.exposed.sql.transactions.transaction
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.format.DateTimeFormatter

object SeedDataService {

    private val timeFormatter = DateTimeFormatter.ofPattern("H:mm")

    fun seedInitialData() {
        transaction {
            val airportCount = AirportsTable.selectAll().count()
            if (airportCount == 0L) {
                seedAirports()
            }

            val flightCount = FlightsTable.selectAll().count()
            if (flightCount == 0L) {
                seedFlights()
            }
        }
    }

    private fun seedAirports() {
        val seenCodes = HashSet<String>()
        for (airport in AirportLoader.loadFromCsv()) {
            val codeValue = airport.iata_code.trim().uppercase()
            if (codeValue.isBlank() || !seenCodes.add(codeValue)) {
                continue
            }

            AirportsTable.insert {
                it[code] = codeValue
                it[name] = airport.name
                it[city] = airport.municipality
                it[country] = airport.iso_country
            }
        }
    }

    private fun seedFlights() {
        val airportIndex = AirportsTable.selectAll()
            .associate { row -> row[code] to row[id].value }
        val defaultAircraftId = getDefaultAircraftId()

        for (row in FlightScheduleLoader.loadFromCsv()) {
            val departureId = airportIndex[row.from]
            val arrivalId = airportIndex[row.to]
            if (departureId == null || arrivalId == null) {
                continue
            }

            val scheduledDeparture = parseDateTime(row.departureTime, LocalDate.now())
            val scheduledArrival = parseDateTime(row.arrivalTime, scheduledDeparture.toLocalDate()).let {
                if (it <= scheduledDeparture) it.plusDays(1) else it
            }
            val price = row.price.toBigDecimalOrNull()?.setScale(2, RoundingMode.HALF_UP) ?: BigDecimal("199.00")

            FlightsTable.insert {
                it[flightNumber] = row.flightNumber
                it[departureAirportId] = departureId
                it[arrivalAirportId] = arrivalId
                it[departureTime] = scheduledDeparture
                it[arrivalTime] = scheduledArrival
                it[aircraftId] = defaultAircraftId
                it[basePrice] = price
                it[status] = "scheduled"
            }
        }
    }

    private fun parseDateTime(timeText: String, fallbackDate: LocalDate): LocalDateTime {
        val parsed = LocalTime.parse(timeText, timeFormatter)
        return LocalDateTime.of(fallbackDate, parsed)
    }

    private fun getDefaultAircraftId(): Int {
        val existing = AircraftTable
            .selectAll()
            .where { AircraftTable.model eq "Standard" }
            .singleOrNull()

        if (existing != null) return existing[AircraftTable.id].value

        return AircraftTable.insertAndGetId {
            it[AircraftTable.model] = "Standard"
            it[AircraftTable.totalSeats] = 180
        }.value
    }
}

