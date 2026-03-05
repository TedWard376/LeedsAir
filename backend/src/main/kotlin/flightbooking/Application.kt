package flightbooking

import io.ktor.server.application.*
import flightbooking.db.DatabaseFactory

fun main(args: Array<String>) {
    io.ktor.server.netty.EngineMain.main(args)
}

fun Application.module() {
    DatabaseFactory.init(environment.config)
    configureRouting()
}
