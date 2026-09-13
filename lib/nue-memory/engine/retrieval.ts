import { StructuredMemory, MemorySearchResult } from '../core/types';

export interface RetrievedContext {
  memories: StructuredMemory[];
  summaryTokens: string[];
  injectedContextBlock: string;
  categoryDirectives: Record<string, string>;
  totalRetrieved: number;
}

/**
 * Orchestrates retrieved memories into a high-density, formatted context injection block for AI agents
 */
export function formatAgentContext(
  searchResults: MemorySearchResult[],
  options: { maxItems?: number; domain?: string } = {}
): RetrievedContext {
  const maxItems = options.maxItems || 6;
  const activeResults = searchResults
    .filter((r) => r.memory.isActive)
    .slice(0, maxItems);

  const memories = activeResults.map((r) => r.memory);
  const summaryTokens: string[] = [];
  const categoryDirectives: Record<string, string> = {};

  const lines: string[] = [];

  for (const mem of memories) {
    const categoryTag = mem.category.toUpperCase();
    const token = `${mem.category}: ${mem.value.slice(0, 32)}...`;
    summaryTokens.push(token);
    categoryDirectives[mem.category] = mem.value;

    const confidencePct = Math.round(mem.confidence * 100);
    lines.push(`- [${categoryTag}]: ${mem.value} (confidence: ${confidencePct}%)`);
  }

  const injectedContextBlock =
    lines.length > 0
      ? `\n[Nue Persistent Memory Context]:\n${lines.join('\n')}\n`
      : '';

  return {
    memories,
    summaryTokens,
    injectedContextBlock,
    categoryDirectives,
    totalRetrieved: memories.length,
  };
}
