package flightbooking.service

import flightbooking.db.table.LoyaltyAccountsTable
import flightbooking.db.table.LoyaltyTransactionsTable
import flightbooking.db.table.UsersTable
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonIgnoreUnknownKeys
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.sql.update
import java.time.LocalDateTime

object LoyaltyService {
    private val json = Json {
        ignoreUnknownKeys = true
    }

    private const val defaultUserId = 1

    @OptIn(ExperimentalSerializationApi::class)
    @Serializable
    @JsonIgnoreUnknownKeys
    data class RedeemRequest(
        val rewardId: String = "",
        val pointsCost: Int = 0,
    )

    @Serializable
    data class LoyaltySummary(
        val userId: Int,
        val points: Int,
        val lifetimePoints: Int,
        val tier: String,
    )

    @Serializable
    data class RedeemResponse(
        val rewardId: String,
        val points: Int,
        val lifetimePoints: Int,
        val tier: String,
        val message: String,
    )

    fun getLoyalty(authorizationHeader: String?): LoyaltySummary = transaction {
        val userId = resolveUserId(authorizationHeader)
        val accountRow = ensureAccount(userId)
        val accountId = accountRow[LoyaltyAccountsTable.id]
        val points = accountRow[LoyaltyAccountsTable.pointsBalance]
        val lifetimePoints = LoyaltyTransactionsTable.selectAll()
            .filter { it[LoyaltyTransactionsTable.loyaltyAccountId] == accountId }
            .sumOf { it[LoyaltyTransactionsTable.pointsEarned] }

        LoyaltySummary(
            userId = userId,
            points = points,
            lifetimePoints = lifetimePoints,
            tier = accountRow[LoyaltyAccountsTable.tier].replaceFirstChar { it.uppercase() },
        )
    }

    fun redeem(authorizationHeader: String?, requestBody: String): RedeemResponse = transaction {
        val request = json.decodeFromString<RedeemRequest>(requestBody)
        require(request.rewardId.isNotBlank()) { "Reward id is required" }
        require(request.pointsCost > 0) { "Points cost must be greater than zero" }

        val userId = resolveUserId(authorizationHeader)
        val accountRow = ensureAccount(userId)
        val accountId = accountRow[LoyaltyAccountsTable.id]
        val currentPoints = accountRow[LoyaltyAccountsTable.pointsBalance]

        if (currentPoints < request.pointsCost) {
            throw IllegalArgumentException("Not enough points")
        }

        val updatedPoints = currentPoints - request.pointsCost
        val updatedTier = calculateTier(updatedPoints)

        LoyaltyAccountsTable.update({ LoyaltyAccountsTable.id eq accountId }) { row ->
            row[pointsBalance] = updatedPoints
            row[tier] = updatedTier
        }

        LoyaltyTransactionsTable.insert { row ->
            row[loyaltyAccountId] = accountId
            row[bookingId] = null
            row[pointsEarned] = 0
            row[pointsRedeemed] = request.pointsCost
            row[transactionDate] = LocalDateTime.now()
        }

        val lifetimePoints = LoyaltyTransactionsTable.selectAll()
            .filter { it[LoyaltyTransactionsTable.loyaltyAccountId] == accountId }
            .sumOf { it[LoyaltyTransactionsTable.pointsEarned] }

        RedeemResponse(
            rewardId = request.rewardId,
            points = updatedPoints,
            lifetimePoints = lifetimePoints,
            tier = updatedTier.replaceFirstChar { it.uppercase() },
            message = "Reward redeemed successfully",
        )
    }

    private fun resolveUserId(authorizationHeader: String?): Int {
        val tokenUserId = AuthService.resolveUserIdFromAuthorization(authorizationHeader)
        val candidate = tokenUserId ?: defaultUserId
        ensureUser(candidate)
        return candidate
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

    private fun ensureAccount(userId: Int) =
        LoyaltyAccountsTable.selectAll().firstOrNull { it[LoyaltyAccountsTable.userId] == userId }
            ?: run {
                LoyaltyAccountsTable.insert { row ->
                    row[LoyaltyAccountsTable.userId] = userId
                    row[pointsBalance] = 0
                    row[tier] = "bronze"
                }
                LoyaltyAccountsTable.selectAll().first { it[LoyaltyAccountsTable.userId] == userId }
            }

    private fun calculateTier(points: Int): String = when {
        points >= 5000 -> "gold"
        points >= 2000 -> "silver"
        else -> "bronze"
    }
}
