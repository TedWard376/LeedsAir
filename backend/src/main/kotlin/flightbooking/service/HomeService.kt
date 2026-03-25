package flightbooking.service

import flightbooking.db.*
import flightbooking.service.Airport as ApiAirport

object HomeService {
    private fun ApiAirport.toDbAirport(): Airport = Airport(
        name, latitude_deg, longitude_deg, continent, iso_country, municipality, icao_code, iata_code
    )

    private val DestinationsDisplay = listOf(
        DestinationDisplay("Barcelona", "BCN", 89.0, "🇪🇸"),
        DestinationDisplay("Amsterdam", "AMS", 65.0, "🇳🇱"),
        DestinationDisplay("Dubai", "DXB", 299.0, "🇦🇪"),
        DestinationDisplay("Paris", "CDG", 74.0, "🇫🇷")
    )

    private val HeroSlides = listOf(
        HeroSlide(
            "Explore the Horizon",
            "Escape to your dream destination today",
            "Flights from $99",
            "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=1200&q=80",
            "A scenic view of a city at sunset",
            "Start Searching",
            "/search"
        )
    )

    private val BestOffers = listOf(
        Offer("New York Getaway", "From $499", 499.0, "USD", "JFK", "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400", "New York skyline", "Return"),
        Offer("Dubai Luxury", "From $450", 450.0, "USD", "DXB", "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400", "Burj Khalifa at night", "Return"),
        Offer("Tokyo Blossom", "From $640", 640.0, "USD", "NRT", "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400", "Traditional Tokyo street", "One way"),
        Offer("Barcelona Sun", "From $110", 110.0, "USD", "BCN", "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=400", "Park Güell in Barcelona", "Return"),
        Offer("Sydney Harbor", "From $920", 920.0, "USD", "SYD", "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=400", "Sydney Opera House", "Return"),
        Offer("Amsterdam Canals", "From $95", 95.0, "USD", "AMS", "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?w=400", "Amsterdam canal view", "Each way")
    )

    suspend fun getHomeData(userIp: String?): HomeResponse {
        val nearestAirport = userIp?.let { ip ->
            try { getNearestAirport(ip).toDbAirport() } catch (e: Exception) { null }
        } ?: Airports[0].toDbAirport()

        return HomeResponse(
            brandName = "FLIGHT BOOKING SYSTEM",
            user = UserStatus(false),
            nearestAirport = nearestAirport,
            heroSlides = HeroSlides,
            bestOffers = BestOffers,
            destinations = DestinationsDisplay,
            legal = LegalInfo(),
            navigation = mapOf(
                "Experience" to listOf("Our Fleet", "Cabin Classes", "Lounge Access"),
                "Book" to listOf("Flights", "Hotels", "Vacations"),
                "Support" to listOf("Manage Booking", "Check-in", "Accessibility Help")
            )
        )
    }
}
