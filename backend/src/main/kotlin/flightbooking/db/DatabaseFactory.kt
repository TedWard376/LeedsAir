package flightbooking.db

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import io.ktor.server.config.ApplicationConfig
import org.flywaydb.core.Flyway
import org.flywaydb.core.api.MigrationVersion
import org.jetbrains.exposed.sql.Database

object DatabaseFactory {
    fun init(config: ApplicationConfig) {
        val databaseConfig = config.config("database")
        val jdbcUrl = readString(
            databaseConfig,
            listOf("jdbcUrl", "jdbcURL"),
            env = "DB_JDBC_URL",
            displayName = "database.jdbcUrl"
        )
        val driverClassName = readString(
            databaseConfig,
            listOf("driverClassName"),
            env = "DB_DRIVER_CLASS_NAME",
            displayName = "database.driverClassName"
        )
        val username = readString(
            databaseConfig,
            listOf("username"),
            env = "DB_USER",
            displayName = "database.username"
        )
        val password = readString(
            databaseConfig,
            listOf("password"),
            env = "DB_PASSWORD",
            displayName = "database.password"
        )
        val maximumPoolSize = databaseConfig.propertyOrNull("maximumPoolSize")?.getString()?.toIntOrNull()
            ?: System.getenv("DB_MAX_POOL_SIZE")?.toIntOrNull()
            ?: 10

        val hikari = HikariConfig().apply {
            this.jdbcUrl = jdbcUrl
            this.driverClassName = driverClassName
            this.username = username
            this.password = password
            this.maximumPoolSize = maximumPoolSize
            isAutoCommit = false
            transactionIsolation = "TRANSACTION_REPEATABLE_READ"
            validate()
        }

        val dataSource = HikariDataSource(hikari)
        Database.connect(dataSource)

        Flyway.configure()
            .dataSource(jdbcUrl, username, password)
            .locations("classpath:db/migration")
            .baselineOnMigrate(true)
            .baselineVersion(MigrationVersion.fromVersion("0"))
            .load()
            .migrate()
    }

    private fun readString(
        config: ApplicationConfig,
        keys: List<String>,
        env: String,
        displayName: String,
    ): String {
        val valueFromConfig = keys.firstNotNullOfOrNull { config.propertyOrNull(it)?.getString() }
        val valueFromEnv = System.getenv(env)
        return valueFromConfig ?: valueFromEnv ?: throw IllegalStateException(
            "Missing required config '$displayName'. Set one of: ${
                keys.joinToString(", ")
            } in application.yaml or set '$env' in environment."
        )
    }
}
