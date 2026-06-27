export interface OrganizerField {
  id: string
  label: string
  guidedHint: string
  guidedSteps?: string[]
  placeholder: string
  icon: string
  rows: number
}

export interface OrganizerTemplate {
  id: string
  name: string
  description: string
  gradeRange: string
  fields: OrganizerField[]
}

export const ORGANIZER_TEMPLATES: Record<string, OrganizerTemplate> = {
  'paragraph-builder': {
    id: 'paragraph-builder',
    name: 'Paragraph Builder',
    description: 'Write a structured paragraph with a topic sentence, supporting details, and a conclusion.',
    gradeRange: 'K–8',
    fields: [
      { id: 'topic-sentence', label: 'Topic Sentence', guidedHint: 'In this text, I noticed that ___', guidedSteps: ['Name the text or topic.', 'Tell the reader your main idea in one clear sentence.'], placeholder: 'Write your topic sentence…', icon: '🍔', rows: 3 },
      { id: 'detail-1', label: 'Supporting Detail 1', guidedHint: 'One detail that supports this is ___', guidedSteps: ['Go back to the page where you found evidence.', 'Write one fact, quote, or event that proves your topic sentence.'], placeholder: 'Write your first detail…', icon: '🥩', rows: 3 },
      { id: 'detail-2', label: 'Supporting Detail 2', guidedHint: 'Another detail is ___', guidedSteps: ['Find a second piece of evidence.', 'Explain how it connects to your main idea.'], placeholder: 'Write your second detail…', icon: '🥩', rows: 3 },
      { id: 'detail-3', label: 'Supporting Detail 3', guidedHint: 'A third detail is ___', guidedSteps: ['Look for one more important example.', 'Make sure it is different from your first two details.'], placeholder: 'Write your third detail…', icon: '🥩', rows: 3 },
      { id: 'conclusion', label: 'Concluding Sentence', guidedHint: 'Therefore, I believe ___', guidedSteps: ['Restate your main idea in a new way.', 'Leave the reader with a final thought.'], placeholder: 'Write your conclusion…', icon: '🍔', rows: 3 },
    ],
  },
  'main-idea': {
    id: 'main-idea',
    name: 'Main Idea + Details',
    description: 'Identify the central idea of a text and the details that support it.',
    gradeRange: '2–8',
    fields: [
      { id: 'main-idea', label: 'Main Idea', guidedHint: 'The main idea of this text is ___', guidedSteps: ['Ask: What is this mostly about?', 'Write the biggest idea, not a tiny detail.'], placeholder: 'What is this mostly about?', icon: '💡', rows: 3 },
      { id: 'detail-1', label: 'Supporting Detail 1', guidedHint: 'A detail that supports this is ___', guidedSteps: ['Find one important detail from the text.', 'Use it to prove your main idea.'], placeholder: 'First supporting detail…', icon: '📌', rows: 3 },
      { id: 'detail-2', label: 'Supporting Detail 2', guidedHint: 'Another detail is ___', guidedSteps: ['Find another detail from a different part of the text.', 'Tell why it matters.'], placeholder: 'Second supporting detail…', icon: '📌', rows: 3 },
      { id: 'detail-3', label: 'Supporting Detail 3', guidedHint: 'The text also shows ___', guidedSteps: ['Look for a fact, example, or event.', 'Connect it back to the main idea.'], placeholder: 'Third supporting detail…', icon: '📌', rows: 3 },
      { id: 'detail-4', label: 'Supporting Detail 4', guidedHint: 'Finally, ___', guidedSteps: ['Add one final detail if the text gives you one.', 'Skip repeated details. Choose something new.'], placeholder: 'Fourth supporting detail…', icon: '📌', rows: 3 },
    ],
  },
  'compare-contrast': {
    id: 'compare-contrast',
    name: 'Compare & Contrast',
    description: 'Explore similarities and differences between two things, people, or ideas.',
    gradeRange: '3–12',
    fields: [
      { id: 'subject-a', label: 'Subject A', guidedHint: 'The first subject is ___', guidedSteps: ['Name the first person, place, idea, or thing.', 'Use the same name throughout your organizer.'], placeholder: 'Name the first thing…', icon: '⬅️', rows: 2 },
      { id: 'subject-b', label: 'Subject B', guidedHint: 'The second subject is ___', guidedSteps: ['Name the second person, place, idea, or thing.', 'Check that it is different from Subject A.'], placeholder: 'Name the second thing…', icon: '➡️', rows: 2 },
      { id: 'differences-a', label: 'What makes A unique?', guidedHint: 'Unlike B, A ___', guidedSteps: ['Write something true only about Subject A.', 'Add evidence from the text if you can.'], placeholder: 'What is different about A?', icon: '🔵', rows: 4 },
      { id: 'differences-b', label: 'What makes B unique?', guidedHint: 'Unlike A, B ___', guidedSteps: ['Write something true only about Subject B.', 'Use the same kind of evidence you used for A.'], placeholder: 'What is different about B?', icon: '🟠', rows: 4 },
      { id: 'similarities', label: 'What they share', guidedHint: 'Both ___ and ___ are ___', guidedSteps: ['Find something both subjects have in common.', 'Avoid vague words like “good” or “interesting.”'], placeholder: 'What do they have in common?', icon: '🟰', rows: 4 },
      { id: 'conclusion', label: 'What I notice', guidedHint: 'After comparing, I think ___', guidedSteps: ['Tell what the comparison helped you understand.', 'Use “because” to explain your thinking.'], placeholder: 'What does this comparison reveal?', icon: '💬', rows: 3 },
    ],
  },
  'story-map': {
    id: 'story-map',
    name: 'Story Map',
    description: 'Map out the key narrative elements: characters, setting, problem, events, and resolution.',
    gradeRange: 'K–8',
    fields: [
      { id: 'setting', label: 'Setting', guidedHint: 'The story takes place ___', guidedSteps: ['Name where the story happens.', 'Add when it happens if the text tells you.'], placeholder: 'Where and when does it happen?', icon: '🗺️', rows: 3 },
      { id: 'characters', label: 'Characters', guidedHint: 'The main characters are ___', guidedSteps: ['Name the most important characters.', 'Add one word that describes each character.'], placeholder: 'Who are the important characters?', icon: '👤', rows: 3 },
      { id: 'problem', label: 'Problem / Conflict', guidedHint: 'The main problem is ___', guidedSteps: ['Ask: What does the character want or need?', 'Ask: What gets in the way?'], placeholder: 'What is the central conflict?', icon: '⚡', rows: 3 },
      { id: 'events', label: 'Key Events', guidedHint: 'First ___, then ___, finally ___', guidedSteps: ['List events in order.', 'Choose events that change the story, not every small detail.'], placeholder: 'What are the most important events?', icon: '📋', rows: 5 },
      { id: 'resolution', label: 'Resolution', guidedHint: 'In the end, ___', guidedSteps: ['Tell how the problem ends or changes.', 'Explain what the character learns if the story shows it.'], placeholder: 'How is the problem solved?', icon: '✅', rows: 3 },
    ],
  },
}

export const TEMPLATE_ORDER = ['paragraph-builder', 'main-idea', 'compare-contrast', 'story-map']
