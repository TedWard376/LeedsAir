package flightbooking.service

import flightbooking.db.table.AircraftTable
import flightbooking.db.table.AirportsTable
import flightbooking.db.table.FlightSchedulesTable
import flightbooking.db.table.ScheduledFlightsTable
import kotlinx.serialization.Serializable
import org.jetbrains.exposed.sql.ResultRow
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import java.time.Duration
import java.time.LocalDate
import java.time.format.DateTimeParseException
import kotlin.math.roundToInt

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
        val schedulesById = FlightSchedulesTable.selectAll().associateBy { it[FlightSchedulesTable.id] }

        ScheduledFlightsTable.selectAll()
            .mapNotNull { row ->
                val schedule = schedulesById[row[ScheduledFlightsTable.scheduleId]] ?: return@mapNotNull null
                val departureAirport = airportsById[schedule[FlightSchedulesTable.departureAirportId]] ?: return@mapNotNull null
                val arrivalAirport = airportsById[schedule[FlightSchedulesTable.arrivalAirportId]] ?: return@mapNotNull null
                val departureCode = departureAirport[AirportsTable.code].uppercase()
                val arrivalCode = arrivalAirport[AirportsTable.code].uppercase()

                if (normalizedFrom != null && departureCode != normalizedFrom) return@mapNotNull null
                if (normalizedTo != null && arrivalCode != normalizedTo) return@mapNotNull null

                val departureDateValue = row[ScheduledFlightsTable.departureTime].toLocalDate()
                if (parsedDate != null && departureDateValue != parsedDate) return@mapNotNull null

                buildFlightResponse(
                    row = row,
                    schedule = schedule,
                    departureCode = departureCode,
                    arrivalCode = arrivalCode,
                    aircraftSeats = aircraftById[row[ScheduledFlightsTable.aircraftId]]?.get(AircraftTable.totalSeats)
                )
            }
            .sortedWith(compareBy<FlightResponse> { it.departureDate }.thenBy { it.departureTime }.thenBy { it.flightNumber })
    }

    private fun buildFlightResponse(
        row: ResultRow,
        schedule: ResultRow,
        departureCode: String,
        arrivalCode: String,
        aircraftSeats: Int?
    ): FlightResponse {
        val departureDateTime = row[ScheduledFlightsTable.departureTime]
        val arrivalDateTime = row[ScheduledFlightsTable.arrivalTime]

        return FlightResponse(
            id = row[ScheduledFlightsTable.id],
            flightNumber = schedule[FlightSchedulesTable.flightNumber],
            airline = schedule[FlightSchedulesTable.airline].ifBlank { "Demo Air" },
            from = departureCode,
            to = arrivalCode,
            departureTime = departureDateTime.toLocalTime().toString(),
            arrivalTime = arrivalDateTime.toLocalTime().toString(),
            departureDate = departureDateTime.toLocalDate().toString(),
            duration = formatDuration(departureDateTime, arrivalDateTime),
            stops = schedule[FlightSchedulesTable.stops],
            price = row[ScheduledFlightsTable.basePrice].toDouble().roundToInt(),
            availableSeats = row[ScheduledFlightsTable.availableSeats] ?: aircraftSeats ?: 180
        )
    }

    private fun formatDuration(
        departureDateTime: java.time.LocalDateTime,
        arrivalDateTime: java.time.LocalDateTime
    ): String {
        val minutes = Duration.between(departureDateTime, arrivalDateTime).toMinutes().coerceAtLeast(0)
        val hours = minutes / 60
        val remainingMinutes = minutes % 60
        return "${hours}h ${remainingMinutes}m"
    }
}
