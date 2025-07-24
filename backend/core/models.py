from django.db import models

class CompanyDrive(models.Model):
    company_name = models.CharField(max_length=100)
    role = models.CharField(max_length=100)
    domain = models.CharField(max_length=100)
    salary_range = models.CharField(max_length=50, blank=True, null=True)
    hiring_timeline = models.CharField(max_length=100, help_text="e.g., 'August 2025', 'Batch 2026'")
    drive_date = models.DateField(help_text="Primary date for ordering drives.")
    location = models.CharField(max_length=100)
    interview_process_description = models.TextField()

    def __str__(self):
        return f"{self.company_name} - {self.role} ({self.drive_date})"

    class Meta:
        ordering = ['drive_date'] # Default ordering by drive date