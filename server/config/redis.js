const { createClient } = require("redis");

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  socket: {
    reconnectStrategy: false,
  },
});

redisClient.on("error", (error) => {
  console.log("Redis is unavailable. Using MongoDB only:", error.message);
});

const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log("Redis connected successfully");
  } catch (error) {
    console.log("Redis is unavailable. Using MongoDB only.");
  }
};

const getCache = async (key) => {
  if (!redisClient.isReady) return null;

  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    return null;
  }
};

const setCache = async (key, value) => {
  if (!redisClient.isReady) return;

  try {
    await redisClient.set(key, JSON.stringify(value), { EX: 60 });
  } catch (error) {
    console.log("Could not save product data in Redis");
  }
};

// A new version changes every product cache key, so old cached responses expire naturally.
const getProductCacheVersion = async () => {
  if (!redisClient.isReady) return "0";

  try {
    return (await redisClient.get("products:cache-version")) || "0";
  } catch (error) {
    return "0";
  }
};

const invalidateProductCache = async () => {
  if (!redisClient.isReady) return;

  try {
    await redisClient.incr("products:cache-version");
  } catch (error) {
    console.log("Could not clear product cache");
  }
};

module.exports = {
  connectRedis,
  getCache,
  setCache,
  getProductCacheVersion,
  invalidateProductCache,
};
