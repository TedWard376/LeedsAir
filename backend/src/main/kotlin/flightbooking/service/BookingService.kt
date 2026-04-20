package flightbooking.service

import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonIgnoreUnknownKeys

object BookingService {
    @OptIn(ExperimentalSerializationApi::class)
    @Serializable
    @JsonIgnoreUnknownKeys
    data class Passenger(
        val firstName: String = "",
        val lastName: String = "",
        val dateOfBirth: String = "",
        val passportNumber: String = "",
        val email: String = "",
        val phone: String = ""
    )
    @OptIn(ExperimentalSerializationApi::class)
    @Serializable
    @JsonIgnoreUnknownKeys
    data class Booking(
        val ref : String = "",
        val userId: Int = 1,
        val flightId : String = "",
        val travelClass : String = "",
        val seat : String = "",
        val extras : List<String> = emptyList(),
        val totalPrice : Double = -0.0,
        val passenger: Passenger,
    )

    @Serializable
    data class BookingLookupResponse(
        val found: Boolean,
        val booking: Booking? = null
    )

    private var bookings = listOf(
        Booking(
            ref = "LEEDS1A",
            userId = 1,
            flightId = "LS001",
            travelClass = "Economy",
            seat = "7B",
            extras = emptyList(),
            totalPrice = 84.0,
            passenger = Passenger(
                firstName = "Tom",
                lastName = "Mike",
                dateOfBirth = "1980-08-19",
                passportNumber = "AB123456",
                email = "123@123.com",
                phone = "0987654321"
            )
        )
    )

    fun getAllBookings(userId: Int): List<Booking> {
        return bookings.filter { it.userId == userId }
    }

    fun getBooking(lastName: String, ref: String): BookingLookupResponse {
        val booking = bookings.firstOrNull { it.passenger.lastName == lastName && it.ref == ref }
        return BookingLookupResponse(found = booking != null, booking = booking)
    }

    fun newBooking(str : String) : Booking {
        val b = Json.decodeFromString<Booking>(str)
        val booking = Booking(
            ref = "LEEDS${bookings.size}A",
            userId = b.userId,
            flightId = b.flightId,
            travelClass = b.travelClass,
            seat = b.seat,
            extras = b.extras,
            totalPrice = b.totalPrice,
            passenger = b.passenger
        )
        bookings = bookings.plus(booking)
        return booking
    }
}
