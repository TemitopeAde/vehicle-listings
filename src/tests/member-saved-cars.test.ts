import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createAccountSavedCars,
  type SavedCarsRepository,
} from "../shared/account-saved-cars";
import { legacySavedCarsKey, legacyOwnerKey } from "../shared/saved-cars-model";
import collection from "../extensions/backend/data-collections/saved-cars";
import type { SavedCar } from "../shared/saved-cars";
import { vehicleLinkWithFallback } from "../shared/site-navigation";

const car: SavedCar = {
  id: "member-car",
  title: "Toyota Camry",
  price: 24500,
  currency: "USD",
  image: "",
  href: "https://example.com/cars/camry",
};
function storage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}
function cloud() {
  const members = new Map<string, Map<string, SavedCar>>();
  const rows = (id: string) => {
    if (!members.has(id)) members.set(id, new Map());
    return members.get(id) ?? new Map<string, SavedCar>();
  };
  function device() {
    let member: string | null = "member-a";
    const repository: SavedCarsRepository = {
      memberId: async () => member,
      list: async (id) => [...rows(id).values()],
      save: async (id, car) => {
        rows(id).set(car.id, car);
      },
      remove: async (id, carId) => {
        rows(id).delete(carId);
      },
    };
    return {
      repository,
      login: (id: string | null) => {
        member = id;
      },
      store: createAccountSavedCars(repository, storage()),
    };
  }
  return { rows, device };
}

test("saved cars synchronize between independent devices and isolate member accounts", async () => {
  const server = cloud(),
    first = server.device(),
    second = server.device();
  assert.deepEqual(await first.store.toggle(async () => car), [car]);
  assert.deepEqual(await second.store.refresh(), [car]);
  second.login("member-b");
  assert.deepEqual(await second.store.refresh(), []);
  await second.store.toggle(async () => ({
    ...car,
    title: "Member B's favorite",
  }));
  assert.deepEqual(await first.store.refresh(), [car]);
  await first.store.remove(car.id);
  assert.equal(server.rows("member-b").size, 1);
  second.login("member-a");
  assert.deepEqual(await second.store.refresh(), []);
  await first.store.toggle(async () => car);
  await second.store.clear();
  assert.deepEqual(await first.store.refresh(), []);
  second.login(null);
  assert.equal(await second.store.refresh(), null);
  assert.deepEqual(second.store.state().cars, []);
});

test("guest and failed authentication checks never build or save a favorite", async () => {
  const device = cloud().device();
  let calls = 0;
  const getCar = async () => {
    calls++;
    return car;
  };
  device.login(null);
  assert.equal(await device.store.toggle(getCar), null);
  assert.equal(calls, 0);
  device.repository.memberId = async () => {
    throw new Error("Login unavailable");
  };
  await assert.rejects(device.store.toggle(getCar), /Login unavailable/);
  assert.equal(calls, 0);
  assert.deepEqual(device.store.state().cars, []);
});

test("failed account writes don't report success and can be retried", async () => {
  const device = cloud().device();
  const save = device.repository.save;
  device.repository.save = async () => {
    throw new Error("Network unavailable");
  };
  await assert.rejects(
    device.store.toggle(async () => car),
    /Network unavailable/,
  );
  assert.deepEqual(device.store.state().cars, []);
  assert.match(device.store.state().error, /sync/);
  device.repository.save = save;
  assert.deepEqual(await device.store.toggle(async () => car), [car]);
});

test("device favorites migrate once and a failed migration keeps unsaved entries for retry", async () => {
  const server = cloud(),
    device = server.device(),
    legacy = storage();
  const other = { ...car, id: "other-car" };
  legacy.setItem(legacySavedCarsKey, JSON.stringify([car, other]));
  const save = device.repository.save;
  device.repository.save = async (member, value) => {
    if (value.id === other.id) throw new Error("Second save failed");
    await save(member, value);
  };
  const store = createAccountSavedCars(device.repository, legacy);
  await assert.rejects(store.refresh(), /Second save failed/);
  assert.equal(server.rows("member-a").size, 1);
  assert.equal(legacy.getItem(legacyOwnerKey), "member-a");
  assert.deepEqual(JSON.parse(legacy.getItem(legacySavedCarsKey) ?? "[]"), [
    other,
  ]);
  device.login("member-b");
  assert.deepEqual(await store.refresh(), []);
  assert.equal(server.rows("member-b").size, 0);
  device.login("member-a");
  device.repository.save = save;
  await store.refresh();
  assert.equal(store.state().cars.length, 2);
  assert.deepEqual(JSON.parse(legacy.getItem(legacySavedCarsKey) ?? "[]"), []);
  assert.equal((await server.device().store.refresh())?.length, 2);
});

test("logout clears cached favorites immediately and rejects an in-flight response", async () => {
  const server = cloud(),
    device = server.device();
  await device.store.toggle(async () => car);
  let finish: (cars: SavedCar[]) => void = () => {};
  let started: () => void = () => {};
  const loading = new Promise<void>((resolve) => {
    started = resolve;
  });
  device.repository.list = async () => {
    started();
    return new Promise<SavedCar[]>((resolve) => {
      finish = resolve;
    });
  };
  const pending = device.store.refresh();
  await loading;
  device.store.reset();
  device.login(null);
  assert.deepEqual(device.store.state().cars, []);
  finish([car]);
  assert.equal(await pending, null);
  assert.deepEqual(device.store.state().cars, []);
});

test("collection access is restricted to the signed-in author for every operation", () => {
  assert.ok(
    Object.values(collection.dataPermissions).every(
      (level) => level === "SITE_MEMBER_AUTHOR",
    ),
  );
  assert.equal(collection.idSuffix, "saved-cars");
});

test("a saved vehicle falls back to a current-page link when Wix can't provide the site URL", async () => {
  assert.equal(
    await vehicleLinkWithFallback(
      async () => "https://cars.example.com/vehicles-detail?slug=camry",
      "car-1",
      "https://cars.example.com/inventory",
    ),
    "https://cars.example.com/vehicles-detail?slug=camry",
  );
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.equal(
      await vehicleLinkWithFallback(
        async () => {
          throw new Error("Wix did not return a valid site URL.");
        },
        "car-1",
        "https://cars.example.com/inventory#tab=all",
      ),
      "https://cars.example.com/inventory#tab=all&car=car-1",
    );
  } finally {
    console.warn = warn;
  }
});
