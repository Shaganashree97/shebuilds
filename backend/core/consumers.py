import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from .models import DiscussionTopic, DiscussionPost
from .serializers import DiscussionPostSerializer, DiscussionTopicListSerializer
from django.utils import timezone

# Set up logging
logger = logging.getLogger(__name__)

class DiscussionConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time discussion in a specific topic.
    Handles real-time messaging within a discussion topic.
    """
    
    async def connect(self):
        try:
            logger.info("WebSocket connection attempt started")
            
        self.topic_id = self.scope['url_route']['kwargs']['topic_id']
        self.room_group_name = f'discussion_{self.topic_id}'
        self.user = self.scope.get('user')
            
            logger.info(f"Topic ID: {self.topic_id}, User: {self.user}")
        
        # Accept connection regardless of authentication status
        await self.accept()
            logger.info("WebSocket connection accepted")
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
            logger.info(f"Added to group: {self.room_group_name}")
        
        # Send connection status
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'authenticated': self.user and self.user.is_authenticated,
            'message': 'Connected to discussion'
        }))
            logger.info("Connection status sent")
        
        # Send user join notification if authenticated
        if self.user and self.user.is_authenticated:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_join',
                    'user': self.user.first_name or self.user.username,
                    'user_id': self.user.id,
                    'timestamp': timezone.now().isoformat()
                }
            )
                logger.info("User join notification sent")
            
            logger.info("WebSocket connection fully established")
            
        except Exception as e:
            logger.error(f"Error in WebSocket connect: {e}", exc_info=True)
            await self.close()

    async def disconnect(self, close_code):
        try:
            logger.info(f"WebSocket disconnecting with code: {close_code}")
            
        # Send user leave notification
        if hasattr(self, 'user') and self.user and self.user.is_authenticated:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_leave',
                    'user': self.user.first_name or self.user.username,
                    'user_id': self.user.id,
                    'timestamp': timezone.now().isoformat()
                }
            )
        
        # Leave room group
            if hasattr(self, 'room_group_name'):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
                
            logger.info("WebSocket disconnection completed")
            
        except Exception as e:
            logger.error(f"Error in WebSocket disconnect: {e}", exc_info=True)

    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'chat_message':
                await self.handle_chat_message(data)
            elif message_type == 'typing':
                await self.handle_typing_notification(data)
            elif message_type == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))
        except Exception as e:
            await self.send(text_data=json.dumps({
                'type': 'error', 
                'message': f'Error processing message: {str(e)}'
            }))

    async def handle_chat_message(self, data):
        """Handle new chat messages"""
        content = data.get('content', '').strip()
        if not content:
            logger.warning("Empty message content received")
            return
            
        logger.info(f"Processing chat message: '{content[:50]}...' from user: {self.user}")
        
        # Allow both authenticated and anonymous users for now (for testing)
        # if not self.user or not self.user.is_authenticated:
        #     await self.send(text_data=json.dumps({
        #         'type': 'error',
        #         'message': 'Please log in to participate in the discussion',
        #         'code': 'authentication_required'
        #     }))
        #     return
        
        # Save message to database
        post = await self.save_message(content)
        if post:
            logger.info(f"Broadcasting message to group: {self.room_group_name}")
            # Broadcast message to room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message_broadcast',
                    'post_id': post['id'],
                    'content': post['content'],
                    'author_name': post['author_name'],
                    'author_id': self.user.id if self.user and self.user.is_authenticated else None,
                    'created_at': post['created_at'],
                    'timestamp': timezone.now().isoformat()
                }
            )
        else:
            logger.error("Failed to save message to database")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Failed to save message. Please try again.',
                'code': 'save_failed'
            }))

    async def handle_typing_notification(self, data):
        """Handle typing notifications"""
        if not self.user or not self.user.is_authenticated:
            return
            
        is_typing = data.get('is_typing', False)
        
        # Broadcast typing status to room group (excluding sender)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'typing_notification',
                'user': self.user.first_name or self.user.username,
                'user_id': self.user.id,
                'is_typing': is_typing,
                'sender_channel': self.channel_name
            }
        )

    @database_sync_to_async
    def save_message(self, content):
        """Save message to database"""
        try:
            topic = DiscussionTopic.objects.get(id=self.topic_id)
            
            # Set author information
            author_name = 'Anonymous'
            author = None
            
            if self.user and self.user.is_authenticated:
                author = self.user
                author_name = self.user.first_name or self.user.username
                logger.info(f"Authenticated user sending message: {author_name}")
            else:
                logger.warning("Unauthenticated user trying to send message")
            
            post = DiscussionPost.objects.create(
                topic=topic,
                content=content,
                author=author,
                author_name=author_name
            )
            
            logger.info(f"Message saved successfully: {post.id}")
            
            # Return serialized post data
            return {
                'id': post.id,
                'content': post.content,
                'author_name': post.author_name,
                'created_at': post.created_at.isoformat()
            }
        except DiscussionTopic.DoesNotExist:
            logger.error(f"Topic {self.topic_id} does not exist")
            return None
        except Exception as e:
            logger.error(f"Error saving message: {e}", exc_info=True)
            return None

    # WebSocket message handlers
    async def chat_message_broadcast(self, event):
        """Send chat message to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'post_id': event['post_id'],
            'content': event['content'],
            'author_name': event['author_name'],
            'author_id': event['author_id'],
            'created_at': event['created_at'],
            'timestamp': event['timestamp']
        }))

    async def typing_notification(self, event):
        """Send typing notification to WebSocket (excluding sender)"""
        if event['sender_channel'] != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': 'typing',
                'user': event['user'],
                'user_id': event['user_id'],
                'is_typing': event['is_typing']
            }))

    async def user_join(self, event):
        """Send user join notification to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'user_join',
            'user': event['user'],
            'user_id': event['user_id'],
            'timestamp': event['timestamp']
        }))

    async def user_leave(self, event):
        """Send user leave notification to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'user_leave',
            'user': event['user'],
            'user_id': event['user_id'],
            'timestamp': event['timestamp']
        }))


class DiscussionListConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time updates to the discussion topics list.
    Handles notifications when new topics are created or updated.
    """
    
    async def connect(self):
        self.room_group_name = 'discussion_list'
        self.user = self.scope.get('user')
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'new_topic':
                await self.handle_new_topic(data)
            elif message_type == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))

    async def handle_new_topic(self, data):
        """Handle new topic creation"""
        title = data.get('title', '').strip()
        author_name = data.get('author_name', 'Anonymous').strip()
        
        if not title:
            return
            
        # Save new topic to database
        topic = await self.save_topic(title, author_name)
        if topic:
            # Broadcast new topic to all connected clients
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'new_topic_broadcast',
                    'topic_data': topic
                }
            )

    @database_sync_to_async
    def save_topic(self, title, author_name):
        """Save new topic to database"""
        try:
            topic = DiscussionTopic.objects.create(
                title=title,
                author_name=author_name or 'Anonymous'
            )
            
            # Return serialized topic data
            return {
                'id': topic.id,
                'title': topic.title,
                'author_name': topic.author_name,
                'created_at': topic.created_at.isoformat(),
                'post_count': 0,
                'related_skill_name': None,
                'related_company_name': None
            }
        except Exception as e:
            print(f"Error saving topic: {e}")
            return None

    # WebSocket message handlers
    async def new_topic_broadcast(self, event):
        """Send new topic notification to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'new_topic',
            'topic': event['topic_data']
        }))

    async def topic_updated(self, event):
        """Send topic update notification to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'topic_updated',
            'topic_id': event['topic_id'],
            'post_count': event['post_count']
        })) 