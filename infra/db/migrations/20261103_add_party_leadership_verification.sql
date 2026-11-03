ALTER TABLE Party
    ADD COLUMN leadership_verified_on DATE NULL,
    ADD COLUMN leadership_source_url VARCHAR(1024) NULL;
