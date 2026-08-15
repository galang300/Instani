import { hppInputSchema } from "@panganterkini/validation";
import { Router } from "express";
import { calculateHpp } from "../../common/anomaly.js";

export const hppRoutes = Router();

hppRoutes.post("/calculate", (request, response) => {
  const parsed = hppInputSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(422).json({ errors: parsed.error.flatten() });
    return;
  }

  response.json(calculateHpp(parsed.data));
});
