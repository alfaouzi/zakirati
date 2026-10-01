package com.lfouzi.zakirati.domain.validation

/**
 * Validates children's storytelling transcripts to ensure genuine narrative content
 * before allowing progression or analysis.
 * Non-punitive and child-friendly.
 */
object StoryTranscriptValidator {

    sealed class ValidationResult {
        data object Valid : ValidationResult()
        data class Insufficient(val gentleMessage: String) : ValidationResult()
    }

    private val GREETING_WORDS = setOf(
        "سلام", "السلام", "عليكم", "وعليكم", "ورحمة", "الله", "وبركاته",
        "مرحبا", "مرحباً", "اهلا", "أهلا", "أهلاً", "صباح", "الخير", "مساء",
        "هاي", "الو", "ألو", "شكرا", "شكراً", "نعم", "لا", "ايوه", "ايوة",
        "بسم", "الرحمن", "الرحيم", "تمام", "اوكي", "أوكي", "هلو", "هلا"
    )

    fun validate(transcript: String): ValidationResult {
        val trimmed = transcript.trim()
        if (trimmed.isBlank()) {
            return ValidationResult.Insufficient(
                "لم أسمع أي كلام. اضغط على الميكروفون وابدأ بحكاية قصتك!"
            )
        }

        // Tokenize and clean punctuation
        val words = trimmed.split("\\s+".toRegex())
            .map { it.replace("""[^\p{L}\p{N}]""".toRegex(), "").trim() }
            .filter { it.isNotEmpty() }

        if (words.isEmpty()) {
            return ValidationResult.Insufficient(
                "لم أسمع أي كلام واضح. اضغط على الميكروفون وحاول ثانية."
            )
        }

        val nonGreetingWords = words.filterNot { GREETING_WORDS.contains(it) }

        // If the transcript only contains greeting words
        if (nonGreetingWords.isEmpty()) {
            return ValidationResult.Insufficient(
                "بداية جميلة وترحيب لطيف! ولكن احكِ لي المزيد عن قصتك وما حدث فيها، لأستطيع تذكرها معك."
            )
        }

        // If very short (under 4 words) and lacks content
        if (words.size < 4 || nonGreetingWords.size < 3) {
            return ValidationResult.Insufficient(
                "هذه بداية مشوقة! احكِ لي مزيداً من تفاصيل القصة وماذا حدث، حتى نتذكرها معاً."
            )
        }

        return ValidationResult.Valid
    }

    fun isInsufficient(transcript: String): Boolean {
        return validate(transcript) is ValidationResult.Insufficient
    }
}
