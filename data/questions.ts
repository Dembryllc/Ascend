import type { Question } from "@/types";

const q = (
  id: string,
  moduleId: string,
  difficulty: Question["difficulty"],
  questionText: string,
  choices: string[],
  correctAnswer: string,
  explanation: string,
  skillTag: string
): Question => ({
  id,
  moduleId,
  domain: moduleId,
  difficulty,
  questionText,
  choices,
  correctAnswer,
  explanation,
  skillTag
});

export const questions: Question[] = [
  q("info-1", "info", "Easy", "The passage states that the new library extended evening hours after students requested more study space. Which choice best describes the main idea?", ["The library replaced most printed books.", "Student needs influenced a library policy change.", "Evening classes became more popular.", "The school reduced its study spaces."], "Student needs influenced a library policy change.", "The detail about student requests explains why the library changed its hours.", "Central idea"),
  q("info-2", "info", "Medium", "A graph shows bike trips rising from 1,000 in May to 1,500 in June. Which statement is supported?", ["Bike trips increased by 50%.", "Bike trips doubled.", "Bike trips fell by 500.", "June had 50 total trips."], "Bike trips increased by 50%.", "The increase is 500, and 500 divided by the May value of 1,000 is 50%.", "Quantitative evidence"),
  q("info-3", "info", "Hard", "A historian argues that letters reveal ordinary citizens' views better than official speeches do. Which evidence best supports the claim?", ["A speech was printed in several newspapers.", "Private letters described food prices and local worries.", "The mayor gave speeches every month.", "A museum displayed old campaign posters."], "Private letters described food prices and local worries.", "The claim is about ordinary citizens' views, so private letters with everyday concerns are the strongest evidence.", "Evidence selection"),
  q("craft-1", "craft", "Easy", "The artist was known for meticulous work; each sculpture was carved with ________ attention to detail.", ["careful", "careless", "random", "temporary"], "careful", "Meticulous means extremely careful, so careful fits the context.", "Words in context"),
  q("craft-2", "craft", "Medium", "The biologist's findings were initially met with ________; only after a second lab replicated the experiments did colleagues accept them.", ["enthusiasm", "skepticism", "reverence", "confusion"], "skepticism", "The later acceptance shows colleagues first doubted the findings.", "Words in context"),
  q("craft-3", "craft", "Hard", "Text 1 claims community gardens mainly improve nutrition. Text 2 argues their biggest effect is social connection. How would Text 2 most likely respond to Text 1?", ["By denying that gardens can produce food", "By agreeing that nutrition is the only measurable effect", "By saying Text 1 overlooks an important social benefit", "By claiming gardens are too expensive to maintain"], "By saying Text 1 overlooks an important social benefit", "Text 2 shifts the emphasis from nutrition to social connection, so it would call out what Text 1 misses.", "Cross-text connection"),
  q("exp-1", "exp", "Easy", "Which transition best completes the sentence? The telescope was expensive. ________, the school purchased it because students would use it for years.", ["However", "For example", "Similarly", "Instead"], "However", "The second sentence contrasts cost with the decision to buy it.", "Transitions"),
  q("exp-2", "exp", "Medium", "A writer wants to emphasize that an invention was widely adopted. Which sentence best fits?", ["The inventor had many unrelated hobbies.", "Within five years, factories on three continents used the device.", "The device was painted blue.", "The inventor wrote a short letter."], "Within five years, factories on three continents used the device.", "Wide adoption is shown by use in many factories across continents.", "Rhetorical synthesis"),
  q("exp-3", "exp", "Hard", "Which revision is most concise while preserving meaning? The reason the team delayed the launch was because the software had bugs.", ["The team delayed the launch because the software had bugs.", "Due to the reason that bugs existed, the team delayed the launch.", "The launch, which was delayed by the team, had software bugs.", "The team, for bug reasons, delayed the launch."], "The team delayed the launch because the software had bugs.", "This removes redundancy while keeping the causal relationship clear.", "Concision"),
  q("conv-1", "conv", "Easy", "Choose the correct verb: The results of the survey ________ surprising.", ["was", "were", "is", "has been"], "were", "The subject results is plural, so the verb should be were.", "Agreement"),
  q("conv-2", "conv", "Medium", "Which choice completes the sentence correctly? The fossil was rare ________ it changed scientists' understanding of the species.", ["and", ", and", "; and", ", it"], ", and", "Two complete clauses can be joined with a comma plus a coordinating conjunction.", "Sentence boundaries"),
  q("conv-3", "conv", "Hard", "Which sentence uses punctuation correctly?", ["Nora, a skilled coder, built the app.", "Nora a skilled coder, built the app.", "Nora, a skilled coder built, the app.", "Nora a skilled coder built the app."], "Nora, a skilled coder, built the app.", "The phrase a skilled coder is nonessential and should be set off with two commas.", "Punctuation"),
  q("alg-1", "alg", "Easy", "If 4x - 3 = 13, what is x?", ["2", "3", "4", "5"], "4", "Add 3 to get 4x = 16, then divide by 4.", "Linear equations"),
  q("alg-2", "alg", "Medium", "A line has slope 2 and passes through (0, 5). Which equation represents it?", ["y = 2x + 5", "y = 5x + 2", "y = 2x - 5", "y = x + 7"], "y = 2x + 5", "Slope-intercept form is y = mx + b; m = 2 and b = 5.", "Linear functions"),
  q("alg-3", "alg", "Hard", "If 2x + y = 11 and x - y = 1, what is x?", ["3", "4", "5", "6"], "4", "Add the equations after rewriting y = x - 1, giving 3x - 1 = 11, so x = 4.", "Systems"),
  q("adv-1", "adv", "Easy", "What is the positive solution to x² = 49?", ["5", "6", "7", "14"], "7", "The positive square root of 49 is 7.", "Quadratics"),
  q("adv-2", "adv", "Medium", "Which expression is equivalent to (x + 3)(x - 3)?", ["x² - 9", "x² + 9", "x² - 6", "2x - 9"], "x² - 9", "This is a difference of squares.", "Equivalent forms"),
  q("adv-3", "adv", "Hard", "A function doubles each time x increases by 1 and f(0)=3. What is f(3)?", ["6", "9", "18", "24"], "24", "Starting at 3, double three times: 6, 12, 24.", "Exponential growth"),
  q("prob-1", "prob", "Easy", "A class has 12 juniors and 18 seniors. What fraction are juniors?", ["2/5", "3/5", "2/3", "5/2"], "2/5", "There are 30 students total, and 12/30 simplifies to 2/5.", "Ratios"),
  q("prob-2", "prob", "Medium", "The mean of 4, 7, 9, and x is 8. What is x?", ["8", "10", "12", "14"], "12", "A mean of 8 over four numbers means total 32; 4 + 7 + 9 = 20, so x = 12.", "Mean"),
  q("prob-3", "prob", "Hard", "A bag has 5 red, 3 blue, and 2 green marbles. What is the probability of choosing a blue marble?", ["1/5", "3/10", "1/3", "3/7"], "3/10", "There are 10 marbles total and 3 are blue.", "Probability"),
  q("geo-1", "geo", "Easy", "A rectangle has length 9 and width 4. What is its area?", ["13", "18", "26", "36"], "36", "Area of a rectangle is length times width: 9 x 4 = 36.", "Area"),
  q("geo-2", "geo", "Medium", "A right triangle has legs 5 and 12. What is the hypotenuse?", ["13", "15", "17", "60"], "13", "Use the Pythagorean theorem: 25 + 144 = 169, and the square root is 13.", "Right triangles"),
  q("geo-3", "geo", "Hard", "A circle has radius 3. Which expression gives its area?", ["3π", "6π", "9π", "12π"], "9π", "Circle area is πr², so π times 3² equals 9π.", "Circles")
];
