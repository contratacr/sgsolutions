// Live reload is an explicit development mode, never the distribution configuration.
export function previewConfig(value) {
  if (!value) return {};
  const url = new URL(value);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)
      || url.username || url.password || url.pathname !== '/' || url.search || url.hash || !url.port) {
    throw new Error('SG_MOBILE_PREVIEW_URL must be a local HTTP origin with an explicit port.');
  }
  return {
    appendUserAgent: 'SGSolutionsNativePreview/1.0',
    server: {url: url.origin, cleartext: true, errorPath: 'offline.html'},
  };
}
