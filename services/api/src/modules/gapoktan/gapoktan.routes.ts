import { Router } from "express";

export const gapoktanRoutes = Router();

gapoktanRoutes.get("/", (_request, response) => {
  response.json([
    {
      id: "gpk-tulungagung-01",
      name: "Gapoktan Makmur Tulungagung",
      district: "Ngantru",
      verifiedMembers: 42
    }
  ]);
});
