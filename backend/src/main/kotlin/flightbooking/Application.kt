package flightbooking

import flightbooking.db.DatabaseFactory
import flightbooking.service.SeedDataService
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.*
import io.ktor.server.plugins.cors.routing.CORS
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation

fun main(args: Array<String>) {
    io.ktor.server.netty.EngineMain.main(args)
}

fun Application.module() {
    install(CORS) {
        allowHost("localhost:3000", schemes = listOf("http"))
        allowHost("127.0.0.1:3000", schemes = listOf("http"))
        allowHost("localhost:5173", schemes = listOf("http"))
        allowHost("127.0.0.1:5173", schemes = listOf("http"))
        allowHost("localhost:4173", schemes = listOf("http"))
        allowHost("127.0.0.1:4173", schemes = listOf("http"))
        allowMethod(HttpMethod.Get)
        allowMethod(HttpMethod.Post)
        allowMethod(HttpMethod.Put)
        allowHeader(HttpHeaders.ContentType)
        allowHeader(HttpHeaders.Authorization)
        allowCredentials = true
    }

    install(ContentNegotiation) {
        json()
    }
    DatabaseFactory.init(environment.config)
    if (shouldRunSeed() || SeedDataService.isSeedRequired()) {
        SeedDataService.seedAll()
    } else {
        SeedDataService.seedDemoData()
    }
    configureRouting()
}

private fun Application.shouldRunSeed(): Boolean =
    environment.config.propertyOrNull("seed.runOnStartup")?.getString()?.toBooleanStrictOrNull() == true ||
        System.getenv("RUN_CSV_SEED")?.toBooleanStrictOrNull() == true
