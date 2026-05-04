package flightbooking.service

import kotlin.test.Test
import kotlin.test.assertEquals

class BookingServiceTest {

    @Test
    fun `detectCardBrand identifies the major card families used in checkout`() {
        assertEquals("Visa", BookingService.detectCardBrand("4111 1111 1111 1111"))
        assertEquals("Mastercard", BookingService.detectCardBrand("5555 5555 5555 4444"))
        assertEquals("American Express", BookingService.detectCardBrand("378282246310005"))
        assertEquals("Discover", BookingService.detectCardBrand("6011111111111117"))
        assertEquals("Card", BookingService.detectCardBrand("9999"))
    }

    @Test
    fun `displayStatus maps stored booking statuses to user facing labels`() {
        assertEquals("Confirmed", BookingService.displayStatus("confirmed"))
        assertEquals("Cancelled", BookingService.displayStatus("cancelled"))
        assertEquals("Checked In", BookingService.displayStatus("checked_in"))
        assertEquals("Pending", BookingService.displayStatus("pending"))
    }
}
