package flightbooking

import flightbooking.service.BookingService
import flightbooking.service.FlightService
import flightbooking.service.HomeService
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.*
import io.ktor.server.request.receiveText
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.SerializationException

fun Application.configureRouting() {
    routing {
        get("/") {
            call.respondText("Ktor environment is running.")
        }

        // Landing Page API (Home)
        get("/api/home") {
            val userIp = call.request.local.remoteAddress
            call.respond(HomeService.getHomeData(userIp))
        }

        get("/api/flights") {
            call.respond(
                FlightService.searchFlights(
                    from = call.request.queryParameters["from"],
                    to = call.request.queryParameters["to"],
                    departureDate = call.request.queryParameters["departureDate"]
                )
            )
        }

        get("/api/bookings") {
            val rawUserId = call.request.queryParameters["userId"]
            val userId = rawUserId?.toIntOrNull() ?: 1
            if (rawUserId != null && rawUserId.toIntOrNull() == null) {
                call.respond(
                    status = HttpStatusCode.BadRequest,
                    message = mapOf("error" to "Missing or invalid userId")
                )
                return@get
            }

            call.respond(BookingService.getAllBookings(userId))
        }

        get("/api/bookings/lookup") {
            val ref = call.request.queryParameters["ref"]?.trim().orEmpty()
            val lastName = call.request.queryParameters["lastName"]?.trim().orEmpty()
            if (ref.isBlank() || lastName.isBlank()) {
                call.respond(
                    status = HttpStatusCode.BadRequest,
                    message = mapOf("error" to "Missing ref or lastName")
                )
                return@get
            }

            val result = BookingService.getBooking(lastName = lastName, ref = ref)
            if (result == null) {
                call.respond(HttpStatusCode.NotFound, mapOf("error" to "Booking not found"))
                return@get
            }

            call.respond(result)
        }

        post("/api/bookings") {
            val requestBody = call.receiveText().trim()
            if (requestBody.isBlank()) {
                call.respond(
                    status = HttpStatusCode.BadRequest,
                    message = mapOf("error" to "Request body cannot be empty")
                )
                return@post
            }

            try {
                call.respond(
                    status = HttpStatusCode.Created,
                    message = BookingService.newBooking(requestBody)
                )
            } catch (_: SerializationException) {
                call.respond(
                    status = HttpStatusCode.BadRequest,
                    message = mapOf("error" to "Invalid booking payload")
                )
            } catch (_: IllegalArgumentException) {
                call.respond(
                    status = HttpStatusCode.BadRequest,
                    message = mapOf("error" to "Invalid booking payload")
                )
            }
        }

        put("/api/bookings/{id}") {
            val bookingId = call.parameters["id"]?.toIntOrNull()
            if (bookingId == null) {
                call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Missing or invalid booking id"))
                return@put
            }

            val requestBody = call.receiveText().trim()
            if (requestBody.isBlank()) {
                call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Request body cannot be empty"))
                return@put
            }

            try {
                call.respond(BookingService.modifyBooking(bookingId, requestBody))
            } catch (_: SerializationException) {
                call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Invalid booking payload"))
            } catch (e: IllegalArgumentException) {
                val status = if (e.message == "Booking not found") HttpStatusCode.NotFound else HttpStatusCode.BadRequest
                call.respond(status, mapOf("error" to (e.message ?: "Invalid booking payload")))
            }
        }

        post("/api/bookings/{id}/cancel") {
            val bookingId = call.parameters["id"]?.toIntOrNull()
            if (bookingId == null) {
                call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Missing or invalid booking id"))
                return@post
            }

            try {
                call.respond(BookingService.cancelBooking(bookingId))
            } catch (e: IllegalArgumentException) {
                val status = if (e.message == "Booking not found") HttpStatusCode.NotFound else HttpStatusCode.BadRequest
                call.respond(status, mapOf("error" to (e.message ?: "Unable to cancel booking")))
            }
        }

        post("/api/bookings/{id}/checkin") {
            val bookingId = call.parameters["id"]?.toIntOrNull()
            if (bookingId == null) {
                call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Missing or invalid booking id"))
                return@post
            }

            try {
                call.respond(BookingService.checkInBooking(bookingId))
            } catch (e: IllegalArgumentException) {
                val status = if (e.message == "Booking not found") HttpStatusCode.NotFound else HttpStatusCode.BadRequest
                call.respond(status, mapOf("error" to (e.message ?: "Unable to check in booking")))
            }
        }
    }
}
