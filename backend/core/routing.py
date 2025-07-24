from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'^ws/discussion/(?P<topic_id>\d+)/$', consumers.DiscussionConsumer.as_asgi()),
    re_path(r'^ws/discussion_list/$', consumers.DiscussionListConsumer.as_asgi()),
] 