export interface OrganizerField {
  id: string
  label: string
  guidedHint: string
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
      { id: 'topic-sentence', label: 'Topic Sentence', guidedHint: 'In this text, I noticed that ___', placeholder: 'Write your topic sentence…', icon: '🍔', rows: 2 },
      { id: 'detail-1', label: 'Supporting Detail 1', guidedHint: 'One detail that supports this is ___', placeholder: 'Write your first detail…', icon: '🥩', rows: 2 },
      { id: 'detail-2', label: 'Supporting Detail 2', guidedHint: 'Another detail is ___', placeholder: 'Write your second detail…', icon: '🥩', rows: 2 },
      { id: 'detail-3', label: 'Supporting Detail 3', guidedHint: 'A third detail is ___', placeholder: 'Write your third detail…', icon: '🥩', rows: 2 },
      { id: 'conclusion', label: 'Concluding Sentence', guidedHint: 'Therefore, I believe ___', placeholder: 'Write your conclusion…', icon: '🍔', rows: 2 },
    ],
  },
  'main-idea': {
    id: 'main-idea',
    name: 'Main Idea + Details',
    description: 'Identify the central idea of a text and the details that support it.',
    gradeRange: '2–8',
    fields: [
      { id: 'main-idea', label: 'Main Idea', guidedHint: 'The main idea of this text is ___', placeholder: 'What is this mostly about?', icon: '💡', rows: 2 },
      { id: 'detail-1', label: 'Supporting Detail 1', guidedHint: 'A detail that supports this is ___', placeholder: 'First supporting detail…', icon: '📌', rows: 2 },
      { id: 'detail-2', label: 'Supporting Detail 2', guidedHint: 'Another detail is ___', placeholder: 'Second supporting detail…', icon: '📌', rows: 2 },
      { id: 'detail-3', label: 'Supporting Detail 3', guidedHint: 'The text also shows ___', placeholder: 'Third supporting detail…', icon: '📌', rows: 2 },
      { id: 'detail-4', label: 'Supporting Detail 4', guidedHint: 'Finally, ___', placeholder: 'Fourth supporting detail…', icon: '📌', rows: 2 },
    ],
  },
  'compare-contrast': {
    id: 'compare-contrast',
    name: 'Compare & Contrast',
    description: 'Explore similarities and differences between two things, people, or ideas.',
    gradeRange: '3–12',
    fields: [
      { id: 'subject-a', label: 'Subject A', guidedHint: 'The first subject is ___', placeholder: 'Name the first thing…', icon: '⬅️', rows: 1 },
      { id: 'subject-b', label: 'Subject B', guidedHint: 'The second subject is ___', placeholder: 'Name the second thing…', icon: '➡️', rows: 1 },
      { id: 'differences-a', label: 'What makes A unique?', guidedHint: 'Unlike B, A ___', placeholder: 'What is different about A?', icon: '🔵', rows: 3 },
      { id: 'differences-b', label: 'What makes B unique?', guidedHint: 'Unlike A, B ___', placeholder: 'What is different about B?', icon: '🟠', rows: 3 },
      { id: 'similarities', label: 'What they share', guidedHint: 'Both ___ and ___ are ___', placeholder: 'What do they have in common?', icon: '🟰', rows: 3 },
      { id: 'conclusion', label: 'What I notice', guidedHint: 'After comparing, I think ___', placeholder: 'What does this comparison reveal?', icon: '💬', rows: 2 },
    ],
  },
  'story-map': {
    id: 'story-map',
    name: 'Story Map',
    description: 'Map out the key narrative elements: characters, setting, problem, events, and resolution.',
    gradeRange: 'K–8',
    fields: [
      { id: 'setting', label: 'Setting', guidedHint: 'The story takes place ___', placeholder: 'Where and when does it happen?', icon: '🗺️', rows: 2 },
      { id: 'characters', label: 'Characters', guidedHint: 'The main characters are ___', placeholder: 'Who are the important characters?', icon: '👤', rows: 2 },
      { id: 'problem', label: 'Problem / Conflict', guidedHint: 'The main problem is ___', placeholder: 'What is the central conflict?', icon: '⚡', rows: 2 },
      { id: 'events', label: 'Key Events', guidedHint: 'First ___, then ___, finally ___', placeholder: 'What are the most important events?', icon: '📋', rows: 4 },
      { id: 'resolution', label: 'Resolution', guidedHint: 'In the end, ___', placeholder: 'How is the problem solved?', icon: '✅', rows: 2 },
    ],
  },
}

export const TEMPLATE_ORDER = ['paragraph-builder', 'main-idea', 'compare-contrast', 'story-map']
