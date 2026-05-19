export type Section = "rw" | "math";
export type Impact = "Low" | "Medium" | "High";
export type DomainBand = 1 | 2 | 3 | 4;
export type Confidence = 1 | 2 | 3 | 4 | 5;

export type Module = {
  id: string;
  section: Section;
  name: string;
  short: string;
  overview: string;
  strategyNotes: string[];
  workedExample: {
    prompt: string;
    steps: string[];
    answer: string;
  };
  colorClass: string;
  progress: number;
  confidence: Confidence;
  completed: boolean;
  practiced: number;
  impact: Impact;
  skillTag: string;
};

export type Question = {
  id: string;
  moduleId: string;
  domain: string;
  difficulty: "Easy" | "Medium" | "Hard";
  questionText: string;
  choices: string[];
  correctAnswer: string;
  explanation: string;
  skillTag: string;
};

export type ScoreProfile = {
  studentName: string;
  totalScore: number;
  rwScore: number;
  mathScore: number;
  rwPercentile?: number;
  mathPercentile?: number;
  totalPercentile?: number;
  testDate: string;
  targetScore: number;
  weeklyStudyGoal: number;
  domainBands: Record<string, DomainBand>;
  domainConfidence: Record<string, Confidence>;
};

export type StudySession = {
  day: string;
  focus: string;
  task: string;
  minutes: number;
  priority: "High" | "Medium" | "Low";
};

export type StudyPlan = {
  priorityAreas: Module[];
  recommendedModules: Module[];
  weeklySchedule: StudySession[];
  quickWins: Module[];
  majorGrowthAreas: Module[];
  targetScoreStrategy: string;
  encouragement: string;
  sectionBalance: string;
};

export type ProgressState = {
  completedModules: string[];
  practiceAccuracy: Record<string, number>;
  confidenceRatings: Record<string, Confidence>;
  timeSpentMinutes: Record<string, number>;
  scoreHistory: Array<{ date: string; total: number; rw: number; math: number }>;
};
