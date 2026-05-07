package flightbooking.service

import kotlin.test.Test
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class AdminServiceTest {
    @Test
    fun `login returns a token for default admin credentials`() {
        val response =
            AdminService.login(
                """
                {
                  "username": "admin",
                  "password": "admin12345"
                }
                """.trimIndent(),
            )

        assertTrue(response.token.isNotBlank(), "Expected admin login to return a token")
    }

    @Test
    fun `requireAdmin accepts a token returned from login`() {
        val response =
            AdminService.login(
                """
                {
                  "username": "admin",
                  "password": "admin12345"
                }
                """.trimIndent(),
            )

        AdminService.requireAdmin("Bearer ${response.token}")
    }

    @Test
    fun `login rejects invalid admin credentials`() {
        assertFailsWith<IllegalArgumentException> {
            AdminService.login(
                """
                {
                  "username": "admin",
                  "password": "wrong-password"
                }
                """.trimIndent(),
            )
        }
    }

    @Test
    fun `requireAdmin rejects an invalid token`() {
        assertFailsWith<IllegalArgumentException> {
            AdminService.requireAdmin("Bearer invalid-token")
        }
    }
}
