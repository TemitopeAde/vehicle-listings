import { useState } from "react";
import { createRoot } from "react-dom/client";
import { useForm } from "react-hook-form";
import { Upload } from "tus-js-client";
import type { VehicleForm } from "../../dashboard/components/vehicle-form-types";
import { VehicleSections } from "../../dashboard/components/vehicle-sections";
import { useVehicleUploads } from "../../dashboard/use-vehicle-uploads";
import type { UploadDependencies } from "../../dashboard/media-upload";
import type { VehicleInput } from "../../shared/schemas";
import { vehicleInput } from "../../shared/schemas";
import type { z } from "zod";

const reads = new Map<string, number>();
const dependencies: UploadDependencies = {
  generate: async (mime, name) => ({
    uploadUrl: "https://upload.wixmp.com/upload/tus",
    uploadToken: `${mime.startsWith("video/") ? "video" : "image"}-${name}`,
  }),
  transfer: async (file, options) => new Upload(file, options),
  finalize: (url, signal) => fetch(url, { method: "PUT", signal }),
  getFile: async (id) => {
    const count = (reads.get(id) ?? 0) + 1;
    reads.set(id, count);
    return {
      _id: id,
      operationStatus: count === 1 ? "PENDING" : "READY",
      mediaType: id.startsWith("video-") ? "VIDEO" : "IMAGE",
      private: false,
      url: id.startsWith("video-")
        ? `https://video.wixstatic.com/video/${id}/file.mp4`
        : `https://static.wixstatic.com/media/${id}.jpg`,
    };
  },
  wait: async () => new Promise((resolve) => setTimeout(resolve, 20)),
};
function Fixture() {
  const [section, setSection] = useState(0);
  const form: VehicleForm = useForm<
    z.input<typeof vehicleInput>,
    unknown,
    VehicleInput
  >({
    defaultValues: {
      title: "Test Toyota",
      make: "Toyota",
      model: "Camry",
      stockId: "X",
      year: 2024,
      price: 1,
      media: [],
      videos: [],
      doors: 4,
      seats: 5,
    },
  });
  const uploads = useVehicleUploads(form, dependencies);
  const values = form.watch();
  return (
    <main>
      <button onClick={() => setSection(0)}>Basics</button>
      <button onClick={() => setSection(2)}>Specifications</button>
      <button onClick={() => setSection(4)}>Media</button>
      <VehicleSections
        section={section}
        form={form}
        saved={null}
        dealers={{ data: { items: [] }, error: "" }}
        setConfirm={() => {}}
        uploads={uploads}
      />
      <button
        disabled={uploads.busy}
        onClick={() =>
          localStorage.setItem(
            "media-test-values",
            JSON.stringify(form.getValues()),
          )
        }
      >
        Save fixture
      </button>
      <output aria-label="Vehicle values">{JSON.stringify(values)}</output>
    </main>
  );
}
export function mount() {
  document.body.replaceChildren();
  const root = document.createElement("div");
  document.body.append(root);
  createRoot(root).render(<Fixture />);
}
export function saved(): VehicleInput {
  return JSON.parse(localStorage.getItem("media-test-values") ?? "{}");
}
