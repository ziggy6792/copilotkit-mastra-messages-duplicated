import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

interface GeocodingResponse {
  results: {
    latitude: number;
    longitude: number;
    name: string;
  }[];
}
interface WeatherResponse {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
    weather_code: number;
  };
}

export type WeatherToolResult = z.infer<typeof WeatherToolResultSchema>;

const WeatherToolResultSchema = z.object({
  temperature: z.number(),
  feelsLike: z.number(),
  humidity: z.number(),
  windSpeed: z.number(),
  windGust: z.number(),
  conditions: z.string(),
  location: z.string(),
});

export const weatherTool = createTool({
  id: 'get-weather',
  description: 'Get current weather for a location',
  inputSchema: z.object({
    location: z.string().describe('City name'),
  }),
  outputSchema: WeatherToolResultSchema,
  execute: async ({ context }) => {
    return await getWeather(context.location);
  },
});

// Plan tools (IDs match those used in the LangGraph template)
export const setPlan = createTool({
  id: 'set_plan',
  description: 'Initialize a plan consisting of step descriptions. Resets progress and sets status to in_progress.',
  inputSchema: z.object({
    steps: z.array(z.string()).describe('List of step titles'),
  }),
  outputSchema: z.object({ initialized: z.literal(true), steps: z.array(z.string()) }),
  execute: async ({ context }) => {
    return { initialized: true as const, steps: context.steps };
  },
});

export const updatePlanProgress = createTool({
  id: 'update_plan_progress',
  description: 'Update a single plan step\'s status, and optionally add a note.',
  inputSchema: z.object({
    step_index: z.number().int().nonnegative(),
    status: z.enum(["pending", "in_progress", "completed", "blocked", "failed"]),
    note: z.string().optional(),
  }),
  outputSchema: z.object({ updated: z.literal(true), index: z.number(), status: z.string(), note: z.string().nullable() }),
  execute: async ({ context }) => {
    return { updated: true as const, index: context.step_index, status: context.status, note: context.note ?? null };
  },
});

export const completePlan = createTool({
  id: 'complete_plan',
  description: 'Mark the plan as completed.',
  inputSchema: z.object({}),
  outputSchema: z.object({ completed: z.literal(true) }),
  execute: async () => {
    return { completed: true as const };
  },
});

const getWeather = async (location: string) => {
  const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`;
  const geocodingResponse = await fetch(geocodingUrl);
  const geocodingData = (await geocodingResponse.json()) as GeocodingResponse;

  if (!geocodingData.results?.[0]) {
    throw new Error(`Location '${location}' not found`);
  }

  const { latitude, longitude, name } = geocodingData.results[0];

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,weather_code`;

  const response = await fetch(weatherUrl);
  const data = (await response.json()) as WeatherResponse;

  return {
    temperature: data.current.temperature_2m,
    feelsLike: data.current.apparent_temperature,
    humidity: data.current.relative_humidity_2m,
    windSpeed: data.current.wind_speed_10m,
    windGust: data.current.wind_gusts_10m,
    conditions: getWeatherCondition(data.current.weather_code),
    location: name,
  };
};

function getWeatherCondition(code: number): string {
  const conditions: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };
  return conditions[code] || 'Unknown';
}