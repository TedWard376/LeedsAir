package flightbooking.service

import flightbooking.db.table.AircraftTable
import flightbooking.db.table.AirportsTable
import flightbooking.db.table.BookingFlightsTable
import flightbooking.db.table.BookingsTable
import flightbooking.db.table.FlightSchedulesTable
import flightbooking.db.table.ModificationRequestsTable
import flightbooking.db.table.PassengersTable
import flightbooking.db.table.PaymentsTable
import flightbooking.db.table.ScheduledFlightsTable
import flightbooking.db.table.SeatsTable
import flightbooking.db.table.UsersTable
import org.apache.commons.csv.CSVFormat
import org.apache.commons.csv.CSVParser
import org.jetbrains.exposed.sql.SortOrder
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.sql.update
import org.mindrot.jbcrypt.BCrypt
import java.io.InputStreamReader
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.DayOfWeek
import java.time.Duration
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.util.UUID
import kotlin.math.ceil

object SeedDataService {

    private const val AIRPORTS_CSV_PATH = "data/airports.csv"
    private const val scheduledFlightHorizonDays = 90
    private val scheduleTimeFormatter: DateTimeFormatter = DateTimeFormatter.ofPattern("H:mm")

    fun isSeedRequired(): Boolean = transaction {
        val hasSchedules = FlightSchedulesTable.selectAll().limit(1).any()
        val hasScheduledFlights = ScheduledFlightsTable.selectAll().limit(1).any()
        !hasSchedules || !hasScheduledFlights
    }

    fun seedAll() {
        val schedules = FlightScheduleLoader.loadFromCsv()
        println("SeedDataService: seeding ${schedules.size} flight schedules from CSV")
        seedAirports(schedules)
        seedFlightSchedules(schedules)
        seedScheduledFlights()
        seedDemoData()
        println("SeedDataService: seed complete")
    }

    fun seedDemoData() {
        seedDemoAdminBookings()
        seedVisibleDemoCustomerBookings()
    }

    private fun seedDemoAdminBookings() {
        transaction {
            val flights = ScheduledFlightsTable.selectAll()
                .sortedBy { it[ScheduledFlightsTable.departureTime] }
                .take(16)
            if (flights.size < 3) return@transaction

            val demoUsers = listOf(
                DemoBookingSeed("Maya", "Patel", "maya.patel@demo.leedsair.local", "confirmed", 184.50, emptyList(), null),
                DemoBookingSeed("Oliver", "Grant", "oliver.grant@demo.leedsair.local", "checked_in", 326.00, emptyList(), null),
                DemoBookingSeed("Sophie", "Walker", "sophie.walker@demo.leedsair.local", "cancelled", 142.99, emptyList(), "Family emergency before departure."),
                DemoBookingSeed("Daniel", "Morgan", "daniel.morgan@demo.leedsair.local", "confirmed", 268.40, listOf("seat_change"), null),
                DemoBookingSeed("Aisha", "Rahman", "aisha.rahman@demo.leedsair.local", "confirmed", 512.75, listOf("date_change"), null),
                DemoBookingSeed("Lucas", "Bennett", "lucas.bennett@demo.leedsair.local", "confirmed", 221.10, listOf("bag_addition"), null),
                DemoBookingSeed("Emily", "Foster", "emily.foster@demo.leedsair.local", "checked_in", 305.65, emptyList(), null),
                DemoBookingSeed("Noah", "Hughes", "noah.hughes@demo.leedsair.local", "confirmed", 410.20, listOf("meal_change"), null),
                DemoBookingSeed("Grace", "Murphy", "grace.murphy@demo.leedsair.local", "cancelled", 167.35, emptyList(), "Unable to travel due to illness."),
                DemoBookingSeed("Ethan", "Cole", "ethan.cole@demo.leedsair.local", "confirmed", 289.90, listOf("date_change"), null),
                DemoBookingSeed("Zara", "Khan", "zara.khan@demo.leedsair.local", "checked_in", 348.55, emptyList(), null),
                DemoBookingSeed("Leo", "Turner", "leo.turner@demo.leedsair.local", "confirmed", 198.75, listOf("seat_change", "special_assistance"), null),
            )

            demoUsers.forEachIndexed { index, seed ->
                val userId = UsersTable.selectAll()
                    .firstOrNull { it[UsersTable.email].equals(seed.email, ignoreCase = true) }
                    ?.get(UsersTable.id)
                    ?: UsersTable.insert { row ->
                        row[firstName] = seed.firstName
                        row[lastName] = seed.lastName
                        row[email] = seed.email
                        row[passwordHash] = null
                        row[role] = "customer"
                        row[createdAt] = LocalDateTime.now().minusDays((index + 10).toLong())
                    }[UsersTable.id]

                val bookingReference = "ADMDEMO${1000 + index}"
                val existingBooking = BookingsTable.selectAll()
                    .firstOrNull { it[BookingsTable.bookingReference] == bookingReference }
                if (existingBooking != null) return@forEachIndexed

                val flight = flights[index % flights.size]
                val bookingTime = flight[ScheduledFlightsTable.departureTime].minusDays((index + 2).toLong())
                val bookingId = BookingsTable.insert { row ->
                    row[BookingsTable.userId] = userId
                    row[BookingsTable.bookingReference] = bookingReference
                    row[totalPrice] = BigDecimal.valueOf(seed.totalPrice).setScale(2, RoundingMode.HALF_UP)
                    row[status] = seed.status
                    row[createdAt] = bookingTime
                }[BookingsTable.id]

                PassengersTable.insert { row ->
                    row[PassengersTable.bookingId] = bookingId
                    row[firstName] = seed.firstName
                    row[lastName] = seed.lastName
                    row[email] = seed.email
                }

                BookingFlightsTable.insert { row ->
                    row[BookingFlightsTable.bookingId] = bookingId
                    row[flightId] = flight[ScheduledFlightsTable.id]
                }

                PaymentsTable.insert { row ->
                    row[PaymentsTable.bookingId] = bookingId
                    row[amount] = BigDecimal.valueOf(seed.totalPrice).setScale(2, RoundingMode.HALF_UP)
                    row[paymentMethod] = "dummy_card"
                    row[paymentStatus] = if (seed.status == "cancelled") "refunded" else "paid"
                    row[provider] = "dummy_gateway"
                    row[providerPaymentMethodId] = "pm_demo_${UUID.randomUUID().toString().replace("-", "").take(14)}"
                    row[cardholderName] = "${seed.firstName} ${seed.lastName}"
                    row[cardBrand] = if (index % 2 == 0) "Visa" else "Mastercard"
                    row[cardLast4] = "${2400 + index}".takeLast(4)
                    row[expiryMonth] = 10 + (index % 2)
                    row[expiryYear] = 2028 + (index % 2)
                    row[billingPostalCode] = "LS${index + 1} 4AB"
                    row[isDummy] = true
                    row[transactionReference] = "txn_demo_${UUID.randomUUID().toString().replace("-", "").take(16)}"
                    row[paymentDate] = bookingTime.plusMinutes(8)
                }

                seed.requestTypes.forEach { requestType ->
                    ModificationRequestsTable.insert { row ->
                        row[ModificationRequestsTable.bookingId] = bookingId
                        row[ModificationRequestsTable.requestType] = requestType
                        row[description] = when (requestType) {
                            "seat_change" -> "Requested aisle seat closer to the front."
                            "date_change" -> "Asked to move outbound flight to the next day."
                            "meal_change" -> "Requested a vegetarian meal for both segments."
                            "bag_addition" -> "Needs one extra 20kg checked bag for a longer stay."
                            "special_assistance" -> "Requested wheelchair support at departure and arrival."
                            else -> "Customer requested an itinerary update."
                        }
                        row[status] = "pending"
                        row[createdAt] = bookingTime.plusDays(1)
                        row[processedBy] = null
                    }
                }

                if (seed.cancellationReason != null) {
                    ModificationRequestsTable.insert { row ->
                        row[ModificationRequestsTable.bookingId] = bookingId
                        row[ModificationRequestsTable.requestType] = "cancellation"
                        row[description] = seed.cancellationReason
                        row[status] = "completed"
                        row[createdAt] = bookingTime.plusHours(6)
                        row[processedBy] = null
                    }
                }
            }
        }
    }

    private fun seedVisibleDemoCustomerBookings() {
        transaction {
            val flights = ScheduledFlightsTable.selectAll()
                .sortedBy { it[ScheduledFlightsTable.departureTime] }
                .take(12)
            if (flights.size < 3) return@transaction

            val demoEmail = "demo.customer@leedsair.local"
            val demoPassword = "demo12345"
            val existingUser = UsersTable.selectAll()
                .firstOrNull { it[UsersTable.email].equals(demoEmail, ignoreCase = true) }
            val userId = existingUser?.get(UsersTable.id)
                ?: UsersTable.insert { row ->
                    row[firstName] = "Jamie"
                    row[lastName] = "Carter"
                    row[email] = demoEmail
                    row[passwordHash] = BCrypt.hashpw(demoPassword, BCrypt.gensalt())
                    row[role] = "customer"
                    row[createdAt] = LocalDateTime.now().minusDays(30)
                }[UsersTable.id]
            val hashedDemoPassword = BCrypt.hashpw(demoPassword, BCrypt.gensalt())

            UsersTable.update({ UsersTable.id eq userId }) { row ->
                row[firstName] = "Jamie"
                row[lastName] = "Carter"
                row[email] = demoEmail
                row[passwordHash] = hashedDemoPassword
                row[role] = "customer"
            }

            val visibleBookings = listOf(
                VisibleDemoBookingSeed("Jamie", "Carter", "confirmed", 196.80, 0, null),
                VisibleDemoBookingSeed("Jamie", "Carter", "checked_in", 248.40, 1, null),
                VisibleDemoBookingSeed("Jamie", "Carter", "cancelled", 133.25, 2, "Change of plans after a meeting was moved."),
                VisibleDemoBookingSeed("Jamie", "Carter", "confirmed", 421.30, 3, null),
                VisibleDemoBookingSeed("Jamie", "Carter", "confirmed", 158.90, 4, null),
                VisibleDemoBookingSeed("Jamie", "Carter", "checked_in", 287.45, 5, null),
            )

            visibleBookings.forEachIndexed { index, seed ->
                val bookingReference = "BOOKDEMO${2000 + index}"
                val existingBooking = BookingsTable.selectAll()
                    .firstOrNull { it[BookingsTable.bookingReference] == bookingReference }
                if (existingBooking != null) return@forEachIndexed

                val flight = flights[(seed.flightOffset + index) % flights.size]
                val bookingTime = flight[ScheduledFlightsTable.departureTime].minusDays((index + 3).toLong())
                val bookingId = BookingsTable.insert { row ->
                    row[BookingsTable.userId] = userId
                    row[BookingsTable.bookingReference] = bookingReference
                    row[totalPrice] = BigDecimal.valueOf(seed.totalPrice).setScale(2, RoundingMode.HALF_UP)
                    row[status] = seed.status
                    row[createdAt] = bookingTime
                }[BookingsTable.id]

                PassengersTable.insert { row ->
                    row[PassengersTable.bookingId] = bookingId
                    row[firstName] = seed.firstName
                    row[lastName] = seed.lastName
                    row[email] = demoEmail
                }

                BookingFlightsTable.insert { row ->
                    row[BookingFlightsTable.bookingId] = bookingId
                    row[flightId] = flight[ScheduledFlightsTable.id]
                }

                PaymentsTable.insert { row ->
                    row[PaymentsTable.bookingId] = bookingId
                    row[amount] = BigDecimal.valueOf(seed.totalPrice).setScale(2, RoundingMode.HALF_UP)
                    row[paymentMethod] = "dummy_card"
                    row[paymentStatus] = if (seed.status == "cancelled") "refunded" else "paid"
                    row[provider] = "dummy_gateway"
                    row[providerPaymentMethodId] = "pm_demo_visible_${UUID.randomUUID().toString().replace("-", "").take(10)}"
                    row[cardholderName] = "${seed.firstName} ${seed.lastName}"
                    row[cardBrand] = "Visa"
                    row[cardLast4] = "${4810 + index}".takeLast(4)
                    row[expiryMonth] = 11
                    row[expiryYear] = 2029
                    row[billingPostalCode] = "LS1 4PL"
                    row[isDummy] = true
                    row[transactionReference] = "txn_visible_${UUID.randomUUID().toString().replace("-", "").take(14)}"
                    row[paymentDate] = bookingTime.plusMinutes(12)
                }

                if (seed.cancellationReason != null) {
                    ModificationRequestsTable.insert { row ->
                        row[ModificationRequestsTable.bookingId] = bookingId
                        row[ModificationRequestsTable.requestType] = "cancellation"
                        row[description] = seed.cancellationReason
                        row[status] = "completed"
                        row[createdAt] = bookingTime.plusHours(3)
                        row[processedBy] = null
                    }
                }
            }
        }
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
            val startDate = LocalDate.now()
            val endDateExclusive = startDate.plusDays(scheduledFlightHorizonDays.toLong())

            val existingFlightsByScheduleAndDeparture = ScheduledFlightsTable
                .selectAll()
                .map { row -> row[ScheduledFlightsTable.scheduleId] to row[ScheduledFlightsTable.departureTime] }
                .toMutableSet()

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

                var departureDate = startDate
                while (departureDate.isBefore(endDateExclusive)) {
                    if (isOperatingOnDate(departureDate, scheduleRow[FlightSchedulesTable.operateDays])) {
                        val departureDateTime = LocalDateTime.of(departureDate, scheduleRow[FlightSchedulesTable.departureTime])
                        val arrivalDateTime = departureDateTime.plusMinutes(scheduleRow[FlightSchedulesTable.durationMinutes].toLong())
                        val flightKey = scheduleId to departureDateTime

                        if (flightKey !in existingFlightsByScheduleAndDeparture) {
                            ScheduledFlightsTable.insert { row ->
                                row[ScheduledFlightsTable.scheduleId] = scheduleId
                                row[ScheduledFlightsTable.departureTime] = departureDateTime
                                row[ScheduledFlightsTable.arrivalTime] = arrivalDateTime
                                row[ScheduledFlightsTable.aircraftId] = aircraftId
                                row[ScheduledFlightsTable.basePrice] = parsePrice(source.price, scheduleRow[FlightSchedulesTable.durationMinutes], source.stops)
                                row[ScheduledFlightsTable.availableSeats] = source.availableSeats ?: totalSeats
                                row[ScheduledFlightsTable.status] = "scheduled"
                            }
                            existingFlightsByScheduleAndDeparture += flightKey
                        }
                    }

                    departureDate = departureDate.plusDays(1)
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

    private fun isOperatingOnDate(date: LocalDate, operateDays: String): Boolean {
        val normalized = normalizedOperateDays(operateDays)
        return normalized[date.dayOfWeek.toOperateDaysIndex()] == '1'
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

    private fun parseTime(value: String): LocalTime {
        val normalized = value.trim().substringBefore(" ").trim()
        return LocalTime.parse(normalized, scheduleTimeFormatter)
    }

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

    private data class DemoBookingSeed(
        val firstName: String,
        val lastName: String,
        val email: String,
        val status: String,
        val totalPrice: Double,
        val requestTypes: List<String>,
        val cancellationReason: String?,
    )

    private data class VisibleDemoBookingSeed(
        val firstName: String,
        val lastName: String,
        val status: String,
        val totalPrice: Double,
        val flightOffset: Int,
        val cancellationReason: String?,
    )
}
