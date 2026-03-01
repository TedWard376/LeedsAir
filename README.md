# COMP2850 Flight Booking System

This is the project structure:
- `build.gradle.kts`: Main build config (plugins, dependencies, toolchain)
- `settings.gradle.kts`: Project name and repository setup
- `gradle/libs.versions.toml`: Centralized dependency versions
- `src/main/kotlin/Application.kt`: Ktor entry point (`main`) and app module
- `src/main/kotlin/Routing.kt`: Current route registration location
- `src/main/resources/application.yaml`: Ktor runtime config (module + port)
- `src/main/resources/logback.xml`: Logging configuration

## Where to add code
- Backend Kotlin code: `src/main/kotlin/`

