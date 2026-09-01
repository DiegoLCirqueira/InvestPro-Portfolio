export const readRateLimit = {
  config: {
    rateLimit: {
      max: 30,
      timeWindow: "1 minute" as const,
    },
  },
};

export const writeRateLimit = {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: "1 minute" as const,
    },
  },
};
