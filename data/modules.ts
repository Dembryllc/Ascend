import type { Module } from "@/types";

export const modules: Module[] = [
  {
    id: "info",
    section: "rw",
    name: "Information and Ideas",
    short: "Find evidence, summarize, and infer.",
    overview: "Learn how to locate strong evidence, identify central ideas, read charts, and make careful inferences from short SAT passages.",
    strategyNotes: ["Underline the claim before reading answer choices.", "Use line evidence instead of memory.", "For graph questions, translate the visual into one plain sentence first."],
    workedExample: {
      prompt: "A passage says urban trees lower street temperatures and reduce energy use. Which finding best supports the claim?",
      steps: ["Name the claim: trees reduce heat and energy use.", "Look for data that connects trees to both effects.", "Reject choices that mention parks generally but not energy or temperature."],
      answer: "A study showing tree-lined blocks were cooler and nearby buildings used less air conditioning."
    },
    colorClass: "module-color-info",
    progress: 64,
    confidence: 4,
    completed: false,
    practiced: 32,
    impact: "Medium",
    skillTag: "Evidence and inference"
  },
  {
    id: "craft",
    section: "rw",
    name: "Craft and Structure",
    short: "Words in context, purpose, and structure.",
    overview: "Practice vocabulary-in-context, text structure, author purpose, and cross-text relationship questions.",
    strategyNotes: ["Find transition words before filling blanks.", "Predict the author purpose in 3 words.", "For paired texts, label each author's position before comparing them."],
    workedExample: {
      prompt: "The scientist's claim was initially met with ________; only after replication did colleagues accept it.",
      steps: ["The second clause says colleagues accepted it later.", "That means they did not accept it at first.", "Choose the word that means doubt."],
      answer: "skepticism"
    },
    colorClass: "module-color-craft",
    progress: 22,
    confidence: 2,
    completed: false,
    practiced: 11,
    impact: "High",
    skillTag: "Words in context"
  },
  {
    id: "exp",
    section: "rw",
    name: "Expression of Ideas",
    short: "Transitions, synthesis, and revision.",
    overview: "Improve sentence placement, transitions, concision, and note-synthesis questions by matching each edit to the writer's goal.",
    strategyNotes: ["Read the goal before the notes.", "Choose transitions based on logic, not vibes.", "Prefer precise and concise answers unless the prompt asks for detail."],
    workedExample: {
      prompt: "A student wants to emphasize that a poet had two careers. Which note should be included?",
      steps: ["Identify the rhetorical goal: two careers.", "Scan notes for both jobs.", "Choose the answer that joins both clearly."],
      answer: "The poet worked as both a physician and a published writer."
    },
    colorClass: "module-color-exp",
    progress: 38,
    confidence: 3,
    completed: false,
    practiced: 18,
    impact: "High",
    skillTag: "Transitions and synthesis"
  },
  {
    id: "conv",
    section: "rw",
    name: "Standard English Conventions",
    short: "Grammar, punctuation, and sentence structure.",
    overview: "Sharpen grammar rules for punctuation, agreement, verb form, modifiers, and sentence boundaries.",
    strategyNotes: ["Find the subject before checking verbs.", "Use commas only when a rule allows them.", "If two complete sentences are joined, use a period, semicolon, or conjunction."],
    workedExample: {
      prompt: "The murals, painted in 1932, ________ recently restored.",
      steps: ["Subject is murals, plural.", "The phrase between commas is extra information.", "Choose the plural verb form."],
      answer: "were"
    },
    colorClass: "module-color-conv",
    progress: 71,
    confidence: 4,
    completed: false,
    practiced: 42,
    impact: "Medium",
    skillTag: "Punctuation and agreement"
  },
  {
    id: "alg",
    section: "math",
    name: "Algebra",
    short: "Linear equations, systems, and inequalities.",
    overview: "Build speed and accuracy with linear equations, inequalities, functions, and systems.",
    strategyNotes: ["Isolate variables one clean move at a time.", "Graph systems only when it helps.", "Check whether the question asks for x, y, or an expression."],
    workedExample: {
      prompt: "If 3x + 7 = 22, what is 2x?",
      steps: ["Subtract 7 to get 3x = 15.", "Divide by 3 to get x = 5.", "Double x."],
      answer: "10"
    },
    colorClass: "module-color-alg",
    progress: 88,
    confidence: 5,
    completed: true,
    practiced: 64,
    impact: "Medium",
    skillTag: "Linear equations"
  },
  {
    id: "adv",
    section: "math",
    name: "Advanced Math",
    short: "Quadratics, exponentials, and nonlinear forms.",
    overview: "Practice equivalent expressions, nonlinear equations, quadratics, exponentials, and function features.",
    strategyNotes: ["Factor before using heavier tools.", "Match equation form to what the question asks.", "For exponentials, identify the starting value and growth factor."],
    workedExample: {
      prompt: "The equation x² - 9 = 0 has which positive solution?",
      steps: ["Recognize difference of squares.", "Factor to (x - 3)(x + 3) = 0.", "Choose the positive solution."],
      answer: "3"
    },
    colorClass: "module-color-adv",
    progress: 76,
    confidence: 4,
    completed: false,
    practiced: 48,
    impact: "Medium",
    skillTag: "Nonlinear equations"
  },
  {
    id: "prob",
    section: "math",
    name: "Problem Solving and Data Analysis",
    short: "Ratios, stats, probability, and charts.",
    overview: "Turn real-world wording into rates, percentages, tables, statistics, and probability setups.",
    strategyNotes: ["Write units next to every number.", "For percent change, use change divided by original.", "Check whether the question asks for mean, median, or range."],
    workedExample: {
      prompt: "A price rises from $40 to $50. What is the percent increase?",
      steps: ["Find the change: 10.", "Divide by original: 10/40.", "Convert to a percent."],
      answer: "25%"
    },
    colorClass: "module-color-prob",
    progress: 82,
    confidence: 4,
    completed: false,
    practiced: 50,
    impact: "Low",
    skillTag: "Rates and percentages"
  },
  {
    id: "geo",
    section: "math",
    name: "Geometry and Trigonometry",
    short: "Area, volume, triangles, circles, and trig.",
    overview: "Review geometric formulas, angle facts, right-triangle trig, circles, and coordinate geometry.",
    strategyNotes: ["Draw or redraw the figure with only useful labels.", "Write the formula before plugging in.", "For right triangles, label opposite, adjacent, and hypotenuse."],
    workedExample: {
      prompt: "A right triangle has legs 6 and 8. What is the hypotenuse?",
      steps: ["Use a² + b² = c².", "Compute 36 + 64 = 100.", "Take the square root."],
      answer: "10"
    },
    colorClass: "module-color-geo",
    progress: 58,
    confidence: 3,
    completed: false,
    practiced: 28,
    impact: "Medium",
    skillTag: "Right triangles"
  }
];

export const moduleMap = new Map(modules.map((module) => [module.id, module]));
