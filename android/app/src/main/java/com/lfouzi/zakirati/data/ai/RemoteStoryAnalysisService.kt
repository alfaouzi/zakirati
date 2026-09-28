package com.lfouzi.zakirati.data.ai

import com.lfouzi.zakirati.BuildConfig
import com.lfouzi.zakirati.domain.model.StoryAnalysisResult
import com.lfouzi.zakirati.domain.service.StoryAnalysisService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

@Serializable
private data class AnalysisRequest(
    val firstStory: String,
    val secondStory: String
)

class RemoteStoryAnalysisService(
    private val backendUrl: String = BuildConfig.BACKEND_URL,
    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .build(),
    private val json: Json = Json { ignoreUnknownKeys = true }
) : StoryAnalysisService {

    init {
        // Enforce HTTPS security: disallow cleartext HTTP unless explicitly on local development emulator/localhost
        val isLocalDev = backendUrl.contains("10.0.2.2") || backendUrl.contains("localhost") || backendUrl.contains("127.0.0.1")
        if (backendUrl.startsWith("http://") && !isLocalDev) {
            throw IllegalArgumentException("Production backend URL must strictly use HTTPS for child data security: $backendUrl")
        }
    }

    override suspend fun analyzeStories(
        firstStory: String,
        secondStory: String
    ): Result<StoryAnalysisResult> = withContext(Dispatchers.IO) {
        try {
            val reqPayload = AnalysisRequest(firstStory = firstStory, secondStory = secondStory)
            val jsonBody = json.encodeToString(AnalysisRequest.serializer(), reqPayload)

            val request = Request.Builder()
                .url(backendUrl)
                .post(jsonBody.toRequestBody("application/json; charset=utf-8".toMediaType()))
                .build()

            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext Result.failure(
                        Exception("Server error with status code: ${response.code}")
                    )
                }

                val bodyStr = response.body?.string() ?: return@withContext Result.failure(
                    Exception("Empty response from AI analysis backend")
                )

                val parsed = json.decodeFromString(StoryAnalysisResult.serializer(), bodyStr)
                Result.success(parsed)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
