from django.db import models
from django.utils import timezone # Import for default timestamp

#
# CompanyDrive model to store information about company drives
#

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


#
# Personalized Preparation models
#

class Skill(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name

class LearningTopic(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    # A topic can be related to multiple skills (e.g., 'Arrays' related to 'DSA' and 'Python')
    related_skills = models.ManyToManyField(Skill, related_name='topics')

    def __str__(self):
        return self.name

class LearningResource(models.Model):
    title = models.CharField(max_length=255)
    url = models.URLField()
    type = models.CharField(max_length=50, choices=[('Video', 'Video'), ('Article', 'Article'), ('Course', 'Course'), ('Problem Set', 'Problem Set')])
    # A resource can be associated with multiple topics
    associated_topics = models.ManyToManyField(LearningTopic, related_name='resources')

    def __str__(self):
        return self.title
    

class MockInterviewQuestion(models.Model):
    # Foreign Key to CompanyDrive, so each question is linked to a specific company drive
    company = models.ForeignKey(CompanyDrive, on_delete=models.CASCADE, related_name='mock_questions')
    role = models.CharField(max_length=100, help_text="e.g., 'Software Engineer', 'Data Analyst'")
    question_text = models.TextField()
    difficulty_level = models.CharField(max_length=20, choices=[('Easy', 'Easy'), ('Medium', 'Medium'), ('Hard', 'Hard')])
    # Optional: You could add fields for expected answer, keywords for future AI feedback
    # expected_answer = models.TextField(blank=True)
    # expected_keywords = models.TextField(blank=True, help_text="Comma-separated keywords for basic evaluation")

    def __str__(self):
        return f"Mock Q for {self.company.company_name} ({self.role}) - {self.difficulty_level}"


class DiscussionTopic(models.Model):
    """
    Represents a main discussion thread or topic in the forum.
    """
    title = models.CharField(max_length=255)
    # Using CharField for author for hackathon simplicity (no full user auth required)
    # In a real app, this would be a ForeignKey to Django's User model
    author_name = models.CharField(max_length=100, default='Anonymous')
    created_at = models.DateTimeField(default=timezone.now)
    # Optional: Link to a skill or company for structured discussions
    related_skill = models.ForeignKey(
        'Skill', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='discussion_topics'
    )
    related_company = models.ForeignKey(
        'CompanyDrive', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='discussion_topics'
    )

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['-created_at'] # Order by newest topics first

class DiscussionPost(models.Model):
    """
    Represents a reply or comment within a discussion topic.
    """
    topic = models.ForeignKey(DiscussionTopic, on_delete=models.CASCADE, related_name='posts')
    content = models.TextField()
    # Using CharField for author for hackathon simplicity
    author_name = models.CharField(max_length=100, default='Anonymous')
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Post by {self.author_name} on {self.topic.title[:30]}..."

    class Meta:
        ordering = ['created_at'] # Order posts within a topic from oldest to newest