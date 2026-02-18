from django.db import models


class Ticket(models.Model):
    class Priority(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'
        CRITICAL = 'critical', 'Critical'

    class Category(models.TextChoices):
        BILLING = 'billing', 'Billing'
        TECHNICAL = 'technical', 'Technical'
        ACCOUNT = 'account', 'Account'
        GENERAL = 'general', 'General'

    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        IN_PROGRESS = 'in_progress', 'In Progress'
        RESOLVED = 'resolved', 'Resolved'
        CLOSED = 'closed', 'Closed'

    title = models.CharField(max_length=200, db_index=True)
    description = models.TextField()
    category = models.CharField(
        max_length=50, choices=Category.choices, default=Category.GENERAL, db_index=True
    )
    priority = models.CharField(
        max_length=50, choices=Priority.choices, default=Priority.LOW, db_index=True
    )
    status = models.CharField(
        max_length=50, choices=Status.choices, default=Status.OPEN, db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['category', 'priority']),
            models.Index(fields=['status', 'created_at']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(category__in=[c.value for c in Category]),
                name='valid_category',
            ),
            models.CheckConstraint(
                check=models.Q(priority__in=[p.value for p in Priority]),
                name='valid_priority',
            ),
            models.CheckConstraint(
                check=models.Q(status__in=[s.value for s in Status]),
                name='valid_status',
            ),
        ]

    def __str__(self):
        return f"{self.title} ({self.status})"
