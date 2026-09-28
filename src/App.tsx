/**
 * ذاكرتي تحكي (My Memory Tells)
 * Interactive educational memory and storytelling game for children in Arabic.
 * Developer: ل.فوزي
 */

import React, { useState } from 'react';
import { GameScreen, StoryAnalysisResult } from './types/game';
import { storyAnalysisService } from './services/aiService';
import { textToSpeechService } from './services/ttsService';
import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { HowToPlayScreen } from './components/HowToPlayScreen';
import { AboutScreen } from './components/AboutScreen';
import { RoundOneScreen } from './components/RoundOneScreen';
import { RoundTwoScreen } from './components/RoundTwoScreen';
import { AnalysisScreen } from './components/AnalysisScreen';
import { ResultScreen } from './components/ResultScreen';
import { AndroidViewWrapper } from './components/AndroidViewWrapper';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<GameScreen>('HOME');
  const [firstStory, setFirstStory] = useState<string>('');
  const [secondStory, setSecondStory] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<StoryAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const handleStartGame = () => {
    setFirstStory('');
    setSecondStory('');
    setAnalysisResult(null);
    setAnalysisError(null);
    setCurrentScreen('ROUND_ONE');
  };

  const handleRoundOneCompleted = (storyText: string) => {
    setFirstStory(storyText);
    setCurrentScreen('ROUND_TWO');
  };

  const handleRoundTwoCompleted = async (retoldStoryText: string) => {
    setSecondStory(retoldStoryText);
    setCurrentScreen('ANALYZING');
    setAnalysisError(null);

    try {
      const result = await storyAnalysisService.analyzeStories(firstStory, retoldStoryText);
      setAnalysisResult(result);
      setCurrentScreen('RESULT');
    } catch (err: any) {
      console.error('Analysis error:', err);
      setAnalysisError(
        'تعذر الاتصال بذاكرتي الآن. تحقق من اتصال الإنترنت وحاول مرة أخرى.'
      );
      setCurrentScreen('ERROR');
    }
  };

  const handleRetryAnalysis = async () => {
    if (!firstStory || !secondStory) {
      handleStartGame();
      return;
    }
    setCurrentScreen('ANALYZING');
    setAnalysisError(null);
    try {
      const result = await storyAnalysisService.analyzeStories(firstStory, secondStory);
      setAnalysisResult(result);
      setCurrentScreen('RESULT');
    } catch (err) {
      setAnalysisError(
        'لم نتمكن من مقارنة القصتين الآن. حاول مرة أخرى.'
      );
      setCurrentScreen('ERROR');
    }
  };

  const handleNavigateHome = () => {
    textToSpeechService.stop();
    setCurrentScreen('HOME');
  };

  const handleToggleSound = () => {
    if (soundEnabled) {
      textToSpeechService.stop();
    }
    setSoundEnabled(!soundEnabled);
  };

  return (
    <AndroidViewWrapper>
      <div className="flex flex-col min-h-full">
        <Header
          currentScreen={currentScreen}
          onNavigateHome={handleNavigateHome}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
        />

        <main className="flex-1 flex flex-col">
          {currentScreen === 'HOME' && (
            <HomeScreen
              onStartGame={handleStartGame}
              onOpenHowToPlay={() => setCurrentScreen('HOW_TO_PLAY')}
              onOpenAbout={() => setCurrentScreen('ABOUT')}
            />
          )}

          {currentScreen === 'HOW_TO_PLAY' && (
            <HowToPlayScreen
              onStartGame={handleStartGame}
              onBack={handleNavigateHome}
            />
          )}

          {currentScreen === 'ABOUT' && (
            <AboutScreen onBack={handleNavigateHome} />
          )}

          {currentScreen === 'ROUND_ONE' && (
            <RoundOneScreen
              onStoryCompleted={handleRoundOneCompleted}
              onCancel={handleNavigateHome}
            />
          )}

          {currentScreen === 'ROUND_TWO' && (
            <RoundTwoScreen
              onStoriesReadyForComparison={handleRoundTwoCompleted}
              onCancel={handleNavigateHome}
            />
          )}

          {currentScreen === 'ANALYZING' && <AnalysisScreen />}

          {currentScreen === 'RESULT' && analysisResult && (
            <ResultScreen
              result={analysisResult}
              onPlayAgain={handleStartGame}
              onGoHome={handleNavigateHome}
              soundEnabled={soundEnabled}
            />
          )}

          {currentScreen === 'ERROR' && (
            <div className="max-w-md mx-auto px-4 py-12 text-center my-auto">
              <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">عفوًا!</h3>
              <p className="text-base font-bold text-slate-600 mb-6">
                {analysisError || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.'}
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleRetryAnalysis}
                  className="w-full py-3.5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-lg flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>إعادة المحاولة</span>
                </button>
                <button
                  onClick={handleNavigateHome}
                  className="w-full py-3 px-6 rounded-2xl bg-white hover:bg-amber-50 text-amber-950 font-bold text-sm border border-amber-200 cursor-pointer"
                >
                  العودة للرئيسية
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </AndroidViewWrapper>
  );
}
