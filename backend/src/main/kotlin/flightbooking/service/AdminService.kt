package flightbooking.service

import flightbooking.db.table.BookingsTable
import flightbooking.db.table.ComplaintsTable
import flightbooking.db.table.LoyaltyAccountsTable
import flightbooking.db.table.ModificationRequestsTable
import flightbooking.db.table.UsersTable
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonIgnoreUnknownKeys
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.sql.update
import java.nio.charset.StandardCharsets
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.Base64

object AdminService {
    private const val adminCacheTtlMs = 30 * 1000L
    private val json =
        Json {
            ignoreUnknownKeys = true
        }

    @Volatile
    private var cachedAdminBookings: Pair<Long, List<BookingService.Booking>>? = null

    @Volatile
    private var cachedReports: Pair<Long, AdminReports>? = null

    @Volatile
    private var cachedComplaints: Pair<Long, List<AdminComplaint>>? = null

    private const val adminTokenPrefix = "leedsair-admin"

    @OptIn(ExperimentalSerializationApi::class)
    @Serializable
    @JsonIgnoreUnknownKeys
    data class AdminLoginRequest(
        val username: String = "",
        val password: String = "",
    )

    @Serializable
    data class AdminLoginResponse(
        val token: String,
    )

    @Serializable
    data class AdminMetrics(
        val totalBookings: Int,
        val cancellations: Int,
        val totalRevenue: Double,
        val popularRoute: String,
        val activeUsers: Int,
        val cancellationRate: Double,
    )

    @Serializable
    data class ReportCount(
        val route: String,
        val count: Int,
    )

    @Serializable
    data class ReportBreakdown(
        val label: String,
        val count: Int,
    )

    @Serializable
    data class ReportRevenue(
        val route: String,
        val revenue: Double,
    )

    @Serializable
    data class MonthlyRevenue(
        val month: String,
        val revenue: Double,
    )

    @Serializable
    data class BookingFlightCount(
        val flightNumber: String,
        val count: Int,
    )

    @Serializable
    data class AdminReports(
        val cancellationRate: Double,
        val peakBookingHour: String,
        val bookingsPerFlight: List<BookingFlightCount>,
        val popularRoutes: List<ReportCount>,
        val revenuePerRoute: List<ReportRevenue>,
        val bookingsByStatus: List<ReportBreakdown>,
        val cancellationReasons: List<ReportBreakdown>,
        val loyaltyMix: List<ReportBreakdown>,
        val monthlyRevenue: List<MonthlyRevenue>,
    )

    @OptIn(ExperimentalSerializationApi::class)
    @Serializable
    @JsonIgnoreUnknownKeys
    data class ModificationDecisionRequest(
        val decision: String = "",
        val note: String = "",
    )

    @Serializable
    data class AdminComplaint(
        val id: Int,
        val bookingReference: String? = null,
        val customerName: String,
        val customerEmail: String? = null,
        val subject: String? = null,
        val message: String? = null,
        val status: String,
        val createdAt: String,
    )

    fun login(requestBody: String): AdminLoginResponse {
        val request = json.decodeFromString<AdminLoginRequest>(requestBody)
        val expectedUsername = System.getenv("ADMIN_USERNAME") ?: "admin"
        val expectedPassword = System.getenv("ADMIN_PASSWORD") ?: "admin12345"

        if (request.username.trim() != expectedUsername || request.password != expectedPassword) {
            throw IllegalArgumentException("Invalid admin credentials")
        }

        return AdminLoginResponse(token = createAdminToken(request.username.trim()))
    }

    fun requireAdmin(authorizationHeader: String?) {
        val token =
            extractBearerToken(authorizationHeader)
                ?: throw IllegalArgumentException("Missing or invalid Authorization header")
        if (!isValidAdminToken(token)) {
            throw IllegalArgumentException("Invalid admin token")
        }
    }

    fun getBookings(authorizationHeader: String?): List<BookingService.Booking> {
        requireAdmin(authorizationHeader)
        return loadAdminBookings()
    }

    fun getMetrics(authorizationHeader: String?): AdminMetrics {
        requireAdmin(authorizationHeader)
        val bookings = loadAdminBookings()

        val cancellations = bookings.count { it.status == "Cancelled" }
        val totalRevenue = bookings.filterNot { it.status == "Cancelled" }.sumOf { it.totalPrice }
        val routeCounts = bookings.groupingBy { "${it.flight?.from ?: it.from} -> ${it.flight?.to ?: it.to}" }.eachCount()
        val popularRoute = routeCounts.maxByOrNull { it.value }?.key ?: "-"
        val activeUsers = bookings.map { it.userId }.distinct().size
        val cancellationRate = if (bookings.isEmpty()) 0.0 else (cancellations.toDouble() / bookings.size.toDouble()) * 100.0

        return AdminMetrics(
            totalBookings = bookings.size,
            cancellations = cancellations,
            totalRevenue = round2(totalRevenue),
            popularRoute = popularRoute,
            activeUsers = activeUsers,
            cancellationRate = round2(cancellationRate),
        )
    }

    fun getReports(authorizationHeader: String?): AdminReports {
        requireAdmin(authorizationHeader)
        val now = System.currentTimeMillis()
        cachedReports?.takeIf { now - it.first < adminCacheTtlMs }?.let { return it.second }
        val bookings = loadAdminBookings()
        val loyaltyUserIds =
            transaction {
                LoyaltyAccountsTable.selectAll().map { it[LoyaltyAccountsTable.userId] }.toSet()
            }

        var cancellations = 0
        var loyaltyMembers = 0
        var nonMembers = 0
        val bookingsPerFlightCounts = linkedMapOf<String, Int>()
        val popularRouteCounts = linkedMapOf<String, Int>()
        val revenuePerRouteTotals = linkedMapOf<String, Double>()
        val bookingsByStatusCounts = linkedMapOf<String, Int>()
        val cancellationReasonCounts = linkedMapOf<String, Int>()
        val monthlyRevenueTotals = linkedMapOf<String, Double>()
        val peakBookingHourCounts = linkedMapOf<String, Int>()

        bookings.forEach { booking ->
            val status = booking.status.ifBlank { "Unknown" }
            val route = "${booking.flight?.from ?: booking.from} -> ${booking.flight?.to ?: booking.to}"
            val flightNumber = booking.flight?.flightNumber ?: "-"
            val bookingHour = booking.createdAt.substringAfter("T", "00:00").take(2) + ":00"

            bookingsPerFlightCounts[flightNumber] = (bookingsPerFlightCounts[flightNumber] ?: 0) + 1
            popularRouteCounts[route] = (popularRouteCounts[route] ?: 0) + 1
            bookingsByStatusCounts[status] = (bookingsByStatusCounts[status] ?: 0) + 1
            peakBookingHourCounts[bookingHour] = (peakBookingHourCounts[bookingHour] ?: 0) + 1

            if (booking.userId in loyaltyUserIds) {
                loyaltyMembers += 1
            } else {
                nonMembers += 1
            }

            if (status == "Cancelled") {
                cancellations += 1
                val reason = booking.cancellationReason?.takeIf(String::isNotBlank) ?: "No reason recorded"
                cancellationReasonCounts[reason] = (cancellationReasonCounts[reason] ?: 0) + 1
            } else {
                revenuePerRouteTotals[route] = (revenuePerRouteTotals[route] ?: 0.0) + booking.totalPrice
                val month =
                    runCatching {
                        LocalDateTime.parse(booking.createdAt).format(DateTimeFormatter.ofPattern("MMM yyyy"))
                    }.getOrDefault(booking.createdAt.take(7))
                monthlyRevenueTotals[month] = (monthlyRevenueTotals[month] ?: 0.0) + booking.totalPrice
            }
        }

        val cancellationRate =
            if (bookings.isEmpty()) {
                0.0
            } else {
                cancellations.toDouble() / bookings.size.toDouble() * 100.0
            }

        val bookingsPerFlight =
            bookingsPerFlightCounts.entries
                .sortedByDescending { it.value }
                .take(10)
                .map { BookingFlightCount(flightNumber = it.key, count = it.value) }

        val popularRoutes =
            popularRouteCounts.entries
                .sortedByDescending { it.value }
                .take(10)
                .map { ReportCount(route = it.key, count = it.value) }

        val revenuePerRoute =
            revenuePerRouteTotals.entries
                .sortedByDescending { it.value }
                .take(10)
                .map { ReportRevenue(route = it.key, revenue = round2(it.value)) }

        val bookingsByStatus =
            bookingsByStatusCounts.entries
                .sortedByDescending { it.value }
                .map { ReportBreakdown(label = it.key, count = it.value) }

        val cancellationReasons =
            cancellationReasonCounts.entries
                .sortedByDescending { it.value }
                .take(8)
                .map { ReportBreakdown(label = it.key, count = it.value) }

        val loyaltyMix =
            listOf(
                ReportBreakdown(label = "Loyalty Members", count = loyaltyMembers),
                ReportBreakdown(label = "Non-members", count = nonMembers),
            )

        val monthlyRevenue =
            monthlyRevenueTotals.entries
                .sortedBy { it.key.takeLast(4) + it.key.take(3) }
                .takeLast(6)
                .map { MonthlyRevenue(month = it.key, revenue = round2(it.value)) }

        val peakBookingHour =
            peakBookingHourCounts.maxByOrNull { it.value }?.key ?: "-"

        val reports =
            AdminReports(
                cancellationRate = round2(cancellationRate),
                peakBookingHour = peakBookingHour,
                bookingsPerFlight = bookingsPerFlight,
                popularRoutes = popularRoutes,
                revenuePerRoute = revenuePerRoute,
                bookingsByStatus = bookingsByStatus,
                cancellationReasons = cancellationReasons,
                loyaltyMix = loyaltyMix,
                monthlyRevenue = monthlyRevenue,
            )
        cachedReports = now to reports
        return reports
    }

    fun getComplaints(authorizationHeader: String?): List<AdminComplaint> {
        requireAdmin(authorizationHeader)
        val now = System.currentTimeMillis()
        cachedComplaints?.takeIf { now - it.first < adminCacheTtlMs }?.let { return it.second }

        val complaints =
            transaction {
                val usersById = UsersTable.selectAll().associateBy { it[UsersTable.id] }
                val bookingsById = BookingsTable.selectAll().associateBy { it[BookingsTable.id] }

                ComplaintsTable.selectAll()
                    .sortedByDescending { it[ComplaintsTable.createdAt] }
                    .map { row ->
                        val user = usersById[row[ComplaintsTable.userId]]
                        val bookingReference =
                            row[ComplaintsTable.bookingId]?.let { bookingId ->
                                bookingsById[bookingId]?.get(BookingsTable.bookingReference)
                            }
                        val customerName =
                            listOfNotNull(
                                user?.get(UsersTable.firstName)?.takeIf { it.isNotBlank() },
                                user?.get(UsersTable.lastName)?.takeIf { it.isNotBlank() },
                            ).joinToString(" ").ifBlank { "Guest customer" }

                        AdminComplaint(
                            id = row[ComplaintsTable.id],
                            bookingReference = bookingReference,
                            customerName = customerName,
                            customerEmail = user?.get(UsersTable.email),
                            subject = row[ComplaintsTable.subject],
                            message = row[ComplaintsTable.message],
                            status = row[ComplaintsTable.status].replaceFirstChar { it.uppercase() },
                            createdAt = row[ComplaintsTable.createdAt].toString(),
                        )
                    }
            }
        cachedComplaints = now to complaints
        return complaints
    }

    fun resolveModificationRequest(
        authorizationHeader: String?,
        requestId: Int,
        requestBody: String,
    ): BookingService.Booking {
        requireAdmin(authorizationHeader)
        val request = json.decodeFromString<ModificationDecisionRequest>(requestBody)
        val decision = request.decision.trim().lowercase()
        if (decision != "approved" && decision != "rejected") {
            throw IllegalArgumentException("Decision must be either approved or rejected")
        }

        val resolved =
            transaction {
                val requestRow =
                    ModificationRequestsTable.selectAll()
                        .firstOrNull { it[ModificationRequestsTable.id] == requestId }
                        ?: throw IllegalArgumentException("Modification request not found")

                val currentStatus = requestRow[ModificationRequestsTable.status].lowercase()
                if (currentStatus != "pending") {
                    throw IllegalArgumentException("Only pending requests can be updated")
                }

                val existingDescription = requestRow[ModificationRequestsTable.description].orEmpty().trim()
                val adminNote = request.note.trim()
                val resolvedDescription =
                    buildString {
                        if (existingDescription.isNotBlank()) {
                            append(existingDescription)
                        }
                        if (adminNote.isNotBlank()) {
                            if (isNotEmpty()) append("\n\n")
                            append("Admin note: ")
                            append(adminNote)
                        }
                    }.ifBlank { null }

                ModificationRequestsTable.update({ ModificationRequestsTable.id eq requestId }) { row ->
                    row[status] = decision
                    row[description] = resolvedDescription
                }

                Triple(
                    requestRow[ModificationRequestsTable.bookingId],
                    requestRow[ModificationRequestsTable.requestType],
                    resolvedDescription,
                )
            }
        val bookingId = resolved.first
        val requestType = resolved.second
        val description = resolved.third

        if (decision == "approved") {
            BookingService.applyApprovedRequest(
                bookingId = bookingId,
                requestType = requestType,
                description = description,
            )
        }

        cachedAdminBookings = null
        cachedReports = null
        cachedComplaints = null

        return loadAdminBookings()
            .firstOrNull { it.id == bookingId }
            ?: throw IllegalStateException("Updated booking could not be loaded")
    }

    private fun loadAdminBookings(): List<BookingService.Booking> {
        val now = System.currentTimeMillis()
        cachedAdminBookings?.takeIf { now - it.first < adminCacheTtlMs }?.let { return it.second }
        val bookings = BookingService.getAllBookingsForAdmin()
        cachedAdminBookings = now to bookings
        return bookings
    }

    private fun createAdminToken(username: String): String {
        val payload = "$adminTokenPrefix:$username"
        return Base64.getUrlEncoder().withoutPadding()
            .encodeToString(payload.toByteArray(StandardCharsets.UTF_8))
    }

    private fun isValidAdminToken(token: String): Boolean {
        val decoded =
            runCatching {
                String(Base64.getUrlDecoder().decode(token), StandardCharsets.UTF_8)
            }.getOrNull() ?: return false

        return decoded.startsWith("$adminTokenPrefix:")
    }

    private fun extractBearerToken(authorizationHeader: String?): String? {
        if (authorizationHeader.isNullOrBlank()) return null
        val prefix = "Bearer "
        if (!authorizationHeader.startsWith(prefix, ignoreCase = true)) return null
        return authorizationHeader.substring(prefix.length).trim().takeIf { it.isNotBlank() }
    }

    private fun round2(value: Double): Double = kotlin.math.round(value * 100.0) / 100.0
}
