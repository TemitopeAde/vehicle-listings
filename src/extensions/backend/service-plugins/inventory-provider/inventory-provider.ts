import { toolsProvider } from "@wix/app-tools/service-plugins";
import { context } from "../../../../backend/context";
import { runTool } from "../../../../backend/services/tool-service";
import { AppError } from "../../../../backend/errors";
import { z } from "zod";
toolsProvider.provideHandlers({
  runTool: async ({ request, metadata }) => {
    if (!metadata.identity?.wixUserId)
      throw new AppError(
        "FORBIDDEN",
        "Tools require an authorized Wix collaborator.",
        403,
      );
    const ctx = await context(true);
    if (ctx.actorId !== metadata.identity.wixUserId)
      throw new AppError(
        "FORBIDDEN",
        "Caller identity does not match the tool context.",
        403,
      );
    const result = await runTool(
      ctx,
      request.methodName ?? "",
      request.payload ?? {},
    );
    return { response: z.record(z.string(), z.unknown()).parse(result) };
  },
});
