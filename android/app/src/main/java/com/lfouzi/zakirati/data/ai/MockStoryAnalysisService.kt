package com.lfouzi.zakirati.data.ai

import com.lfouzi.zakirati.domain.model.StoryAnalysisResult
import com.lfouzi.zakirati.domain.service.StoryAnalysisService
import com.lfouzi.zakirati.domain.validation.StoryTranscriptValidator
import kotlinx.coroutines.delay

class MockStoryAnalysisService : StoryAnalysisService {

    override suspend fun analyzeStories(
        firstStory: String,
        secondStory: String
    ): Result<StoryAnalysisResult> {
        val trimmed1 = firstStory.trim()
        val trimmed2 = secondStory.trim()

        if (trimmed1.isBlank()) {
            return Result.failure(IllegalArgumentException("القصة الأولى فارغة"))
        }
        if (trimmed2.isBlank()) {
            return Result.failure(IllegalArgumentException("القصة الثانية فارغة"))
        }

        // Simulate short processing delay
        delay(1200)

        // Validate storytelling sufficiency - reject greeting-only or insufficient content
        val isFirstInsufficient = StoryTranscriptValidator.isInsufficient(trimmed1)
        val isSecondInsufficient = StoryTranscriptValidator.isInsufficient(trimmed2)

        if (isFirstInsufficient || isSecondInsufficient) {
            return Result.success(
                StoryAnalysisResult(
                    overallScore = 0,
                    mainEventsScore = 0,
                    sequenceScore = 0,
                    detailsScore = 0,
                    strengths = listOf("لا تتوفر تفاصيل أو أحداث كافية في النصين لتقييم التذكر"),
                    encouragementMessage = "النص المسجل يحتوي على ترحيب أو كلمات مقتضبة فقط، ولا توجد قصة مكتملة لتقييمها. شاركني قصة تحتوي على أحداث وأشخاص لنكتشف ما تذكرته!",
                    isFallback = true
                )
            )
        }

        // Grounded semantic comparison strictly against actual transcript content
        val stopWords = setOf(
            "في", "من", "على", "إلى", "الي", "عن", "مع", "هذا", "هذه", "ثم", "بعد",
            "كان", "كانت", "هو", "هي", "أنا", "انا", "نحن", "يا", "قد", "لقد", "أن", "ان"
        )

        fun extractContentWords(text: String): Set<String> {
            return text.split("\\s+".toRegex())
                .map { it.replace("""[^\p{L}\p{N}]""".toRegex(), "").trim() }
                .filter { it.length > 1 && !stopWords.contains(it) }
                .toSet()
        }

        val words1 = extractContentWords(trimmed1)
        val words2 = extractContentWords(trimmed2)

        val commonWords = words1.intersect(words2)
        val overlapRatio = if (words1.isNotEmpty()) {
            commonWords.size.toFloat() / words1.size.toFloat()
        } else {
            0.0f
        }

        val overall = (overlapRatio * 100).toInt().coerceIn(10, 100)
        val mainEvents = ((overlapRatio * 0.9f + 0.1f) * 100).toInt().coerceIn(10, 100)
        val sequence = if (words2.size >= (words1.size * 0.5f).toInt()) {
            ((overlapRatio * 0.85f + 0.15f) * 100).toInt().coerceIn(15, 100)
        } else {
            ((overlapRatio * 0.6f) * 100).toInt().coerceIn(10, 80)
        }
        val details = ((overlapRatio * 0.95f + 0.05f) * 100).toInt().coerceIn(10, 100)

        val strengths = mutableListOf<String>()
        if (commonWords.isNotEmpty()) {
            val sampled = commonWords.take(2).joinToString("، ")
            strengths.add("تذكرت عناصر رئيسية من القصة الأولى ($sampled)")
        } else {
            strengths.add("سردت القصة الثانية بأسلوب مختلف عن الأولى")
        }

        if (words2.size >= (words1.size * 0.6f).toInt()) {
            strengths.add("أعدت حكاية القصة بحجم وتفاصيل متقاربة")
        } else {
            strengths.add("لخصت الفكرة باختصار في الرواية الثانية")
        }

        val encouragement = when {
            overall >= 80 -> "رائع ومبهر يا بطل! تذكرت معظم تفاصيل وأحداث قصتك الأولى بدقة."
            overall >= 50 -> "أحسنت! تذكرت عدة تفاصيل أساسية من قصتك الأولى."
            else -> "محاولة جميلة في السرد! اختلفت الرواية الثانية عن الأولى، وفي المرة القادمة ستتذكر أكثر."
        }

        return Result.success(
            StoryAnalysisResult(
                overallScore = overall,
                mainEventsScore = mainEvents,
                sequenceScore = sequence,
                detailsScore = details,
                strengths = strengths.take(3),
                encouragementMessage = encouragement,
                isFallback = true
            )
        )
    }
}
