package flightbooking

import io.ktor.server.application.*
import flightbooking.db.DatabaseFactory
import flightbooking.service.SeedDataService

fun main(args: Array<String>) {
    io.ktor.server.netty.EngineMain.main(args)
}

fun Application.module() {
    DatabaseFactory.init(environment.config)
    if (shouldRunSeed()) {
        SeedDataService.seedAll()
    }
    configureRouting()
}

private fun Application.shouldRunSeed(): Boolean =
    environment.config.propertyOrNull("seed.runOnStartup")?.getString()?.toBooleanStrictOrNull() == true ||
        System.getenv("RUN_CSV_SEED")?.toBooleanStrictOrNull() == true
