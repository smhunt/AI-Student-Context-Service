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

/**
 * SIS webhook — receives change notifications from Aspen.
 * Triggers incremental sync for the affected student.
 */
router.post('/api/webhooks/sis', async (req, res) => {
  const { event_type, oen, board_id, student_id } = req.body;

  if (!event_type || !oen) {
    res.status(400).json({ error: 'Missing event_type or oen' });
    return;
  }

  console.log(`[SIS Webhook] ${event_type} for OEN ${oen}`);

  // Trigger incremental sync if we have enough info
  if (board_id && student_id) {
    try {
      const { syncStudent } = await import('../ingestion/sis-sync.js');
      const result = await syncStudent(oen, board_id, student_id);
      res.json({ accepted: true, sync_result: result });
      return;
    } catch (err) {
      console.error('[SIS Webhook] Sync error:', err);
    }
  }

  res.json({ accepted: true, message: 'Notification received' });
});

export default router;
