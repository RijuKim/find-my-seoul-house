export const ENV = {
  molitServiceKey: process.env.MOLIT_SERVICE_KEY ?? "",
  kaptListServiceKey: process.env.KAPT_LIST_SERVICE_KEY ?? "",
  kaptBasisServiceKey: process.env.KAPT_BASIS_SERVICE_KEY ?? "",
  buildingHubServiceKey: process.env.BUILDING_HUB_SERVICE_KEY ?? "",
  isProduction: process.env.NODE_ENV === "production",
};
