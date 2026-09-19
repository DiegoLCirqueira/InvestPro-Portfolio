export function rateLimitPerMinute(max: number) {
  return {
    config: {
      rateLimit: {
        max,
        timeWindow: "1 minute" as const,
      },
    },
  };
}

export const readRateLimit = rateLimitPerMinute(30);

export const writeRateLimit = rateLimitPerMinute(10);
