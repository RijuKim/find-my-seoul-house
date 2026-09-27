export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  molitServiceKey: process.env.MOLIT_SERVICE_KEY ?? "",
  kaptListServiceKey: process.env.KAPT_LIST_SERVICE_KEY ?? "",
  kaptBasisServiceKey: process.env.KAPT_BASIS_SERVICE_KEY ?? "",
  buildingHubServiceKey: process.env.BUILDING_HUB_SERVICE_KEY ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
