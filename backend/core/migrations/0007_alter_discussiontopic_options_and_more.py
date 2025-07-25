# Generated by Django 5.2.4 on 2025-07-24 20:07

import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0006_remove_userpreparationplan_user_identifier_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='discussiontopic',
            options={'ordering': ['-last_activity', '-created_at']},
        ),
        migrations.AlterModelOptions(
            name='planprogress',
            options={},
        ),
        migrations.RenameField(
            model_name='mockinterviewquestion',
            old_name='difficulty_level',
            new_name='difficulty',
        ),
        migrations.RemoveField(
            model_name='mockinterviewquestion',
            name='role',
        ),
        migrations.AddField(
            model_name='discussionpost',
            name='author',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='discussion_posts', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='discussionpost',
            name='is_edited',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='discussionpost',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddField(
            model_name='discussiontopic',
            name='author',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='discussion_topics', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='discussiontopic',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='discussiontopic',
            name='last_activity',
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
        migrations.AddField(
            model_name='discussiontopic',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddField(
            model_name='mockinterviewquestion',
            name='related_skill',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='core.skill'),
        ),
        migrations.AlterField(
            model_name='mockinterviewquestion',
            name='company',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='core.companydrive'),
        ),
        migrations.CreateModel(
            name='UserOnlineStatus',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('is_online', models.BooleanField(default=False)),
                ('last_seen', models.DateTimeField(default=django.utils.timezone.now)),
                ('current_topic', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='online_users', to='core.discussiontopic')),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='online_status', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'User Online Status',
                'verbose_name_plural': 'User Online Statuses',
            },
        ),
    ]
