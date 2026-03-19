package flightbooking

import flightbooking.service.AirportLoader
import io.ktor.client.*
import io.ktor.client.engine.cio.CIO
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.HttpStatusCode
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonIgnoreUnknownKeys

val client = HttpClient(CIO)

//Define data structure for IpWhoIs API
@OptIn(ExperimentalSerializationApi::class)
@Serializable
@JsonIgnoreUnknownKeys
data class IpWhoIsResponse(
    val ip: String,
    val city: String,
    val country: String,
    val latitude: Double,
    val longitude: Double
)

data class Airport(
    val name: String,
    val latitude_deg: Double,
    val longitude_deg: Double,
    val continent: String,
    val iso_country: String,
    val municipality: String,
    val icao_code: String,
    val iata_code: String
)

val Airports: List<Airport> by lazy { AirportLoader.loadFromCsv() }

suspend fun getUserCoordinate(userIP : String) : Pair<Double, Double>{ //Returns user coordinate depends on user IP
    val response = client.get("https://ipwho.is/$userIP")
    if(response.status == HttpStatusCode(200, "OK")) {
        val responseJSON = Json.decodeFromString<IpWhoIsResponse>(response.bodyAsText())
        return Pair(responseJSON.latitude, responseJSON.longitude)
    } else {
        return Pair(0.0, 0.0)
    }
}

fun calculateDistance(userCoordinate: Pair<Double, Double>, airportCoordinate: Pair<Double, Double>) : Double { //Calculate distance between user and airport
    val dx = userCoordinate.first - airportCoordinate.first
    val dy = userCoordinate.second - airportCoordinate.second
    return dx * dx + dy * dy
}

suspend fun getNearestAirport(userIP : String) : Airport{ //Returns nearest airport from user
    var nearestAirport = Airports[0]
    val userCoordinate = getUserCoordinate(userIP)
    var nearestAirportDistance = calculateDistance(userCoordinate, Pair(nearestAirport.latitude_deg, nearestAirport.longitude_deg))
    for(airport in Airports) {
        val airportDistance = calculateDistance(userCoordinate, Pair(airport.latitude_deg, airport.longitude_deg))
        if(airportDistance < nearestAirportDistance) {
            nearestAirportDistance = airportDistance
            nearestAirport = airport
        }
    }
    return nearestAirport
}
/*
suspend fun main() {
    println(getNearestAirport("104.174.125.138").name)
}
*/