import {Injectable, OnModuleInit} from '@nestjs/common';
import {ElasticsearchService} from '@nestjs/elasticsearch';
import {randomUUID} from 'crypto';
import {isDeepStrictEqual} from 'util';
import {Location} from '../evaluation/evaluation.schema';
import {SearchResult, SearchSnippet} from './search.dto';

interface FileDocument {
  assignment: string;
  solution: string;
  file: string;
  content: string;
}

@Injectable()
export class SearchService implements OnModuleInit {
  constructor(
    private elasticsearchService: ElasticsearchService,
  ) {
  }

  async onModuleInit() {
    const files = await this.elasticsearchService.indices.get({
      index: 'files',
    });
    const {0: oldName, 1: oldData} = Object.entries(files.body)[0];

    const pattern = Object.values({
      number: /[+-]?[0-9]+(\.[0-9]+)?/,
      string: /["](\\\\|\\["]|[^"])*["]/,
      char: /'(\\\\|\\'|[^'])*'/,
      identifier: /[a-zA-Z$_][a-zA-Z0-9$_]*/,
      symbol: /[(){}<>\[\].,;+\-*/%|&=!?:@^]/,
    }).map(r => r.source).join('|');

    const expectedAnalysis = {
      analyzer: {
        code: {
          tokenizer: 'code',
        },
      },
      tokenizer: {
        code: {
          type: 'simple_pattern',
          pattern,
        },
      },
    };

    const expectedContent = {
      type: 'text',
      analyzer: 'code',
      term_vector: 'with_positions_offsets',
    };
    const actualContent = oldData.mappings?.properties?.content;
    const actualAnalysis = oldData.settings?.index?.analysis;
    if (isDeepStrictEqual(expectedContent, actualContent) && isDeepStrictEqual(actualAnalysis, expectedAnalysis)) {
      return;
    }

    const newName = 'files-' + Date.now();
    console.info('Migrating file index:', oldName, '->', newName);

    await this.elasticsearchService.indices.create({
      index: newName,
      body: {
        mappings: {
          properties: {
            content: expectedContent,
          },
        },
        settings: {
          analysis: expectedAnalysis
        },
      },
    });
    await this.elasticsearchService.reindex({
      body: {
        source: {
          index: oldName,
        },
        dest: {
          index: newName,
        },
      },
    });
    await this.elasticsearchService.indices.updateAliases({
      body: {
        actions: [
          {remove_index: {index: oldName}},
          {add: {index: newName, alias: 'files'}},
        ],
      },
    });
  }

  async addFile(assignment: string, solution: string, file: string, content: string) {
    const body: FileDocument = {
      assignment,
      solution,
      file,
      content,
    };
    await this.elasticsearchService.index({
      index: 'files',
      id: `${assignment}/${solution}/${file}`,
      body,
    });
  }

  async find(assignment: string, snippet: string, context?: number): Promise<SearchResult[]> {
    const uniqueId = randomUUID();
    const result = await this.elasticsearchService.search({
      index: 'files',
      body: {
        size: 10000,
        query: {
          bool: {
            must: {
              match_phrase: {
                content: {
                  query: snippet,
                },
              },
            },
            filter: [{
              term: {
                assignment,
              },
            }],
          },
        },
        highlight: {
          fields: {
            content: {},
          },
          pre_tags: [uniqueId],
          post_tags: [uniqueId],
          number_of_fragments: 0,
          type: 'fvh',
        },
      },
    });
    const grouped = new Map<string, SearchResult>();
    for (let hit of result.body.hits.hits) {
      const result = this._convertHit(hit, uniqueId, context);
      const existing = grouped.get(result.solution);
      if (existing) {
        existing.snippets.push(...result.snippets);
      } else {
        grouped.set(result.solution, result);
      }
    }
    return [...grouped.values()];
  }

  _convertHit(hit: { _source: FileDocument, highlight: { content: string[] } }, uniqueId: string, contextLines?: number): SearchResult {
    const {assignment, solution, file, content} = hit._source;
    const lineStartIndices = this._buildLineStartList(content);
    const highlightContent = hit.highlight.content[0];
    const split = highlightContent.split(uniqueId);

    let start = 0;
    const snippets: SearchSnippet[] = [];

    for (let i = 1; i < split.length; i += 2) {
      start += split[i - 1].length;

      const code = split[i];
      const end = start + code.length;
      const from = this._findLocation(lineStartIndices, start);
      const to = this._findLocation(lineStartIndices, end);
      const snippet: SearchSnippet = {
        file,
        from,
        to,
        code,
        comment: '',
      };

      if (contextLines !== undefined) {
        const contextStart = lineStartIndices[from.line < contextLines ? 0 : from.line - contextLines];
        const contextEnd = to.line + contextLines + 1 >= lineStartIndices.length ? code.length : lineStartIndices[to.line + contextLines + 1];
        snippet.context = content.substring(contextStart, contextEnd);
      }

      snippets.push(snippet);

      start = end;
    }

    return {assignment, solution, snippets};
  }

  _findLocation(lineStarts: number[], start: number): Location {
    // TODO may have off-by-one-errors
    let line = lineStarts.findIndex(c => c > start) - 1;
    if (line < 0) {
      line = lineStarts.length - 1;
    }
    const character = start - lineStarts[line];
    return {
      line,
      character,
    };
  }

  _buildLineStartList(source: string): number[] {
    const result: number[] = [0];
    let index = -1;
    while ((index = source.indexOf('\n', index + 1)) >= 0) {
      result.push(index + 1);
    }
    return result;
  }
}