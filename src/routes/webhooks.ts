import { Router } from 'express';

const router = Router();

/**
 * Google Classroom push notification webhook.
 * When configured, Google sends POST notifications here when classroom data changes.
 * For now this is a stub — full implementation requires a registered Google Cloud project
 * with push notifications enabled.
 */
router.post('/api/webhooks/google', async (req, res) => {
  // Google sends a verification request with X-Goog-Resource-State: sync
  const resourceState = req.headers['x-goog-resource-state'];

  if (resourceState === 'sync') {
    // Acknowledge the sync verification
    res.status(200).send();
    return;
  }

  // Log the notification for now — incremental sync will be built out in Sprint 7
  console.log('Google Classroom webhook received:', {
    resourceState,
    resourceId: req.headers['x-goog-resource-id'],
    channelId: req.headers['x-goog-channel-id'],
  });

  // Acknowledge receipt
  res.status(200).send();
});

export default router;
