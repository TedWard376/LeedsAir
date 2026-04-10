package flightbooking.service

import flightbooking.db.table.AircraftTable
import flightbooking.db.table.AirportsTable
import flightbooking.db.table.FlightsTable
import kotlinx.serialization.Serializable
import org.jetbrains.exposed.sql.ResultRow
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import java.time.LocalDate
import java.time.format.DateTimeParseException

@Serializable
data class FlightResponse(
    val id: Int,
    val flightNumber: String,
    val airline: String,
    val from: String,
    val to: String,
    val departureTime: String,
    val arrivalTime: String,
    val departureDate: String,
    val duration: String,
    val stops: Int,
    val price: Int,
    val availableSeats: Int
)

object FlightService {
    private val scheduleIndex by lazy {
        FlightScheduleLoader.loadFromCsv().associateBy { it.flightNumber.uppercase() }
    }

    fun searchFlights(from: String?, to: String?, departureDate: String?): List<FlightResponse> = transaction {
        val normalizedFrom = from?.trim()?.uppercase().takeUnless { it.isNullOrBlank() }
        val normalizedTo = to?.trim()?.uppercase().takeUnless { it.isNullOrBlank() }
        val parsedDate = departureDate?.trim().takeUnless { it.isNullOrBlank() }?.let {
            try {
                LocalDate.parse(it)
            } catch (_: DateTimeParseException) {
                null
            }
        }

        val airportsById = AirportsTable.selectAll().associateBy { it[AirportsTable.id] }
        val aircraftById = AircraftTable.selectAll().associateBy { it[AircraftTable.id] }

        FlightsTable.selectAll()
            .mapNotNull { row ->
                val departureAirport = airportsById[row[FlightsTable.departureAirportId]] ?: return@mapNotNull null
                val arrivalAirport = airportsById[row[FlightsTable.arrivalAirportId]] ?: return@mapNotNull null
                val departureCode = departureAirport[AirportsTable.code].uppercase()
                val arrivalCode = arrivalAirport[AirportsTable.code].uppercase()

                if (normalizedFrom != null && departureCode != normalizedFrom) return@mapNotNull null
                if (normalizedTo != null && arrivalCode != normalizedTo) return@mapNotNull null

                val departureDateValue = row[FlightsTable.departureTime].toLocalDate()
                if (parsedDate != null && departureDateValue != parsedDate) return@mapNotNull null

                buildFlightResponse(
                    row = row,
                    departureCode = departureCode,
                    arrivalCode = arrivalCode,
                    aircraftSeats = aircraftById[row[FlightsTable.aircraftId]]?.get(AircraftTable.totalSeats)
                )
            }
            .sortedWith(compareBy<FlightResponse> { it.departureDate }.thenBy { it.departureTime }.thenBy { it.flightNumber })
    }

    private fun buildFlightResponse(
        row: ResultRow,
        departureCode: String,
        arrivalCode: String,
        aircraftSeats: Int?
    ): FlightResponse {
        val schedule = scheduleIndex[row[FlightsTable.flightNumber].uppercase()]
        val departureDateTime = row[FlightsTable.departureTime]
        val arrivalDateTime = row[FlightsTable.arrivalTime]

        return FlightResponse(
            id = row[FlightsTable.id],
            flightNumber = row[FlightsTable.flightNumber],
            airline = schedule?.airline?.ifBlank { "Demo Air" } ?: "Demo Air",
            from = departureCode,
            to = arrivalCode,
            departureTime = schedule?.departureTime?.ifBlank { departureDateTime.toLocalTime().toString() }
                ?: departureDateTime.toLocalTime().toString(),
            arrivalTime = schedule?.arrivalTime?.ifBlank { arrivalDateTime.toLocalTime().toString() }
                ?: arrivalDateTime.toLocalTime().toString(),
            departureDate = departureDateTime.toLocalDate().toString(),
            duration = schedule?.duration?.ifBlank { formatDuration(departureDateTime, arrivalDateTime) }
                ?: formatDuration(departureDateTime, arrivalDateTime),
            stops = schedule?.stops ?: 0,
            price = row[FlightsTable.basePrice].toInt(),
            availableSeats = schedule?.availableSeats ?: aircraftSeats ?: 180
        )
    }

    private fun formatDuration(
        departureDateTime: java.time.LocalDateTime,
        arrivalDateTime: java.time.LocalDateTime
    ): String {
        val minutes = java.time.Duration.between(departureDateTime, arrivalDateTime).toMinutes().coerceAtLeast(0)
        val hours = minutes / 60
        val remainingMinutes = minutes % 60
        return "${hours}h ${remainingMinutes}m"
    }
}
