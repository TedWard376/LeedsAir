package flightbooking

import io.ktor.server.application.*
import flightbooking.db.DatabaseFactory
import flightbooking.service.SeedDataService

fun main(args: Array<String>) {
    io.ktor.server.netty.EngineMain.main(args)
}

fun Application.module() {
    DatabaseFactory.init(environment.config)
    SeedDataService.seedInitialData()
    configureRouting()
}
