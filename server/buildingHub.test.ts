import { describe, expect, it } from "vitest";
import { fetchBuildingHubRecap } from "./buildingHub";

const hasBuildingHubKey = Boolean(process.env.BUILDING_HUB_SERVICE_KEY);

describe("BuildingHUB recap title", () => {
  it.skipIf(!hasBuildingHubKey)("returns the official FAR for a known apartment parcel", async () => {
    const result = await fetchBuildingHubRecap({
      sigunguCd: "11680",
      bjdongCd: "10300",
      bun: "12",
      ji: "2",
    });
    expect(result.status).toBe("matched");
    expect(result.floorAreaRatio).toBeGreaterThan(0);
    expect(result.landArea).toBeGreaterThan(0);
  }, 30_000);
});
