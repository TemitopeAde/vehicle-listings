import type { APIRoute } from "astro";

// Astro answers an error thrown outside a route handler (a module that fails to load, a crash in
// middleware) with an empty 500 unless a 500 route exists. This one keeps the cause visible in the
// browser console and the worker logs. Astro passes no error when middleware fails while rendering it.
export const ALL: APIRoute = ({ props }) => {
  const error = (props as { error?: unknown }).error;
  const detail =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : error == null
        ? "The request failed in middleware before the app could handle it."
        : String(error);
  console.error("Car listing route crashed", detail);
  return Response.json(
    {
      success: false,
      error: {
        code: "UNHANDLED_ERROR",
        message: `Server error: ${detail.slice(0, 300)}`,
      },
    },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
};
