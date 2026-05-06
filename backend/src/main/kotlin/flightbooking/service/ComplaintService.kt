package flightbooking.service

import flightbooking.db.table.BookingsTable
import flightbooking.db.table.ComplaintsTable
import flightbooking.db.table.UsersTable
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonIgnoreUnknownKeys
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import java.time.LocalDateTime

object ComplaintService {
    private val json = Json {
        ignoreUnknownKeys = true
    }

    private const val defaultUserId = 1

    @OptIn(ExperimentalSerializationApi::class)
    @Serializable
    @JsonIgnoreUnknownKeys
    data class ComplaintRequest(
        val bookingReference: String = "",
        val category: String = "",
        val description: String = "",
    )

    @Serializable
    data class ComplaintResponse(
        val id: Int,
        val confirmationNumber: String,
        val status: String,
    )

    fun submitComplaint(authorizationHeader: String?, requestBody: String): ComplaintResponse = transaction {
        val request = json.decodeFromString<ComplaintRequest>(requestBody)
        require(request.category.isNotBlank()) { "Issue category is required" }
        require(request.description.isNotBlank()) { "Description is required" }

        val bookingRow = request.bookingReference.trim()
            .takeIf { it.isNotBlank() }
            ?.let { ref ->
                BookingsTable.selectAll()
                    .firstOrNull { it[BookingsTable.bookingReference].equals(ref, ignoreCase = true) }
            }

        val userId = AuthService.resolveUserIdFromAuthorization(authorizationHeader)
            ?: bookingRow?.get(BookingsTable.userId)
            ?: defaultUserId

        ensureUser(userId)

        val complaintId = ComplaintsTable.insert { row ->
            row[ComplaintsTable.userId] = userId
            row[bookingId] = bookingRow?.get(BookingsTable.id)
            row[subject] = request.category.trim()
            row[message] = request.description.trim()
            row[status] = "open"
            row[createdAt] = LocalDateTime.now()
        }[ComplaintsTable.id]

        ComplaintResponse(
            id = complaintId,
            confirmationNumber = "CMP${complaintId.toString().padStart(6, '0')}",
            status = "Open",
        )
    }

    private fun ensureUser(userId: Int) {
        val existing = UsersTable.selectAll().any { it[UsersTable.id] == userId }
        if (existing) return

        UsersTable.insert { row ->
            row[id] = userId
            row[firstName] = "Guest"
            row[lastName] = "User"
            row[email] = "guest$userId@leedsair.local"
            row[passwordHash] = null
            row[role] = "customer"
            row[createdAt] = LocalDateTime.now()
        }
    }
}
