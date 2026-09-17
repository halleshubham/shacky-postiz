// AI video generation kill-switch. There was previously no single config
// controlling this - each video provider (HeyGen, Image-Text-Slides, Veo3)
// only turned itself off if its own third-party API key was missing, so the
// feature as a whole couldn't be disabled without unsetting every key. This
// is the one flag that gates all of them at once, checked everywhere video
// generation could otherwise be reached (the options list, direct API calls,
// and the AI chat agent's tools) - see video.manager.ts and media.service.ts.
//
// Off by default: set AI_VIDEO_GENERATION_ENABLED=true to turn it back on.
export const AI_VIDEO_GENERATION_ENABLED =
  process.env.AI_VIDEO_GENERATION_ENABLED === 'true';
