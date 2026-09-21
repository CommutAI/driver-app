import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, use a backend proxy
});

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class Agent {
  private messages: AgentMessage[] = [];

  async sendMessage(userMessage: string): Promise<string> {
    this.messages.push({ role: 'user', content: userMessage });

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: this.messages
      });

      const assistantMessage = response.content[0].type === 'text' 
        ? response.content[0].text 
        : 'Non-text response received';

      this.messages.push({ role: 'assistant', content: assistantMessage });
      
      return assistantMessage;
    } catch (error) {
      console.error('Agent error:', error);
      throw new Error('Failed to get response from agent');
    }
  }

  getConversationHistory(): AgentMessage[] {
    return [...this.messages];
  }

  clearConversation(): void {
    this.messages = [];
  }
}

export const agent = new Agent();
