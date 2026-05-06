package flightbooking.service

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class FlightScheduleLoaderTest {
    @Test
    fun `loadFromCsv returns seeded schedules`() {
        val rows = FlightScheduleLoader.loadFromCsv()

        assertFalse(rows.isEmpty(), "Expected seeded flight schedules to be available for tests")
    }

    @Test
    fun `loadFromCsv normalizes route codes and includes expected sample row`() {
        val rows = FlightScheduleLoader.loadFromCsv()
        val sample = rows.firstOrNull { it.flightNumber == "LS101" }

        assertNotNull(sample, "Expected seeded schedule LS101 to be present")
        assertEquals("LBA", sample.from)
        assertEquals("DUB", sample.to)
        assertEquals("06:40", sample.departureTime)
        assertEquals("08:05", sample.arrivalTime)
        assertEquals("1111111", sample.operateDays)
    }

    @Test
    fun `loadFromCsv skips blank required fields`() {
        val rows = FlightScheduleLoader.loadFromCsv()

        assertTrue(
            rows.none { row ->
                row.flightNumber.isBlank() ||
                    row.from.isBlank() ||
                    row.to.isBlank() ||
                    row.departureTime.isBlank() ||
                    row.arrivalTime.isBlank()
            },
        )
    }
}
