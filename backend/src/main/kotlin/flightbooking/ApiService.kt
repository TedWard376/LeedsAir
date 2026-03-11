package flightbooking

import  io.ktor.client.*
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

//Test purpose, to be replaced by database
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
//Test purpose, to be replaced by database
val Airports = listOf(
    Airport("Leeds Bradford Airport",
        53.865898,
        -1.66057,
        "EU",
        "GB",
        "Leeds",
        "EGNM",
        "LBA"
    ),
    Airport("Manchester Airport",
        53.349375,
        -2.279521,
        "EU",
        "GB",
        "Manchester",
        "EGCC",
        "MAN"
    ),
    Airport("London Heathrow Airport",
        51.470748,
        -0.459909,
        "EU",
        "GB",
        "London",
        "EGLL",
        "LHR"
    ),
    Airport("John F. Kennedy International Airport",
        40.641311,
        -73.778139,
        "NA",
        "US",
        "New York",
        "KJFK",
        "JFK"
    ),
    Airport("Los Angeles International Airport",
        33.941589,
        -118.40853,
        "NA",
        "US",
        "Los Angeles",
        "KLAX",
        "LAX"
    ),
    Airport("Dubai International Airport",
        25.253174,
        55.365673,
        "AS",
        "AE",
        "Dubai",
        "OMDB",
        "DXB"
    ),
    Airport("Singapore Changi Airport",
        1.364420,
        103.991531,
        "AS",
        "SG",
        "Singapore",
        "WSSS",
        "SIN"
    ),
    Airport("Tokyo Haneda Airport",
        35.549393,
        139.779839,
        "AS",
        "JP",
        "Tokyo",
        "RJTT",
        "HND"
    ),
    Airport("Paris Charles de Gaulle Airport",
        49.009724,
        2.547778,
        "EU",
        "FR",
        "Paris",
        "LFPG",
        "CDG"
    ),
    Airport("Frankfurt Airport",
        50.037933,
        8.562152,
        "EU",
        "DE",
        "Frankfurt",
        "EDDF",
        "FRA"
    ),
    Airport("Sydney Kingsford Smith Airport",
        -33.939923,
        151.175276,
        "OC",
        "AU",
        "Sydney",
        "YSSY",
        "SYD"
    )
) //List of major airports

suspend fun getUserCoordinate(userIP : String) : Pair<Double, Double>{ //Returns user coordinate depends on user IP
    val response = client.get("https://ipwho.is/$userIP")
    if(response.status == HttpStatusCode(200, "OK")) {
        val responseJSON = Json.decodeFromString<IpWhoIsResponse>(response.bodyAsText())
        return Pair(responseJSON.latitude, responseJSON.longitude)
    } else {
        return Pair(0.0, 0.0)
    }
}

fun calculateDistance(userCoordinate: Pair<Double, Double>, airportCoordinate: Pair<Double, Double>) : Double { //Calculate distance between user and aiport
    val dx = userCoordinate.first - airportCoordinate.first
    val dy = userCoordinate.second - airportCoordinate.second
    return dx * dx + dy * dy
}

fun getNearestAirport(userCoordinate: Pair<Double, Double>) : Airport{ //Returns nearest airport from user
    var nearestAirport = Airports[0]
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

suspend fun main() {
    println(getNearestAirport(getUserCoordinate("104.174.125.138")).name)
}
