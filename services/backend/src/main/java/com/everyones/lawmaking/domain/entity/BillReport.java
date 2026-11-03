package com.everyones.lawmaking.domain.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;

@Entity
@Table(name = "BillReport", indexes = @Index(name = "idx_bill_report_published", columnList = "published_at,bill_id"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BillReport {
    @Id
    @Column(name = "bill_id")
    private String billId;

    @MapsId
    @OnDelete(action = OnDeleteAction.CASCADE)
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bill_id", foreignKey = @ForeignKey(name = "fk_bill_report_bill"))
    private Bill bill;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String title;

    @Column(nullable = false, columnDefinition = "MEDIUMTEXT")
    private String markdown;

    /** UTC publication timestamp supplied by the report generator. */
    @Column(name = "published_at", nullable = false, columnDefinition = "DATETIME(6)")
    private LocalDateTime publishedAt;
}
