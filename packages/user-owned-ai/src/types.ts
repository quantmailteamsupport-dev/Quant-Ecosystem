export interface BYOMConfig {
  userId: string;
  defaultProvider: string | null;
  endpoints: ModelEndpoint[];
  costTracking: boolean;
  maxMonthlyBudget: number | null;
  localInferenceEnabled: boolean;
}

export interface ModelProvider {
  id: string;
  name: string;
  type: 'openai-compatible' | 'anthropic-compatible' | 'huggingface' | 'ollama' | 'custom';
  baseUrl: string;
  apiKey?: string;
  capabilities: ModelCapabilities;
  rateLimit: RateLimit;
}

export interface ModelEndpoint {
  id: string;
  providerId: string;
  modelId: string;
  url: string;
  apiKey?: string;
  active: boolean;
  priority: number;
  capabilities: ModelCapabilities;
  costPerToken: CostPerToken;
}

export interface InferenceRequest {
  id: string;
  endpointId: string;
  prompt: string;
  options: InferenceOptions;
  timestamp: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: InferenceResult;
}

export interface InferenceOptions {
  maxTokens: number;
  temperature: number;
  topP: number;
  stopSequences?: string[];
  stream: boolean;
}

export interface InferenceResult {
  text: string;
  tokensUsed: number;
  latencyMs: number;
  cost: number;
  model: string;
}

export interface ModelCapabilities {
  chat: boolean;
  completion: boolean;
  embedding: boolean;
  imageGeneration: boolean;
  codeGeneration: boolean;
  functionCalling: boolean;
  maxContextLength: number;
  streaming: boolean;
}

export interface CostPerToken {
  input: number;
  output: number;
  currency: string;
}

export interface RateLimit {
  requestsPerMinute: number;
  tokensPerMinute: number;
}

export interface CostSummary {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly';
  totalCost: number;
  totalTokens: number;
  requestCount: number;
  byEndpoint: Map<string, EndpointCost>;
  currency: string;
}

export interface EndpointCost {
  endpointId: string;
  cost: number;
  tokens: number;
  requests: number;
}
