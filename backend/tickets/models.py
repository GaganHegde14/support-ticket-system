from django.db import models

class Ticket(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    CATEGORY_CHOICES = [
        ('billing', 'Billing'),
        ('technical', 'Technical'),
        ('account', 'Account'),
        ('general', 'General'),
    ]
    
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    priority = models.CharField(max_length=50, choices=PRIORITY_CHOICES)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='open')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.status})"
