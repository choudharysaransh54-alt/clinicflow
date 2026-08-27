require('dotenv').config();

const requiredEnvVars = ['MONGO_URI', 'REDIS_URL', 'JWT_SECRET'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`FATAL ERROR: Environment variable ${envVar} is missing.`);
    process.exit(1);
  }
}
