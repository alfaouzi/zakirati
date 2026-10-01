export type GameScreen =
  | 'HOME'
  | 'HOW_TO_PLAY'
  | 'ABOUT'
  | 'ROUND_ONE'
  | 'ROUND_ONE_RECORDING'
  | 'ROUND_ONE_RECORDED'
  | 'ROUND_TWO'
  | 'ROUND_TWO_RECORDING'
  | 'ROUND_TWO_RECORDED'
  | 'ANALYZING'
  | 'RESULT'
  | 'ERROR';

export interface StoryAnalysisResult {
  overallScore: number;
  mainEventsScore: number;
  sequenceScore: number;
  detailsScore: number;
  strengths: string[];
  encouragementMessage: string;
  isFallback?: boolean;
  recalledDetails?: string[];
  omittedDetails?: string[];
  changedDetails?: string[];
  charactersAnalysis?: string;
  placesAnalysis?: string;
  sequenceAnalysis?: string;
}

export interface SpeechRecognitionResultState {
  transcript: string;
  isListening: boolean;
  error?: string;
}
