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

        delay(1000)

        // Validate storytelling sufficiency
        val validation1 = StoryTranscriptValidator.validate(trimmed1)
        val validation2 = StoryTranscriptValidator.validate(trimmed2)

        if (validation1 is StoryTranscriptValidator.ValidationResult.Insufficient ||
            validation2 is StoryTranscriptValidator.ValidationResult.Insufficient) {

            val reason = if (validation1 is StoryTranscriptValidator.ValidationResult.Insufficient) {
                validation1.gentleMessage
            } else {
                (validation2 as StoryTranscriptValidator.ValidationResult.Insufficient).gentleMessage
            }

            return Result.success(
                StoryAnalysisResult(
                    overallScore = 0,
                    mainEventsScore = 0,
                    sequenceScore = 0,
                    detailsScore = 0,
                    strengths = listOf("لم تتوفر معلومات كافية في التسجيل لإجراء تقييم التذكر"),
                    encouragementMessage = "$reason يُرجى إعادة السرد وحكاية قصة واضحة تحتوي على مواقف وأحداث لنكتشف معاً ما استطعت تذكره!",
                    isFallback = true,
                    recalledDetails = emptyList(),
                    omittedDetails = listOf("لم يتم تسجيل قصة كافية للمقارنة"),
                    changedDetails = emptyList(),
                    charactersAnalysis = "لا توجد شخصيات محددة لتحليلها.",
                    placesAnalysis = "لم يتم ذكر أماكن في النص.",
                    sequenceAnalysis = "لا يوجد تسلسل أحداث كافٍ."
                )
            )
        }

        // Grounded semantic comparison strictly against actual transcript content
        val stopWords = setOf(
            "في", "من", "على", "إلى", "الي", "عن", "مع", "هذا", "هذه", "ثم", "بعد",
            "كان", "كانت", "هو", "هي", "أنا", "انا", "نحن", "يا", "قد", "لقد", "أن", "ان"
        )

        fun extractContentWords(text: String): List<String> {
            return text.split("\\s+".toRegex())
                .map { it.replace("""[^\p{L}\p{N}]""".toRegex(), "").trim() }
                .filter { it.length > 1 && !stopWords.contains(it) }
        }

        val words1 = extractContentWords(trimmed1).distinct()
        val words2 = extractContentWords(trimmed2).distinct()

        val commonWords = words1.intersect(words2.toSet()).toList()
        val omittedWords = words1.filterNot { words2.contains(it) }

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
        val recalledDetails = mutableListOf<String>()
        val omittedDetails = mutableListOf<String>()
        val changedDetails = mutableListOf<String>()

        if (commonWords.isNotEmpty()) {
            val sample = commonWords.take(3).joinToString(" و ") { "\"$it\"" }
            strengths.add("تذكرت عناصر رئيسية من القصة الأولى مثل: $sample")
            recalledDetails.add("تذكرت عناصر وأحداثاً مهمة شملت: $sample")
        } else {
            strengths.add("سردت القصة الثانية بأسلوب مختلف عن الأولى")
        }

        if (omittedWords.isNotEmpty()) {
            val omittedSample = omittedWords.take(2).joinToString(" و ") { "\"$it\"" }
            omittedDetails.add("أغفلت بعض الكلمات التي ذكرتها أولاً مثل: $omittedSample")
        } else {
            omittedDetails.add("لم تغفل تفاصيل جوهرية من الرواية الأولى")
        }

        if (words2.size >= (words1.size * 0.6f).toInt()) {
            strengths.add("أعدت حكاية القصة بحجم وتفاصيل متقاربة")
            changedDetails.add("استخدمت أسلوبك الخاص للتعبير عن نفس الفكرة العامة")
        } else {
            strengths.add("لخصت الفكرة باختصار في الرواية الثانية")
            changedDetails.add("اخترت تلخيص القصة بدلاً من ذكر كل التفاصيل السابقة")
        }

        val charactersAnalysis = if (commonWords.isNotEmpty()) {
            "تم استرجاع الإشارات إلى الشخصيات بدقة متقاربة."
        } else {
            "ظهر اختلاف في الإشارة إلى الشخصيات بين الروايتين."
        }

        val placesAnalysis = "تم استرجاع البيئة العامة للأحداث بأسلوب شفهي جميل."
        val sequenceAnalysis = if (words2.size >= (words1.size * 0.6f).toInt()) {
            "تسلسل الأحداث توافق مع البداية والوسط في القصة الأولى."
        } else {
            "اقتصر تسلسل الأحداث على الفكرة الأساسية بشكل موجز."
        }

        val encouragement = when {
            overall >= 80 -> "رائع ومبهر يا بطل! تذكرت معظم تفاصيل وأحداث قصتك الأولى بدقة وبراعة."
            overall >= 50 -> "أحسنت! تذكرت عدة تفاصيل أساسية من قصتك الأولى، ومحاولتك تدل على تركيز رائع."
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
                isFallback = true,
                recalledDetails = recalledDetails,
                omittedDetails = omittedDetails,
                changedDetails = changedDetails,
                charactersAnalysis = charactersAnalysis,
                placesAnalysis = placesAnalysis,
                sequenceAnalysis = sequenceAnalysis
            )
        )
    }
}
