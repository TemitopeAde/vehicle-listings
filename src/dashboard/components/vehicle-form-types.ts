import type { UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import { vehicleInput, type VehicleInput } from "../../shared/schemas";
export type VehicleForm = UseFormReturn<
  z.input<typeof vehicleInput>,
  unknown,
  VehicleInput
>;
