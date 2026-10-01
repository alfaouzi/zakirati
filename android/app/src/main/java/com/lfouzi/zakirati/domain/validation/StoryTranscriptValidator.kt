package com.lfouzi.zakirati.domain.validation

/**
 * Validates storytelling content in "صدى حكايتي" to distinguish between:
 * 1. Empty or extremely short recordings (تسجيل فارغ أو قصير جداً)
 * 2. Greetings and polite introductions (تحية فقط)
 * 3. Unclear / mumbled / repetitive filler speech (كلام غير واضح)
 * 4. Genuine storytelling narrative (حكاية قابلة للتحليل)
 *
 * Requests retelling if content is insufficient, preventing fabricated strengths.
 */
object StoryTranscriptValidator {

    enum class ContentCategory {
        EMPTY_OR_TOO_SHORT,
        GREETING,
        UNCLEAR,
        VALID_STORY
    }

    sealed class ValidationResult {
        data object Valid : ValidationResult()
        data class Insufficient(val category: ContentCategory, val gentleMessage: String) : ValidationResult()
    }

    private val GREETING_WORDS = setOf(
        "سلام", "السلام", "عليكم", "وعليكم", "ورحمة", "الله", "وبركاته",
        "مرحبا", "مرحباً", "اهلا", "أهلا", "أهلاً", "صباح", "الخير", "مساء",
        "النور", "شكرا", "شكراً", "هاي", "هلو", "الو", "ألو", "كيف", "حالك",
        "الحال", "تمام", "بخير", "هلا", "عافية", "يعطيك", "العافية", "يسلمو",
        "بسم", "الرحمن", "الرحيم", "يا", "مية", "أهلين", "اهلين", "أصدقاء", "اصدقاء"
    )

    private val FILLER_SOUNDS = setOf(
        "اممم", "امممم", "ممم", "اها", "اه", "اووه", "اوو", "اييي",
        "هاها", "هاهاها", "هههه", "ههه", "بلابلا", "يعني", "شو", "ايش"
    )

    fun validate(transcript: String): ValidationResult {
        val trimmed = transcript.trim()
        if (trimmed.isBlank()) {
            return ValidationResult.Insufficient(
                ContentCategory.EMPTY_OR_TOO_SHORT,
                "لم أسمع أي كلام. اضغط على الميكروفون وابدأ بحكاية قصتك!"
            )
        }

        // Tokenize and clean punctuation
        val words = trimmed.split("\\s+".toRegex())
            .map { it.replace("""[^\p{L}\p{N}]""".toRegex(), "").trim() }
            .filter { it.isNotEmpty() }

        if (words.size < 3) {
            return ValidationResult.Insufficient(
                ContentCategory.EMPTY_OR_TOO_SHORT,
                "التسجيل قصير جداً! احكِ لي قصة أو موقفاً كاملاً عما حدث."
            )
        }

        // Check for unclear or repetitive speech
        val uniqueWords = words.map { it.lowercase() }.toSet()
        if (uniqueWords.size <= 2 && words.size >= 3) {
            return ValidationResult.Insufficient(
                ContentCategory.UNCLEAR,
                "الكلام مكرر أو غير واضح بما يكفي لفهم أحداث القصة. حاول إعادة السرد بوضوح."
            )
        }

        val fillerCount = words.count { FILLER_SOUNDS.contains(it) }
        if (fillerCount.toFloat() / words.size > 0.5f) {
            return ValidationResult.Insufficient(
                ContentCategory.UNCLEAR,
                "لم نتمكن من سماع قصة واضحة. اضغط على الميكروفون وأعد السرد بهدوء."
            )
        }

        // Check for greetings
        val greetingCount = words.count { GREETING_WORDS.contains(it) }
        val nonGreetingWords = words.filterNot { GREETING_WORDS.contains(it) || FILLER_SOUNDS.contains(it) }

        if (nonGreetingWords.size < 2 || greetingCount.toFloat() / words.size >= 0.5f) {
            return ValidationResult.Insufficient(
                ContentCategory.GREETING,
                "تحية طيبة وبداية جميلة! ولكن نحتاج إلى سماع قصتك؛ احكِ لي ماذا حدث معك؟"
            )
        }

        if (nonGreetingWords.size < 3) {
            return ValidationResult.Insufficient(
                ContentCategory.EMPTY_OR_TOO_SHORT,
                "هذه بداية مشوقة! احكِ لي مزيداً من تفاصيل القصة وماذا حدث، حتى نتذكرها معاً."
            )
        }

        return ValidationResult.Valid
    }

    fun isInsufficient(transcript: String): Boolean {
        return validate(transcript) is ValidationResult.Insufficient
    }

    fun classify(transcript: String): ContentCategory {
        return when (val res = validate(transcript)) {
            is ValidationResult.Valid -> ContentCategory.VALID_STORY
            is ValidationResult.Insufficient -> res.category
        }
    }
}
