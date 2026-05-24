package datn.web_datn.service

import datn.web_datn.model.CategoryModel
import org.springframework.cache.annotation.CacheEvict
import org.springframework.cache.annotation.Cacheable
import org.springframework.http.*
import org.springframework.stereotype.Service
import org.springframework.web.client.RestTemplate

@Service
class CategoryService(private val restTemplate: RestTemplate) {
    private val apiUrl = (System.getenv("API_BASE_URL") ?: "http://127.0.0.1:8000") + "/api/categories"

    @Cacheable(value = ["categories"])
    fun getAllCategories(token: String?): List<CategoryModel> {
        val headers = HttpHeaders()
        headers.setBearerAuth(token ?: "")
        val entity = HttpEntity<Unit>(headers)
        return try {
            val response = restTemplate.exchange(apiUrl, HttpMethod.GET, entity, Array<CategoryModel>::class.java)
            response.body?.toList() ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    @CacheEvict(value = ["categories"], allEntries = true)
    fun createCategoryFromMap(payload: Map<String, Any>, token: String?): Map<*, *>? {
        val headers = HttpHeaders()
        headers.contentType = MediaType.APPLICATION_JSON
        if (!token.isNullOrBlank()) headers.setBearerAuth(token)
        
        // NORMALIZATION & VALIDATION
        val rawName = payload["category_name"]?.toString()?.trim() ?: ""
        val rawCode = payload["category_code"]?.toString()?.trim()?.uppercase() ?: ""
        
        if (rawName.isEmpty() || rawCode.isEmpty()) {
            return mapOf("error" to "Tên và mã danh mục không được để trống")
        }

        // Normalize Name: "máy tính" -> "Máy Tính"
        val normalizedName = rawName.split(" ").joinToString(" ") { it.lowercase().replaceFirstChar { char -> char.uppercase() } }
        
        // Check duplicates
        val allCats = getAllCategories(token)
        if (allCats.any { it.category_name.equals(normalizedName, ignoreCase = true) }) {
            return mapOf("error" to "Danh mục '$normalizedName' đã tồn tại")
        }
        if (allCats.any { it.category_code.equals(rawCode, ignoreCase = true) }) {
            return mapOf("error" to "Mã danh mục '$rawCode' đã được sử dụng")
        }

        val finalPayload = payload.toMutableMap()
        finalPayload["category_name"] = normalizedName
        finalPayload["category_code"] = rawCode
        
        val entity = HttpEntity(finalPayload, headers)
        println(">>> CATEGORY SERVICE: [POST] $apiUrl - Normalized Payload: $finalPayload")
        
        return try {
            val response = restTemplate.exchange(apiUrl, HttpMethod.POST, entity, Map::class.java)
            response.body
        } catch (e: org.springframework.web.client.HttpStatusCodeException) {
            val errorBody = e.responseBodyAsString
            mapOf("error" to (errorBody.takeIf { it.isNotBlank() } ?: e.message))
        } catch (e: Exception) {
            mapOf("error" to e.message)
        }
    }

    fun createCategory(category: CategoryModel, token: String?): Map<*, *>? {
        val payload = mapOf(
            "category_name" to category.category_name,
            "category_code" to category.category_code,
            "description" to category.description?.takeIf { it.isNotBlank() }
        )
        return createCategoryFromMap(payload as Map<String, Any>, token)
    }

    @CacheEvict(value = ["categories"], allEntries = true)
    fun updateCategoryFromMap(id: Int, payload: Map<String, Any>, token: String?): Map<*, *>? {
        val headers = HttpHeaders()
        headers.contentType = MediaType.APPLICATION_JSON
        if (!token.isNullOrBlank()) headers.setBearerAuth(token)
        
        // NORMALIZATION & VALIDATION
        val rawName = payload["category_name"]?.toString()?.trim() ?: ""
        val rawCode = payload["category_code"]?.toString()?.trim()?.uppercase() ?: ""
        
        if (rawName.isEmpty() || rawCode.isEmpty()) {
            return mapOf("error" to "Tên và mã danh mục không được để trống")
        }

        val normalizedName = rawName.split(" ").joinToString(" ") { it.lowercase().replaceFirstChar { char -> char.uppercase() } }
        
        // Check duplicates (excluding current id)
        val allCats = getAllCategories(token)
        if (allCats.any { it.category_name.equals(normalizedName, ignoreCase = true) && it.id != id }) {
            return mapOf("error" to "Tên danh mục '$normalizedName' đã tồn tại ở danh mục khác")
        }
        if (allCats.any { it.category_code.equals(rawCode, ignoreCase = true) && it.id != id }) {
            return mapOf("error" to "Mã danh mục '$rawCode' đã được sử dụng")
        }

        val finalPayload = payload.toMutableMap()
        finalPayload["category_name"] = normalizedName
        finalPayload["category_code"] = rawCode

        val entity = HttpEntity(finalPayload, headers)
        println(">>> CATEGORY SERVICE: [PUT] $apiUrl/$id - Normalized Payload: $finalPayload")
        
        return try {
            val response = restTemplate.exchange("$apiUrl/$id", HttpMethod.PUT, entity, Map::class.java)
            response.body
        } catch (e: org.springframework.web.client.HttpStatusCodeException) {
            val errorBody = e.responseBodyAsString
            mapOf("error" to (errorBody.takeIf { it.isNotBlank() } ?: e.message))
        } catch (e: Exception) {
            mapOf("error" to e.message)
        }
    }

    fun updateCategory(id: Int, category: CategoryModel, token: String?): Map<*, *>? {
        val payload = mapOf(
            "category_name" to category.category_name,
            "category_code" to category.category_code,
            "description" to category.description?.takeIf { it.isNotBlank() }
        )
        return updateCategoryFromMap(id, payload as Map<String, Any>, token)
    }

    @CacheEvict(value = ["categories"], allEntries = true)
    fun deleteCategory(id: Int, token: String?): Map<*, *>? {
        val headers = HttpHeaders()
        if (!token.isNullOrBlank()) {
            headers.setBearerAuth(token)
        }
        
        val entity = HttpEntity<Unit>(headers)
        println(">>> CATEGORY SERVICE: [DELETE] $apiUrl/$id")
        
        return try {
            val response = restTemplate.exchange("$apiUrl/$id", HttpMethod.DELETE, entity, Map::class.java)
            println(">>> CATEGORY SERVICE: Delete Response Status: ${response.statusCode}")
            response.body
        } catch (e: org.springframework.web.client.HttpStatusCodeException) {
            val errorBody = e.responseBodyAsString
            println(">>> CATEGORY SERVICE: DELETE HTTP ERROR ${e.statusCode} - $errorBody")
            mapOf("error" to (errorBody.takeIf { it.isNotBlank() } ?: e.message))
        } catch (e: Exception) {
            println(">>> CATEGORY SERVICE: DELETE FATAL ERROR - ${e.message}")
            mapOf("error" to e.message)
        }
    }
}
