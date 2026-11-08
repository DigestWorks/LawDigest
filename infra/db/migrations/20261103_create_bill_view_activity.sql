CREATE TABLE IF NOT EXISTS BillViewActivity (
    bill_id VARCHAR(255) NOT NULL,
    viewed_at DATETIME NOT NULL,
    view_count BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (bill_id, viewed_at),
    INDEX idx_bill_view_activity_time (viewed_at, bill_id),
    CONSTRAINT fk_bill_view_activity_bill FOREIGN KEY (bill_id) REFERENCES Bill(bill_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
