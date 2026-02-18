from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status as http_status

from .models import Ticket


class TicketModelTest(TestCase):
    """Tests for the Ticket model."""

    def test_create_ticket(self):
        ticket = Ticket.objects.create(
            title="Test ticket",
            description="Test description",
            category="billing",
            priority="high",
        )
        self.assertEqual(ticket.status, "open")
        self.assertEqual(str(ticket), "[High] Test ticket")

    def test_default_ordering(self):
        t1 = Ticket.objects.create(
            title="First", description="d", category="general", priority="low"
        )
        t2 = Ticket.objects.create(
            title="Second", description="d", category="general", priority="low"
        )
        tickets = list(Ticket.objects.all())
        self.assertEqual(tickets[0].id, t2.id)
        self.assertEqual(tickets[1].id, t1.id)


class TicketAPITest(TestCase):
    """Tests for the Ticket API endpoints."""

    def setUp(self):
        self.client = APIClient()

    def test_create_ticket_success(self):
        data = {
            "title": "Cannot login",
            "description": "Getting 403 error on login page",
            "category": "technical",
            "priority": "high",
        }
        response = self.client.post("/api/tickets/", data, format="json")
        self.assertEqual(response.status_code, http_status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "open")

    def test_create_ticket_missing_title(self):
        data = {"description": "Some issue", "category": "general", "priority": "low"}
        response = self.client.post("/api/tickets/", data, format="json")
        self.assertEqual(response.status_code, http_status.HTTP_400_BAD_REQUEST)

    def test_list_tickets(self):
        Ticket.objects.create(
            title="T1", description="d", category="billing", priority="low"
        )
        response = self.client.get("/api/tickets/")
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)

    def test_filter_by_category(self):
        Ticket.objects.create(
            title="T1", description="d", category="billing", priority="low"
        )
        Ticket.objects.create(
            title="T2", description="d", category="technical", priority="high"
        )
        response = self.client.get("/api/tickets/?category=billing")
        self.assertEqual(len(response.data["results"]), 1)

    def test_patch_status(self):
        ticket = Ticket.objects.create(
            title="T1", description="d", category="billing", priority="low"
        )
        response = self.client.patch(
            f"/api/tickets/{ticket.id}/",
            {"status": "resolved"},
            format="json",
        )
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        ticket.refresh_from_db()
        self.assertEqual(ticket.status, "resolved")

    def test_stats_endpoint(self):
        Ticket.objects.create(
            title="T1", description="d", category="billing", priority="low"
        )
        Ticket.objects.create(
            title="T2", description="d", category="technical", priority="high"
        )
        response = self.client.get("/api/tickets/stats/")
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.data["total_tickets"], 2)
        self.assertEqual(response.data["open_tickets"], 2)
        self.assertIn("priority_breakdown", response.data)
        self.assertIn("category_breakdown", response.data)

    def test_classify_endpoint_fallback(self):
        """Without an API key, should return fallback values."""
        response = self.client.post(
            "/api/tickets/classify/",
            {"description": "I can't access my billing page"},
            format="json",
        )
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.data["suggested_category"], "general")
        self.assertEqual(response.data["suggested_priority"], "low")
