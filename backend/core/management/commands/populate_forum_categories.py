from django.core.management.base import BaseCommand
from core.models import ForumCategory


class Command(BaseCommand):
    help = 'Populate default forum categories for discussion forums'

    def handle(self, *args, **options):
        categories = [
            {
                'name': 'General Discussion',
                'description': 'General topics and discussions about career preparation',
                'icon': '💬',
                'color': '#667eea',
                'order': 1
            },
            {
                'name': 'Technical Questions',
                'description': 'Ask and discuss technical interview questions and concepts',
                'icon': '🔧',
                'color': '#10b981',
                'order': 2
            },
            {
                'name': 'Data Structures & Algorithms',
                'description': 'Discussion about DSA problems, solutions, and approaches',
                'icon': '📊',
                'color': '#f59e0b',
                'order': 3
            },
            {
                'name': 'System Design',
                'description': 'System design interviews, patterns, and architecture discussions',
                'icon': '🏗️',
                'color': '#8b5cf6',
                'order': 4
            },
            {
                'name': 'Company Experiences',
                'description': 'Share interview experiences and company-specific insights',
                'icon': '🏢',
                'color': '#06b6d4',
                'order': 5
            },
            {
                'name': 'Resume & Career Advice',
                'description': 'Get feedback on resumes and career guidance',
                'icon': '📄',
                'color': '#ec4899',
                'order': 6
            },
            {
                'name': 'Mock Interview Feedback',
                'description': 'Share and discuss mock interview experiences',
                'icon': '🎤',
                'color': '#84cc16',
                'order': 7
            },
            {
                'name': 'Study Groups',
                'description': 'Find study partners and organize group study sessions',
                'icon': '👥',
                'color': '#f97316',
                'order': 8
            },
            {
                'name': 'Resources & Tools',
                'description': 'Share useful resources, books, courses, and tools',
                'icon': '📚',
                'color': '#6366f1',
                'order': 9
            },
            {
                'name': 'Off-Topic',
                'description': 'Casual conversations and non-career related discussions',
                'icon': '🎯',
                'color': '#64748b',
                'order': 10
            }
        ]

        created_count = 0
        updated_count = 0

        for category_data in categories:
            category, created = ForumCategory.objects.get_or_create(
                name=category_data['name'],
                defaults={
                    'description': category_data['description'],
                    'icon': category_data['icon'],
                    'color': category_data['color'],
                    'order': category_data['order'],
                    'is_active': True
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created forum category: {category.name}')
                )
            else:
                # Update existing category if needed
                updated = False
                if category.description != category_data['description']:
                    category.description = category_data['description']
                    updated = True
                if category.icon != category_data['icon']:
                    category.icon = category_data['icon']
                    updated = True
                if category.color != category_data['color']:
                    category.color = category_data['color']
                    updated = True
                if category.order != category_data['order']:
                    category.order = category_data['order']
                    updated = True
                
                if updated:
                    category.save()
                    updated_count += 1
                    self.stdout.write(
                        self.style.WARNING(f'Updated forum category: {category.name}')
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nForum categories populated successfully!\n'
                f'Created: {created_count} categories\n'
                f'Updated: {updated_count} categories\n'
                f'Total categories in database: {ForumCategory.objects.count()}'
            )
        ) 