-- Additive covering indexes for two existing composite foreign keys.
-- Staging tested; do not apply to the populated I3 principal without a reviewed rollout.
-- Transactional CREATE INDEX is appropriate for the empty staging instance.
CREATE INDEX IF NOT EXISTS account_reconciliations_user_event_fk_idx
  ON atlas_private.account_reconciliations (user_id, event_id);
CREATE INDEX IF NOT EXISTS financial_events_user_recurrence_fk_idx
  ON atlas_private.financial_events (user_id, recurrence_rule_id);
