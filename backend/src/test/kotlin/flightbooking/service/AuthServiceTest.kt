package flightbooking.service

import java.nio.charset.StandardCharsets
import java.util.Base64
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class AuthServiceTest {

    @Test
    fun `resolveUserIdFromAuthorization extracts user id from a valid bearer token`() {
        val token = Base64.getUrlEncoder().withoutPadding()
            .encodeToString("leedsair:42:test@example.com".toByteArray(StandardCharsets.UTF_8))

        val userId = AuthService.resolveUserIdFromAuthorization("Bearer $token")

        assertEquals(42, userId)
    }

    @Test
    fun `resolveUserIdFromAuthorization returns null for malformed headers`() {
        assertNull(AuthService.resolveUserIdFromAuthorization(null))
        assertNull(AuthService.resolveUserIdFromAuthorization(""))
        assertNull(AuthService.resolveUserIdFromAuthorization("Token abc"))
        assertNull(AuthService.resolveUserIdFromAuthorization("Bearer invalid-token"))
    }
}
