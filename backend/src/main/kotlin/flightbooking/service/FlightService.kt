package flightbooking.service

import flightbooking.db.table.AircraftTable
import flightbooking.db.table.AirportsTable
import flightbooking.db.table.FlightSchedulesTable
import flightbooking.db.table.ScheduledFlightsTable
import kotlinx.serialization.Serializable
import org.jetbrains.exposed.sql.ResultRow
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.SqlExpressionBuilder.greaterEq
import org.jetbrains.exposed.sql.SqlExpressionBuilder.inList
import org.jetbrains.exposed.sql.SqlExpressionBuilder.less
import org.jetbrains.exposed.sql.andWhere
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import java.time.Duration
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeParseException
import kotlin.math.roundToInt

@Serializable
data class FlightSegment(
    val from: String,
    val to: String,
    val departureTime: String,
    val arrivalTime: String,
    val departureDate: String,
    val duration: String,
    val flightNumber: String,
    val airline: String,
)

@Serializable
data class FlightResponse(
    val id: String,
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
    val availableSeats: Int,
    val tabIndex: Int = 0,
    val ariaLabel: String = "",
)

object FlightService {
    fun searchFlights(
        from: String?,
        to: String?,
        departureDate: String?,
    ): List<FlightResponse> =
        transaction {
            val normalizedFrom = from?.trim()?.uppercase().takeUnless { it.isNullOrBlank() }
            val normalizedTo = to?.trim()?.uppercase().takeUnless { it.isNullOrBlank() }
            val parsedDate =
                departureDate?.trim().takeUnless { it.isNullOrBlank() }?.let {
                    try {
                        LocalDate.parse(it)
                    } catch (_: DateTimeParseException) {
                        null
                    }
                }

            val airportsByCode = AirportsTable.selectAll().associateBy { it[AirportsTable.code].uppercase() }
            val departureAirportId = normalizedFrom?.let { code -> airportsByCode[code]?.get(AirportsTable.id) }
            val arrivalAirportId = normalizedTo?.let { code -> airportsByCode[code]?.get(AirportsTable.id) }

            if (normalizedFrom != null && departureAirportId == null) return@transaction emptyList()
            if (normalizedTo != null && arrivalAirportId == null) return@transaction emptyList()

            val scheduleQuery = FlightSchedulesTable.selectAll()
            if (departureAirportId != null) {
                scheduleQuery.andWhere { FlightSchedulesTable.departureAirportId eq departureAirportId }
            }
            if (arrivalAirportId != null) {
                scheduleQuery.andWhere { FlightSchedulesTable.arrivalAirportId eq arrivalAirportId }
            }

            val schedulesById = scheduleQuery.toList().associateBy { it[FlightSchedulesTable.id] }

            val airportsById = AirportsTable.selectAll().associateBy { it[AirportsTable.id] }
            val aircraftSeatMap = AircraftTable.selectAll().associate { row -> row[AircraftTable.id] to row[AircraftTable.totalSeats] }

            // Only query direct flights if there are matching direct schedules
            val directFlights =
                if (schedulesById.isNotEmpty()) {
                    val scheduledFlightsQuery =
                        ScheduledFlightsTable.selectAll()
                            .andWhere { ScheduledFlightsTable.scheduleId inList schedulesById.keys.toList() }

                    if (parsedDate != null) {
                        val startOfDay = parsedDate.atStartOfDay()
                        val nextDay = parsedDate.plusDays(1).atStartOfDay()
                        scheduledFlightsQuery.andWhere { ScheduledFlightsTable.departureTime greaterEq startOfDay }
                        scheduledFlightsQuery.andWhere { ScheduledFlightsTable.departureTime less nextDay }
                    }

                    scheduledFlightsQuery.mapNotNull { row ->
                        val schedule = schedulesById[row[ScheduledFlightsTable.scheduleId]] ?: return@mapNotNull null
                        val departureAirport = airportsById[schedule[FlightSchedulesTable.departureAirportId]] ?: return@mapNotNull null
                        val arrivalAirport = airportsById[schedule[FlightSchedulesTable.arrivalAirportId]] ?: return@mapNotNull null
                        buildFlightResponse(
                            row = row,
                            schedule = schedule,
                            departureCode = departureAirport[AirportsTable.code].uppercase(),
                            arrivalCode = arrivalAirport[AirportsTable.code].uppercase(),
                            totalSeats = aircraftSeatMap[row[ScheduledFlightsTable.aircraftId]] ?: 189,
                        )
                    }
                } else {
                    emptyList()
                }

            val directDates = directFlights.map { it.departureDate }.toSet()

            // Always attempt connecting flights (covers routes with zero direct service)
            val connectingFlights =
                if (departureAirportId != null && arrivalAirportId != null) {
                    findConnectingFlights(departureAirportId, arrivalAirportId, parsedDate, airportsById, aircraftSeatMap)
                        .filter { it.departureDate !in directDates }
                } else {
                    emptyList()
                }

            (directFlights + connectingFlights)
                .sortedWith(compareBy<FlightResponse> { it.departureDate }.thenBy { it.departureTime }.thenBy { it.flightNumber })
        }

    private fun findConnectingFlights(
        departureAirportId: Int,
        arrivalAirportId: Int,
        parsedDate: LocalDate?,
        airportsById: Map<Int, ResultRow>,
        aircraftSeatMap: Map<Int, Int>,
    ): List<FlightResponse> {
        val startOfDay = parsedDate?.atStartOfDay()
        val endOfWindow = parsedDate?.plusDays(2)?.atStartOfDay()

        val firstLegSchedules =
            FlightSchedulesTable.selectAll()
                .andWhere { FlightSchedulesTable.departureAirportId eq departureAirportId }
                .toList()
        val secondLegSchedules =
            FlightSchedulesTable.selectAll()
                .andWhere { FlightSchedulesTable.arrivalAirportId eq arrivalAirportId }
                .toList()
        val relevantSchedules =
            (firstLegSchedules + secondLegSchedules)
                .distinctBy { it[FlightSchedulesTable.id] }
        val schedulesById = relevantSchedules.associateBy { it[FlightSchedulesTable.id] }
        if (schedulesById.isEmpty()) return emptyList()

        val validFlightsQuery =
            ScheduledFlightsTable.selectAll()
                .andWhere { ScheduledFlightsTable.scheduleId inList schedulesById.keys.toList() }

        if (startOfDay != null && endOfWindow != null) {
            validFlightsQuery.andWhere { ScheduledFlightsTable.departureTime greaterEq startOfDay }
            validFlightsQuery.andWhere { ScheduledFlightsTable.departureTime less endOfWindow }
        }

        val validFlights = validFlightsQuery.toList()

        val firstLegs =
            validFlights.filter { flightRow ->
                schedulesById[flightRow[ScheduledFlightsTable.scheduleId]]?.get(FlightSchedulesTable.departureAirportId) == departureAirportId
            }

        val secondLegs =
            validFlights.filter { flightRow ->
                schedulesById[flightRow[ScheduledFlightsTable.scheduleId]]?.get(FlightSchedulesTable.arrivalAirportId) == arrivalAirportId
            }

        val secondLegsByDep =
            secondLegs.groupBy { flightRow ->
                schedulesById[flightRow[ScheduledFlightsTable.scheduleId]]!![FlightSchedulesTable.departureAirportId]
            }
        val connectingFlights = mutableListOf<FlightResponse>()

        val depCode = airportsById[departureAirportId]!![AirportsTable.code].uppercase()
        val arrCode = airportsById[arrivalAirportId]!![AirportsTable.code].uppercase()

        for (leg1 in firstLegs) {
            val sched1 = schedulesById[leg1[ScheduledFlightsTable.scheduleId]]!!
            val arrAirport1 = sched1[FlightSchedulesTable.arrivalAirportId]

            val matchingSecondLegs = secondLegsByDep[arrAirport1] ?: continue

            val leg1Seats = aircraftSeatMap[leg1[ScheduledFlightsTable.aircraftId]] ?: 189
            val leg1Available = leg1[ScheduledFlightsTable.availableSeats] ?: leg1Seats
            if (leg1Available <= 0) continue

            val p1 = calculateDynamicPrice(leg1[ScheduledFlightsTable.basePrice].toDouble(), leg1[ScheduledFlightsTable.departureTime], leg1Available, leg1Seats)
            val arrivalTime1 = leg1[ScheduledFlightsTable.arrivalTime]
            val midCode = airportsById[arrAirport1]!![AirportsTable.code].uppercase()

            for (leg2 in matchingSecondLegs) {
                val sched2 = schedulesById[leg2[ScheduledFlightsTable.scheduleId]]!!
                val departureTime2 = leg2[ScheduledFlightsTable.departureTime]

                val layoverMinutes = Duration.between(arrivalTime1, departureTime2).toMinutes()
                if (layoverMinutes in 60..720) {
                    if (parsedDate == null || leg1[ScheduledFlightsTable.departureTime].toLocalDate() == parsedDate) {
                        val leg2Seats = aircraftSeatMap[leg2[ScheduledFlightsTable.aircraftId]] ?: 189
                        val leg2Available = leg2[ScheduledFlightsTable.availableSeats] ?: leg2Seats

                        if (leg2Available > 0) {
                            val p2 = calculateDynamicPrice(leg2[ScheduledFlightsTable.basePrice].toDouble(), leg2[ScheduledFlightsTable.departureTime], leg2Available, leg2Seats)
                            val layoverStr = "${layoverMinutes / 60}h ${layoverMinutes % 60}m"

                            connectingFlights.add(
                                FlightResponse(
                                    id = "${leg1[ScheduledFlightsTable.id]},${leg2[ScheduledFlightsTable.id]}",
                                    flightNumber = "${sched1[FlightSchedulesTable.flightNumber]} (${leg1[ScheduledFlightsTable.departureTime].toLocalTime()}-${leg1[ScheduledFlightsTable.arrivalTime].toLocalTime()}) ✈ $midCode ($layoverStr) ✈ ${sched2[FlightSchedulesTable.flightNumber]} (${leg2[ScheduledFlightsTable.departureTime].toLocalTime()}-${leg2[ScheduledFlightsTable.arrivalTime].toLocalTime()})",
                                    airline = "Multiple Airlines",
                                    from = depCode,
                                    to = arrCode,
                                    departureTime = leg1[ScheduledFlightsTable.departureTime].toLocalTime().toString(),
                                    arrivalTime = leg2[ScheduledFlightsTable.arrivalTime].toLocalTime().toString(),
                                    departureDate = leg1[ScheduledFlightsTable.departureTime].toLocalDate().toString(),
                                    duration = formatDuration(leg1[ScheduledFlightsTable.departureTime], leg2[ScheduledFlightsTable.arrivalTime]),
                                    stops = 1,
                                    price = (p1 + p2).roundToInt(),
                                    availableSeats = minOf(leg1Available, leg2Available),
                                    tabIndex = 0,
                                    ariaLabel = "Flight from $depCode to $arrCode with 1 stop in $midCode, Price ${(p1 + p2).roundToInt()} pounds",
                                ),
                            )
                        }
                    }
                }
            }
        }
        return connectingFlights
    }

    private fun buildFlightResponse(
        row: ResultRow,
        schedule: ResultRow,
        departureCode: String,
        arrivalCode: String,
        totalSeats: Int,
    ): FlightResponse {
        val departureDateTime = row[ScheduledFlightsTable.departureTime]
        val arrivalDateTime = row[ScheduledFlightsTable.arrivalTime]
        val availableSeats = row[ScheduledFlightsTable.availableSeats] ?: totalSeats
        val dynamicPrice =
            calculateDynamicPrice(
                basePrice = row[ScheduledFlightsTable.basePrice].toDouble(),
                departureDateTime = departureDateTime,
                availableSeats = availableSeats,
                totalSeats = totalSeats,
            )

        return FlightResponse(
            id = row[ScheduledFlightsTable.id].toString(),
            flightNumber = schedule[FlightSchedulesTable.flightNumber],
            airline = schedule[FlightSchedulesTable.airline].ifBlank { "Demo Air" },
            from = departureCode,
            to = arrivalCode,
            departureTime = departureDateTime.toLocalTime().toString(),
            arrivalTime = arrivalDateTime.toLocalTime().toString(),
            departureDate = departureDateTime.toLocalDate().toString(),
            duration = formatDuration(departureDateTime, arrivalDateTime),
            stops = schedule[FlightSchedulesTable.stops],
            price = dynamicPrice.roundToInt(),
            availableSeats = availableSeats,
            tabIndex = 0,
            ariaLabel = "Direct flight from $departureCode to $arrivalCode, Price ${dynamicPrice.roundToInt()} pounds",
        )
    }

    private fun calculateDynamicPrice(
        basePrice: Double,
        departureDateTime: LocalDateTime,
        availableSeats: Int,
        totalSeats: Int,
    ): Double {
        val now = LocalDateTime.now()
        val hoursUntilDeparture = Duration.between(now, departureDateTime).toHours().coerceAtLeast(0)
        val daysUntilDeparture = hoursUntilDeparture / 24.0
        val seatsRatio = if (totalSeats <= 0) 1.0 else availableSeats.toDouble() / totalSeats.toDouble()

        val timeMultiplier =
            when {
                daysUntilDeparture > 60 -> 0.95
                daysUntilDeparture > 30 -> 1.0
                daysUntilDeparture > 14 -> 1.1
                daysUntilDeparture > 7 -> 1.2
                daysUntilDeparture > 3 -> 1.35
                daysUntilDeparture >= 1 -> 1.55
                else -> 1.8
            }

        val scarcityMultiplier =
            when {
                seatsRatio <= 0.10 -> 1.35
                seatsRatio <= 0.20 -> 1.20
                seatsRatio <= 0.35 -> 1.10
                else -> 1.0
            }

        val weekendMultiplier =
            when (departureDateTime.dayOfWeek) {
                java.time.DayOfWeek.FRIDAY,
                java.time.DayOfWeek.SATURDAY,
                java.time.DayOfWeek.SUNDAY,
                -> 1.05
                else -> 1.0
            }

        // Pseudo-random fluctuation based on the date and base price so it's consistent per flight/date
        val seed = departureDateTime.toLocalDate().toEpochDay() + basePrice.toLong()
        val random = java.util.Random(seed)
        // Fluctuate between 0.92 and 1.08 (-8% to +8%) to make daily prices look natural
        val dailyFluctuationMultiplier = 0.92 + (0.16 * random.nextDouble())

        return basePrice * timeMultiplier * scarcityMultiplier * weekendMultiplier * dailyFluctuationMultiplier
    }

    private fun formatDuration(
        departureDateTime: java.time.LocalDateTime,
        arrivalDateTime: java.time.LocalDateTime,
    ): String {
        val minutes = Duration.between(departureDateTime, arrivalDateTime).toMinutes().coerceAtLeast(0)
        val hours = minutes / 60
        val remainingMinutes = minutes % 60
        return "${hours}h ${remainingMinutes}m"
    }
}
