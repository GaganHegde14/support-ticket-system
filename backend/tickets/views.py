from django.db.models import Count, Avg, Q
from django.db.models.functions import TruncDate
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter
from rest_framework.response import Response

from .filters import TicketFilter
from .models import Ticket
from .serializers import (
    ClassifyRequestSerializer,
    TicketSerializer,
    TicketUpdateSerializer,
)
from .services import classify_ticket


class TicketViewSet(viewsets.ModelViewSet):
    """
    ViewSet for support tickets.

    list:   GET    /api/tickets/          — list all tickets (filterable, searchable)
    create: POST   /api/tickets/          — create a ticket
    partial_update: PATCH /api/tickets/<id>/ — update status/category/priority
    stats:  GET    /api/tickets/stats/    — aggregated statistics
    classify: POST /api/tickets/classify/ — LLM-based classification
    """

    queryset = Ticket.objects.all()
    filterset_class = TicketFilter
    search_fields = ["title", "description"]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_serializer_class(self):
        if self.action == "partial_update":
            return TicketUpdateSerializer
        return TicketSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        """
        Return aggregated ticket statistics using DB-level aggregation only.
        No Python loops for aggregation.
        """
        qs = Ticket.objects.all()

        # Total and open counts
        totals = qs.aggregate(
            total_tickets=Count("id"),
            open_tickets=Count("id", filter=Q(status="open")),
        )

        # Average tickets per day using TruncDate
        daily_counts = (
            qs.annotate(date=TruncDate("created_at"))
            .values("date")
            .annotate(count=Count("id"))
            .aggregate(avg_tickets_per_day=Avg("count"))
        )

        # Priority breakdown — single query with conditional counts
        priority_breakdown = qs.aggregate(
            **{
                p.value: Count("id", filter=Q(priority=p.value))
                for p in Ticket.Priority
            }
        )

        # Category breakdown — single query with conditional counts
        category_breakdown = qs.aggregate(
            **{
                c.value: Count("id", filter=Q(category=c.value))
                for c in Ticket.Category
            }
        )

        return Response(
            {
                "total_tickets": totals["total_tickets"],
                "open_tickets": totals["open_tickets"],
                "avg_tickets_per_day": round(
                    daily_counts["avg_tickets_per_day"] or 0.0, 2
                ),
                "priority_breakdown": priority_breakdown,
                "category_breakdown": category_breakdown,
            }
        )

    @action(detail=False, methods=["post"], url_path="classify")
    def classify(self, request):
        """Classify a ticket description using the LLM service."""
        serializer = ClassifyRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = classify_ticket(serializer.validated_data["description"])
        return Response(result, status=status.HTTP_200_OK)
