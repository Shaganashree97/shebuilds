from django.db import models
from django.utils import timezone # Import for default timestamp
from django.contrib.auth.models import User

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
# Skills and Learning Resources models
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

#
# Mock Interview Questions model
#

class MockInterviewQuestion(models.Model):
    question_text = models.TextField()
    difficulty = models.CharField(max_length=20, choices=[('Easy', 'Easy'), ('Medium', 'Medium'), ('Hard', 'Hard')])
    # Optional: Link to a skill or company for structured interviews
    related_skill = models.ForeignKey(Skill, on_delete=models.SET_NULL, null=True, blank=True)
    company = models.ForeignKey(CompanyDrive, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.question_text[:50]}..."


class ForumCategory(models.Model):
    """
    Represents different forum categories/channels for organizing discussions.
    """
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True, help_text="Emoji or icon identifier")
    color = models.CharField(max_length=7, default='#667eea', help_text="Hex color code for category")
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0, help_text="Display order")
    created_at = models.DateTimeField(default=timezone.now)
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name = "Forum Category"
        verbose_name_plural = "Forum Categories"
        ordering = ['order', 'name']


class DiscussionTopic(models.Model):
    """
    Represents a main discussion thread or topic in the forum.
    """
    title = models.CharField(max_length=255)
    content = models.TextField(blank=True, help_text="Optional initial post content")
    category = models.ForeignKey(
        ForumCategory, on_delete=models.CASCADE, 
        related_name='topics', null=True, blank=True,
        help_text="Forum category this topic belongs to"
    )
    
    # Support both authenticated users and anonymous posting
    author = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='discussion_topics'
    )
    author_name = models.CharField(max_length=100, default='Anonymous')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Optional: Link to a skill or company for structured discussions
    related_skill = models.ForeignKey(
        'Skill', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='discussion_topics'
    )
    related_company = models.ForeignKey(
        'CompanyDrive', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='discussion_topics'
    )
    
    # Forum features
    is_pinned = models.BooleanField(default=False, help_text="Pin topic to top of category")
    is_locked = models.BooleanField(default=False, help_text="Prevent new posts")
    view_count = models.IntegerField(default=0, help_text="Number of times topic was viewed")
    
    # Real-time features
    is_active = models.BooleanField(default=True)
    last_activity = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        # Auto-set author_name if user is provided
        if self.author:
            self.author_name = self.author.first_name or self.author.username
        super().save(*args, **kwargs)

    def update_activity(self):
        """Update last activity timestamp"""
        self.last_activity = timezone.now()
        self.save(update_fields=['last_activity'])

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['-last_activity', '-created_at'] # Order by activity first, then creation


class DiscussionPost(models.Model):
    """
    Represents a reply or comment within a discussion topic.
    """
    topic = models.ForeignKey(DiscussionTopic, on_delete=models.CASCADE, related_name='posts')
    content = models.TextField()
    
    # Support both authenticated users and anonymous posting
    author = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='discussion_posts'
    )
    author_name = models.CharField(max_length=100, default='Anonymous')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Real-time features
    is_edited = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        # Auto-set author_name if user is provided
        if self.author:
            self.author_name = self.author.first_name or self.author.username
        
        # Update topic activity when new post is created
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        if is_new:
            self.topic.update_activity()

    def __str__(self):
        return f"Post by {self.author_name} on {self.topic.title[:30]}..."

    class Meta:
        ordering = ['created_at'] # Order posts within a topic from oldest to newest


#
# User Online Status for Real-time Features
#

class UserOnlineStatus(models.Model):
    """
    Track online status of users in discussion forums
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='online_status')
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(default=timezone.now)
    current_topic = models.ForeignKey(
        DiscussionTopic, on_delete=models.SET_NULL, 
        null=True, blank=True, related_name='online_users'
    )
    
    def mark_online(self, topic=None):
        """Mark user as online"""
        self.is_online = True
        self.last_seen = timezone.now()
        self.current_topic = topic
        self.save()
    
    def mark_offline(self):
        """Mark user as offline"""
        self.is_online = False
        self.last_seen = timezone.now()
        self.current_topic = None
        self.save()
    
    def __str__(self):
        status = "Online" if self.is_online else "Offline"
        return f"{self.user.username} - {status}"

    class Meta:
        verbose_name = "User Online Status"
        verbose_name_plural = "User Online Statuses"


#
# Preparation Plan Storage and Progress Tracking
#

class UserPreparationPlan(models.Model):
    """
    Stores generated preparation plans for users with progress tracking.
    """
    # User who owns this preparation plan
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='preparation_plans')
    
    # Plan metadata
    plan_name = models.CharField(max_length=255, help_text="User-defined name for the plan")
    academic_details = models.TextField()
    input_type = models.CharField(max_length=20, choices=[('role', 'Target Role'), ('job_description', 'Job Description')])
    preferred_role = models.CharField(max_length=200, blank=True, null=True)
    job_description = models.TextField(blank=True, null=True)
    
    # Generated plan content (stored as JSON)
    plan_data = models.JSONField(help_text="Complete plan data returned from AI")
    
    # Progress tracking
    total_topics = models.IntegerField(default=0)
    completed_topics = models.IntegerField(default=0)
    progress_percentage = models.FloatField(default=0.0)
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    last_accessed = models.DateTimeField(default=timezone.now)
    
    # Status
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.plan_name} - {self.user.username} ({self.progress_percentage:.1f}%)"
    
    def update_progress(self):
        """Update progress percentage based on completed topics"""
        if self.total_topics > 0:
            self.progress_percentage = (self.completed_topics / self.total_topics) * 100
        else:
            self.progress_percentage = 0
        self.save()
    
    class Meta:
        ordering = ['-last_accessed', '-created_at']


class PlanProgress(models.Model):
    """
    Tracks progress on individual topics/sections within a preparation plan.
    """
    plan = models.ForeignKey(UserPreparationPlan, on_delete=models.CASCADE, related_name='topic_progress')
    
    # Topic identification
    section_name = models.CharField(max_length=255, help_text="Skill/section name")
    topic_name = models.CharField(max_length=255, help_text="Specific topic name")
    topic_description = models.TextField(blank=True)
    
    # Progress tracking
    is_completed = models.BooleanField(default=False)
    completion_date = models.DateTimeField(null=True, blank=True)
    
    # Time tracking
    estimated_hours = models.FloatField(null=True, blank=True)
    actual_hours_spent = models.FloatField(default=0.0)
    
    # Notes and feedback
    user_notes = models.TextField(blank=True, help_text="User's personal notes on this topic")
    difficulty_rating = models.IntegerField(
        null=True, blank=True,
        choices=[(1, 'Very Easy'), (2, 'Easy'), (3, 'Medium'), (4, 'Hard'), (5, 'Very Hard')],
        help_text="User's difficulty rating for this topic"
    )
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        # Update completion date when topic is marked complete
        if self.is_completed and not self.completion_date:
            self.completion_date = timezone.now()
        elif not self.is_completed:
            self.completion_date = None
            
        super().save(*args, **kwargs)
        
        # Update parent plan progress
        self.plan.completed_topics = self.plan.topic_progress.filter(is_completed=True).count()
        self.plan.update_progress()
    
    def __str__(self):
        status = "✅" if self.is_completed else "⭕"
        return f"{status} {self.section_name}: {self.topic_name}"
    
    class Meta:
        unique_together = ['plan', 'section_name', 'topic_name']