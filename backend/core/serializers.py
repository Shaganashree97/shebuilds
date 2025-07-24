from rest_framework import serializers
from .models import CompanyDrive, Skill, LearningTopic, LearningResource

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