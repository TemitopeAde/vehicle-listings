import {
  legacyOwnerKey,
  legacySavedCarsKey,
  maxSavedCars,
  parseSavedCars,
  savedCarSchema,
  type SavedCar,
} from "./saved-cars-model";

export type SavedCarsRepository = {
  memberId(): Promise<string | null>;
  list(memberId: string): Promise<SavedCar[]>;
  save(memberId: string, car: SavedCar): Promise<void>;
  remove(memberId: string, id: string): Promise<void>;
};
export type SavedCarsState = {
  memberId: string | null;
  cars: SavedCar[];
  loading: boolean;
  error: string;
};
type LegacyStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function createAccountSavedCars(
  repository: SavedCarsRepository,
  legacyStorage?: LegacyStorage,
) {
  let state: SavedCarsState = {
    memberId: null,
    cars: [],
    loading: false,
    error: "",
  };
  let queue: Promise<unknown> = Promise.resolve();
  let generation = 0;
  const listeners = new Set<() => void>();
  const publish = (patch: Partial<SavedCarsState>) => {
    state = { ...state, ...patch };
    for (const listener of listeners) listener();
  };
  const storage = () => {
    try {
      return legacyStorage ?? window.localStorage;
    } catch {
      return undefined;
    }
  };
  async function migrate(memberId: string, cars: SavedCar[], started: number) {
    const local = storage();
    if (!local) return cars;
    let pending: SavedCar[];
    try {
      const owner = local.getItem(legacyOwnerKey);
      if (owner && owner !== memberId) return cars;
      pending = parseSavedCars(
        JSON.parse(local.getItem(legacySavedCarsKey) ?? "[]"),
      );
      if (!pending.length) return cars;
      local.setItem(legacyOwnerKey, memberId);
    } catch {
      return cars;
    }
    const next = [...cars];
    for (const car of pending) {
      if (!next.some((saved) => saved.id === car.id)) {
        if (next.length >= maxSavedCars) break;
        if (
          (await repository.memberId()) !== memberId ||
          generation !== started
        )
          throw new Error("Your member session changed. Please try again.");
        await repository.save(memberId, car);
        next.unshift(car);
      }
      // Clear each legacy entry only after the account write has succeeded.
      try {
        const remaining = parseSavedCars(
          JSON.parse(local.getItem(legacySavedCarsKey) ?? "[]"),
        );
        local.setItem(
          legacySavedCarsKey,
          JSON.stringify(remaining.filter((saved) => saved.id !== car.id)),
        );
      } catch {
        /* Account storage still works when browser storage is unavailable. */
      }
    }
    return next;
  }
  function run(
    operation?: (memberId: string, cars: SavedCar[]) => Promise<SavedCar[]>,
  ) {
    const result = queue
      .catch(() => {})
      .then(async () => {
        const started = generation;
        publish({ loading: true, error: "" });
        try {
          const memberId = await repository.memberId();
          if (memberId !== state.memberId) publish({ memberId, cars: [] });
          if (!memberId) {
            publish({ cars: [], loading: false });
            return null;
          }
          let cars = await repository.list(memberId);
          if (generation !== started) return null;
          cars = await migrate(memberId, cars, started);
          if (
            (await repository.memberId()) !== memberId ||
            generation !== started
          ) {
            publish({ memberId: null, cars: [], loading: false });
            return null;
          }
          if (operation) cars = await operation(memberId, cars);
          if (
            (await repository.memberId()) !== memberId ||
            generation !== started
          ) {
            publish({ memberId: null, cars: [], loading: false });
            return null;
          }
          publish({ memberId, cars, loading: false });
          return cars;
        } catch (error) {
          publish({
            memberId: null,
            cars: [],
            loading: false,
            error: "Could not sync your saved cars. Please try again.",
          });
          throw error;
        }
      });
    queue = result;
    return result;
  }
  return {
    state: () => state,
    reset() {
      generation++;
      publish({ memberId: null, cars: [], loading: false, error: "" });
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    refresh: () => run(),
    toggle: (getCar: () => Promise<SavedCar>) =>
      run(async (memberId, cars) => {
        const car = savedCarSchema.parse(await getCar());
        if ((await repository.memberId()) !== memberId)
          throw new Error("Your member session changed. Please try again.");
        if (cars.some((saved) => saved.id === car.id)) {
          await repository.remove(memberId, car.id);
          return cars.filter((saved) => saved.id !== car.id);
        }
        if (cars.length >= maxSavedCars)
          throw new Error(
            "You can save up to 50 cars. Remove one before saving another.",
          );
        await repository.save(memberId, car);
        return [car, ...cars];
      }),
    remove: (id: string) =>
      run(async (memberId, cars) => {
        await repository.remove(memberId, id);
        return cars.filter((car) => car.id !== id);
      }),
    clear: () =>
      run(async (memberId, cars) => {
        await Promise.all(
          cars.map((car) => repository.remove(memberId, car.id)),
        );
        return [];
      }),
  };
}
export type AccountSavedCars = ReturnType<typeof createAccountSavedCars>;
