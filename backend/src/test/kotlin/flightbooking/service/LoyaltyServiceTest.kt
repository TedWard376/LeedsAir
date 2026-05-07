package flightbooking.service

import kotlin.test.Test
import kotlin.test.assertEquals

class LoyaltyServiceTest {
    @Test
    fun `estimatePoints awards whole-pound economy points plus first booking bonus`() {
        val points =
            LoyaltyService.estimatePoints(
                totalPrice = 123.90,
                travelClass = "economy",
                includeFirstBookingBonus = true,
            )

        assertEquals(623, points)
    }

    @Test
    fun `estimatePoints doubles points for business travel`() {
        val points =
            LoyaltyService.estimatePoints(
                totalPrice = 250.75,
                travelClass = "business",
                includeFirstBookingBonus = false,
            )

        assertEquals(500, points)
    }
}
