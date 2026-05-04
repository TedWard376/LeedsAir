package flightbooking

import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.server.testing.testApplication
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class RoutingIntegrationTest {

    @Test
    fun `admin auth login returns a token with default credentials`() = testApplication {
        application {
            configureRouting()
        }

        val response = client.post("/api/admin/auth/login") {
            contentType(ContentType.Application.Json)
            setBody("""{"username":"admin","password":"admin12345"}""")
        }

        assertEquals(HttpStatusCode.OK, response.status)
        assertTrue(response.bodyAsText().contains("token"))
    }

    @Test
    fun `auth login rejects an empty request body before service logic runs`() = testApplication {
        application {
            configureRouting()
        }

        val response = client.post("/api/auth/login") {
            contentType(ContentType.Application.Json)
            setBody("")
        }

        assertEquals(HttpStatusCode.BadRequest, response.status)
        assertTrue(response.bodyAsText().contains("Request body cannot be empty"))
    }

    @Test
    fun `bookings endpoint rejects an empty request body before hitting the database`() = testApplication {
        application {
            configureRouting()
        }

        val response = client.post("/api/bookings") {
            contentType(ContentType.Application.Json)
            setBody("")
        }

        assertEquals(HttpStatusCode.BadRequest, response.status)
        assertTrue(response.bodyAsText().contains("Request body cannot be empty"))
    }
}
