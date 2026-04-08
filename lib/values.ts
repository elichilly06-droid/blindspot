export interface ValuesQuestion {
  id: string
  question: string
  options: string[]
  // 'ordinal' = distance between answers matters (e.g. politics)
  // 'categorical' = match or no match
  type: 'ordinal' | 'categorical'
}

export const VALUES_QUESTIONS: ValuesQuestion[] = [
  {
    id: 'politics',
    question: 'Politically, I would describe myself as…',
    options: ['Very liberal', 'Liberal', 'Moderate', 'Conservative', 'Very conservative', 'Apolitical'],
    type: 'ordinal',
  },
  {
    id: 'kids',
    question: 'When it comes to having kids…',
    options: ['I definitely want kids', 'I\'m open to it', 'Not sure yet', 'I don\'t want kids', 'I already have kids'],
    type: 'categorical',
  },
  {
    id: 'religion_role',
    question: 'Religion or spirituality plays __ in my life',
    options: ['A central role', 'An important role', 'A small role', 'No role'],
    type: 'ordinal',
  },
  {
    id: 'ambition',
    question: 'When it comes to career and ambition…',
    options: ['Career is my top priority', 'Work hard, play hard', 'I work to live, not live to work', 'Still figuring it out'],
    type: 'ordinal',
  },
  {
    id: 'social',
    question: 'My social life looks like…',
    options: ['Always out, love meeting people', 'Active but selective', 'Small close circle', 'I\'m a homebody'],
    type: 'ordinal',
  },
  {
    id: 'conflict',
    question: 'When there\'s conflict in a relationship…',
    options: ['I talk it out right away', 'I need space, then I talk', 'I tend to avoid conflict', 'Depends on the situation'],
    type: 'categorical',
  },
  {
    id: 'finances',
    question: 'My relationship with money…',
    options: ['I save aggressively', 'I save most, spend some', 'I balance saving and living', 'I live in the moment'],
    type: 'ordinal',
  },
  {
    id: 'health',
    question: 'Health and fitness in my life…',
    options: ['It\'s a lifestyle — I take it seriously', 'I stay active regularly', 'Casually — when I feel like it', 'Not really my thing'],
    type: 'ordinal',
  },
  {
    id: 'relationship_pace',
    question: 'In relationships, I tend to move…',
    options: ['Slowly — I take time to open up', 'At a natural pace', 'Pretty fast when there\'s a connection'],
    type: 'ordinal',
  },
  {
    id: 'living',
    question: 'Long term, I see myself living…',
    options: ['In a big city', 'In a smaller city or college town', 'In the suburbs', 'Somewhere rural', 'Wherever life takes me'],
    type: 'categorical',
  },
  {
    id: 'drinking',
    question: 'When it comes to drinking…',
    options: ['Yes, socially', 'Occasionally', 'Rarely', 'I don\'t drink'],
    type: 'ordinal',
  },
  {
    id: 'environment',
    question: 'The environment and sustainability…',
    options: ['Central to how I live', 'I actively try to do my part', 'I\'m aware but not super strict', 'Not a major focus for me'],
    type: 'ordinal',
  },
]

// Score compatibility between two sets of answers (0–1)
export function valuesCompatibilityScore(
  mine: Record<string, string>,
  theirs: Record<string, string>
): number {
  const questions = VALUES_QUESTIONS.filter(q => mine[q.id] && theirs[q.id])
  if (questions.length === 0) return 0.5 // neutral if no data

  const scores = questions.map(q => {
    const myIdx = q.options.indexOf(mine[q.id])
    const theirIdx = q.options.indexOf(theirs[q.id])
    if (myIdx === -1 || theirIdx === -1) return 0.5

    if (q.type === 'categorical') {
      return myIdx === theirIdx ? 1 : 0
    } else {
      // ordinal: score based on distance
      const maxDist = q.options.length - 1
      const dist = Math.abs(myIdx - theirIdx)
      return 1 - dist / maxDist
    }
  })

  return scores.reduce((a, b) => a + b, 0) / scores.length
}
