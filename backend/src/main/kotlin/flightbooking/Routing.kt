package flightbooking

import flightbooking.service.HomeService
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

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

        //Booking API
        get("/api/flights") {
            val tripType = call.request.queryParameters["tripType"]
            val from = call.request.queryParameters["from"]
            val to = call.request.queryParameters["to"]
            val departureDate = call.request.queryParameters["departureDate"]
            val travelClass = call.request.queryParameters["travelClass"]
            val adults = call.request.queryParameters["adults"]
            val children = call.request.queryParameters["children"]
            val infants = call.request.queryParameters["infants"]
            val response = listOf<String>("""{"id":"FL001","flightNumber":"LS101","airline":"LeedsAir","from":"${from.toString()}","to":"${to.toString()}","departureTime":"07:30","arrivalTime":"08:45","departureDate":"${departureDate.toString()}","duration":"1h 15m","stops":0,"price":89,"availableSeats":45}""")
            call.respond(response.toString())
        }
    }
}
