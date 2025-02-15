/**
 *  This is a model for the response from the agent.
 *  It contains the response from the agent and the chat history.
 */

export type AgentResponse = {
    response: string;
    chat_history: string[];
};