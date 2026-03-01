package uk.ac.comp2850.flightbooking

import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Application.configureRouting() {
    routing {
        get("/") {
            call.respondText("Ktor environment is running.")
        }
    }
}