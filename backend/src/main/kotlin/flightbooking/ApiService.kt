package flightbooking

import  io.ktor.client.*
import io.ktor.client.engine.cio.CIO
import io.ktor.client.request.*
import io.ktor.client.statement.*
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

suspend fun getUserCoordinate(userIP : String) : Pair<Double, Double>{ //Returns user coordinate depends on user IP
    val response = client.get("https://ipwho.is/$userIP")
    val responseJSON = Json.decodeFromString<IpWhoIsResponse>(response.bodyAsText())
    return Pair(responseJSON.latitude, responseJSON.longitude)
}
