package flightbooking.service

import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
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

    var Bookings = listOf(
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

    fun getAllBookings(userId: Int): String {
        var userBookings : List<Booking> = listOf()
        for (b in Bookings) {
            if (b.userId == userId) {
                userBookings = userBookings.plus(b)
            }
        }
        return "$userBookings"
    }

    fun getBooking(lastName: String, ref: String): String {
        for (b in Bookings) {
            if (b.passenger.lastName == lastName && b.ref == ref) {
                return "$b"
            }
        }
        return ""
    }

    fun newBooking(str : String) :  String {
        val b = Json.decodeFromString<Booking>(str)
        val booking = Booking("LEEDS${Bookings.size}A", b.userId, b.flightId, b.travelClass, b.seat, b.extras, b.totalPrice, b.passenger)
        Bookings = Bookings.plus(booking)
        return Json.encodeToString(booking)
    }
}