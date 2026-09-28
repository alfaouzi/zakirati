package com.lfouzi.zakirati.domain.service

import com.lfouzi.zakirati.domain.model.StoryAnalysisResult

interface StoryAnalysisService {
    suspend fun analyzeStories(
        firstStory: String,
        secondStory: String
    ): Result<StoryAnalysisResult>
}
