package flightbooking.db

import kotlinx.serialization.Serializable

@Serializable
data class Airport(
    val name: String,
    val latitude: Double,
    val longitude: Double,
    val continent: String,
    val isoCountry: String,
    val municipality: String,
    val icaoCode: String,
    val iataCode: String
)

@Serializable
data class DestinationDisplay(
    val city: String,
    val code: String,
    val price: Double,
    val flag: String
)

@Serializable
data class Offer(
    val title: String,
    val description: String,
    val fromPrice: Double,
    val currency: String,
    val destination: String,
    val imageUrl: String,
    val altText: String,
    val tripType: String = "Return"
)

@Serializable
data class HeroSlide(
    val title: String,
    val subtitle: String,
    val priceInfo: String,
    val imageUrl: String,
    val altText: String,
    val ctaText: String,
    val ctaUrl: String
)

@Serializable
data class UserStatus(
    val isLoggedIn: Boolean,
    val username: String? = null,
    val loyaltyTier: String? = null,
    val loyaltyPoints: Int = 0,
    val accessibilityPreferences: Map<String, Boolean> = emptyMap()
)

@Serializable
data class LegalInfo(
    val cookieAccepted: Boolean = false,
    val privacyUrl: String = "/privacy",
    val termsUrl: String = "/terms",
    val cookiePolicyUrl: String = "/cookies"
)

@Serializable
data class HomeResponse(
    val brandName: String,
    val user: UserStatus,
    val nearestAirport: Airport?,
    val heroSlides: List<HeroSlide>,
    val bestOffers: List<Offer>,
    val destinations: List<DestinationDisplay>,
    val legal: LegalInfo,
    val navigation: Map<String, List<String>>
)
