from rest_framework import serializers
from .models import CompanyDrive, MockInterviewQuestion, Skill, LearningTopic, LearningResource, DiscussionTopic, DiscussionPost

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
    preferred_role = serializers.CharField(max_length=100)

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

# --- Collaborative Learning ---

class DiscussionPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiscussionPost
        # Read-only fields for ID and timestamp, allowing author_name and content to be writable
        fields = ['id', 'topic', 'content', 'author_name', 'created_at']
        read_only_fields = ['created_at'] # Auto-set on creation

class DiscussionTopicSerializer(serializers.ModelSerializer):
    # Nested serializer to display posts directly within the topic details
    # This will be used when retrieving a single topic with its posts
    posts = DiscussionPostSerializer(many=True, read_only=True)
    # Include related skill/company names for better context
    related_skill_name = serializers.CharField(source='related_skill.name', read_only=True, allow_null=True)
    related_company_name = serializers.CharField(source='related_company.company_name', read_only=True, allow_null=True)


    class Meta:
        model = DiscussionTopic
        fields = ['id', 'title', 'author_name', 'created_at', 'related_skill', 'related_skill_name', 'related_company', 'related_company_name', 'posts']
        read_only_fields = ['created_at'] # Auto-set on creation
        # Make related_skill and related_company writable by ID if creating/updating topics
        extra_kwargs = {
            'related_skill': {'write_only': True, 'required': False, 'allow_null': True},
            'related_company': {'write_only': True, 'required': False, 'allow_null': True},
        }

# A simpler serializer for listing topics (without all posts, for performance)
class DiscussionTopicListSerializer(serializers.ModelSerializer):
    post_count = serializers.SerializerMethodField()
    related_skill_name = serializers.CharField(source='related_skill.name', read_only=True, allow_null=True)
    related_company_name = serializers.CharField(source='related_company.company_name', read_only=True, allow_null=True)

    class Meta:
        model = DiscussionTopic
        fields = ['id', 'title', 'author_name', 'created_at', 'post_count', 'related_skill_name', 'related_company_name']

    def get_post_count(self, obj):
        return obj.posts.count()
