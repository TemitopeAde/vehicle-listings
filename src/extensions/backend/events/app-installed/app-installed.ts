import { appInstances, embeddedScripts } from "@wix/app-management";
import { auth } from "@wix/essentials";
import { savedCarsScript } from "../../../../shared/saved-cars-script";
import { notifyLifecycleEvent } from "../../../../backend/notify-lifecycle-event";
import { recordLifecycleEvent } from "../../../../backend/record-lifecycle-event";
import { runInBackground } from "../../../../backend/run-in-background";

// Wix needs a fast acknowledgement; setup and notifications finish after the response.
export default appInstances.onAppInstanceInstalled((event) => {
  runInBackground("AppInstalled saved cars script", async () => {
    await auth.elevate(embeddedScripts.embedScript)(
      savedCarsScript.properties,
      { componentId: savedCarsScript.componentId },
    );
  });
  runInBackground("AppInstalled email", () =>
    notifyLifecycleEvent({
      eventType: "APP_INSTALLED",
      instanceIdHint: event.metadata?.instanceId,
    }),
  );
  runInBackground("AppInstalled Sheets record", () =>
    recordLifecycleEvent("AppInstalled", event),
  );
});
