from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import CompanyDrive, MockInterviewQuestion, Skill, LearningTopic, LearningResource, DiscussionTopic, DiscussionPost, ForumCategory

# Authentication Serializers
class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password_confirm', 'first_name', 'last_name')
        extra_kwargs = {
            'email': {'required': True},
            'first_name': {'required': True},
            'last_name': {'required': True},
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match.")
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user

class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        if email and password:
            try:
                user = User.objects.get(email=email)
                user = authenticate(username=user.username, password=password)
                if user:
                    if not user.is_active:
                        raise serializers.ValidationError('User account is disabled.')
                    attrs['user'] = user
                    return attrs
                else:
                    raise serializers.ValidationError('Invalid credentials.')
            except User.DoesNotExist:
                raise serializers.ValidationError('User with this email does not exist.')
        else:
            raise serializers.ValidationError('Must include email and password.')

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'date_joined')
        read_only_fields = ('id', 'date_joined')

class CompanyDriveSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyDrive
        fields = '__all__' # Include all fields from the model

class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = '__all__'

class LearningResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningResource
        fields = ['title', 'url', 'type'] # Only expose relevant fields for the plan

class LearningTopicSerializer(serializers.ModelSerializer):
    # This will be used to nest topics within skills in the plan output
    # For the plan generation output, we just need basic info and its resources
    resources = LearningResourceSerializer(many=True, read_only=True)

    class Meta:
        model = LearningTopic
        fields = ['name', 'description', 'resources']


# This serializer is for the input to the plan generation API
class PrepPlanInputSerializer(serializers.Serializer):
    academic_course_details = serializers.CharField(max_length=500)
    preferred_role = serializers.CharField(max_length=100, required=False, allow_blank=True)
    job_description = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    plan_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    
    def validate(self, data):
        preferred_role = data.get('preferred_role', '').strip()
        job_description = data.get('job_description', '').strip()
        
        if not preferred_role and not job_description:
            raise serializers.ValidationError(
                "Either 'preferred_role' or 'job_description' must be provided."
            )
        
        return data

class PlanProgressSerializer(serializers.Serializer):
    plan_id = serializers.IntegerField()
    section_name = serializers.CharField(max_length=255)
    topic_name = serializers.CharField(max_length=255)
    is_completed = serializers.BooleanField()
    user_notes = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    difficulty_rating = serializers.IntegerField(min_value=1, max_value=5, required=False, allow_null=True)

class UserPreparationPlanSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    plan_name = serializers.CharField(max_length=255)
    academic_details = serializers.CharField()
    input_type = serializers.CharField()
    preferred_role = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    job_description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    plan_data = serializers.JSONField()
    total_topics = serializers.IntegerField()
    completed_topics = serializers.IntegerField()
    progress_percentage = serializers.FloatField()
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    last_accessed = serializers.DateTimeField(read_only=True)
    is_active = serializers.BooleanField()

class PlanProgressDetailSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    section_name = serializers.CharField()
    topic_name = serializers.CharField()
    topic_description = serializers.CharField(required=False, allow_blank=True)
    is_completed = serializers.BooleanField()
    completion_date = serializers.DateTimeField(read_only=True)
    estimated_hours = serializers.FloatField(required=False, allow_null=True)
    actual_hours_spent = serializers.FloatField()
    user_notes = serializers.CharField(required=False, allow_blank=True)
    difficulty_rating = serializers.IntegerField(required=False, allow_null=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

# This serializer is for the structured output of the plan
class PrepPlanOutputSerializer(serializers.Serializer):
    summary = serializers.CharField()
    time_estimation = serializers.JSONField() # Holds total weeks and breakdown
    sections = serializers.ListField(
        child=serializers.DictField(
            child=serializers.DictField() # Expecting {'skill': '...', 'topics': [...]}
        )
    )

class MockInterviewQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MockInterviewQuestion
        fields = ['id', 'question_text', 'difficulty_level', 'role'] # Expose relevant fields for frontend

class MockInterviewInputSerializer(serializers.Serializer):
    company_name = serializers.CharField(max_length=200)
    job_description = serializers.CharField(max_length=5000)
    num_questions = serializers.IntegerField(min_value=1, max_value=10, default=5)

class MockInterviewResponseSerializer(serializers.Serializer):
    question_text = serializers.CharField()
    difficulty_level = serializers.CharField()
    audio_url = serializers.URLField(required=False, allow_null=True)
    audio_data = serializers.CharField(required=False, allow_null=True)  # Base64 encoded audio

class AnswerEvaluationInputSerializer(serializers.Serializer):
    company_name = serializers.CharField(max_length=200)
    job_description = serializers.CharField(max_length=5000)
    question_answers = serializers.ListField(
        child=serializers.DictField(
            child=serializers.CharField()
        )
    )

class AnswerFeedbackSerializer(serializers.Serializer):
    question_text = serializers.CharField()
    user_answer = serializers.CharField()
    score = serializers.IntegerField()  # 1-10 rating
    strengths = serializers.ListField(child=serializers.CharField())
    improvements = serializers.ListField(child=serializers.CharField())
    suggestions = serializers.ListField(child=serializers.CharField())
    overall_comment = serializers.CharField()

# --- Collaborative Learning ---

class ForumCategorySerializer(serializers.ModelSerializer):
    topic_count = serializers.SerializerMethodField()
    latest_activity = serializers.SerializerMethodField()
    
    class Meta:
        model = ForumCategory
        fields = ['id', 'name', 'description', 'icon', 'color', 'is_active', 'order', 'topic_count', 'latest_activity', 'created_at']
        read_only_fields = ['created_at']
    
    def get_topic_count(self, obj):
        return obj.topics.filter(is_active=True).count()
    
    def get_latest_activity(self, obj):
        latest_topic = obj.topics.filter(is_active=True).order_by('-last_activity').first()
        if latest_topic:
            return {
                'topic_id': latest_topic.id,
                'topic_title': latest_topic.title,
                'last_activity': latest_topic.last_activity,
                'author_name': latest_topic.author_name
            }
        return None

class DiscussionPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiscussionPost
        # Read-only fields for ID and timestamp, allowing author_name and content to be writable
        fields = ['id', 'topic', 'content', 'author_name', 'created_at', 'updated_at', 'is_edited']
        read_only_fields = ['created_at', 'updated_at'] # Auto-set on creation

class DiscussionTopicSerializer(serializers.ModelSerializer):
    # Nested serializer to display posts directly within the topic details
    # This will be used when retrieving a single topic with its posts
    posts = DiscussionPostSerializer(many=True, read_only=True)
    # Include related skill/company names for better context
    related_skill_name = serializers.CharField(source='related_skill.name', read_only=True, allow_null=True)
    related_company_name = serializers.CharField(source='related_company.company_name', read_only=True, allow_null=True)
    # Include category information
    category_name = serializers.CharField(source='category.name', read_only=True, allow_null=True)
    category_color = serializers.CharField(source='category.color', read_only=True, allow_null=True)
    category_icon = serializers.CharField(source='category.icon', read_only=True, allow_null=True)

    class Meta:
        model = DiscussionTopic
        fields = [
            'id', 'title', 'content', 'author_name', 'created_at', 'updated_at', 'last_activity',
            'category', 'category_name', 'category_color', 'category_icon',
            'related_skill', 'related_skill_name', 'related_company', 'related_company_name',
            'is_pinned', 'is_locked', 'view_count', 'posts'
        ]
        read_only_fields = ['created_at', 'updated_at', 'last_activity', 'view_count']
        # Make related fields writable by ID if creating/updating topics
        extra_kwargs = {
            'category': {'write_only': True, 'required': False, 'allow_null': True},
            'related_skill': {'write_only': True, 'required': False, 'allow_null': True},
            'related_company': {'write_only': True, 'required': False, 'allow_null': True},
        }

# A simpler serializer for listing topics (without all posts, for performance)
class DiscussionTopicListSerializer(serializers.ModelSerializer):
    post_count = serializers.SerializerMethodField()
    related_skill_name = serializers.CharField(source='related_skill.name', read_only=True, allow_null=True)
    related_company_name = serializers.CharField(source='related_company.company_name', read_only=True, allow_null=True)
    # Include category information
    category_name = serializers.CharField(source='category.name', read_only=True, allow_null=True)
    category_color = serializers.CharField(source='category.color', read_only=True, allow_null=True)
    category_icon = serializers.CharField(source='category.icon', read_only=True, allow_null=True)
    last_post = serializers.SerializerMethodField()

    class Meta:
        model = DiscussionTopic
        fields = [
            'id', 'title', 'author_name', 'created_at', 'last_activity', 'post_count',
            'category_name', 'category_color', 'category_icon',
            'related_skill_name', 'related_company_name',
            'is_pinned', 'is_locked', 'view_count', 'last_post'
        ]

    def get_post_count(self, obj):
        return obj.posts.count()
    
    def get_last_post(self, obj):
        last_post = obj.posts.order_by('-created_at').first()
        if last_post:
            return {
                'author_name': last_post.author_name,
                'created_at': last_post.created_at
            }
        return None
