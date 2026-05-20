export const satBenchmarks = {
  readingWriting: 480,
  math: 530
};

export const digitalSatSections = [
  {
    id: "rw",
    name: "Reading and Writing",
    moduleMinutes: 32,
    questionsPerModule: 27,
    modules: 2,
    notes: [
      "Short passages with one question each.",
      "Second module adapts based on module-one performance.",
      "Practice should mix vocabulary, evidence, synthesis, and conventions."
    ]
  },
  {
    id: "math",
    name: "Math",
    moduleMinutes: 35,
    questionsPerModule: 22,
    modules: 2,
    notes: [
      "Calculator is available throughout the digital Math section.",
      "Includes multiple choice and student-produced response questions.",
      "Practice should include charts, tables, diagrams, and nonroutine algebra."
    ]
  }
];

export const officialDomainDetails: Record<string, { coverage: string; scoreReportMeaning: string; nextBandSkill: string }> = {
  info: {
    coverage: "About 26% of Reading and Writing",
    scoreReportMeaning: "Shows how well a student uses details, evidence, graphs, and central ideas.",
    nextBandSkill: "Choose evidence that directly supports a precise claim."
  },
  craft: {
    coverage: "About 28% of Reading and Writing",
    scoreReportMeaning: "Shows command of vocabulary in context, text purpose, and cross-text relationships.",
    nextBandSkill: "Use context clues and author-purpose labels before reading answers."
  },
  exp: {
    coverage: "About 20% of Reading and Writing",
    scoreReportMeaning: "Shows how well a student revises for transitions, synthesis, and rhetorical goals.",
    nextBandSkill: "Match every revision to the writer's stated goal."
  },
  conv: {
    coverage: "About 26% of Reading and Writing",
    scoreReportMeaning: "Shows control of grammar, sentence boundaries, punctuation, and usage.",
    nextBandSkill: "Spot the subject/verb core and sentence-boundary rule quickly."
  },
  alg: {
    coverage: "About 35% of Math",
    scoreReportMeaning: "Shows linear equation, inequality, function, and system fluency.",
    nextBandSkill: "Translate words into equations and solve without losing signs."
  },
  adv: {
    coverage: "About 35% of Math",
    scoreReportMeaning: "Shows nonlinear, quadratic, exponential, and equivalent-expression skill.",
    nextBandSkill: "Choose the equation form that reveals the requested value."
  },
  prob: {
    coverage: "About 15% of Math",
    scoreReportMeaning: "Shows data, rates, ratios, percentages, probability, and statistics skill.",
    nextBandSkill: "Keep units visible and identify the original value in percent questions."
  },
  geo: {
    coverage: "About 15% of Math",
    scoreReportMeaning: "Shows geometry, measurement, coordinate geometry, and trigonometry skill.",
    nextBandSkill: "Draw the figure, write the formula, then substitute."
  }
};

export const officialScoreReportNotes = [
  "SAT total score is the sum of Reading and Writing plus Math, on a 400-1600 scale.",
  "Section scores are reported from 200-800.",
  "College and Career Readiness Benchmarks are 480 for Reading and Writing and 530 for Math.",
  "The score report PDF includes Knowledge and Skills performance across eight content domains.",
  "Domain bars show level of mastery in that domain, not a separate scaled score."
];
