package flightbooking.service

import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonIgnoreUnknownKeys
import java.nio.charset.StandardCharsets
import java.util.Base64

object AdminService {
    private val json = Json {
        ignoreUnknownKeys = true
    }

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
    data class ReportRevenue(
        val route: String,
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
        val token = extractBearerToken(authorizationHeader)
            ?: throw IllegalArgumentException("Missing or invalid Authorization header")
        if (!isValidAdminToken(token)) {
            throw IllegalArgumentException("Invalid admin token")
        }
    }

    fun getBookings(authorizationHeader: String?): List<BookingService.Booking> {
        requireAdmin(authorizationHeader)
        return BookingService.getAllBookingsForAdmin()
    }

    fun getMetrics(authorizationHeader: String?): AdminMetrics {
        requireAdmin(authorizationHeader)
        val bookings = BookingService.getAllBookingsForAdmin()

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
        val bookings = BookingService.getAllBookingsForAdmin()

        val cancellationRate = if (bookings.isEmpty()) 0.0 else {
            bookings.count { it.status == "Cancelled" }.toDouble() / bookings.size.toDouble() * 100.0
        }

        val bookingsPerFlight = bookings.groupingBy { it.flight?.flightNumber ?: "-" }
            .eachCount()
            .entries
            .sortedByDescending { it.value }
            .take(10)
            .map { BookingFlightCount(flightNumber = it.key, count = it.value) }

        val popularRoutes = bookings.groupingBy { "${it.flight?.from ?: it.from} -> ${it.flight?.to ?: it.to}" }
            .eachCount()
            .entries
            .sortedByDescending { it.value }
            .take(10)
            .map { ReportCount(route = it.key, count = it.value) }

        val revenuePerRoute = bookings
            .filterNot { it.status == "Cancelled" }
            .groupBy { "${it.flight?.from ?: it.from} -> ${it.flight?.to ?: it.to}" }
            .map { (route, rows) -> ReportRevenue(route = route, revenue = round2(rows.sumOf { it.totalPrice })) }
            .sortedByDescending { it.revenue }
            .take(10)

        val peakBookingHour = bookings
            .groupingBy {
                it.createdAt.substringAfter("T", "00:00").substring(0, 2) + ":00"
            }
            .eachCount()
            .maxByOrNull { it.value }
            ?.key
            ?: "-"

        return AdminReports(
            cancellationRate = round2(cancellationRate),
            peakBookingHour = peakBookingHour,
            bookingsPerFlight = bookingsPerFlight,
            popularRoutes = popularRoutes,
            revenuePerRoute = revenuePerRoute,
        )
    }

    private fun createAdminToken(username: String): String {
        val payload = "$adminTokenPrefix:$username"
        return Base64.getUrlEncoder().withoutPadding()
            .encodeToString(payload.toByteArray(StandardCharsets.UTF_8))
    }

    private fun isValidAdminToken(token: String): Boolean {
        val decoded = runCatching {
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
