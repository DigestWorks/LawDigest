CREATE TABLE IF NOT EXISTS BillReport (
    bill_id VARCHAR(255) NOT NULL PRIMARY KEY,
    title TEXT NOT NULL,
    markdown MEDIUMTEXT NOT NULL,
    published_at DATETIME(6) NOT NULL,
    INDEX idx_bill_report_published (published_at, bill_id),
    CONSTRAINT fk_bill_report_bill FOREIGN KEY (bill_id) REFERENCES Bill(bill_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
