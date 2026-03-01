import { Router } from 'express';
import express from 'express';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { query } from '../db/index.js';

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

/**
 * Clerk webhook — handles user lifecycle events for auto-provisioning.
 *
 * Events handled:
 *  - user.created: Log new Clerk user (manual DB provisioning still required)
 *  - user.updated: Update external_id mapping if email changes
 *  - user.deleted: Deactivate user in our DB
 *
 * Requires: CLERK_WEBHOOK_SECRET for Svix signature verification.
 */
router.post('/api/webhooks/clerk', express.raw({ type: 'application/json' }), async (req, res) => {
  const secret = config.clerkWebhookSecret;

  // Verify webhook signature if secret is configured
  if (secret) {
    const svixId = req.headers['svix-id'] as string;
    const svixTimestamp = req.headers['svix-timestamp'] as string;
    const svixSignature = req.headers['svix-signature'] as string;

    if (!svixId || !svixTimestamp || !svixSignature) {
      res.status(400).json({ error: 'Missing Svix headers' });
      return;
    }

    // Verify timestamp is within 5 minutes
    const timestampSeconds = parseInt(svixTimestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestampSeconds) > 300) {
      res.status(400).json({ error: 'Timestamp too old' });
      return;
    }

    // Compute expected signature
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const signedContent = `${svixId}.${svixTimestamp}.${body}`;
    const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
    const expectedSignature = crypto
      .createHmac('sha256', secretBytes)
      .update(signedContent)
      .digest('base64');

    // Check against provided signatures (may have multiple, space-separated)
    const signatures = svixSignature.split(' ').map((s) => s.replace(/^v1,/, ''));
    if (!signatures.includes(expectedSignature)) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }
  }

  const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { type, data } = payload;

  console.log(`[Clerk Webhook] Event: ${type}`);

  switch (type) {
    case 'user.created': {
      const email = data.email_addresses?.find(
        (e: any) => e.id === data.primary_email_address_id
      )?.email_address;
      console.log(`[Clerk Webhook] New user: ${email || data.id}`);

      // If the user already exists in our DB (pre-provisioned), link their external_id
      if (email) {
        await query(
          `UPDATE users SET external_id = $1, updated_at = NOW()
           WHERE email = $2 AND external_id IS NULL`,
          [data.id, email]
        );
      }
      break;
    }

    case 'user.updated': {
      const email = data.email_addresses?.find(
        (e: any) => e.id === data.primary_email_address_id
      )?.email_address;

      if (email) {
        // Update external_id mapping for the new email
        await query(
          `UPDATE users SET external_id = $1, updated_at = NOW()
           WHERE email = $2`,
          [data.id, email]
        );
      }
      break;
    }

    case 'user.deleted': {
      // Deactivate the user in our DB
      if (data.id) {
        await query(
          `UPDATE users SET active = false, updated_at = NOW()
           WHERE external_id = $1`,
          [data.id]
        );
        console.log(`[Clerk Webhook] Deactivated user: ${data.id}`);
      }
      break;
    }

    default:
      console.log(`[Clerk Webhook] Unhandled event type: ${type}`);
  }

  res.json({ received: true });
});

export default router;
