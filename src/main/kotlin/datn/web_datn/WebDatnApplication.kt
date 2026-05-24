package datn.web_datn

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.cache.annotation.EnableCaching

@SpringBootApplication
@EnableCaching
class WebDatnApplication

fun main(args: Array<String>) {
    runApplication<WebDatnApplication>(*args)
}
