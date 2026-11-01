import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
export const envPath = fileURLToPath(new URL('../.env', import.meta.url));
dotenv.config({ path: envPath, quiet: true });
