package flightbooking.service

import java.time.*
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonIgnoreUnknownKeys

object BookingService {
    data class ScheduleFlight (
        val id : String,
        val flightNumber : String,
        val airline : String,
        val from : String,
        val to : String,
        val departureTime : String,
        val arrivalTime : String,
        val operateDays : String,
        val duration : String,
        val stops : Int,
        val price : Double,
        val availableSeats : Int
    )

    //Define data class for flight
    @OptIn(ExperimentalSerializationApi::class)
    @Serializable
    @JsonIgnoreUnknownKeys
    data class Flight(
        val id : String,
        val flightNumber : String,
        val airline : String,
        val from : String,
        val to : String,
        val departureTime : String,
        val arrivalTime : String,
        val departureDate : String,
        val duration : String,
        val stops : Int,
        val price : Double,
        val availableSeats : Int
    )

    val ScheduleFlights = listOf(
        ScheduleFlight(
            id = "FL001",
            flightNumber = "LS101",
            airline = "LeedsAirline",
            from = "LBA",
            to = "DUB",
            departureTime = "06:40",
            arrivalTime = "08:05",
            operateDays = "1111111",
            duration = "1h 25m",
            stops = 0,
            price = 84.0,
            availableSeats = 45
        )
    )

    fun isOperate(scheduleFlight : ScheduleFlight, departureDate: String) : Boolean { //Check if the flight operates on given date
        val date = LocalDate.parse(departureDate)
        var day = date.dayOfWeek.value
        if (day == 7) day = 0
        return scheduleFlight.operateDays[day] == '1'
    }

    fun scheduleToFlight(scheduleFlight: ScheduleFlight, departureDate: String) : Flight { //Convert flight from schedule to date
        return Flight(
            id = scheduleFlight.id,
            flightNumber = scheduleFlight.flightNumber,
            airline = scheduleFlight.airline,
            from = scheduleFlight.from,
            to = scheduleFlight.to,
            departureTime = scheduleFlight.departureTime,
            arrivalTime = scheduleFlight.arrivalTime,
            departureDate = departureDate,
            duration = scheduleFlight.duration,
            stops = scheduleFlight.stops,
            price = scheduleFlight.price,
            availableSeats = scheduleFlight.availableSeats
        )
    }

    fun getFlights(from : String, to : String, departureDate: String): String { //Search flight
        var flightsReturn = listOf<String>()
        for (flight in ScheduleFlights) {
            if (flight.from == from && flight.to == to && isOperate(flight, departureDate)) {
                flightsReturn = flightsReturn.plus(Json.encodeToString(scheduleToFlight(flight, departureDate)))
            }
        }
        return "$flightsReturn"
        
    }
}