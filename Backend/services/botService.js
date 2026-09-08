/**
 * Bot Response Service using ES6+
 */

export const generateBotResponse = async (userMessage = '') => {
  const text = userMessage.toLowerCase().trim();

  if (text.includes('hello') || text.includes('hi') || text.includes('hey')) {
    return 'Hello! How can I assist you today?';
  }
  if (text.includes('how are you')) {
    return "I'm doing great, thank you for asking! How about you?";
  }
  if (text.includes('help')) {
    return 'I can help you with answering questions, managing chat conversations, and interactive responses.';
  }
  if (text.includes('bye')) {
    return 'Goodbye! Have a fantastic day ahead!';
  }

  return `I received your message: "${userMessage}". How else can I help you?`;
};
