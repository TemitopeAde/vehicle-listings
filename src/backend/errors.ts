import { ZodError } from "zod";
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError(
      "INVALID_JSON",
      "The request must contain valid JSON.",
      400,
    );
  }
}
export function methodNotAllowed(methods: string[]) {
  return Response.json(
    {
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "This request method is not supported.",
      },
    },
    {
      status: 405,
      headers: { Allow: methods.join(", "), "Cache-Control": "no-store" },
    },
  );
}
export async function respond(run: () => Promise<unknown>, status = 200) {
  try {
    return Response.json(
      { success: true, data: (await run()) ?? null },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ZodError)
      return Response.json(
        {
          success: false,
          error: {
            code: "VALIDATION",
            message: "Please check the submitted fields.",
            fields: error.flatten(),
          },
        },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    if (error instanceof AppError)
      return Response.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    console.error(
      "Car listing request failed",
      error instanceof Error ? `${error.name}: ${error.message}` : "unknown",
    );
    return Response.json(
      {
        success: false,
        error: {
          code: "REQUEST_FAILED",
          message:
            "The request failed. Check Wix collection permissions and try again.",
        },
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
