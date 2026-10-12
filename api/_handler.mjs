import { handleApi } from '../lib/api.mjs';

export async function route(req, res, path) {
  const originalUrl = req.url;
  req.url = path;
  try {
    return await handleApi(req, res);
  } finally {
    req.url = originalUrl;
  }
}
