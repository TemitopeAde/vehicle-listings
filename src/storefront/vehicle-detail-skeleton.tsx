import { useI18n } from "../shared/i18n-react";
import { Skeleton as Bone } from "./ui/skeleton";

/** Placeholder with the vehicle detail layout, shown while the vehicle loads. */
export function VehicleDetailSkeleton() {
  const { t } = useI18n();
  return (
    <div className="mt-6 grid gap-8" role="status" aria-busy="true">
      <span className="sr-only">{t("Loading vehicle details…")}</span>
      <div className="sf-detail-header flex flex-wrap items-end justify-between gap-5">
        <div className="grid gap-3">
          <Bone className="h-5 w-24 rounded-full" />
          <Bone className="h-8 w-72 max-w-full" />
          <Bone className="h-4 w-48" />
        </div>
        <div className="sf-price-block ml-auto grid justify-items-end gap-3">
          <Bone className="h-7 w-32" />
          <Bone className="h-9 w-28" />
        </div>
      </div>
      <div className="sf-detail grid grid-cols-1 gap-8">
        <div className="grid min-w-0 content-start gap-6">
          <Bone className="aspect-[4/3] w-full rounded-lg" />
          <div className="sf-hide-sm grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Bone key={i} className="aspect-[4/3] w-full rounded-lg" />
            ))}
          </div>
          <div className="grid gap-4">
            <Bone className="h-6 w-40" />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-5">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="grid gap-2 border-b pb-3">
                  <Bone className="h-3 w-16" />
                  <Bone className="h-4 w-24" />
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-3">
            <Bone className="h-6 w-48" />
            <Bone className="h-4 w-full" />
            <Bone className="h-4 w-full" />
            <Bone className="h-4 w-2/3" />
          </div>
        </div>
        <div className="grid content-start gap-6">
          <div className="grid gap-4 rounded-lg border p-5">
            <Bone className="h-6 w-36" />
            <Bone className="h-10 w-full" />
            <Bone className="h-10 w-full" />
            <Bone className="h-24 w-full" />
            <Bone className="h-10 w-full" />
          </div>
          <div className="grid gap-4 rounded-lg border p-5">
            <Bone className="h-6 w-40" />
            <Bone className="h-10 w-full" />
            <Bone className="h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
