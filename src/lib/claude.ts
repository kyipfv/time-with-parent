import Anthropic from '@anthropic-ai/sdk'

// Initialize Claude API client
const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_CLAUDE_API_KEY || '',
  dangerouslyAllowBrowser: true // Required for browser usage
})

export const brainstormGiftIdeas = async (parentInfo: {
  name: string
  relationship: string
  age: number
  interests?: string
  notes?: string
}) => {
  try {
    const prompt = `Help me brainstorm thoughtful gift ideas for my ${parentInfo.relationship}, ${parentInfo.name}, who is ${parentInfo.age} years old. 
    ${parentInfo.interests ? `Their interests include: ${parentInfo.interests}.` : ''}
    ${parentInfo.notes ? `Additional context: ${parentInfo.notes}.` : ''}
    
    Please suggest 5 creative and thoughtful gift ideas that would be meaningful for an elderly parent. For each gift, provide:
    1. The gift idea
    2. Why it would be meaningful
    3. Price range (budget-friendly, moderate, or premium)
    
    Format as JSON array with objects containing: title, description, priceRange`

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const content = response.content[0]
    if (content.type === 'text') {
      // Extract JSON from response
      const jsonMatch = content.text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    }
    
    return []
  } catch (error) {
    console.error('Error brainstorming gift ideas:', error)
    return []
  }
}

export const parseAppointmentWithClaude = async (input: string): Promise<{
  doctor?: string
  specialty?: string
  date?: string
  time?: string
  location?: string
  reason?: string
} | null> => {
  try {
    const prompt = `Parse this medical appointment description and extract the details: "${input}"
    
    Extract and return as JSON:
    - doctor: Doctor's name
    - specialty: Medical specialty
    - date: Date in YYYY-MM-DD format (today is ${new Date().toISOString().split('T')[0]})
    - time: Time in HH:MM format (24-hour)
    - location: Location/hospital/clinic name
    - reason: Reason for appointment
    
    If a field is not mentioned, omit it from the response.
    Return only valid JSON, no explanation.`

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const content = response.content[0]
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    }
    
    return null
  } catch (error) {
    console.error('Error parsing appointment with Claude:', error)
    return null
  }
}