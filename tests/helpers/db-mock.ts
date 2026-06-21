import { vi } from "vitest";

type QueryResult = unknown[];

function makeThenable<T>(value: T) {
  return {
    then: (onFulfilled: (v: T) => unknown, onRejected?: (e: unknown) => unknown) =>
      Promise.resolve(value).then(onFulfilled, onRejected),
  };
}

export function createSelectChain(result: QueryResult = []) {
  const terminal = makeThenable(result);
  const limit = vi.fn().mockResolvedValue(result);
  const orderBy = vi.fn().mockImplementation(() => ({
    ...makeThenable(result),
    limit,
    orderBy,
  }));
  const where = vi.fn().mockImplementation(() => ({
    ...terminal,
    limit,
    orderBy,
    where,
  }));
  const innerJoin = vi.fn().mockImplementation(() => ({
    ...terminal,
    where,
    orderBy,
    innerJoin,
  }));
  const from = vi.fn().mockImplementation(() => ({
    ...terminal,
    where,
    innerJoin,
    orderBy,
  }));

  return { from, where, innerJoin, orderBy, limit, setResult: (next: QueryResult) => {
    result.splice(0, result.length, ...next);
  } };
}

export function createMockDb(initialResult: QueryResult = []) {
  const result = [...initialResult];
  const selectChain = createSelectChain(result);

  return {
    db: {
      select: vi.fn().mockReturnValue(selectChain),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "generated-id" }]),
          onConflictDoNothing: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    },
    selectChain,
    setSelectResult: (next: QueryResult) => {
      result.splice(0, result.length, ...next);
    },
  };
}
