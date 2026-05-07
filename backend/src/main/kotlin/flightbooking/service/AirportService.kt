package flightbooking.service

import flightbooking.db.table.AirportsTable
import flightbooking.db.table.FlightSchedulesTable
import flightbooking.db.table.ScheduledFlightsTable
import java.time.LocalDateTime
import kotlinx.serialization.Serializable
import org.jetbrains.exposed.sql.andWhere
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction

@Serializable
data class AirportDTO(
    val code: String,
    val name: String,
    val city: String?,
    val country: String?,
    val directFrom: List<String> = emptyList(),
    val connectingFrom: List<String> = emptyList(),
    val tabIndex: Int = 0,
    val ariaLabel: String = ""
)

data class Destination(
    val departureAirport: String,
    val departureAirportId: Int,
    val arrivalAirport: String,
    val arrivalAirportId: Int,
)

@Serializable
data class Departure(
    val code: String,
    val name: String,
    val city: String,
    val country: String,
    val flag: String,
)

object AirportService {
    private fun getContinentOrder(continent: String?): Int {
        return when (continent?.uppercase()) {
            "EU" -> 1
            "AS" -> 2
            "NA" -> 3
            "SA" -> 4
            "OC" -> 5
            "AF" -> 6
            else -> 7
        }
    }

    private var cachedAirports: List<AirportDTO>? = null

    fun getAllAirports(): List<AirportDTO> {
        if (cachedAirports != null) return cachedAirports!!

        val continentMap = Airports.associate { it.iata_code to it.continent }
        
        return transaction {
            val allSchedules = FlightSchedulesTable.selectAll().toList()
            val schedulesMapById = allSchedules.associateBy { it[FlightSchedulesTable.id] }
            val allFlights = ScheduledFlightsTable.selectAll().toList()

            data class RealFlight(val depId: Int, val arrId: Int, val dep: LocalDateTime, val arr: LocalDateTime)
            val realFlights = allFlights.mapNotNull { row ->
                val sched = schedulesMapById[row[ScheduledFlightsTable.scheduleId]] ?: return@mapNotNull null
                RealFlight(
                    depId = sched[FlightSchedulesTable.departureAirportId],
                    arrId = sched[FlightSchedulesTable.arrivalAirportId],
                    dep = row[ScheduledFlightsTable.departureTime],
                    arr = row[ScheduledFlightsTable.arrivalTime]
                )
            }

            val airportsById = AirportsTable.selectAll().associateBy { it[AirportsTable.id] }
            
            val directMap = mutableMapOf<String, MutableSet<String>>()
            val activeAirportIds = mutableSetOf<Int>()

            for (flight in realFlights) {
                activeAirportIds.add(flight.depId)
                activeAirportIds.add(flight.arrId)
                
                val dep = airportsById[flight.depId]?.get(AirportsTable.code) ?: continue
                val arr = airportsById[flight.arrId]?.get(AirportsTable.code) ?: continue
                directMap.getOrPut(arr) { mutableSetOf() }.add(dep)
            }

            // Use real scheduled flights (with actual dates) to determine valid connecting routes.
            // Group by departure date so we only match legs that genuinely fly on the same calendar day.
            val connectingMap = mutableMapOf<String, MutableSet<String>>()

            val flightsByDate = realFlights.groupBy { it.dep.toLocalDate() }

            for ((_, dayFlights) in flightsByDate) {
                for (leg1 in dayFlights) {
                    for (leg2 in dayFlights) {
                        if (leg1.arrId == leg2.depId) {
                            val layoverMinutes = java.time.Duration.between(leg1.arr, leg2.dep).toMinutes()
                            if (layoverMinutes in 60..720) {
                                val dep = airportsById[leg1.depId]?.get(AirportsTable.code) ?: continue
                                val arr = airportsById[leg2.arrId]?.get(AirportsTable.code) ?: continue
                                if (dep != arr && directMap[arr]?.contains(dep) != true) {
                                    connectingMap.getOrPut(arr) { mutableSetOf() }.add(dep)
                                }
                            }
                        }
                    }
                }
            }

            val hasDeparturesSet = mutableSetOf<String>()
            for (deps in directMap.values) hasDeparturesSet.addAll(deps)
            for (deps in connectingMap.values) hasDeparturesSet.addAll(deps)

            val result = AirportsTable.selectAll()
                .filter { it[AirportsTable.id] in activeAirportIds }
                .map {
                    val code = it[AirportsTable.code]
                    AirportDTO(
                        code = code,
                        name = it[AirportsTable.name] ?: "",
                        city = it[AirportsTable.city],
                        country = it[AirportsTable.country],
                        directFrom = directMap[code]?.toList() ?: emptyList(),
                        connectingFrom = connectingMap[code]?.toList() ?: emptyList(),
                        tabIndex = 0,
                        ariaLabel = "Select ${it[AirportsTable.name]} airport in ${it[AirportsTable.city] ?: "Unknown City"}"
                    )
                }
                .filter { it.code in hasDeparturesSet }
                .sortedWith(compareBy({ getContinentOrder(continentMap[it.code]) }, { it.name }))
            
            cachedAirports = result
            result
        }
    }
    fun returnDepartureAirports(): List<Departure> { //Return all departure airports
        val schedules = FlightScheduleLoader.loadFromCsv()
        val airports = AirportLoader.loadFromCsv()
        val airportMap = airports.associateBy { it.iata_code.trim().uppercase() } //Create a hashmap for airports
        val departures = mutableSetOf<Departure>()

        for (schedule in schedules) {
            val airport = airportMap[schedule.from.trim().uppercase()] ?: continue
            departures.add(Departure(airport.iata_code.trim().uppercase(), airport.name.trim(), airport.municipality.trim(), airport.iso_country.trim().uppercase(),airport.iso_country.trim().uppercase()))
        }

        return departures.toList()
    }

    fun returnDestinations(from: String?): List<Destination> = transaction { //Return possible destination from specified airport
        val normalisedFrom = from?.trim()?.uppercase().takeUnless { it.isNullOrBlank() } //Normalise from String
        val airportsById = AirportsTable.selectAll().associateBy { it[AirportsTable.id] }
        val airportsByCode = AirportsTable.selectAll().associateBy { it[AirportsTable.code].uppercase() }
        val departureAirportId = normalisedFrom?.let { code -> airportsByCode[code]?.get(AirportsTable.id) }
        var scheduleQuery = FlightSchedulesTable.selectAll()

        if (departureAirportId != null) {
            scheduleQuery = scheduleQuery.andWhere { FlightSchedulesTable.departureAirportId eq departureAirportId }
        }

        val schedules = scheduleQuery.toList()

        return@transaction schedules.mapNotNull { schedule -> //Returns depId: Int, arrId: Int, depAirport: String, arrAirport: String
            val depId = schedule[FlightSchedulesTable.departureAirportId]
            val arrId = schedule[FlightSchedulesTable.arrivalAirportId]
            val depAirport = airportsById[depId] ?: return@mapNotNull null
            val arrAirport = airportsById[arrId] ?: return@mapNotNull null

            Destination(
                departureAirport = depAirport[AirportsTable.code],
                departureAirportId = depId,
                arrivalAirport = arrAirport[AirportsTable.code],
                arrivalAirportId = arrId
            )
        }.distinctBy { it.departureAirportId to it.arrivalAirportId }  //Prevents duplicate flights
    }
}
