from django.contrib import admin
from .models import CompanyDrive, Skill, LearningTopic, LearningResource

admin.site.register(CompanyDrive)
admin.site.register(Skill)
admin.site.register(LearningTopic)
admin.site.register(LearningResource)