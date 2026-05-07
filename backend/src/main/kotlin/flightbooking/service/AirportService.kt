package flightbooking.service

import flightbooking.db.table.AirportsTable
import flightbooking.db.table.FlightSchedulesTable
import flightbooking.db.table.ScheduledFlightsTable
import java.time.LocalDateTime
import kotlinx.serialization.Serializable
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction

@Serializable
data class AirportDTO(
    val code: String,
    val name: String,
    val city: String?,
    val country: String?,
    val directFrom: List<String> = emptyList(),
    val connectingFrom: List<String> = emptyList()
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
            val airportsById = AirportsTable.selectAll().associateBy { it[AirportsTable.id] }
            
            val directMap = mutableMapOf<String, MutableSet<String>>()
            val activeAirportIds = mutableSetOf<Int>()

            for (sched in allSchedules) {
                val depId = sched[FlightSchedulesTable.departureAirportId]
                val arrId = sched[FlightSchedulesTable.arrivalAirportId]
                activeAirportIds.add(depId)
                activeAirportIds.add(arrId)
                
                val dep = airportsById[depId]?.get(AirportsTable.code) ?: continue
                val arr = airportsById[arrId]?.get(AirportsTable.code) ?: continue
                directMap.getOrPut(arr) { mutableSetOf() }.add(dep)
            }

            // Use real scheduled flights (with actual dates) to determine valid connecting routes.
            // Group by departure date so we only match legs that genuinely fly on the same calendar day.
            val connectingMap = mutableMapOf<String, MutableSet<String>>()
            val allFlights = ScheduledFlightsTable.selectAll().toList()
            val schedulesMapById = allSchedules.associateBy { it[FlightSchedulesTable.id] }

            // Build lightweight data class for each real flight with departure/arrival airports
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
                        connectingFrom = connectingMap[code]?.toList() ?: emptyList()
                    )
                }.sortedWith(compareBy({ getContinentOrder(continentMap[it.code]) }, { it.name }))
            
            cachedAirports = result
            result
        }
    }
}
