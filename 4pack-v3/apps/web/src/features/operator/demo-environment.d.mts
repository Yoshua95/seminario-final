type Environment = { NODE_ENV?: string; VERCEL?: string; VERCEL_ENV?: string };
export function isVercelPreview(environment?: Environment): boolean;
export function isDemoEnabled(environment?: Environment): boolean;
