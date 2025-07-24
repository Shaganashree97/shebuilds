from rest_framework import serializers
from .models import CompanyDrive

class CompanyDriveSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyDrive
        fields = '__all__' # Include all fields from the model