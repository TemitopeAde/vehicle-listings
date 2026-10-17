import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import * as React from "react";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import {
  SavedCarsSettings,
  type Scripts,
} from "../dashboard/saved-cars-settings";

test("dashboard embeds, retries a failure, disables and re-embeds the correct script", async () => {
  const dom = new JSDOM('<div id="test-root"></div>', {
    url: "https://example.com",
  });
  Object.assign(globalThis, {
    React,
    window: dom.window,
    document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const host = dom.window.document.getElementById("test-root");
  assert.ok(host);
  const root = createRoot(host);
  const calls: Parameters<Scripts["embedScript"]>[] = [];
  let fail = true;
  const scripts: Scripts = {
    getEmbeddedScript: async () => {
      throw new Error("No script installed");
    },
    embedScript: async (properties, options) => {
      calls.push([properties, options]);
      if (fail) throw new Error("Embedding failed");
      return {
        properties: { ...properties, disabled: properties.disabled ?? false },
      };
    },
  };
  const button = (label: string) => {
    const result = [...host.querySelectorAll("button")].find(
      (element) => element.textContent === label,
    );
    assert.ok(result, `Button ${label} is available`);
    return result;
  };
  try {
    await act(async () =>
      root.render(createElement(SavedCarsSettings, { scripts })),
    );
    await act(async () => button("Embed script").click());
    assert.ok(button("Embed script"));
    assert.equal(
      host
        .querySelector('[role="status"]')
        ?.textContent?.includes("Script embedded and enabled"),
      false,
    );
    fail = false;
    await act(async () => button("Embed script").click());
    assert.equal(
      calls[1]?.[1]?.componentId,
      "a98020c4-3999-4b6d-96f1-01fa817d4011",
    );
    assert.deepEqual(calls[1]?.[0], {
      disabled: false,
      parameters: { label: "Saved cars", accent: "#196947" },
    });
    assert.ok(
      host
        .querySelector('[role="status"]')
        ?.textContent?.includes("Script embedded and enabled"),
    );
    const checkbox = host.querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    );
    assert.ok(checkbox);
    await act(async () => checkbox.click());
    await act(async () => button("Save button settings").click());
    assert.equal(calls[2]?.[0].disabled, true);
    assert.ok(
      host
        .querySelector('[role="status"]')
        ?.textContent?.includes("Script embedded and disabled"),
    );
    await act(async () => button("Re-embed script").click());
    assert.equal(calls[3]?.[0].disabled, false);
    assert.equal(checkbox.checked, true);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});
