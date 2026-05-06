package flightbooking.service

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
    val ip: String? = null,
    val city: String? = null,
    val country: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val success: Boolean = true,
    val message: String? = null
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
    // For local testing, 127.0.0.1 or IPv6 localhost will fail IP geolocation.
    // We mock the IP to a Leeds, UK IP (or directly return Leeds coordinates) so local development works.
    val queryIP = if (userIP == "127.0.0.1" || userIP == "0:0:0:0:0:0:0:1" || userIP == "localhost") {
        "82.46.254.1" // A sample IP in Leeds, UK
    } else {
        userIP
    }
    
    return try {
        val response = client.get("https://ipwho.is/$queryIP")
        if (response.status == HttpStatusCode.OK) {
            val responseJSON = Json.decodeFromString<IpWhoIsResponse>(response.bodyAsText())
            if (responseJSON.success && responseJSON.latitude != null && responseJSON.longitude != null) {
                Pair(responseJSON.latitude, responseJSON.longitude)
            } else {
                Pair(53.7997, -1.5492) // Fallback to Leeds coordinates
            }
        } else {
            Pair(53.7997, -1.5492)
        }
    } catch (e: Exception) {
        println("IP Geolocation failed: ${e.message}")
        Pair(53.7997, -1.5492)
    }
}

fun calculateDistance(userCoordinate: Pair<Double, Double>, airportCoordinate: Pair<Double, Double>) : Double { //Calculate distance between user and airport
    val dx = userCoordinate.first - airportCoordinate.first
    val dy = userCoordinate.second - airportCoordinate.second
    return dx * dx + dy * dy
}

suspend fun getNearestAirport(userIP : String) : Airport{ //Returns nearest airport from user
    val activeCodes = AirportService.getAllAirports().map { it.code }.toSet()
    val activeAirportsList = Airports.filter { it.iata_code in activeCodes }
    
    // If no active airports (e.g. database empty), fallback to all
    val searchableAirports = if (activeAirportsList.isNotEmpty()) activeAirportsList else Airports

    var nearestAirport = searchableAirports[0]
    val userCoordinate = getUserCoordinate(userIP)
    var nearestAirportDistance = calculateDistance(userCoordinate, Pair(nearestAirport.latitude_deg, nearestAirport.longitude_deg))
    for(airport in searchableAirports) {
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