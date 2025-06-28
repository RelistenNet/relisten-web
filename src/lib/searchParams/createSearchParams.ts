import { inferParserType, ParserMap, useQueryStates } from 'nuqs';
import { createLoader, createSerializer, LoaderInput, Options } from 'nuqs/server';
import { z } from 'zod/v4';

export function createSearchParams<
  const Schema extends z.ZodTypeAny,
  const Parser extends ParserMap,
>(schema: Schema, parser: Parser) {
  const loadSearchParams = createLoader(parser);

  return {
    schema,
    parser,
    useQueryStates: (options?: Options) => {
      // could add extra stuff to this hook like validation
      const qs = useQueryStates(parser, options);

      const validateSearchParams = (obj: z.infer<Schema>): boolean => {
        try {
          schema.parse(obj);

          return true;
        } catch (err) {
          console.error('Error parsing future validation', err);

          return false;
        }
      };

      return [...qs, validateSearchParams] as const;
    },
    parseAndValidate: async (searchParams: Promise<LoaderInput>) => {
      const parsed = await loadSearchParams(searchParams);
      const result = schema.safeParse(parsed);

      if (result.error) {
        const error = new Error();

        error.cause = z.prettifyError(result.error);

        throw error;
      }

      return parsed;
    },
    buildUrl: (pathname: string, nextSearchParams: Partial<inferParserType<Parser>>) => {
      const serialize = createSerializer(parser);

      const params = serialize(nextSearchParams as any); // not sure the typing here yet

      return [pathname, params].join('');
    },
  };
}

export function combineSearchParams<
  const T extends readonly ReturnType<typeof createSearchParams>[],
>(...params: T) {
  const baseSchema = params.reduce((acc, p) => acc.and(p.schema), z.object({}));
  const baseParser = Object.assign({}, ...params.map((p) => p.parser));

  return createSearchParams(baseSchema, baseParser);
}
