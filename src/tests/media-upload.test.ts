import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createMediaUpload,
  type UploadDependencies,
} from "../dashboard/media-upload";
import { validateMediaFile } from "../shared/media";
import { videoSchema, vehicleInput } from "../shared/schemas";

function fixture(kind: "IMAGE" | "VIDEO" = "IMAGE") {
  const calls = {
    generate: 0,
    transfer: 0,
    finalize: [] as string[],
    reads: 0,
  };
  const url =
    kind === "IMAGE"
      ? "https://static.wixstatic.com/media/photo.jpg"
      : "https://video.wixstatic.com/video/car/mp4/file.mp4";
  const dependencies: UploadDependencies = {
    generate: async () => {
      calls.generate++;
      return {
        uploadUrl: "https://upload.wixmp.com/upload/tus",
        uploadToken: "signed-token",
      };
    },
    transfer: async (file, options) => {
      calls.transfer++;
      assert.equal(options.endpoint, "https://upload.wixmp.com/upload/tus");
      assert.equal(options.metadata?.filename, file.name);
      assert.equal(options.metadata?.token, "signed-token");
      return {
        start() {
          options.onProgress?.(file.size, file.size);
          options.onSuccess?.({
            lastResponse: {
              getStatus: () => 204,
              getHeader: () => undefined,
              getBody: () => "",
              getUnderlyingObject: () => undefined,
            },
          });
        },
        abort: async () => {},
      };
    },
    finalize: async (url) => {
      calls.finalize.push(url);
      return Response.json({ file: { id: "file-123" } });
    },
    getFile: async (id) => {
      assert.equal(id, "file-123");
      calls.reads++;
      return {
        _id: id,
        operationStatus: calls.reads === 1 ? "PENDING" : "READY",
        mediaType: kind,
        private: false,
        url,
      };
    },
    wait: async () => {},
  };
  return { calls, dependencies, url };
}
test("TUS upload finalizes with Wix token and waits for processed public media", async () => {
  const { dependencies, calls, url } = fixture();
  const upload = createMediaUpload(
    new File(["photo"], "front & side.jpg", { type: "image/jpeg" }),
    "image",
    dependencies,
  );
  const updates: string[] = [];
  const result = await upload(new AbortController().signal, (value) =>
    updates.push(value.status),
  );
  assert.equal(result.url, url);
  assert.equal(result.fileId, "file-123");
  const finalUrl = new URL(calls.finalize[0]);
  assert.equal(finalUrl.pathname, "/upload/tus/signed-token");
  assert.equal(finalUrl.searchParams.get("filename"), "front & side.jpg");
  assert.deepEqual(updates, ["uploading", "uploading", "processing"]);
  assert.equal(calls.reads, 2);
});
test("processing retry reuses the uploaded video without another transfer or finalization", async () => {
  const { dependencies, calls, url } = fixture("VIDEO");
  const read = dependencies.getFile;
  dependencies.getFile = async () => {
    throw new Error("Media service temporarily unavailable");
  };
  const upload = createMediaUpload(
    new File(["video"], "walkaround.mp4", { type: "video/mp4" }),
    "video",
    dependencies,
  );
  await assert.rejects(
    upload(new AbortController().signal, () => {}),
    /temporarily/,
  );
  dependencies.getFile = read;
  const result = await upload(new AbortController().signal, () => {});
  assert.equal(result.url, url);
  assert.equal(calls.generate, 1);
  assert.equal(calls.transfer, 1);
  assert.equal(calls.finalize.length, 1);
});
test("failed and private Wix files are never attached as ready media", async () => {
  for (const descriptor of [
    { operationStatus: "FAILED" as const },
    {
      operationStatus: "READY" as const,
      mediaType: "IMAGE" as const,
      private: true,
      url: "https://static.wixstatic.com/media/private.jpg",
    },
    {
      operationStatus: "READY" as const,
      mediaType: "VIDEO" as const,
      url: "https://static.wixstatic.com/media/wrong.jpg",
    },
  ]) {
    const { dependencies } = fixture();
    dependencies.getFile = async () => descriptor;
    const upload = createMediaUpload(
      new File(["photo"], "photo.jpg", { type: "image/jpeg" }),
      "image",
      dependencies,
    );
    await assert.rejects(
      upload(new AbortController().signal, () => {}),
      /process|public/,
    );
  }
});
test("cancellation aborts an in-flight TUS transfer and skips finalization", async () => {
  const { dependencies, calls } = fixture();
  const controller = new AbortController();
  let aborted = false;
  dependencies.transfer = async () => ({
    start() {
      controller.abort();
    },
    abort: async () => {
      aborted = true;
    },
  });
  const upload = createMediaUpload(
    new File(["photo"], "photo.jpg", { type: "image/jpeg" }),
    "image",
    dependencies,
  );
  await assert.rejects(
    upload(controller.signal, () => {}),
    { name: "AbortError" },
  );
  assert.ok(aborted);
  assert.equal(calls.finalize.length, 0);
});
test("media rejects invalid types, oversize files and deceptive video hosts; legacy vehicles default videos to empty", () => {
  assert.throws(() =>
    validateMediaFile(
      { name: "script.svg", type: "image/svg+xml", size: 20 },
      "image",
    ),
  );
  assert.throws(() =>
    validateMediaFile(
      { name: "large.mp4", type: "video/mp4", size: 501 * 1024 * 1024 },
      "video",
    ),
  );
  assert.equal(
    validateMediaFile({ name: "movie.MOV", type: "", size: 20 }, "video"),
    "video/quicktime",
  );
  assert.equal(
    videoSchema.safeParse({
      url: "https://video.wixstatic.com.evil.test/file.mp4",
    }).success,
    false,
  );
  assert.equal(
    videoSchema.safeParse({ url: "javascript:alert(1)" }).success,
    false,
  );
  assert.deepEqual(
    vehicleInput.parse({
      title: "Toyota Camry",
      make: "Toyota",
      model: "Camry",
      year: 2024,
      price: 1,
      stockId: "X",
    }).videos,
    [],
  );
});

test("a failed partial transfer resumes its existing TUS URL on retry", async () => {
  const { dependencies, calls } = fixture();
  let attempts = 0;
  dependencies.transfer = async (_file, options) => {
    attempts++;
    if (attempts === 2)
      assert.equal(
        options.uploadUrl,
        "https://upload.wixmp.com/transfer/partial",
      );
    return {
      url: "https://upload.wixmp.com/transfer/partial",
      start() {
        if (attempts === 1) options.onError?.(new Error("Connection lost"));
        else
          options.onSuccess?.({
            lastResponse: {
              getStatus: () => 204,
              getHeader: () => undefined,
              getBody: () => "",
              getUnderlyingObject: () => undefined,
            },
          });
      },
      abort: async () => {},
    };
  };
  const upload = createMediaUpload(
    new File(["photo"], "photo.jpg", { type: "image/jpeg" }),
    "image",
    dependencies,
  );
  await assert.rejects(
    upload(new AbortController().signal, () => {}),
    /transfer failed/,
  );
  await upload(new AbortController().signal, () => {});
  assert.equal(calls.generate, 1);
  assert.equal(calls.finalize.length, 1);
});
