from rest_framework import serializers
from .models import Ticket


class TicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class TicketUpdateSerializer(serializers.ModelSerializer):
    """Serializer for PATCH updates — only status, category, priority are writable."""

    class Meta:
        model = Ticket
        fields = ['id', 'title', 'description', 'category', 'priority', 'status', 'created_at']
        read_only_fields = ['id', 'title', 'description', 'created_at']


class ClassifyRequestSerializer(serializers.Serializer):
    """Validates the description field for the AI classification endpoint."""

    description = serializers.CharField(
        min_length=10,
        max_length=5000,
        help_text="Ticket description to classify",
    )
