ALTER TABLE BillTimeline
    ADD COLUMN approval_vote_count INT NULL,
    ADD COLUMN total_vote_count INT NULL,
    ALGORITHM=INSTANT;
