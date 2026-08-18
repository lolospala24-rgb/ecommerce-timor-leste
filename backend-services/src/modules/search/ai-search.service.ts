import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../../prisma/prisma.service';

export interface AiSearchFilters {
  keywords: string;
  category: string | null;
  categoryId: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  brand: string | null;
}

interface AiSearchModelOutput {
  keywords: string;
  category: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  brand: string | null;
}

// Fast, low-cost model — this is a single-turn extraction task, not a
// reasoning-heavy one, so Haiku is the right cost/latency tier here.
const AI_SEARCH_MODEL = 'claude-haiku-4-5';

@Injectable()
export class AiSearchService {
  private readonly logger = new Logger(AiSearchService.name);
  private readonly client: Anthropic | null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  isEnabled(): boolean {
    return this.client !== null;
  }

  async parseQuery(rawQuery: string): Promise<AiSearchFilters> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI search is not configured on this server.',
      );
    }

    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    const categoryNames = categories.map((category) => category.name);

    let responseText: string;
    try {
      const message = await this.client.messages.create({
        model: AI_SEARCH_MODEL,
        max_tokens: 400,
        system:
          "You turn a shopper's natural-language product search into structured filters " +
          'for an e-commerce marketplace in Timor-Leste. Shoppers write in Tetum, Indonesian, ' +
          'Portuguese, or English, often mixed in the same sentence. Extract only what the ' +
          'shopper actually said — never invent a brand, category, or price the shopper did ' +
          'not mention.',
        messages: [
          {
            role: 'user',
            content: `Shopper query: "${rawQuery}"`,
          },
        ],
        output_config: {
          format: {
            type: 'json_schema',
            schema: {
              type: 'object',
              properties: {
                keywords: {
                  type: 'string',
                  description:
                    'Core product search terms to match against product names and ' +
                    'descriptions: product type plus any specs/brand/model mentioned ' +
                    '(e.g. "laptop programming RAM 16GB"). Keep the language the shopper used.',
                },
                category: {
                  type: ['string', 'null'],
                  enum: [...categoryNames, null],
                  description:
                    'Pick the single best-matching category from the provided list, or ' +
                    'null if none clearly fits.',
                },
                minPrice: {
                  type: ['number', 'null'],
                  description:
                    'Minimum budget in US dollars if the shopper stated one, else null.',
                },
                maxPrice: {
                  type: ['number', 'null'],
                  description:
                    'Maximum budget in US dollars if the shopper stated one ' +
                    '(e.g. "budget $700" -> 700), else null.',
                },
                brand: {
                  type: ['string', 'null'],
                  description: 'A specific brand name the shopper mentioned, else null.',
                },
              },
              required: ['keywords', 'category', 'minPrice', 'maxPrice', 'brand'],
              additionalProperties: false,
            },
          },
        },
      });

      const textBlock = message.content.find((block) => block.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text block in AI search response');
      }
      responseText = textBlock.text;
    } catch (error) {
      this.logger.error('AI search query parsing failed', error as Error);
      throw new ServiceUnavailableException(
        'AI search could not process this query. Try again in a moment.',
      );
    }

    let parsed: AiSearchModelOutput;
    try {
      parsed = JSON.parse(responseText);
    } catch (error) {
      this.logger.error(`AI search returned unparsable output: ${responseText}`);
      throw new ServiceUnavailableException(
        'AI search could not process this query. Try again in a moment.',
      );
    }

    const matchedCategory = parsed.category
      ? categories.find((category) => category.name === parsed.category)
      : undefined;

    return {
      keywords: (parsed.keywords || '').trim() || rawQuery,
      category: matchedCategory?.name ?? null,
      categoryId: matchedCategory?.id ?? null,
      minPrice: typeof parsed.minPrice === 'number' ? parsed.minPrice : null,
      maxPrice: typeof parsed.maxPrice === 'number' ? parsed.maxPrice : null,
      brand: (parsed.brand || '').trim() || null,
    };
  }
}
