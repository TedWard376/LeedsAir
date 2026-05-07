package flightbooking

import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.install
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.testing.testApplication
import java.nio.charset.StandardCharsets
import java.util.Base64
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class RoutingIntegrationTest {
    private fun testRouting(block: suspend io.ktor.client.HttpClient.() -> Unit) =
        testApplication {
            application {
                install(ContentNegotiation) {
                    json()
                }
                configureRouting()
            }

            client.block()
        }

    @Test
    fun `admin auth login returns a token with default credentials`() =
        testRouting {
            val response =
                post("/api/admin/auth/login") {
                    contentType(ContentType.Application.Json)
                    setBody("""{"username":"admin","password":"admin12345"}""")
                }

            assertEquals(HttpStatusCode.OK, response.status)
            assertTrue(response.bodyAsText().contains("token"))
        }

    @Test
    fun `auth login rejects an empty request body before service logic runs`() =
        testRouting {
            val response =
                post("/api/auth/login") {
                    contentType(ContentType.Application.Json)
                    setBody("")
                }

            assertEquals(HttpStatusCode.BadRequest, response.status)
            assertTrue(response.bodyAsText().contains("Request body cannot be empty"))
        }

    @Test
    fun `bookings endpoint rejects an empty request body before hitting the database`() =
        testRouting {
            val response =
                post("/api/bookings") {
                    contentType(ContentType.Application.Json)
                    setBody("")
                }

            assertEquals(HttpStatusCode.BadRequest, response.status)
            assertTrue(response.bodyAsText().contains("Request body cannot be empty"))
        }

    @Test
    fun `bookings lookup rejects missing query parameters`() =
        testRouting {
            val response = get("/api/bookings/lookup")

            assertEquals(HttpStatusCode.BadRequest, response.status)
            assertTrue(response.bodyAsText().contains("Missing ref or lastName"))
        }

    @Test
    fun `admin bookings rejects requests without an admin token`() =
        testRouting {
            val response = get("/api/admin/bookings")

            assertEquals(HttpStatusCode.Unauthorized, response.status)
            assertTrue(response.bodyAsText().contains("Missing or invalid Authorization header"))
        }

    @Test
    fun `admin bookings rejects a customer bearer token`() =
        testRouting {
            val customerToken =
                Base64.getUrlEncoder().withoutPadding()
                    .encodeToString("leedsair:42:test@example.com".toByteArray(StandardCharsets.UTF_8))

            val response =
                get("/api/admin/bookings") {
                    header(HttpHeaders.Authorization, "Bearer $customerToken")
                }

            assertEquals(HttpStatusCode.Unauthorized, response.status)
            assertTrue(response.bodyAsText().contains("Invalid admin token"))
        }

    @Test
    fun `admin complaints rejects malformed bearer tokens`() =
        testRouting {
            val response =
                get("/api/admin/complaints") {
                    header(HttpHeaders.Authorization, "Bearer not-base64")
                }

            assertEquals(HttpStatusCode.Unauthorized, response.status)
            assertTrue(response.bodyAsText().contains("Invalid admin token"))
        }

    @Test
    fun `admin metrics rejects a non bearer authorization scheme`() =
        testRouting {
            val response =
                get("/api/admin/metrics") {
                    header(HttpHeaders.Authorization, "Token abc123")
                }

            assertEquals(HttpStatusCode.Unauthorized, response.status)
            assertTrue(response.bodyAsText().contains("Missing or invalid Authorization header"))
        }

    @Test
    fun `admin modification decision rejects missing request id`() =
        testRouting {
            val response =
                post("/api/admin/modification-requests/not-a-number/decision") {
                    contentType(ContentType.Application.Json)
                    setBody("""{"decision":"approved"}""")
                }

            assertEquals(HttpStatusCode.BadRequest, response.status)
            assertTrue(response.bodyAsText().contains("Missing or invalid request id"))
        }
}
